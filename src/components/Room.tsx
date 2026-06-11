import { useEffect } from 'react'
import { useRTCContext } from '../rtc/RTCContext'
import { useRoomStore } from '../store/roomStore'
import { useMediaStore } from '../store/mediaStore'
import { GridView } from './layout/GridView'
import { SpeakerView } from './layout/SpeakerView'
import { ControlBar } from './ControlBar'
import { ParticipantPanel } from './ParticipantPanel'
import { ChatPanel } from './ChatPanel'
import { env } from '../config/env'
import { genTRTCUserSig } from '../config/trtcUserSig'


interface Props {
  roomId: string
  userId: string
  displayName: string
  enableCamera: boolean
  enableMic: boolean
  onLeave: () => void
}

export function Room({ roomId, userId, displayName, enableCamera, enableMic, onLeave }: Props) {
  const { provider, providerName } = useRTCContext()
  const {
    participants, layoutMode, isSidebarOpen, sidebarTab,
    setRoom, leaveRoom: clearRoom, addParticipant, removeParticipant,
    updateParticipant, setLocalParticipant, setActiveSpeaker,
  } = useRoomStore()
  const {
    setCameraEnabled, setMicEnabled, setScreenSharing,
    setConnectionState, setNetworkQuality,
  } = useMediaStore()

  // Join the room and wire all provider events
  useEffect(() => {
    if (!provider) return

    setRoom(roomId, userId, displayName)
    setLocalParticipant({ videoEnabled: enableCamera, audioEnabled: enableMic })

    // Wire events
    const onUserJoined = (p: any) => {
      addParticipant({ ...p, displayName: p.displayName || p.userId })
    }
    const onUserLeft = (uid: string) => removeParticipant(uid)
    const onAudioState = (uid: string, enabled: boolean) => {
      if (uid === 'local') {
        setLocalParticipant({ audioEnabled: enabled })
      } else {
        updateParticipant(uid, { audioEnabled: enabled })
      }
    }
    const onVideoState = (uid: string, enabled: boolean) => {
      if (uid === 'local') {
        setLocalParticipant({ videoEnabled: enabled })
      } else {
        updateParticipant(uid, { videoEnabled: enabled })
      }
    }
    const onScreenShareStart = (uid: string) => updateParticipant(uid, { isScreenSharing: true })
    const onScreenShareStop = (uid: string) => updateParticipant(uid, { isScreenSharing: false })
    const onAudioLevel = (uid: string, level: number) => {
      const targetId = uid === 'local' ? userId : uid
      updateParticipant(targetId, { audioLevel: level })
      // Active speaker: the participant with level > 20
      if (level > 20) setActiveSpeaker(targetId)
    }
    const onNetworkQuality = (uid: string, uplink: number, downlink: number) => {
      if (uid === 'local') {
        setNetworkQuality(uplink, downlink)
        setLocalParticipant({ networkQuality: uplink as any })
      } else {
        updateParticipant(uid, { networkQuality: uplink as any })
      }
    }
    const onConnectionState = (state: any) => setConnectionState(state)
    const onError = (msg: string) => console.error('[RTC]', msg)

    provider.on('userJoined', onUserJoined)
    provider.on('userLeft', onUserLeft)
    provider.on('audioStateChanged', onAudioState)
    provider.on('videoStateChanged', onVideoState)
    provider.on('screenShareStarted', onScreenShareStart)
    provider.on('screenShareStopped', onScreenShareStop)
    provider.on('audioLevelChanged', onAudioLevel)
    provider.on('networkQualityChanged', onNetworkQuality)
    provider.on('connectionStateChanged', onConnectionState)
    provider.on('error', onError)

    // Join the room — generate UserSig dynamically for TRTC if SecretKey is set
    async function join() {
      let token: string
      let appId: string | number

      if (providerName === 'trtc') {
        appId = env.trtc.sdkAppId
        if (env.trtc.secretKey) {
          // Auto-generate UserSig for this userId — no manual token management needed
          token = await genTRTCUserSig(env.trtc.sdkAppId, env.trtc.secretKey, userId)
          console.log('[TRTC] Auto-generated UserSig for userId:', userId)
        } else {
          // Fall back to static UserSig from .env.local
          token = env.trtc.userSig
        }
      } else {
        appId = env.agora.appId
        if (env.agora.appCertificate) {
          const res = await fetch(`/api/agora-token?channel=${encodeURIComponent(roomId)}&uid=${encodeURIComponent(userId)}`)
          const data = await res.json()
          if (data.error) throw new Error('Token fetch failed: ' + data.error)
          token = data.token
          console.log('[Agora] Got token for channel:', roomId)
        } else {
          token = env.agora.token || ''
        }
      }

      await provider!.joinRoom({ roomId, userId, displayName, enableCamera, enableMic, token, appId })
      setConnectionState('connected')
      setCameraEnabled(enableCamera)
      setMicEnabled(enableMic)
    }

    join().catch(err => {
      console.error('[RTC] Join failed:', err)
      alert('Join failed: ' + (err?.message || JSON.stringify(err)))
    })

    return () => {
      provider.off('userJoined', onUserJoined)
      provider.off('userLeft', onUserLeft)
      provider.off('audioStateChanged', onAudioState)
      provider.off('videoStateChanged', onVideoState)
      provider.off('screenShareStarted', onScreenShareStart)
      provider.off('screenShareStopped', onScreenShareStop)
      provider.off('audioLevelChanged', onAudioLevel)
      provider.off('networkQualityChanged', onNetworkQuality)
      provider.off('connectionStateChanged', onConnectionState)
      provider.off('error', onError)
    }
  }, [provider])

  const handleLeave = async () => {
    setConnectionState('disconnected')
    await provider?.leaveRoom()
    setScreenSharing(false)
    setCameraEnabled(false)
    setMicEnabled(false)
    clearRoom()
    onLeave()
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium">Room: {roomId}</span>
          <span className="text-gray-500 text-xs">· {participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          providerName === 'agora' ? 'bg-blue-700/40 text-blue-300' : 'bg-orange-700/40 text-orange-300'
        }`}>
          {providerName === 'agora' ? 'Agora RTC' : 'Tencent TRTC'}
        </span>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video area */}
        <div className="flex-1 overflow-hidden">
          {layoutMode === 'grid'
            ? <GridView participants={participants} />
            : <SpeakerView participants={participants} />
          }
        </div>

        {/* Sidebar */}
        {isSidebarOpen && (
          <div className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col flex-shrink-0">
            {sidebarTab === 'participants'
              ? <ParticipantPanel />
              : <ChatPanel />
            }
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="flex-shrink-0">
        <ControlBar onLeave={handleLeave} />
      </div>
    </div>
  )
}
