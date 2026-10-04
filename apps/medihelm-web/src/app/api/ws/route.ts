// WebSocket upgrade is handled by custom server
// This route provides connection info for the client
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    ws: true,
    path: '/api/ws',
    fallback: '/api/notifications/stream',
    message: 'WebSocket endpoint — connect via Socket.io client or use SSE fallback',
  })
}
