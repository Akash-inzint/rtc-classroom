import type { RTCParticipant } from '../../rtc/IRTCProvider'
import { VideoTile } from '../VideoTile'
import { useRoomStore } from '../../store/roomStore'

interface Props {
  participants: RTCParticipant[]
}

const STRIP_HEIGHT = 112 // px — thumbnail strip height

export function SpeakerView({ participants }: Props) {
  const { pinnedUserId, activeSpeakerId, setPinnedUser, setLayoutMode } = useRoomStore()

  const primaryId = pinnedUserId || activeSpeakerId || participants[0]?.userId
  const primary = participants.find(p => p.userId === primaryId) || participants[0]
  const strip = participants.filter(p => p.userId !== primary?.userId)

  const handleUnpin = () => {
    setPinnedUser(null)
    if (participants.length === 1) setLayoutMode('grid')
  }

  const handlePin = (userId: string) => {
    setPinnedUser(pinnedUserId === userId ? null : userId)
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden p-2 gap-2">
      {/* Primary tile — takes all remaining height */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {primary && (
          <VideoTile
            participant={primary}
            isPinned={!!pinnedUserId}
            onPin={handleUnpin}
          />
        )}
      </div>

      {/* Thumbnail strip — fixed height, scrollable */}
      {strip.length > 0 && (
        <div
          className="flex gap-2 overflow-x-auto flex-shrink-0"
          style={{ height: STRIP_HEIGHT }}
        >
          {strip.map(p => (
            <div
              key={p.userId}
              className="flex-shrink-0 relative"
              style={{ height: STRIP_HEIGHT, aspectRatio: '16/9' }}
            >
              <VideoTile
                participant={p}
                isPinned={pinnedUserId === p.userId}
                onPin={handlePin}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
