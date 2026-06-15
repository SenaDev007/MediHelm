import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/rapports-analytics — Rapports analytiques pour la pharmacie
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M15_ANALYTICS', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const domaine = searchParams.get('domaine') // vente, stock, patient, etc.
    const periode = searchParams.get('periode') || 'mois'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Récupérer les rapports analytiques existants
    const where: Record<string, unknown> = { pharmacieId }
    if (domaine) {
      where.domaine = domaine
    }
    if (periode) {
      where.periode = periode
    }

    const skip = (page - 1) * limit

    const [rapports, total] = await Promise.all([
      db.rapportAnalytique.findMany({
        where,
        orderBy: { genereeLe: 'desc' },
        skip,
        take: limit,
      }),
      db.rapportAnalytique.count({ where }),
    ])

    // Calculer les analytics en temps réel
    const now = new Date()
    const startDate = getStartDate(periode, now)

    // --- Top produits vendus ---
    const ventes = await db.vente.findMany({
      where: {
        pharmacieId,
        statut: 'VALIDEE',
        createdAt: { gte: startDate },
      },
      include: {
        lignes: {
          include: {
            medicament: { select: { id: true, nomCommercial: true, dci: true, forme: true } },
          },
        },
      },
    })

    const produitsMap: Record<string, {
      id: string
      nom: string
      dci: string
      forme: string
      quantite: number
      ca: number
      nbVentes: number
    }> = {}

    for (const vente of ventes) {
      for (const ligne of vente.lignes) {
        const key = ligne.medicamentId
        if (!produitsMap[key]) {
          produitsMap[key] = {
            id: ligne.medicament.id,
            nom: ligne.medicament.nomCommercial,
            dci: ligne.medicament.dci,
            forme: ligne.medicament.forme,
            quantite: 0,
            ca: 0,
            nbVentes: 0,
          }
        }
        produitsMap[key].quantite += ligne.quantite
        produitsMap[key].ca += ligne.prixTotal
        produitsMap[key].nbVentes += 1
      }
    }

    const topProduits = Object.values(produitsMap)
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 20)

    // --- Évolution des ventes par jour/semaine ---
    const evolutionVentes: Array<{ date: string; montant: number; nbVentes: number }> = []
    const venteParDate: Record<string, { montant: number; nbVentes: number }> = {}

    for (const vente of ventes) {
      const dateKey = vente.createdAt.toISOString().split('T')[0]
      if (!venteParDate[dateKey]) {
        venteParDate[dateKey] = { montant: 0, nbVentes: 0 }
      }
      venteParDate[dateKey].montant += vente.montantTotal
      venteParDate[dateKey].nbVentes += 1
    }

    for (const [date, stats] of Object.entries(venteParDate)) {
      evolutionVentes.push({ date, ...stats })
    }
    evolutionVentes.sort((a, b) => a.date.localeCompare(b.date))

    // --- Prédictions IA ---
    const predictions = await db.predictionIA.findMany({
      where: { pharmacieId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // --- Stats résumées ---
    const caTotal = ventes.reduce((sum, v) => sum + v.montantTotal, 0)
    const nbVentesTotal = ventes.length
    const panierMoyen = nbVentesTotal > 0 ? caTotal / nbVentesTotal : 0

    // --- Stats patients ---
    const nbPatients = await db.patient.count({
      where: { pharmacieId },
    })

    return NextResponse.json({
      rapports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      analytics: {
        topProduits,
        evolutionVentes,
        predictions,
        resume: {
          ca: caTotal,
          nbVentes: nbVentesTotal,
          panierMoyen,
          nbPatients,
        },
      },
    })
  } catch (error) {
    console.error('Erreur GET rapports-analytics:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des rapports analytiques' },
      { status: 500 }
    )
  }
}

function getStartDate(periode: string, now: Date): Date {
  switch (periode) {
    case 'jour':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    case 'semaine': {
      const dayOfWeek = now.getDay()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff)
    }
    case 'mois':
      return new Date(now.getFullYear(), now.getMonth(), 1)
    case 'trimestre': {
      const quarter = Math.floor(now.getMonth() / 3)
      return new Date(now.getFullYear(), quarter * 3, 1)
    }
    case 'annee':
      return new Date(now.getFullYear(), 0, 1)
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1)
  }
}
