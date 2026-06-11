import type { IRTCProvider } from './IRTCProvider'
import type { RTCProviderName } from '../config/env'

export async function createRTCProvider(name: RTCProviderName): Promise<IRTCProvider> {
  if (name === 'trtc') {
    const { TRTCAdapter } = await import('./adapters/TRTCAdapter')
    return new TRTCAdapter()
  } else {
    const { AgoraAdapter } = await import('./adapters/AgoraAdapter')
    return new AgoraAdapter()
  }
}

export function clearProviderCache(): void { /* no-op */ }
