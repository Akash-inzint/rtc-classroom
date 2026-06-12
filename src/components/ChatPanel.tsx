import { useEffect, useRef, useState } from 'react'
import { useRoomStore } from '../store/roomStore'
import { useRTCContext } from '../rtc/RTCContext'

export function ChatPanel() {
  const { messages, localUserId, localDisplayName, sendMessage, markChatRead } = useRoomStore()
  const { provider } = useRTCContext()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { markChatRead() }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    setText('')
    // Add to local store immediately so sender sees it
    sendMessage(localUserId, localDisplayName, trimmed)
    // Broadcast to all other participants via RTC data channel
    await provider?.sendChatMessage(localUserId, localDisplayName, trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-700">
        <span className="text-white text-sm font-medium">Chat</span>
        <p className="text-gray-500 text-xs">Messages visible during this call only</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-gray-600 text-xs text-center mt-8">No messages yet</p>
        )}
        {messages.map(msg => {
          const isLocal = msg.userId === localUserId
          return (
            <div key={msg.id} className={`flex flex-col ${isLocal ? 'items-end' : 'items-start'}`}>
              {!isLocal && (
                <span className="text-gray-400 text-xs mb-0.5">{msg.displayName}</span>
              )}
              <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
                isLocal ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'
              }`}>
                <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
              </div>
              <span className="text-gray-600 text-xs mt-0.5">{formatTime(msg.timestamp)}</span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-gray-700">
        <div className="flex gap-2">
          <textarea
            className="flex-1 bg-gray-700 text-white text-sm rounded-lg px-3 py-2 resize-none border border-gray-600 focus:outline-none focus:border-blue-500 placeholder-gray-500"
            placeholder="Send a message…"
            rows={1}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-lg transition-colors flex-shrink-0 disabled:opacity-40"
            onClick={handleSend}
            disabled={!text.trim()}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
        <p className="text-gray-600 text-xs mt-1">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
