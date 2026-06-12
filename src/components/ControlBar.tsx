import { useState } from 'react'
import { useRTCContext } from '../rtc/RTCContext'
import { useMediaStore } from '../store/mediaStore'
import { useRoomStore } from '../store/roomStore'
import { DeviceSelector } from './DeviceSelector'
import { env } from '../config/env'

interface Props {
  onLeave: () => void
}

export function ControlBar({ onLeave }: Props) {
  const { provider } = useRTCContext()
  const {
    cameraEnabled, micEnabled, screenSharing, noiseSuppression,
    setCameraEnabled, setMicEnabled, setScreenSharing, connectionState,
    localNetworkUplink,
  } = useMediaStore()
  const { layoutMode, setLayoutMode, localUserId, localDisplayName, raiseHand, lowerHand, handRaises, toggleSidebar, unreadCount } = useRoomStore()

  const [showDevices, setShowDevices] = useState(false)
  const [handRaised, setHandRaised] = useState(false)

  const toggleMic = async () => {
    if (micEnabled) { await provider?.disableMicrophone(); setMicEnabled(false) }
    else { await provider?.enableMicrophone(); setMicEnabled(true) }
  }

  const toggleCamera = async () => {
    if (cameraEnabled) { await provider?.disableCamera(); setCameraEnabled(false) }
    else { await provider?.enableCamera(); setCameraEnabled(true) }
  }

  const toggleScreenShare = async () => {
    if (screenSharing) { await provider?.stopScreenShare(); setScreenSharing(false) }
    else {
      try { await provider?.startScreenShare(); setScreenSharing(true) }
      catch { /* cancelled */ }
    }
  }

  const toggleHandRaise = () => {
    if (handRaised) { lowerHand(localUserId); setHandRaised(false) }
    else { raiseHand(localUserId); setHandRaised(true) }
  }

  const networkLabel =
    connectionState === 'reconnecting' ? '⟳' :
    connectionState === 'disconnected' ? '⚠' :
    localNetworkUplink === 0 ? '—' :
    localNetworkUplink <= 2 ? '▲ Good' :
    localNetworkUplink <= 4 ? '▲ Fair' : '▲ Poor'

  const networkColor =
    localNetworkUplink === 0 ? 'text-gray-400' :
    localNetworkUplink <= 2 ? 'text-green-400' :
    localNetworkUplink <= 4 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="relative bg-gray-900 border-t border-gray-700 px-2 py-2">
      {/* Single row on desktop, two rows on mobile */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">

        {/* Row 1 (mobile) / Left (desktop): status */}
        <div className="flex items-center justify-between md:justify-start gap-2 md:min-w-[130px]">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              env.rtcProvider === 'agora' ? 'bg-blue-700 text-blue-100' : 'bg-orange-700 text-orange-100'
            }`}>
              {env.rtcProvider === 'agora' ? 'Agora' : 'TRTC'}
            </span>
            <span className={`text-xs ${networkColor} hidden sm:inline`}>{networkLabel}</span>
          </div>
          {/* Leave button shown inline on mobile row 1 */}
          <button
            onClick={onLeave}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-medium text-sm transition-colors md:hidden"
          >
            Leave
          </button>
        </div>

        {/* Row 2 (mobile) / Center (desktop): primary controls */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <Btn active={micEnabled} onColor="bg-gray-700" offColor="bg-red-600" onClick={toggleMic} title={micEnabled ? 'Mute' : 'Unmute'}>
            {micEnabled ? <MicOnIcon /> : <MicOffIcon />}
          </Btn>
          <Btn active={cameraEnabled} onColor="bg-gray-700" offColor="bg-red-600" onClick={toggleCamera} title={cameraEnabled ? 'Camera off' : 'Camera on'}>
            {cameraEnabled ? <CamOnIcon /> : <CamOffIcon />}
          </Btn>
          {/* Screen share — hide on mobile (not supported) */}
          <Btn active={!screenSharing} onColor="bg-gray-700" offColor="bg-blue-600" onClick={toggleScreenShare} title={screenSharing ? 'Stop sharing' : 'Share screen'} className="hidden sm:flex">
            <ScreenShareIcon active={screenSharing} />
          </Btn>
          <Btn active={layoutMode === 'grid'} onColor="bg-gray-700" offColor="bg-purple-600" onClick={() => setLayoutMode(layoutMode === 'grid' ? 'speaker' : 'grid')} title="Toggle layout">
            {layoutMode === 'grid' ? <GridIcon /> : <SpeakerIcon />}
          </Btn>
          <Btn active={!handRaised} onColor="bg-gray-700" offColor="bg-yellow-500" onClick={toggleHandRaise} title={handRaised ? 'Lower hand' : 'Raise hand'}>
            <span className="text-base leading-none">✋</span>
          </Btn>
          {/* Leave button on desktop */}
          <button
            onClick={onLeave}
            className="hidden md:block bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors ml-1"
          >
            Leave
          </button>
        </div>

        {/* Right (desktop only): panels + settings */}
        <div className="hidden md:flex items-center gap-2 min-w-[130px] justify-end">
          <Btn active onColor="bg-gray-700" offColor="bg-gray-700" onClick={() => toggleSidebar('participants')} title="Participants">
            <PeopleIcon />
          </Btn>
          <Btn active onColor="bg-gray-700" offColor="bg-gray-700" onClick={() => toggleSidebar('chat')} title="Chat">
            <div className="relative">
              <ChatIcon />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          </Btn>
          <Btn active onColor="bg-gray-700" offColor="bg-gray-700" onClick={() => setShowDevices(v => !v)} title="Settings">
            <SettingsIcon />
          </Btn>
        </div>

        {/* Mobile bottom row: panel buttons */}
        <div className="flex items-center justify-center gap-1.5 md:hidden">
          <Btn active onColor="bg-gray-700" offColor="bg-gray-700" onClick={() => toggleSidebar('participants')} title="Participants">
            <PeopleIcon />
          </Btn>
          <Btn active onColor="bg-gray-700" offColor="bg-gray-700" onClick={() => toggleSidebar('chat')} title="Chat">
            <div className="relative">
              <ChatIcon />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          </Btn>
          <Btn active onColor="bg-gray-700" offColor="bg-gray-700" onClick={() => setShowDevices(v => !v)} title="Settings">
            <SettingsIcon />
          </Btn>
        </div>
      </div>

      {showDevices && <DeviceSelector onClose={() => setShowDevices(false)} />}
    </div>
  )
}

function Btn({
  active, onColor, offColor, onClick, title, children, className = '',
}: {
  active: boolean
  onColor: string
  offColor: string
  onClick: () => void
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors flex items-center justify-center text-white ${active ? onColor : offColor} ${className}`}
    >
      {children}
    </button>
  )
}

