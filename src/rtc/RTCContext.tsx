import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { IRTCProvider } from './IRTCProvider'
import { createRTCProvider, clearProviderCache } from './factory'
import type { RTCProviderName } from '../config/env'

interface RTCContextValue {
  provider: IRTCProvider | null
  isReady: boolean
  providerName: RTCProviderName
}

const RTCContext = createContext<RTCContextValue>({
  provider: null,
  isReady: false,
  providerName: 'agora',
})

interface Props {
  children: React.ReactNode
  providerName: RTCProviderName
}

export function RTCContextProvider({ children, providerName }: Props) {
  const [provider, setProvider] = useState<IRTCProvider | null>(null)
  const [isReady, setIsReady] = useState(false)
  const providerRef = useRef<IRTCProvider | null>(null)

  useEffect(() => {
    let cancelled = false
    setProvider(null)
    setIsReady(false)

    createRTCProvider(providerName).then(async (p) => {
      if (cancelled) return
      try { await p.initialize() } catch (err) {
        console.error('[RTCContext] initialize failed:', err)
      }
      if (cancelled) return
      providerRef.current = p
      setProvider(p)
      setIsReady(true)
    }).catch(err => {
      console.error('[RTCContext] createRTCProvider failed:', err)
    })

    return () => {
      cancelled = true
      providerRef.current?.destroy()
      providerRef.current = null
      clearProviderCache()
    }
  }, [providerName])

  return (
    <RTCContext.Provider value={{ provider, isReady, providerName }}>
      {children}
    </RTCContext.Provider>
  )
}

export function useRTCContext(): RTCContextValue {
  return useContext(RTCContext)
}
