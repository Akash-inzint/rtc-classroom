import { useCallback, useEffect, useRef } from 'react'
import type { RTCParticipant } from '../rtc/IRTCProvider'
import { VideoPlaceholder } from './VideoPlaceholder'
import { useRTCContext } from '../rtc/RTCContext'
import { useRoomStore } from '../store/roomStore'

interface Props {
  participant: RTCParticipant
  isPinned?: boolean
  onPin?: (userId: string) => void
}

export function VideoTile({ participant, isPinned, onPin }: Props) {
  const { provider } = useRTCContext()
  const { activeSpeakerId, handRaises } = useRoomStore()
  const providerRef = useRef(provider)
  const participantRef = useRef(participant)
  providerRef.current = provider
  participantRef.current = participant

  const isActive = activeSpeakerId === participant.userId
  const hasHandRaised = handRaises.includes(participant.userId)

  // Callback ref: fires whenever the element is mounted/unmounted, so video
  // re-attaches correctly when the tile moves between grid and speaker view.
  const videoRef = useCallback((el: HTMLDivElement | null) => {
    if (!el || !providerRef.current) return
    const p = participantRef.current
    if (p.isLocal) {
      providerRef.current.playLocalVideo(el)
    } else if (p.videoEnabled) {
      providerRef.current.playRemoteVideo(p.userId, el)
    }
  }, []) // stable — provider/participant accessed via refs

  // Re-attach when videoEnabled flips to true (element already mounted)
  const elRef = useRef<HTMLDivElement | null>(null)
  const setRef = useCallback((el: HTMLDivElement | null) => {
    elRef.current = el
    videoRef(el)
  }, [videoRef])

  useEffect(() => {
    if (!provider || !elRef.current || !participant.videoEnabled) return
    if (participant.isLocal) {
      provider.playLocalVideo(elRef.current)
    } else {
      provider.playRemoteVideo(participant.userId, elRef.current)
    }
  }, [provider, participant.userId, participant.isLocal, participant.videoEnabled])

  const networkBars = (quality: number) => {
    const filled = Math.max(0, 4 - Math.floor(quality * 4 / 6))
    const colors = quality <= 2 ? 'bg-green-400' : quality <= 4 ? 'bg-yellow-400' : 'bg-red-400'
    return (
      <div className="flex items-end gap-0.5 h-3">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`w-1 rounded-sm ${i <= filled ? colors : 'bg-gray-600'}`}
            style={{ height: `${i * 3}px` }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`relative w-full h-full rounded-xl overflow-hidden bg-gray-900 cursor-pointer group
        ${isActive ? 'ring-2 ring-blue-400' : 'ring-1 ring-gray-700'}
        ${isPinned ? 'ring-2 ring-yellow-400' : ''}`}
      onClick={() => onPin?.(participant.userId)}
    >
      {/* Video container — always in DOM so SDK can attach; hidden via CSS when off */}
      <div
        ref={setRef}
        className="absolute inset-0"
        style={{ display: participant.videoEnabled ? 'block' : 'none' }}
      />
      {!participant.videoEnabled && <VideoPlaceholder displayName={participant.displayName} />}

      {/* Bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Hand raise */}
          {hasHandRaised && (
            <span className="text-sm">✋</span>
          )}
          {/* Name */}
          <span className="text-white text-xs font-medium truncate">
            {participant.displayName}
            {participant.isLocal && ' (You)'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Network quality */}
          {networkBars(participant.networkQuality)}

          {/* Mic state */}
          {participant.audioEnabled ? (
            <AudioLevelIcon level={participant.audioLevel} />
          ) : (
            <MicOffIcon />
          )}

          {/* Camera off */}
          {!participant.videoEnabled && (
            <span title="Camera off">
              <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98zm-2-.79V18H4V6h12v3.69z"/>
                <path d="M2 4l16 16 1.41-1.41L3.41 2.59 2 4z"/>
              </svg>
            </span>
          )}
        </div>
      </div>

      {/* Screen share badge */}
      {participant.isScreenSharing && (
        <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">
          Sharing
        </div>
      )}

      {/* Pin button on hover */}
      <button
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white p-1 rounded"
        onClick={(e) => { e.stopPropagation(); onPin?.(participant.userId) }}
        title={isPinned ? 'Unpin' : 'Pin'}
      >
        {isPinned ? '📌' : '📍'}
      </button>
    </div>
  )
}

function AudioLevelIcon({ level }: { level: number }) {
  const active = level > 10
  return (
    <svg className={`w-3.5 h-3.5 ${active ? 'text-green-400' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
    </svg>
  )
}

function MicOffIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V20c0 .55.45 1 1 1s1-.45 1-1v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
    </svg>
  )
}
