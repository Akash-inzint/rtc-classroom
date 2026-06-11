import type { RTCParticipant } from '../../rtc/IRTCProvider'
import { VideoTile } from '../VideoTile'
import { useRoomStore } from '../../store/roomStore'

interface Props {
  participants: RTCParticipant[]
}

export function SpeakerView({ participants }: Props) {
  const { pinnedUserId, activeSpeakerId, setPinnedUser, setLayoutMode } = useRoomStore()

  const primaryId = pinnedUserId || activeSpeakerId || participants[0]?.userId
  const primary = participants.find(p => p.userId === primaryId) || participants[0]
  const strip = participants.filter(p => p.userId !== primary?.userId)

  const handlePin = (userId: string) => {
    if (pinnedUserId === userId) {
      setPinnedUser(null)
    } else {
      setPinnedUser(userId)
    }
  }

  const handleUnpin = () => {
    setPinnedUser(null)
    if (participants.length === 1) setLayoutMode('grid')
  }

  return (
    <div className="flex flex-col h-full gap-2 p-2">
      {/* Primary large tile */}
      <div className="flex-1 min-h-0 relative">
        {primary && (
          <VideoTile
            participant={primary}
            isPinned={!!pinnedUserId}
            onPin={handleUnpin}
          />
        )}
      </div>

      {/* Strip of thumbnails */}
      {strip.length > 0 && (
        <div className="flex gap-2 overflow-x-auto h-28 flex-shrink-0">
          {strip.map(p => (
            <div key={p.userId} className="h-full aspect-video flex-shrink-0">
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
