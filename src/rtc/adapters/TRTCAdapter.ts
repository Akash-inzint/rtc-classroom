import TRTCLib from 'trtc-sdk-v5'
import type {
  IRTCProvider,
  JoinConfig,
  DeviceInfo,
  RTCParticipant,
  RTCEvent,
  RTCEventHandlers,
  RTCConnectionState,
} from '../IRTCProvider'

// Use the imported module; alias to TRTC for readability
const TRTC = TRTCLib as any

export class TRTCAdapter implements IRTCProvider {
  readonly providerName = 'trtc' as const

  private client: any = null
  private participants = new Map<string, RTCParticipant>()
  private handlers = new Map<string, Set<Function>>()
  private _cameraEnabled = false
  private _micEnabled = false
  private _screenSharing = false
  private localVideoEl: HTMLElement | null = null

  async initialize(): Promise<void> {
    // TRTC.create() returns the client instance
    this.client = TRTC.create()
    this._bindClientEvents()
  }

  async joinRoom(config: JoinConfig): Promise<void> {
    // TRTC roomId must be a positive integer — hash string room IDs
    const numericRoomId = toNumericRoomId(config.roomId)
    console.log(`[TRTC] joining room "${config.roomId}" → roomId ${numericRoomId}, userId: ${config.userId}`)

    await this.client.enterRoom({
      sdkAppId: Number(config.appId),
      userId: config.userId,
      userSig: config.token,
      roomId: numericRoomId,
      scene: 'rtc',
      role: 'anchor',
    })

    if (config.enableMic) {
      await this.client.startLocalAudio()
      this._micEnabled = true
    }

    if (config.enableCamera) {
      await this.client.startLocalVideo({ view: null })
      this._cameraEnabled = true
    }
  }

  async leaveRoom(): Promise<void> {
    try { await this.stopScreenShare() } catch { /* ignore */ }
    if (this._micEnabled) await this.client?.stopLocalAudio().catch(() => {})
    if (this._cameraEnabled) await this.client?.stopLocalVideo().catch(() => {})
    await this.client?.exitRoom()
    this._cameraEnabled = false
    this._micEnabled = false
    this._screenSharing = false
    this.participants.clear()
  }

  async destroy(): Promise<void> {
    await this.leaveRoom()
    this.client?.destroy?.()
    this.client = null
    this.handlers.clear()
  }

