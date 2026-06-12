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
    updateParticipant, setLocalParticipant, setActiveSpeaker, sendMessage,
    toggleSidebar,
  } = useRoomStore()
  const {
    setCameraEnabled, setMicEnabled, setScreenSharing,
    setConnectionState, setNetworkQuality,
  } = useMediaStore()

  useEffect(() => {
    if (!provider) return

    setRoom(roomId, userId, displayName)
    setLocalParticipant({ videoEnabled: enableCamera, audioEnabled: enableMic })

    const onUserJoined = (p: any) => addParticipant({ ...p, displayName: p.displayName || p.userId })
    const onUserLeft = (uid: string) => removeParticipant(uid)
    const onAudioState = (uid: string, enabled: boolean) => {
      if (uid === 'local') setLocalParticipant({ audioEnabled: enabled })
      else updateParticipant(uid, { audioEnabled: enabled })
    }
    const onVideoState = (uid: string, enabled: boolean) => {
      if (uid === 'local') setLocalParticipant({ videoEnabled: enabled })
      else updateParticipant(uid, { videoEnabled: enabled })
    }
    const onScreenShareStart = (uid: string) => updateParticipant(uid, { isScreenSharing: true })
    const onScreenShareStop = (uid: string) => updateParticipant(uid, { isScreenSharing: false })
    const onAudioLevel = (uid: string, level: number) => {
      const targetId = uid === 'local' ? userId : uid
      updateParticipant(targetId, { audioLevel: level })
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
    const onChatMessage = (fromUserId: string, fromDisplayName: string, text: string) => {
      sendMessage(fromUserId, fromDisplayName, text)
    }

    provider.on('userJoined', onUserJoined)
    provider.on('userLeft', onUserLeft)
    provider.on('audioStateChanged', onAudioState)
    provider.on('videoStateChanged', onVideoState)
    provider.on('screenShareStarted', onScreenShareStart)
    provider.on('screenShareStopped', onScreenShareStop)
    provider.on('audioLevelChanged', onAudioLevel)
    provider.on('networkQualityChanged', onNetworkQuality)
    provider.on('connectionStateChanged', onConnectionState)
    provider.on('chatMessage', onChatMessage)
    provider.on('error', onError)

    async function join() {
      let token: string
      let appId: string | number

      if (providerName === 'trtc') {
        appId = env.trtc.sdkAppId
        token = env.trtc.secretKey
          ? await genTRTCUserSig(env.trtc.sdkAppId, env.trtc.secretKey, userId)
          : env.trtc.userSig
      } else {
        appId = env.agora.appId
        if (env.agora.appCertificate) {
          const res = await fetch(`/api/agora-token?channel=${encodeURIComponent(roomId)}&uid=`)
          const data = await res.json()
          if (data.error) throw new Error('Token fetch failed: ' + data.error)
          token = data.token
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
      provider.off('chatMessage', onChatMessage)
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
    // 100dvh accounts for mobile browser address bar
    <div className="flex flex-col bg-gray-950 overflow-hidden" style={{ height: '100dvh' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-white text-sm font-medium truncate">Room: {roomId}</span>
          <span className="text-gray-500 text-xs flex-shrink-0">· {participants.length}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
          providerName === 'agora' ? 'bg-blue-700/40 text-blue-300' : 'bg-orange-700/40 text-orange-300'
        }`}>
          {providerName === 'agora' ? 'Agora' : 'TRTC'}
        </span>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Video area */}
        <div className="flex-1 overflow-hidden" style={{ minWidth: 0 }}>
          {layoutMode === 'grid'
            ? <GridView participants={participants} />
            : <SpeakerView participants={participants} />
          }
        </div>

        {/* Sidebar — overlays on mobile, fixed panel on desktop */}
        {isSidebarOpen && (
          <>
            {/* Mobile overlay backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-20 md:hidden"
              onClick={() => toggleSidebar()}
            />
            <div className="
              fixed inset-y-0 right-0 z-30 w-full max-w-xs
              md:relative md:inset-auto md:z-auto md:w-72 md:flex-shrink-0
              bg-gray-900 border-l border-gray-800 flex flex-col
            ">
              {/* Mobile close button */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 md:hidden">
                <span className="text-white text-sm font-medium capitalize">{sidebarTab}</span>
                <button onClick={() => toggleSidebar()} className="text-gray-400 p-1">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
              {sidebarTab === 'participants' ? <ParticipantPanel /> : <ChatPanel />}
            </div>
          </>
        )}
      </div>

      {/* Control bar */}
      <div className="flex-shrink-0">
        <ControlBar onLeave={handleLeave} />
      </div>
    </div>
  )
}
