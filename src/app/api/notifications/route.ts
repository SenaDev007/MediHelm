import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

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

    if (body.markAllAsRead) {
      // Marquer toutes les notifications comme lues
      await db.notification.updateMany({
        where: {
          userId: user.id,
          lue: false,
        },
        data: { lue: true },
      })
      return NextResponse.json({ message: 'Toutes les notifications marquées comme lues' })
    }

    if (body.ids && Array.isArray(body.ids)) {
      await db.notification.updateMany({
        where: {
          id: { in: body.ids },
          userId: user.id,
        },
        data: { lue: true },
      })
      return NextResponse.json({ message: 'Notifications marquées comme lues' })
    }

    if (body.id) {
      const data = await db.notification.update({
        where: { id: body.id },
        data: { lue: body.lue !== undefined ? body.lue : true },
      })
      return NextResponse.json(data)
    }

    return NextResponse.json(
      { error: 'ID(s) de notification requis ou markAllAsRead=true' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Erreur PATCH notifications:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des notifications' },
      { status: 500 }
    )
  }
}
