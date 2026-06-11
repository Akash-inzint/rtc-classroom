export type RTCProviderName = 'agora' | 'trtc'

export interface DeviceInfo {
  deviceId: string
  label: string
  kind: 'audioinput' | 'audiooutput' | 'videoinput'
}

export interface RTCParticipant {
  userId: string
  displayName: string
  isLocal: boolean
  audioEnabled: boolean
  videoEnabled: boolean
  isScreenSharing: boolean
  audioLevel: number  // 0-100
  networkQuality: 0 | 1 | 2 | 3 | 4 | 5 | 6  // 0=unknown, 1=best, 6=disconnected
  videoElement?: HTMLElement | null
}

export interface JoinConfig {
  roomId: string
  userId: string
  displayName: string
  enableCamera: boolean
  enableMic: boolean
  /** Pre-generated token (Agora RTC token or TRTC UserSig) */
  token: string
  /** App ID / SDK App ID */
  appId: string | number
}

export type RTCConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

export type RTCEvent =
  | 'userJoined'
  | 'userLeft'
  | 'audioStateChanged'
  | 'videoStateChanged'
  | 'screenShareStarted'
  | 'screenShareStopped'
  | 'audioLevelChanged'
  | 'networkQualityChanged'
  | 'connectionStateChanged'
  | 'error'

export type RTCEventHandlers = {
  userJoined: (participant: RTCParticipant) => void
  userLeft: (userId: string) => void
  audioStateChanged: (userId: string, enabled: boolean) => void
  videoStateChanged: (userId: string, enabled: boolean) => void
  screenShareStarted: (userId: string) => void
  screenShareStopped: (userId: string) => void
  audioLevelChanged: (userId: string, level: number) => void
  networkQualityChanged: (userId: string, uplink: number, downlink: number) => void
  connectionStateChanged: (state: RTCConnectionState) => void
  error: (message: string, code?: string | number) => void
}

export interface IRTCProvider {
  readonly providerName: RTCProviderName

  // Lifecycle
  initialize(): Promise<void>
  joinRoom(config: JoinConfig): Promise<void>
  leaveRoom(): Promise<void>
  destroy(): Promise<void>

  // Events
  on<K extends RTCEvent>(event: K, handler: RTCEventHandlers[K]): void
  off<K extends RTCEvent>(event: K, handler: RTCEventHandlers[K]): void

  // Local media
  enableCamera(deviceId?: string): Promise<void>
  disableCamera(): Promise<void>
  enableMicrophone(deviceId?: string): Promise<void>
  disableMicrophone(): Promise<void>
  switchCamera(deviceId: string): Promise<void>
  switchMicrophone(deviceId: string): Promise<void>
  setSpeaker(deviceId: string): Promise<void>
  enableNoiseSuppression(enabled: boolean): Promise<void>
  setVideoProfile(profile: 'low' | 'medium' | 'high'): Promise<void>

  // Screen sharing
  startScreenShare(): Promise<void>
  stopScreenShare(): Promise<void>

  // Device enumeration
  getCameras(): Promise<DeviceInfo[]>
  getMicrophones(): Promise<DeviceInfo[]>
  getSpeakers(): Promise<DeviceInfo[]>

  // Render remote video into a DOM element
  playRemoteVideo(userId: string, element: HTMLElement): void
  playLocalVideo(element: HTMLElement): void

  // State queries
  getParticipants(): RTCParticipant[]
  isCameraEnabled(): boolean
  isMicrophoneEnabled(): boolean
  isScreenSharing(): boolean
}
