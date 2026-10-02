// ============================================================
// MediHelm — Historique des alertes DPMED
// GET /api/alertes/dpmed/historique
// Liste des diffusions d'alertes pour la pharmacie de l'utilisateur
// Filtrage par statut et plage de dates
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    // 1. Authentification + RBAC
    const authResult = await requireAuth(request, 'M18_ALERTES_DPMED', 'read')
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
    const whereDiffusion: Record<string, unknown> = {
      pharmacieId: user.pharmacieId,
    }

    if (statut) {
      whereDiffusion.statut = statut
    }

    if (dateDebut || dateFin) {
      whereDiffusion.createdAt = {
        ...(dateDebut && { gte: new Date(dateDebut) }),
        ...(dateFin && { lte: new Date(dateFin) }),
      }
    }

    // 4. Récupérer les diffusions avec les détails de l'alerte
    const [diffusions, total] = await Promise.all([
      db.diffusionAlerte.findMany({
        where: whereDiffusion,
        include: {
          alerte: {
            select: {
              id: true,
              referenceOfficielle: true,
              titre: true,
              typeAlerte: true,
              niveauUrgence: true,
              dciConcernee: true,
              description: true,
              dateEmissionDPMED: true,
              statut: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.diffusionAlerte.count({
        where: whereDiffusion,
      }),
    ])

    // 5. Retourner les résultats paginés
    return NextResponse.json({
      data: diffusions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })

  } catch (error) {
    console.error('Erreur historique alertes DPMED:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'historique des alertes' },
      { status: 500 }
    )
  }
}
