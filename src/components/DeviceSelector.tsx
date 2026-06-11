import { useEffect, useRef, useState } from 'react'
import { useMediaStore } from '../store/mediaStore'
import { useRTCContext } from '../rtc/RTCContext'

interface Props {
  onClose: () => void
}

export function DeviceSelector({ onClose }: Props) {
  const { provider } = useRTCContext()
  const {
    cameras, microphones, speakers,
    selectedCameraId, selectedMicId, selectedSpeakerId,
    setSelectedCamera, setSelectedMic, setSelectedSpeaker,
    setDevices, noiseSuppression, setNoiseSuppression,
    videoProfile, setVideoProfile,
  } = useMediaStore()

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!provider) return
    Promise.all([provider.getCameras(), provider.getMicrophones(), provider.getSpeakers()])
      .then(([cams, mics, spks]) => setDevices(cams, mics, spks))
  }, [provider])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleCamera = async (id: string) => {
    setSelectedCamera(id)
    await provider?.switchCamera(id)
  }

  const handleMic = async (id: string) => {
    setSelectedMic(id)
    await provider?.switchMicrophone(id)
  }

  const handleSpeaker = async (id: string) => {
    setSelectedSpeaker(id)
    await provider?.setSpeaker(id)
  }

  const handleNoise = async (v: boolean) => {
    setNoiseSuppression(v)
    await provider?.enableNoiseSuppression(v)
  }

  const handleProfile = async (p: 'low' | 'medium' | 'high') => {
    setVideoProfile(p)
    await provider?.setVideoProfile(p)
  }

  return (
    <div
      ref={ref}
      className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-4 w-80 z-50"
    >
      <h3 className="text-white font-semibold mb-3 text-sm">Device Settings</h3>

      <DeviceSelect
        label="Camera"
        devices={cameras}
        value={selectedCameraId}
        onChange={handleCamera}
      />
      <DeviceSelect
        label="Microphone"
        devices={microphones}
        value={selectedMicId}
        onChange={handleMic}
      />
      <DeviceSelect
        label="Speaker"
        devices={speakers}
        value={selectedSpeakerId}
        onChange={handleSpeaker}
      />

      <div className="mt-3 border-t border-gray-700 pt-3 space-y-2">
        <label className="flex items-center justify-between text-gray-300 text-xs">
          <span>Noise Suppression</span>
          <input
            type="checkbox"
            checked={noiseSuppression}
            onChange={e => handleNoise(e.target.checked)}
            className="accent-blue-500"
          />
        </label>

        <div>
          <span className="text-gray-400 text-xs block mb-1">Video Quality</span>
          <div className="flex gap-1">
            {(['low', 'medium', 'high'] as const).map(p => (
              <button
                key={p}
                className={`flex-1 text-xs py-1 rounded ${videoProfile === p ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                onClick={() => handleProfile(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DeviceSelect({
  label,
  devices,
  value,
  onChange,
}: {
  label: string
  devices: { deviceId: string; label: string }[]
  value: string
  onChange: (id: string) => void
}) {
  if (devices.length === 0) return null
  return (
    <div className="mb-2">
      <label className="text-gray-400 text-xs block mb-0.5">{label}</label>
      <select
        className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1.5 border border-gray-600"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {devices.map(d => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || d.deviceId}
          </option>
        ))}
      </select>
    </div>
  )
}
