import { useEffect, useRef, useState } from 'react'
import { useRTCContext } from '../rtc/RTCContext'
import { useMediaStore } from '../store/mediaStore'
import type { RTCProviderName } from '../config/env'

interface Props {
  onJoin: (roomId: string, userId: string, displayName: string, enableCamera: boolean, enableMic: boolean) => void
  providerName: RTCProviderName
  onProviderChange: (p: RTCProviderName) => void
}

export function PreJoinScreen({ onJoin, providerName, onProviderChange }: Props) {
  const { provider, isReady } = useRTCContext()
  const { setDevices, cameraEnabled, micEnabled, setCameraEnabled, setMicEnabled } = useMediaStore()

  const [roomId, setRoomId] = useState('test-app')
  const [displayName, setDisplayName] = useState(() => `User-${Math.floor(Math.random() * 1000)}`)
  // userId — for TRTC with SecretKey this is auto-signed so any value works
  const [userId, setUserId] = useState(() => `user-${Math.floor(Math.random() * 10000)}`)
  const [cameras, setCameras] = useState<{ deviceId: string; label: string }[]>([])
  const [microphones, setMicrophones] = useState<{ deviceId: string; label: string }[]>([])
  const [selectedCamera, setSelectedCamera] = useState('')
  const [selectedMic, setSelectedMic] = useState('')
  const [previewError, setPreviewError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Load devices and start preview
  useEffect(() => {
    let active = true

    async function init() {
      try {
        // Request permissions first
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }

        const devices = await navigator.mediaDevices.enumerateDevices()
        if (!active) return

        const cams = devices.filter(d => d.kind === 'videoinput').map(d => ({
          deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 4)}`
        }))
        const mics = devices.filter(d => d.kind === 'audioinput').map(d => ({
          deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 4)}`
        }))

        setCameras(cams)
        setMicrophones(mics)
        if (cams[0]) setSelectedCamera(cams[0].deviceId)
        if (mics[0]) setSelectedMic(mics[0].deviceId)
      } catch (err: any) {
        if (active) setPreviewError(err.message || 'Could not access camera/microphone')
      }
    }

    // Start preview regardless of SDK readiness — preview uses native mediaDevices
    init()

    return () => {
      active = false
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [isReady])

  const handleJoin = () => {
    if (!roomId.trim() || !displayName.trim()) return
    // Stop preview stream — provider will create its own tracks
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    onJoin(roomId.trim(), userId.trim() || displayName.trim(), displayName.trim(), cameraEnabled, micEnabled)
  }


  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl flex flex-col md:flex-row gap-6">

        {/* Camera preview */}
        <div className="flex-1">
          <div className="aspect-video bg-gray-900 rounded-2xl overflow-hidden relative">
            {cameraEnabled ? (
              previewError ? (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-red-400 text-sm text-center px-4">{previewError}</p>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-3xl font-bold text-white">
                  {displayName[0]?.toUpperCase() || '?'}
                </div>
                <p className="text-gray-400 mt-3 text-sm">Camera is off</p>
              </div>
            )}

            {/* Mic/Cam toggles overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
              <button
                onClick={() => setCameraEnabled(!cameraEnabled)}
                className={`p-3 rounded-full ${cameraEnabled ? 'bg-gray-700 text-white' : 'bg-red-600 text-white'}`}
                title={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  {cameraEnabled
                    ? <path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98z"/>
                    : <><path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98zm-2-.79V18H4V6h12v3.69z"/><path d="M2 4l16 16 1.41-1.41L3.41 2.59 2 4z"/></>
                  }
                </svg>
              </button>
              <button
                onClick={() => setMicEnabled(!micEnabled)}
                className={`p-3 rounded-full ${micEnabled ? 'bg-gray-700 text-white' : 'bg-red-600 text-white'}`}
                title={micEnabled ? 'Mute' : 'Unmute'}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  {micEnabled
                    ? <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
                    : <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V20c0 .55.45 1 1 1s1-.45 1-1v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                  }
                </svg>
              </button>
            </div>
          </div>

          {/* Device selectors */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <select
              className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 border border-gray-600"
              value={selectedCamera}
              onChange={e => setSelectedCamera(e.target.value)}
            >
              {cameras.length === 0 && <option>No camera found</option>}
              {cameras.map(c => <option key={c.deviceId} value={c.deviceId}>{c.label}</option>)}
            </select>
            <select
              className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 border border-gray-600"
              value={selectedMic}
              onChange={e => setSelectedMic(e.target.value)}
            >
              {microphones.length === 0 && <option>No mic found</option>}
              {microphones.map(m => <option key={m.deviceId} value={m.deviceId}>{m.label}</option>)}
            </select>
          </div>
        </div>

        {/* Join form */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="mb-6">
            <h1 className="text-white text-2xl font-bold">Ready to join?</h1>

            {/* Provider switcher */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-gray-400 text-xs">Provider:</span>
              <div className="flex rounded-lg overflow-hidden border border-gray-700">
                <button
                  onClick={() => onProviderChange('agora')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    providerName === 'agora'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Agora
                </button>
                <button
                  onClick={() => onProviderChange('trtc')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    providerName === 'trtc'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Tencent TRTC
                </button>
              </div>
              {!isReady && <span className="text-yellow-400 text-xs">⟳ loading…</span>}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs block mb-1">Display Name</label>
              <input
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-blue-500 text-sm"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
            </div>

            {providerName === 'trtc' && !import.meta.env.VITE_TRTC_SECRET_KEY && (
              <div className="p-2 bg-orange-900/30 border border-orange-700 rounded-lg text-xs text-orange-300">
                ⚠️ Set <code className="font-mono">VITE_TRTC_SECRET_KEY</code> in .env.local to auto-generate UserSig for any user.
              </div>
            )}

            <div>
              <label className="text-gray-400 text-xs block mb-1">Room ID</label>
              <input
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-blue-500 text-sm"
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                placeholder="Enter room ID"
              />
              <p className="text-gray-600 text-xs mt-1">Share this ID with others to invite them</p>
            </div>

            <button
              onClick={handleJoin}
              disabled={!roomId.trim() || !displayName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors text-sm"
            >
              {isReady ? 'Join Now' : 'Join Now (SDK loading…)'}
            </button>
          </div>

          <div className="mt-4 p-3 bg-gray-900 rounded-xl text-xs text-gray-500">
            <p className="font-medium text-gray-400 mb-1">Quick setup guide:</p>
            <p>1. Set your credentials in <code className="text-gray-300">.env.local</code></p>
            <p>2. Change <code className="text-gray-300">VITE_RTC_PROVIDER</code> to switch between Agora and TRTC</p>
            <p>3. Open this app in two tabs to test a call</p>
          </div>
        </div>
      </div>
    </div>
  )
}
