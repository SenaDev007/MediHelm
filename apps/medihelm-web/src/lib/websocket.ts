// ============================================================
// MediHelm — WebSocket Server (Socket.io)
// Real-time notifications, stock alerts, vente updates
// Référence: MH-SPECS-2025-v2.0 — WebSocket
// ============================================================

import type { Server as HTTPServer } from 'http'

let io: any = null

export interface WebSocketEvent {
  event: string
  data: unknown
  pharmacieId?: string
  userId?: string
}

/**
 * Initialize Socket.io server
 * Call this from a custom server or API route
 */
export async function initWebSocketServer(httpServer: HTTPServer) {
  try {
    const { Server } = await import('socket.io')

    io = new Server(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || '*',
        methods: ['GET', 'POST'],
      },
      path: '/api/ws',
    })

    io.use(async (socket: any, next: any) => {
      // Verify auth token
      const token = socket.handshake.auth.token || socket.handshake.query.token
      if (!token) {
        return next(new Error('Authentication required'))
      }

      try {
        // Decode JWT (simple verification)
        const parts = token.split('.')
        if (parts.length !== 3) {
          return next(new Error('Invalid token'))
        }
        const payload = JSON.parse(atob(parts[1]))
        socket.data.user = {
          id: payload.id,
          pharmacieId: payload.pharmacieId,
          roleName: payload.roleName,
        }
        next()
      } catch {
        next(new Error('Invalid token'))
      }
    })

    io.on('connection', (socket: any) => {
      const user = socket.data.user
      console.log(`[WS] Client connected: ${user?.id}`)

      // Join pharmacy room
      if (user?.pharmacieId) {
        socket.join(`pharmacie:${user.pharmacieId}`)
      }

      // Join user-specific room
      if (user?.id) {
        socket.join(`user:${user.id}`)
      }

      socket.on('disconnect', () => {
        console.log(`[WS] Client disconnected: ${user?.id}`)
      })
    })

    console.log('[WS] Socket.io server initialized')
    return io
  } catch (error) {
    console.warn('[WS] Socket.io not available, falling back to SSE:', error)
    return null
  }
}

/**
 * Emit event to a specific pharmacy
 */
export function emitToPharmacie(pharmacieId: string, event: string, data: unknown) {
  if (io) {
    io.to(`pharmacie:${pharmacieId}`).emit(event, data)
  }
}

/**
 * Emit event to a specific user
 */
export function emitToUser(userId: string, event: string, data: unknown) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data)
  }
}

/**
 * Emit event to all connected clients
 */
export function emitGlobal(event: string, data: unknown) {
  if (io) {
    io.emit(event, data)
  }
}

/**
 * Get the Socket.io instance
 */
export function getIO() {
  return io
}
