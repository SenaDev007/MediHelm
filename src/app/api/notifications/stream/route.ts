import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', userId: user.id })}\n\n`))

      // Keep-alive every 30 seconds
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'ping' })}\n\n`))
        } catch {
          clearInterval(interval)
        }
      }, 30000)

      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
