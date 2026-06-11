import { useState } from 'react'
import { RTCContextProvider } from './rtc/RTCContext'
import { PreJoinScreen } from './components/PreJoinScreen'
import { Room } from './components/Room'
import { env, type RTCProviderName } from './config/env'

interface RoomConfig {
  roomId: string
  userId: string
  displayName: string
  enableCamera: boolean
  enableMic: boolean
}

export default function App() {
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null)
  const [providerName, setProviderName] = useState<RTCProviderName>(env.rtcProvider)

  const handleJoin = (
    roomId: string,
    userId: string,
    displayName: string,
    enableCamera: boolean,
    enableMic: boolean
  ) => {
    setRoomConfig({ roomId, userId, displayName, enableCamera, enableMic })
  }

  const handleLeave = () => {
    setRoomConfig(null)
  }

  return (
    <RTCContextProvider key={providerName} providerName={providerName}>
      {roomConfig ? (
        <Room
          roomId={roomConfig.roomId}
          userId={roomConfig.userId}
          displayName={roomConfig.displayName}
          enableCamera={roomConfig.enableCamera}
          enableMic={roomConfig.enableMic}
          onLeave={handleLeave}
        />
      ) : (
        <PreJoinScreen
          onJoin={handleJoin}
          providerName={providerName}
          onProviderChange={setProviderName}
        />
      )}
    </RTCContextProvider>
  )
}
