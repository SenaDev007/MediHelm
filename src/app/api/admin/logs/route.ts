import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M19_CONFORMITE', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const searchAction = searchParams.get('action') || ''
    const entity = searchParams.get('entity') || ''
    const userId = searchParams.get('userId') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''

    const where: Record<string, unknown> = {}

    if (searchAction) {
      where.action = { contains: searchAction, mode: 'insensitive' }
    }
    if (entity) {
      where.entity = entity
    }
    if (userId) {
      where.userId = userId
    }
    if (dateFrom || dateTo) {
      const createdAt: Record<string, Date> = {}
      if (dateFrom) createdAt.gte = new Date(dateFrom)
      if (dateTo) createdAt.lte = new Date(dateTo)
      where.createdAt = createdAt
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.auditLog.count({ where }),
    ])

    // Get unique entities for filter
    const entities = await db.auditLog.groupBy({
      by: ['entity'],
      _count: { entity: true },
      orderBy: { _count: { entity: 'desc' } },
    })

    return NextResponse.json({
      data: logs.map(l => ({
        id: l.id,
        userId: l.userId,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        details: l.details,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt,
      })),
      entities: entities.map(e => ({ entity: e.entity, count: e._count.entity })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur GET admin/logs:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des logs' }, { status: 500 })
  }
}
