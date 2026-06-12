import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  ICameraVideoTrack,
  ILocalVideoTrack,
  IRemoteVideoTrack,
} from 'agora-rtc-sdk-ng'
import type {
  IRTCProvider,
  JoinConfig,
  DeviceInfo,
  RTCParticipant,
  RTCEvent,
  RTCEventHandlers,
  RTCConnectionState,
} from '../IRTCProvider'

export class AgoraAdapter implements IRTCProvider {
  readonly providerName = 'agora' as const

  private client!: IAgoraRTCClient
  private screenClient: IAgoraRTCClient | null = null
  private localAudioTrack: IMicrophoneAudioTrack | null = null
  private localVideoTrack: ICameraVideoTrack | null = null
  private localScreenTrack: ILocalVideoTrack | null = null
  private participants = new Map<string, RTCParticipant>()
  private handlers = new Map<string, Set<Function>>()
  private appId = ''
  private channelName = ''
  private userId = ''
  private noiseSuppression = true
  private _cameraEnabled = false
  private _micEnabled = false

  async initialize(): Promise<void> {
    this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp9' })
    AgoraRTC.setLogLevel(4) // NONE — suppress all SDK logs
    this._bindClientEvents()
  }

  async joinRoom(config: JoinConfig): Promise<void> {
    this.appId = config.appId as string
    this.channelName = config.roomId
    this.userId = config.userId

    // Join + create tracks in parallel for faster join
    const [micTrack, camTrack] = await Promise.all([
      this.client.join(this.appId, this.channelName, config.token || null, config.userId).then(() => null),
      config.enableMic ? AgoraRTC.createMicrophoneAudioTrack({ AEC: true, ANS: this.noiseSuppression, AGC: true }) : Promise.resolve(null),
      config.enableCamera ? AgoraRTC.createCameraVideoTrack({ encoderConfig: '720p_2' }) : Promise.resolve(null),
    ]).then(([, mic, cam]) => [mic, cam] as [IMicrophoneAudioTrack | null, ICameraVideoTrack | null])

    if (micTrack) { this.localAudioTrack = micTrack; this._micEnabled = true }
    if (camTrack) { this.localVideoTrack = camTrack; this._cameraEnabled = true }

    const tracksToPublish = [micTrack, camTrack].filter(Boolean) as (IMicrophoneAudioTrack | ICameraVideoTrack)[]
    if (tracksToPublish.length > 0) {
      await this.client.publish(tracksToPublish)
    }

    // Stream channel for chat messages
    try {
      await (this.client as any).enableStreamMessage()
    } catch { /* ignore if not supported */ }

    ;(this.client as any).on?.('stream-message', (_uid: any, payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload))
        if (data.type === 'chat') {
          this.emit('chatMessage', data.userId, data.displayName, data.text)
        }
      } catch { /* ignore */ }
    })

    // Pick up anyone already in the channel before we joined
    for (const user of this.client.remoteUsers) {
      const userId = String(user.uid)
      const p = this._buildParticipant(userId)

      if (user.hasAudio) {
        await this.client.subscribe(user, 'audio').catch(() => {})
        user.audioTrack?.play()
        p.audioEnabled = true
      }
      if (user.hasVideo) {
        await this.client.subscribe(user, 'video').catch(() => {})
        p.videoEnabled = true
      }

      this.participants.set(userId, p)
      this.emit('userJoined', p)
      if (p.audioEnabled) this.emit('audioStateChanged', userId, true)
      if (p.videoEnabled) this.emit('videoStateChanged', userId, true)
    }

    this.client.enableAudioVolumeIndicator()
  }

  async leaveRoom(): Promise<void> {
    try { await this.stopScreenShare() } catch { /* ignore */ }
    this.localAudioTrack?.close()
    this.localVideoTrack?.close()
    this.localAudioTrack = null
    this.localVideoTrack = null
    this._cameraEnabled = false
    this._micEnabled = false
    this.participants.clear()
    await this.client?.leave()
  }

  async destroy(): Promise<void> {
    await this.leaveRoom()
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
    this.client.on('user-joined', (user) => {
      const p = this._buildParticipant(String(user.uid))
      this.participants.set(p.userId, p)
      this.emit('userJoined', p)
    })

    this.client.on('user-left', (user) => {
      const userId = String(user.uid)
      this.participants.delete(userId)
      this.emit('userLeft', userId)
    })

    this.client.on('user-published', async (user, mediaType) => {
      await this.client.subscribe(user, mediaType)
      const userId = String(user.uid)
      const isScreenShare = userId.endsWith('-screen')
      const p = this.participants.get(userId) || this._buildParticipant(userId)

      if (mediaType === 'audio') {
        user.audioTrack?.play()
        p.audioEnabled = true
        this.participants.set(userId, p)
        this.emit('audioStateChanged', userId, true)
      } else {
        p.videoEnabled = true
        this.participants.set(userId, p)
        this.emit('videoStateChanged', userId, true)
        if (isScreenShare) this.emit('screenShareStarted', userId)
      }

      // Ensure participant is in the list
      if (!this.participants.has(userId)) {
        this.participants.set(userId, p)
        this.emit('userJoined', p)
      }
    })

    this.client.on('user-unpublished', (user, mediaType) => {
      const userId = String(user.uid)
      const p = this.participants.get(userId)
      if (!p) return

      if (mediaType === 'audio') {
        p.audioEnabled = false
        this.emit('audioStateChanged', userId, false)
      } else {
        p.videoEnabled = false
        this.emit('videoStateChanged', userId, false)
      }
      this.participants.set(userId, p)
    })

    this.client.on('volume-indicator', (volumes) => {
      volumes.forEach(({ uid, level }) => {
        const userId = String(uid)
        const p = this.participants.get(userId)
        if (p) { p.audioLevel = level; this.participants.set(userId, p) }
        this.emit('audioLevelChanged', userId, level)
      })
    })

    this.client.on('network-quality', (stats) => {
      this.emit('networkQualityChanged', 'local', stats.uplinkNetworkQuality, stats.downlinkNetworkQuality)
    })

    this.client.on('connection-state-change', (state) => {
      const map: Record<string, RTCConnectionState> = {
        CONNECTING: 'connecting',
        CONNECTED: 'connected',
        DISCONNECTED: 'disconnected',
        RECONNECTING: 'reconnecting',
      }
      this.emit('connectionStateChanged', map[state] || 'disconnected')
    })
  }

  // Mic toggle — unpublish/republish so remote users see the state change
  async enableMicrophone(deviceId?: string): Promise<void> {
    if (!this.localAudioTrack) {
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack(
        deviceId ? { microphoneId: deviceId } : { AEC: true, ANS: this.noiseSuppression, AGC: true }
      )
    }
    await this.client.publish([this.localAudioTrack])
    this._micEnabled = true
    this.emit('audioStateChanged', 'local', true)
  }

  async disableMicrophone(): Promise<void> {
    if (this.localAudioTrack) {
      await this.client.unpublish([this.localAudioTrack])
    }
    this._micEnabled = false
    this.emit('audioStateChanged', 'local', false)
  }

  // Camera toggle — unpublish/republish so remote users see the state change
  async enableCamera(deviceId?: string): Promise<void> {
    if (!this.localVideoTrack) {
      this.localVideoTrack = await AgoraRTC.createCameraVideoTrack(
        deviceId ? { cameraId: deviceId } : { encoderConfig: '720p_2' }
      )
    }
    await this.client.publish([this.localVideoTrack])
    this._cameraEnabled = true
    this.emit('videoStateChanged', 'local', true)
  }

  async disableCamera(): Promise<void> {
    if (this.localVideoTrack) {
      await this.client.unpublish([this.localVideoTrack])
    }
    this._cameraEnabled = false
    this.emit('videoStateChanged', 'local', false)
  }

  async switchCamera(deviceId: string): Promise<void> {
    await this.localVideoTrack?.setDevice(deviceId)
  }

  async switchMicrophone(deviceId: string): Promise<void> {
    await this.localAudioTrack?.setDevice(deviceId)
  }

  async setSpeaker(deviceId: string): Promise<void> {
    document.querySelectorAll('audio').forEach((el: HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) => {
      el.setSinkId?.(deviceId)
    })
  }

  async enableNoiseSuppression(enabled: boolean): Promise<void> {
    this.noiseSuppression = enabled
    if (this.localAudioTrack) {
      try { await (this.localAudioTrack as any).setAINSMode(enabled ? 'STATIONARY' : 'NONE') } catch { /* ignore */ }
    }
  }

  async setVideoProfile(profile: 'low' | 'medium' | 'high'): Promise<void> {
    const map = { low: '360p_7', medium: '720p_2', high: '1080p_2' } as const
    await this.localVideoTrack?.setEncoderConfiguration(map[profile])
  }

  async startScreenShare(): Promise<void> {
    this.screenClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp9' })
    const screenToken = await this._fetchToken(`${this.userId}-screen`)
    await this.screenClient.join(this.appId, this.channelName, screenToken, `${this.userId}-screen`)

    const result = await AgoraRTC.createScreenVideoTrack({ optimizationMode: 'detail' }, 'disable')
    this.localScreenTrack = Array.isArray(result) ? result[0] : result as ILocalVideoTrack
    await this.screenClient.publish([this.localScreenTrack!])
    this.localScreenTrack!.on('track-ended', () => { this.stopScreenShare() })
    this.emit('screenShareStarted', 'local')
  }

  async stopScreenShare(): Promise<void> {
    if (!this.screenClient) return
    try {
      if (this.localScreenTrack) {
        await this.screenClient.unpublish([this.localScreenTrack])
        this.localScreenTrack.close()
        this.localScreenTrack = null
      }
      await this.screenClient.leave()
    } finally {
      this.screenClient = null
    }
    this.emit('screenShareStopped', 'local')
  }

  async sendChatMessage(userId: string, displayName: string, text: string): Promise<void> {
    try {
      const payload = new TextEncoder().encode(JSON.stringify({ type: 'chat', userId, displayName, text }))
      await (this.client as any).sendStreamMessage(payload)
    } catch { /* ignore */ }
  }

  async getCameras(): Promise<DeviceInfo[]> {
    const list = await AgoraRTC.getCameras()
    return list.map(d => ({ deviceId: d.deviceId, label: d.label, kind: 'videoinput' as const }))
  }

  async getMicrophones(): Promise<DeviceInfo[]> {
    const list = await AgoraRTC.getMicrophones()
    return list.map(d => ({ deviceId: d.deviceId, label: d.label, kind: 'audioinput' as const }))
  }

  async getSpeakers(): Promise<DeviceInfo[]> {
    try {
      const list = await AgoraRTC.getPlaybackDevices()
      return list.map(d => ({ deviceId: d.deviceId, label: d.label, kind: 'audiooutput' as const }))
    } catch { return [] }
  }

  playRemoteVideo(userId: string, element: HTMLElement): void {
    const remoteUsers = this.client.remoteUsers
    const user = remoteUsers.find(u => String(u.uid) === userId)
    if (user?.videoTrack) {
      (user.videoTrack as IRemoteVideoTrack).play(element)
    }
  }

  playLocalVideo(element: HTMLElement): void {
    this.localVideoTrack?.play(element)
  }

  getParticipants(): RTCParticipant[] {
    return Array.from(this.participants.values())
  }

  isCameraEnabled(): boolean { return this._cameraEnabled }
  isMicrophoneEnabled(): boolean { return this._micEnabled }
  isScreenSharing(): boolean { return this.screenClient !== null }

  private async _fetchToken(uid: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/agora-token?channel=${encodeURIComponent(this.channelName)}&uid=${encodeURIComponent(uid)}`)
      const data = await res.json()
      return data.token || null
    } catch { return null }
  }

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
