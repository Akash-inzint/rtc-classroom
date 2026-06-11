import { useRoomStore } from '../store/roomStore'

export function ParticipantPanel() {
  const { participants, handRaises, localUserId, lowerHand } = useRoomStore()

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
        <span className="text-white text-sm font-medium">
          Participants ({participants.length})
        </span>
        {handRaises.length > 0 && (
          <span className="text-yellow-400 text-xs">✋ {handRaises.length} raised</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hand raises at the top */}
        {handRaises.length > 0 && (
          <div className="px-3 py-2 border-b border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Raised Hand</p>
            {handRaises.map(userId => {
              const p = participants.find(x => x.userId === userId)
              if (!p) return null
              return (
                <div key={userId} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">✋</span>
                    <span className="text-white text-sm">{p.displayName}{p.isLocal ? ' (You)' : ''}</span>
                  </div>
                  {p.isLocal && (
                    <button
                      className="text-xs text-gray-400 hover:text-white"
                      onClick={() => lowerHand(userId)}
                    >
                      Lower
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* All participants */}
        <div className="divide-y divide-gray-800">
          {participants.map(p => (
            <div key={p.userId} className="flex items-center justify-between px-3 py-2 hover:bg-gray-800">
              <div className="flex items-center gap-2 min-w-0">
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                  avatarColor(p.displayName)
                }`}>
                  {p.displayName[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm truncate">
                    {p.displayName}
                    {p.isLocal && <span className="text-gray-500 ml-1">(You)</span>}
                  </p>
                  {/* Audio level bar */}
                  {p.audioEnabled && p.audioLevel > 0 && (
                    <div className="w-16 h-1 bg-gray-700 rounded mt-0.5">
                      <div
                        className="h-full bg-green-400 rounded transition-all duration-100"
                        style={{ width: `${Math.min(100, p.audioLevel)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {handRaises.includes(p.userId) && <span title="Hand raised">✋</span>}
                {p.isScreenSharing && (
                  <span title="Screen sharing" className="text-blue-400 text-xs">⬜</span>
                )}
                {p.audioEnabled
                  ? <svg className="w-3.5 h-3.5 text-green-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/></svg>
                  : <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V20c0 .55.45 1 1 1s1-.45 1-1v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>
                }
                {p.videoEnabled
                  ? <svg className="w-3.5 h-3.5 text-green-400" viewBox="0 0 24 24" fill="currentColor"><path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98z"/></svg>
                  : <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="currentColor"><path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98zm-2-.79V18H4V6h12v3.69z"/><path d="M2 4l16 16 1.41-1.41L3.41 2.59 2 4z"/></svg>
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function avatarColor(name: string) {
  const colors = ['bg-blue-600','bg-purple-600','bg-green-600','bg-orange-600','bg-red-600','bg-teal-600','bg-pink-600']
  return colors[(name.charCodeAt(0) || 0) % colors.length]
}
