// ============================================================
// MédiHelm — Journaux d'audit
// GET /api/audit-logs
// Liste des journaux d'audit filtrés par pharmacie
// Permission M14_DASHBOARD read ou M07_RH pour les logs RH
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    // 1. Authentification + RBAC (M14_DASHBOARD read ou M07_RH read)
    const authResult = await requireAuth(request, 'M14_DASHBOARD', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    // 2. Extraire les paramètres de filtre
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') as string | null
    const entity = searchParams.get('entity') as string | null
    const userId = searchParams.get('userId') as string | null
    const dateDebut = searchParams.get('dateDebut') as string | null
    const dateFin = searchParams.get('dateFin') as string | null
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)

    // 3. Construire les filtres
    // Note: AuditLog n'a pas de pharmacieId direct, on filtre via l'utilisateur
    const where: Record<string, unknown> = {}

    if (action) {
      where.action = { contains: action, mode: 'insensitive' }
    }

    if (entity) {
      where.entity = entity
    }

    if (userId) {
      where.userId = userId
    } else {
      // Si pas de userId spécifique, on filtre par pharmacie via les utilisateurs
      const pharmacieUsers = await db.utilisateur.findMany({
        where: { pharmacieId: user.pharmacieId },
        select: { id: true },
      })
      where.userId = { in: pharmacieUsers.map((u) => u.id) }
    }

    if (dateDebut || dateFin) {
      where.createdAt = {
        ...(dateDebut && { gte: new Date(dateDebut) }),
        ...(dateFin && { lte: new Date(dateFin) }),
      }
    }

    // 4. Récupérer les logs paginés
    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ])

    // 5. Retourner les résultats
    return NextResponse.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })

  } catch (error) {
    console.error('Erreur récupération journaux d\'audit:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des journaux d\'audit' },
      { status: 500 }
    )
  }
}
