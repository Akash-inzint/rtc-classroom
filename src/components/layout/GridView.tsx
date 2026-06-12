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
    participants.length <= 1 ? 1 :
    participants.length <= 4 ? 2 :
    participants.length <= 9 ? 3 : 4

  const rows = Math.ceil(participants.length / cols)

  return (
    <div
      className="w-full h-full p-2"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: '8px',
      }}
    >
      {participants.map(p => (
        <div key={p.userId} style={{ position: 'relative', minHeight: 0, minWidth: 0 }}>
          <VideoTile
            participant={p}
            isPinned={pinnedUserId === p.userId}
            onPin={handlePin}
          />
        </div>
      ))}
    </div>
  )
}