  on<K extends RTCEvent>(event: K, handler: RTCEventHandlers[K]): void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(handler as Function)
  }

  off<K extends RTCEvent>(event: K, handler: RTCEventHandlers[K]): void {
    this.handlers.get(event)?.delete(handler as Function)
  }

  private emit<K extends RTCEvent>(event: K, ...args: Parameters<RTCEventHandlers[K]>): void {
    this.handlers.get(event)?.forEach(h => (h as Function)(...args))
  }

  private _bindClientEvents(): void {
    this.client.on(TRTC.EVENT.REMOTE_USER_ENTER, ({ userId }: { userId: string }) => {
      const p = this._buildParticipant(userId)
      this.participants.set(userId, p)
      this.emit('userJoined', p)
    })

    this.client.on(TRTC.EVENT.REMOTE_USER_EXIT, ({ userId }: { userId: string }) => {
      this.participants.delete(userId)
      this.emit('userLeft', userId)
    })

    this.client.on(TRTC.EVENT.REMOTE_AUDIO_AVAILABLE, ({ userId }: { userId: string }) => {
      const p = this.participants.get(userId)
      if (p) { p.audioEnabled = true; this.participants.set(userId, p) }
      this.emit('audioStateChanged', userId, true)
    })

    this.client.on(TRTC.EVENT.REMOTE_AUDIO_UNAVAILABLE, ({ userId }: { userId: string }) => {
      const p = this.participants.get(userId)
      if (p) { p.audioEnabled = false; this.participants.set(userId, p) }
      this.emit('audioStateChanged', userId, false)
    })

    this.client.on(TRTC.EVENT.REMOTE_VIDEO_AVAILABLE, ({ userId, streamType }: { userId: string; streamType: string }) => {
      const p = this.participants.get(userId)
      if (p) { p.videoEnabled = true; this.participants.set(userId, p) }
      this.emit('videoStateChanged', userId, true)
      // Subscribe to remote video — actual rendering done by playRemoteVideo()
      this.client.startRemoteVideo({ userId, streamType, view: null }).catch(() => {})
    })

    this.client.on(TRTC.EVENT.REMOTE_VIDEO_UNAVAILABLE, ({ userId }: { userId: string }) => {
      const p = this.participants.get(userId)
      if (p) { p.videoEnabled = false; this.participants.set(userId, p) }
      this.emit('videoStateChanged', userId, false)
    })

    this.client.on(TRTC.EVENT.AUDIO_VOLUME, ({ result }: { result: Array<{ userId: string; volume: number }> }) => {
      result?.forEach(({ userId, volume }: { userId: string; volume: number }) => {
        const p = this.participants.get(userId)
        if (p) { p.audioLevel = volume; this.participants.set(userId, p) }
        this.emit('audioLevelChanged', userId || 'local', volume)
      })
    })

    this.client.on(TRTC.EVENT.NETWORK_QUALITY, ({ uplinkNetworkQuality, downlinkNetworkQuality }: any) => {
      this.emit('networkQualityChanged', 'local', uplinkNetworkQuality, downlinkNetworkQuality)
    })

    this.client.on(TRTC.EVENT.CONNECTION_STATE_CHANGED, ({ prevState, curState }: any) => {
      const map: Record<string, RTCConnectionState> = {
        CONNECTING: 'connecting',
        CONNECTED: 'connected',
        DISCONNECTED: 'disconnected',
        RECONNECTING: 'reconnecting',
      }
      this.emit('connectionStateChanged', map[curState] || 'disconnected')
    })

    this.client.on(TRTC.EVENT.ERROR, ({ code, message }: any) => {
      this.emit('error', message || 'TRTC error', code)
    })
  }

  async enableCamera(deviceId?: string): Promise<void> {
    const opts: any = deviceId ? { option: { cameraId: deviceId } } : {}
    if (this.localVideoEl) opts.view = this.localVideoEl
    await this.client.startLocalVideo(opts)
    this._cameraEnabled = true
    this.emit('videoStateChanged', 'local', true)
  }

  async disableCamera(): Promise<void> {
    await this.client.stopLocalVideo()
    this._cameraEnabled = false
    this.emit('videoStateChanged', 'local', false)
  }

  async enableMicrophone(deviceId?: string): Promise<void> {
    const opts: any = deviceId ? { option: { microphoneId: deviceId } } : {}
    await this.client.startLocalAudio(opts)
    this._micEnabled = true
    this.emit('audioStateChanged', 'local', true)
  }

  async disableMicrophone(): Promise<void> {
    await this.client.stopLocalAudio()
    this._micEnabled = false
    this.emit('audioStateChanged', 'local', false)
  }

  async switchCamera(deviceId: string): Promise<void> {
    await this.client.updateLocalVideo({ option: { cameraId: deviceId } })
  }

  async switchMicrophone(deviceId: string): Promise<void> {
    await this.client.updateLocalAudio({ option: { microphoneId: deviceId } })
  }

  async setSpeaker(deviceId: string): Promise<void> {
    try {
      await this.client.setAudioPlaybackDevice(deviceId)
    } catch {
      // Not available in all environments
    }
  }

  async enableNoiseSuppression(enabled: boolean): Promise<void> {
    await this.client.updateLocalAudio({ option: { ANS: enabled } })
  }

  async setVideoProfile(profile: 'low' | 'medium' | 'high'): Promise<void> {
    const map = { low: '480p', medium: '720p', high: '1080p' }
    await this.client.updateLocalVideo({ option: { profile: map[profile] } })
  }

  async startScreenShare(): Promise<void> {
    await this.client.startScreenShare()
    this._screenSharing = true
    this.emit('screenShareStarted', 'local')
  }

  async stopScreenShare(): Promise<void> {
    if (!this._screenSharing) return
    await this.client.stopScreenShare()
    this._screenSharing = false
    this.emit('screenShareStopped', 'local')
  }

  async getCameras(): Promise<DeviceInfo[]> {
    try {
      const list = await TRTC.getCameraList()
      return list.map((d: any) => ({ deviceId: d.deviceId, label: d.label, kind: 'videoinput' as const }))
    } catch { return [] }
  }

  async getMicrophones(): Promise<DeviceInfo[]> {
    try {
      const list = await TRTC.getMicrophoneList()
      return list.map((d: any) => ({ deviceId: d.deviceId, label: d.label, kind: 'audioinput' as const }))
    } catch { return [] }
  }

  async getSpeakers(): Promise<DeviceInfo[]> {
    try {
      const list = await TRTC.getSpeakerList()
      return list.map((d: any) => ({ deviceId: d.deviceId, label: d.label, kind: 'audiooutput' as const }))
    } catch { return [] }
  }

  playRemoteVideo(userId: string, element: HTMLElement): void {
    this.client.startRemoteVideo({ userId, streamType: 'main', view: element }).catch(() => {})
  }

  playLocalVideo(element: HTMLElement): void {
    this.localVideoEl = element
    if (this._cameraEnabled) {
      this.client.updateLocalVideo({ view: element }).catch(() => {})
    }
  }

  getParticipants(): RTCParticipant[] {
    return Array.from(this.participants.values())
  }

  isCameraEnabled(): boolean { return this._cameraEnabled }
  isMicrophoneEnabled(): boolean { return this._micEnabled }
  isScreenSharing(): boolean { return this._screenSharing }

  private _buildParticipant(userId: string): RTCParticipant {
    return {
      userId,
      displayName: userId,
      isLocal: false,
      audioEnabled: false,
      videoEnabled: false,
      isScreenSharing: false,
      audioLevel: 0,
      networkQuality: 0,
    }
  }
}

/**
 * TRTC roomId must be a positive integer (1–4294967295).
 * If the room ID is already numeric, use it directly.
 * Otherwise hash the string to a stable number in that range.
 */
function toNumericRoomId(roomId: string): number {
  const n = Number(roomId)
  if (!isNaN(n) && n > 0 && Number.isInteger(n)) return n
  // djb2 hash → clamp to [1, 4294967295]
  let hash = 5381
  for (let i = 0; i < roomId.length; i++) {
    hash = ((hash << 5) + hash) ^ roomId.charCodeAt(i)
    hash = hash >>> 0  // keep unsigned 32-bit
  }
  return (hash % 4294967294) + 1  // ensure >= 1
}
