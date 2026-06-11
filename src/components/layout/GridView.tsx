import type { RTCParticipant } from '../../rtc/IRTCProvider'
import { VideoTile } from '../VideoTile'
import { useRoomStore } from '../../store/roomStore'

interface Props {
  participants: RTCParticipant[]
}

export function GridView({ participants }: Props) {
  const { pinnedUserId, setPinnedUser, setLayoutMode } = useRoomStore()

  const handlePin = (userId: string) => {
    if (pinnedUserId === userId) {
      setPinnedUser(null)
    } else {
      setPinnedUser(userId)
      setLayoutMode('speaker')
    }
  }

  const cols =
    participants.length <= 1 ? 'grid-cols-1' :
    participants.length <= 4 ? 'grid-cols-2' :
    participants.length <= 9 ? 'grid-cols-3' :
    'grid-cols-4'

  return (
    <div className={`grid ${cols} gap-2 w-full h-full p-2`}>
      {participants.map(p => (
        <VideoTile
          key={p.userId}
          participant={p}
          isPinned={pinnedUserId === p.userId}
          onPin={handlePin}
        />
      ))}
    </div>
  )
}