const s = 'w-5 h-5'
function MicOnIcon() { return <svg className={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg> }
function MicOffIcon() { return <svg className={s} viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V20c0 .55.45 1 1 1s1-.45 1-1v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg> }
function CamOnIcon() { return <svg className={s} viewBox="0 0 24 24" fill="currentColor"><path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98z"/></svg> }
function CamOffIcon() { return <svg className={s} viewBox="0 0 24 24" fill="currentColor"><path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98zm-2-.79V18H4V6h12v3.69z"/><path d="M2 4l16 16 1.41-1.41L3.41 2.59 2 4z"/></svg> }
function ScreenShareIcon({ active }: { active: boolean }) { return <svg className={s} viewBox="0 0 24 24" fill="currentColor"><path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zm-7-3.53v-2.19c-2.78.48-4.34 1.71-5.5 3.72.14-1.4.59-4.5 3.5-5.99v-2.27l4 3.44-2 3.29z"/></svg> }
function GridIcon() { return <svg className={s} viewBox="0 0 24 24" fill="currentColor"><path d="M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z"/></svg> }
function SpeakerIcon() { return <svg className={s} viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM8 15c0-1.66 1.34-3 3-3 .35 0 .69.07 1 .18V6h5v2h-3v7.03c-.02 1.64-1.35 2.97-3 2.97-1.66 0-3-1.34-3-3z"/></svg> }
function PeopleIcon() { return <svg className={s} viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg> }
function ChatIcon() { return <svg className={s} viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg> }
function SettingsIcon() { return <svg className={s} viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg> }
