import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/notifications/stream — SSE stream pour notifications en temps réel
// Version simplifiée : retourne les 20 dernières notifications non lues
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M14_DASHBOARD', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const notifications = await db.notification.findMany({
      where: {
        userId: user.id,
        lue: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Retourner en format SSE-compatible
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // Envoyer les notifications initiales
        const data = JSON.stringify({
          type: 'initial',
          notifications,
          count: notifications.length,
        })
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))

        // Envoyer un heartbeat pour garder la connexion ouverte
        const heartbeat = setInterval(() => {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        }, 30000)

        // Nettoyage après 5 minutes
        setTimeout(() => {
          clearInterval(heartbeat)
          controller.close()
        }, 300000)
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Erreur GET notifications/stream:', error)
    return NextResponse.json(
      { error: 'Erreur lors du flux de notifications' },
      { status: 500 }
    )
  }
}
