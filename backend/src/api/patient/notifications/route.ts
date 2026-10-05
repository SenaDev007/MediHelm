import { db } from '@backend/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@backend/lib/api-auth'

// GET: List notifications for a patient
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M05_PATIENTS', 'read')
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    // Pour un patient, userId est forcé à la session (anti-IDOR);
    // un autre userId n'est consultable que par les rôles pharmacie/admin.
    let userId = searchParams.get('userId')
    if (authResult.roleName === 'PATIENT') {
      if (userId && userId !== authResult.id) {
        return NextResponse.json({ error: 'Accès refusé à ces notifications' }, { status: 403 })
      }
      userId = authResult.id
    }
    const nonLuesSeulement = searchParams.get('nonLues') === 'true'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    if (!userId) {
      return NextResponse.json(
        { error: 'Le paramètre userId est requis' },
        { status: 400 }
      )
    }

    // Rôles pharmacie: l'utilisateur consulté doit appartenir à leur pharmacie
    if (authResult.roleName !== 'PATIENT' && authResult.roleName !== 'PLATFORM_ADMIN') {
      const cible = await db.utilisateur.findFirst({
        where: { id: userId, pharmacieId: authResult.pharmacieId },
        select: { id: true },
      })
      if (!cible) {
        return NextResponse.json({ error: 'Utilisateur introuvable dans votre pharmacie' }, { status: 404 })
      }
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
