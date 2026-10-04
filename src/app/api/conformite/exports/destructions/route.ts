import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

// GET /api/conformite/exports/destructions — Export du rapport de destructions
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M19_CONFORMITE', 'read')
    if (authResult instanceof Response) return authResult

    const user = authResult
    const { searchParams } = new URL(request.url)

    // Paramètres de période
    const dateDebut = searchParams.get('dateDebut')
      ? new Date(searchParams.get('dateDebut')!)
      : new Date(new Date().getFullYear(), 0, 1) // Début d'année par défaut
    const dateFin = searchParams.get('dateFin')
      ? new Date(searchParams.get('dateFin')!)
      : new Date() // Aujourd'hui par défaut

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const skip = (page - 1) * limit

    // Récupérer les mouvements de destruction
    const where = {
      pharmacieId: user.pharmacieId,
      type: 'DESTRUCTION' as const,
      createdAt: { gte: dateDebut, lte: dateFin },
    }

    const [destructions, total] = await Promise.all([
      db.mouvementStock.findMany({
        where,
        include: {
          medicament: {
            select: {
              dci: true,
              nomCommercial: true,
              forme: true,
              dosage: true,
              estStupefiant: true,
            },
          },
          lot: {
            select: {
              numeroLot: true,
              dateExpiration: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.mouvementStock.count({ where }),
    ])

    // Statistiques résumées
    const totalQuantite = destructions.reduce((sum, d) => sum + d.quantite, 0)
    const totalStup = destructions.filter((d) => d.medicament?.estStupefiant).length
    const totalNonStup = destructions.filter((d) => !d.medicament?.estStupefiant).length

    // Grouper par motif
    const parMotif: Record<string, { count: number; quantite: number }> = {}
    for (const d of destructions) {
      const motif = d.motif || 'Non spécifié'
      if (!parMotif[motif]) {
        parMotif[motif] = { count: 0, quantite: 0 }
      }
      parMotif[motif].count++
      parMotif[motif].quantite += d.quantite
    }

    return NextResponse.json({
      periode: {
        dateDebut,
        dateFin,
      },
      pharmacieId: user.pharmacieId,
      resume: {
        totalDestructions: total,
        totalQuantite,
        stupéfiants: totalStup,
        nonStupéfiants: totalNonStup,
        parMotif,
      },
      data: destructions.map((d) => ({
        id: d.id,
        date: d.createdAt,
        dci: d.medicament?.dci,
        nomCommercial: d.medicament?.nomCommercial,
        forme: d.medicament?.forme,
        dosage: d.medicament?.dosage,
        estStupefiant: d.medicament?.estStupefiant,
        numeroLot: d.lot?.numeroLot,
        dateExpiration: d.lot?.dateExpiration,
        quantite: d.quantite,
        motif: d.motif,
        reference: d.reference,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      dateGeneration: new Date(),
    })
  } catch (error) {
    console.error('Erreur lors de l\'export des destructions:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'export du rapport de destructions.' },
      { status: 500 }
    )
  }
}
