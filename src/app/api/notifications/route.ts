import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { validate, notificationSchema } from '@/lib/validations'

// GET /api/notifications — Liste des notifications de l'utilisateur courant
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M14_DASHBOARD', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20')
    const lue = searchParams.get('lue')
    const type = searchParams.get('type')

    const where: Record<string, unknown> = {
      userId: user.id,
    }

    if (lue !== null && lue !== undefined && lue !== '') {
      where.lue = lue === 'true'
    }
    if (type) where.type = type

    const [data, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.notification.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Erreur GET notifications:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des notifications' },
      { status: 500 }
    )
  }
}

// PATCH /api/notifications — Marquer des notifications comme lues
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M14_DASHBOARD', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()
    const validation = validate(notificationSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    // Create notification for user
    const result = await db.notification.create({
      data: {
        userId: user.id,
        titre: data.titre,
        message: data.message,
        type: data.type || 'INFO',
        lien: data.lien || null,
        lue: false,
      },
    })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Erreur PATCH notifications:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des notifications' },
      { status: 500 }
    )
  }
}
