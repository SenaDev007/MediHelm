// ============================================================
// MediHelm — Réceptions SoBAPS (liste)
// GET /api/sobaps/receptions
// Liste des réceptions pour la pharmacie de l'utilisateur
// Permission : M03_COMMANDES read
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    // 1. Authentification + RBAC
    const authResult = await requireAuth(request, 'M03_COMMANDES', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    // 2. Extraire les paramètres de filtre
    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut') as string | null
    const dateDebut = searchParams.get('dateDebut') as string | null
    const dateFin = searchParams.get('dateFin') as string | null
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)

    // 3. Construire les filtres
    const where: Record<string, unknown> = {
      pharmacieId: user.pharmacieId,
    }

    if (statut) {
      where.statut = statut
    }

    if (dateDebut || dateFin) {
      where.dateReception = {
        ...(dateDebut && { gte: new Date(dateDebut) }),
        ...(dateFin && { lte: new Date(dateFin) }),
      }
    }

    // 4. Récupérer les réceptions
    const [receptions, total] = await Promise.all([
      db.receptionGrossiste.findMany({
        where,
        include: {
          ordonnanceGrossiste: {
            select: {
              id: true,
              reference: true,
              statut: true,
              grossisteId: true,
              montantTotal: true,
              createdAt: true,
            },
          },
          pharmacie: {
            select: {
              id: true,
              nom: true,
              ville: true,
            },
          },
        },
        orderBy: { dateReception: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.receptionGrossiste.count({ where }),
    ])

    // 5. Retourner les résultats paginés
    return NextResponse.json({
      data: receptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })

  } catch (error) {
    console.error('Erreur récupération réceptions SoBAPS:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des réceptions' },
      { status: 500 }
    )
  }
}
