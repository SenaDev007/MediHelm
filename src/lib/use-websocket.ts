'use client'

// ============================================================
// MediHelm — WebSocket Client Hook
// Real-time updates via Socket.io (with SSE fallback)
// Référence: MH-SPECS-2025-v2.0 — WebSocket Client
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react'

export interface WSEvent {
  event: string
  data: unknown
  timestamp: string
}

export interface UseWebSocketOptions {
  pharmacieId?: string
  onNotification?: (data: any) => void
  onStockUpdate?: (data: any) => void
  onVenteUpdate?: (data: any) => void
  onAlerte?: (data: any) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null)
  const socketRef = useRef<any>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const connect = useCallback(() => {
    // Try Socket.io first
    try {
      if (typeof window !== 'undefined' && (window as any).__SOCKET_IO__) {
        const { io } = require('socket.io-client')
        const token = getCookie('next-auth.session-token')

        socketRef.current = io({
          path: '/api/ws',
          auth: { token },
        })

        socketRef.current.on('connect', () => {
          setIsConnected(true)
          options.onConnect?.()
        })

        socketRef.current.on('disconnect', () => {
          setIsConnected(false)
          options.onDisconnect?.()
        })

        // Register event handlers
        if (options.pharmacieId) {
          socketRef.current.emit('join:pharmacie', options.pharmacieId)
        }

        socketRef.current.on('notification', (data: any) => {
          setLastEvent({ event: 'notification', data, timestamp: new Date().toISOString() })
          options.onNotification?.(data)
        })

        socketRef.current.on('stock:update', (data: any) => {
          setLastEvent({ event: 'stock:update', data, timestamp: new Date().toISOString() })
          options.onStockUpdate?.(data)
        })

        socketRef.current.on('vente:update', (data: any) => {
          setLastEvent({ event: 'vente:update', data, timestamp: new Date().toISOString() })
          options.onVenteUpdate?.(data)
        })

        socketRef.current.on('alerte', (data: any) => {
          setLastEvent({ event: 'alerte', data, timestamp: new Date().toISOString() })
          options.onAlerte?.(data)
        })

        return
      }
    } catch {
      // Socket.io not available, use SSE fallback
    }

    // SSE fallback (always available)
    try {
      eventSourceRef.current = new EventSource('/api/notifications/stream')

      eventSourceRef.current.onopen = () => {
        setIsConnected(true)
        options.onConnect?.()
      }

      eventSourceRef.current.onerror = () => {
        setIsConnected(false)
        options.onDisconnect?.()
        // Auto-reconnect after 5 seconds
        setTimeout(() => {
          eventSourceRef.current?.close()
          connect()
        }, 5000)
      }

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setLastEvent({ event: data.type || 'message', data, timestamp: new Date().toISOString() })

          switch (data.type) {
            case 'notification':
              options.onNotification?.(data)
              break
            case 'stock:update':
              options.onStockUpdate?.(data)
              break
            case 'vente:update':
              options.onVenteUpdate?.(data)
              break
            case 'alerte':
              options.onAlerte?.(data)
              break
          }
        } catch {
          // Ignore malformed events
        }
      }
    } catch {
      // SSE not available either
    }
  }, [options.pharmacieId])

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect()
    eventSourceRef.current?.close()
    setIsConnected(false)
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return {
    isConnected,
    lastEvent,
    connect,
    disconnect,
  }
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
  return match?.[2]
}
