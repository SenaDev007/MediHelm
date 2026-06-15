import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M14_DASHBOARD', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const entite = searchParams.get('entite')
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // AuditLog n'a pas de pharmacieId directement, on filtre via les userId
    // appartenant à la pharmacie
    const pharmacieUsers = await db.utilisateur.findMany({
      where: { pharmacieId },
      select: { id: true },
    })
    const userIds = pharmacieUsers.map((u) => u.id)

    const where: Record<string, unknown> = {
      userId: { in: userIds },
    }

    if (action) {
      where.action = { contains: action, mode: 'insensitive' }
    }

    if (entite) {
      where.entity = { contains: entite, mode: 'insensitive' }
    }

    if (dateDebut || dateFin) {
      where.createdAt = {
        ...(dateDebut ? { gte: new Date(dateDebut) } : {}),
        ...(dateFin ? { lte: new Date(dateFin + 'T23:59:59.999Z') } : {}),
      }
    }

    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ])

    return NextResponse.json({
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erreur GET journaux:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des journaux d\'audit' },
      { status: 500 }
    )
  }
}
