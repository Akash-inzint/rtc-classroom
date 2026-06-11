import { create } from 'zustand'
import type { DeviceInfo } from '../rtc/IRTCProvider'

interface MediaState {
  cameraEnabled: boolean
  micEnabled: boolean
  screenSharing: boolean
  noiseSuppression: boolean
  videoProfile: 'low' | 'medium' | 'high'

  cameras: DeviceInfo[]
  microphones: DeviceInfo[]
  speakers: DeviceInfo[]
  selectedCameraId: string
  selectedMicId: string
  selectedSpeakerId: string

  connectionState: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  localNetworkUplink: number
  localNetworkDownlink: number

  setCameraEnabled: (v: boolean) => void
  setMicEnabled: (v: boolean) => void
  setScreenSharing: (v: boolean) => void
  setNoiseSuppression: (v: boolean) => void
  setVideoProfile: (p: 'low' | 'medium' | 'high') => void
  setDevices: (cameras: DeviceInfo[], mics: DeviceInfo[], speakers: DeviceInfo[]) => void
  setSelectedCamera: (id: string) => void
  setSelectedMic: (id: string) => void
  setSelectedSpeaker: (id: string) => void
  setConnectionState: (s: MediaState['connectionState']) => void
  setNetworkQuality: (uplink: number, downlink: number) => void
}

export const useMediaStore = create<MediaState>((set) => ({
  cameraEnabled: true,
  micEnabled: true,
  screenSharing: false,
  noiseSuppression: true,
  videoProfile: 'medium',
  cameras: [],
  microphones: [],
  speakers: [],
  selectedCameraId: '',
  selectedMicId: '',
  selectedSpeakerId: '',
  connectionState: 'idle',
  localNetworkUplink: 0,
  localNetworkDownlink: 0,

  setCameraEnabled: (v) => set({ cameraEnabled: v }),
  setMicEnabled: (v) => set({ micEnabled: v }),
  setScreenSharing: (v) => set({ screenSharing: v }),
  setNoiseSuppression: (v) => set({ noiseSuppression: v }),
  setVideoProfile: (p) => set({ videoProfile: p }),
  setDevices: (cameras, mics, speakers) => set({ cameras, microphones: mics, speakers }),
  setSelectedCamera: (id) => set({ selectedCameraId: id }),
  setSelectedMic: (id) => set({ selectedMicId: id }),
  setSelectedSpeaker: (id) => set({ selectedSpeakerId: id }),
  setConnectionState: (s) => set({ connectionState: s }),
  setNetworkQuality: (uplink, downlink) => set({ localNetworkUplink: uplink, localNetworkDownlink: downlink }),
}))
