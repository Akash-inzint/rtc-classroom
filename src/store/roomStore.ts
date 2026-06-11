import { create } from 'zustand'
import type { RTCParticipant } from '../rtc/IRTCProvider'

export type LayoutMode = 'grid' | 'speaker'

export interface ChatMessage {
  id: string
  userId: string
  displayName: string
  text: string
  timestamp: number
}

interface RoomState {
  // Session
  isInRoom: boolean
  roomId: string
  localUserId: string
  localDisplayName: string

  // Participants
  participants: RTCParticipant[]
  pinnedUserId: string | null
  activeSpeakerId: string | null

  // Layout
  layoutMode: LayoutMode
  isSidebarOpen: boolean
  sidebarTab: 'participants' | 'chat'

  // Hand raises
  handRaises: string[]   // ordered list of userIds

  // Chat
  messages: ChatMessage[]
  unreadCount: number

  // Actions
  setRoom: (roomId: string, userId: string, displayName: string) => void
  leaveRoom: () => void
  addParticipant: (p: RTCParticipant) => void
  removeParticipant: (userId: string) => void
  updateParticipant: (userId: string, patch: Partial<RTCParticipant>) => void
  setLocalParticipant: (p: Partial<RTCParticipant>) => void
  setPinnedUser: (userId: string | null) => void
  setActiveSpeaker: (userId: string | null) => void
  setLayoutMode: (mode: LayoutMode) => void
  toggleSidebar: (tab?: 'participants' | 'chat') => void
  raiseHand: (userId: string) => void
  lowerHand: (userId: string) => void
  sendMessage: (userId: string, displayName: string, text: string) => void
  markChatRead: () => void
}

export const useRoomStore = create<RoomState>((set, get) => ({
  isInRoom: false,
  roomId: '',
  localUserId: '',
  localDisplayName: '',
  participants: [],
  pinnedUserId: null,
  activeSpeakerId: null,
  layoutMode: 'grid',
  isSidebarOpen: false,
  sidebarTab: 'participants',
  handRaises: [],
  messages: [],
  unreadCount: 0,

  setRoom: (roomId, userId, displayName) =>
    set({
      isInRoom: true,
      roomId,
      localUserId: userId,
      localDisplayName: displayName,
      participants: [{
        userId,
        displayName,
        isLocal: true,
        audioEnabled: false,
        videoEnabled: false,
        isScreenSharing: false,
        audioLevel: 0,
        networkQuality: 0,
      }],
    }),

  leaveRoom: () =>
    set({
      isInRoom: false,
      roomId: '',
      localUserId: '',
      localDisplayName: '',
      participants: [],
      pinnedUserId: null,
      activeSpeakerId: null,
      handRaises: [],
      messages: [],
      unreadCount: 0,
    }),

  addParticipant: (p) =>
    set(s => ({
      participants: s.participants.some(x => x.userId === p.userId)
        ? s.participants
        : [...s.participants, p],
    })),

  removeParticipant: (userId) =>
    set(s => ({
      participants: s.participants.filter(p => p.userId !== userId),
      handRaises: s.handRaises.filter(id => id !== userId),
    })),

  updateParticipant: (userId, patch) =>
    set(s => ({
      participants: s.participants.map(p =>
        p.userId === userId ? { ...p, ...patch } : p
      ),
    })),

  setLocalParticipant: (patch) =>
    set(s => ({
      participants: s.participants.map(p =>
        p.isLocal ? { ...p, ...patch } : p
      ),
    })),

  setPinnedUser: (userId) => set({ pinnedUserId: userId }),

  setActiveSpeaker: (userId) => set({ activeSpeakerId: userId }),

  setLayoutMode: (mode) => set({ layoutMode: mode }),

  toggleSidebar: (tab) =>
    set(s => {
      if (tab && s.isSidebarOpen && s.sidebarTab === tab) {
        return { isSidebarOpen: false }
      }
      return {
        isSidebarOpen: true,
        sidebarTab: tab ?? s.sidebarTab,
        unreadCount: tab === 'chat' ? 0 : s.unreadCount,
      }
    }),

  raiseHand: (userId) =>
    set(s => ({
      handRaises: s.handRaises.includes(userId)
        ? s.handRaises
        : [...s.handRaises, userId],
    })),

  lowerHand: (userId) =>
    set(s => ({ handRaises: s.handRaises.filter(id => id !== userId) })),

  sendMessage: (userId, displayName, text) =>
    set(s => ({
      messages: [...s.messages, {
        id: `${Date.now()}-${Math.random()}`,
        userId,
        displayName,
        text,
        timestamp: Date.now(),
      }],
      unreadCount: s.isSidebarOpen && s.sidebarTab === 'chat'
        ? 0
        : s.unreadCount + 1,
    })),

  markChatRead: () => set({ unreadCount: 0 }),
}))
