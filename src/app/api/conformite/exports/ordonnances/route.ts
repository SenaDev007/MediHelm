import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

// GET /api/conformite/exports/ordonnances — Export du rapport d'ordonnances pour une période
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M19_CONFORMITE', 'read')
    if (authResult instanceof Response) return authResult

    const user = authResult
    const { searchParams } = new URL(request.url)

    // Paramètres de période
    const dateDebut = searchParams.get('dateDebut')
      ? new Date(searchParams.get('dateDebut')!)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1) // Début du mois
    const dateFin = searchParams.get('dateFin')
      ? new Date(searchParams.get('dateFin')!)
      : new Date() // Aujourd'hui

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const skip = (page - 1) * limit

    // Récupérer les ordonnances de la période
    const where = {
      pharmacieId: user.pharmacieId,
      dateOrdonnance: { gte: dateDebut, lte: dateFin },
    }

    const [ordonnances, total] = await Promise.all([
      db.ordonnance.findMany({
        where,
        include: {
          lignes: {
            select: {
              dci: true,
              posologie: true,
              quantite: true,
              delivree: true,
            },
          },
          patient: {
            select: {
              nom: true,
              prenom: true,
            },
          },
        },
        orderBy: { dateOrdonnance: 'desc' },
        skip,
        take: limit,
      }),
      db.ordonnance.count({ where }),
    ])

    // Statistiques résumées
    const ordonnancesAvecVente = ordonnances.filter((o) => o.statut === 'VALIDEE').length
    const ordonnancesEnAttente = ordonnances.filter((o) => o.statut === 'RECUE').length
    const totalLignes = ordonnances.reduce((sum, o) => sum + o.lignes.length, 0)
    const lignesDelivrees = ordonnances.reduce(
      (sum, o) => sum + o.lignes.filter((l) => l.delivree).length,
      0
    )

    // Grouper par statut
    const parStatut: Record<string, number> = {}
    for (const o of ordonnances) {
      parStatut[o.statut] = (parStatut[o.statut] || 0) + 1
    }

    // DCI les plus prescrites
    const dciCount: Record<string, number> = {}
    for (const o of ordonnances) {
      for (const l of o.lignes) {
        dciCount[l.dci] = (dciCount[l.dci] || 0) + 1
      }
    }
    const topDcis = Object.entries(dciCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([dci, count]) => ({ dci, count }))

    return NextResponse.json({
      periode: {
        dateDebut,
        dateFin,
      },
      pharmacieId: user.pharmacieId,
      resume: {
        totalOrdonnances: total,
        validees: ordonnancesAvecVente,
        enAttente: ordonnancesEnAttente,
        totalLignes,
        lignesDelivrees,
        tauxDelivrance: totalLignes > 0 ? Math.round((lignesDelivrees / totalLignes) * 100) : 0,
        parStatut,
      },
      topDcis,
      data: ordonnances.map((o) => ({
        id: o.id,
        dateOrdonnance: o.dateOrdonnance,
        prescripteur: o.prescripteur,
        statut: o.statut,
        patient: o.patient ? `${o.patient.prenom} ${o.patient.nom}` : null,
        nbLignes: o.lignes.length,
        lignesDelivrees: o.lignes.filter((l) => l.delivree).length,
        lignes: o.lignes,
        notes: o.notes,
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
    console.error('Erreur lors de l\'export des ordonnances:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'export du rapport d\'ordonnances.' },
      { status: 500 }
    )
  }
}
