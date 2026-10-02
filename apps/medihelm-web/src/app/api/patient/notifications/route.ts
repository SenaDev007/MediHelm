import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET: List notifications for a patient
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M05_PATIENTS', 'read')
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const nonLuesSeulement = searchParams.get('nonLues') === 'true'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    if (!userId) {
      return NextResponse.json(
        { error: 'Le paramètre userId est requis' },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = { userId }
    if (nonLuesSeulement) {
      where.lue = false
    }

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.notification.count({ where }),
    ])

    const nonLues = await db.notification.count({
      where: { userId, lue: false },
    })

    return NextResponse.json({
      data: notifications,
      total,
      nonLues,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erreur GET patient/notifications:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des notifications' },
      { status: 500 }
    )
  }
}
