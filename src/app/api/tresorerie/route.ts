import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/tresorerie — Résumé de trésorerie pour la pharmacie
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M08_FINANCE', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const periode = searchParams.get('periode') || 'mois' // jour, semaine, mois, annee
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')

    // Calculer la plage de dates selon la période
    const now = new Date()
    let startDate: Date

    if (dateDebut) {
      startDate = new Date(dateDebut)
    } else {
      switch (periode) {
        case 'jour':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'semaine': {
          const dayOfWeek = now.getDay()
          const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Lundi = début de semaine
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff)
          break
        }
        case 'mois':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'annee':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      }
    }

    const endDate = dateFin ? new Date(dateFin + 'T23:59:59.999Z') : now

    // Récupérer les écritures comptables pour la période
    const ecritures = await db.ecritureComptable.findMany({
      where: {
        pharmacieId,
        dateEcriture: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { dateEcriture: 'desc' },
    })

    // Calculer les entrées (ENTREE) et sorties (SORTIE)
    const entrees = ecritures
      .filter((e) => e.type === 'ENTREE')
      .reduce((sum, e) => sum + e.montant, 0)

    const sorties = ecritures
      .filter((e) => e.type === 'SORTIE')
      .reduce((sum, e) => sum + e.montant, 0)

    const solde = entrees - sorties

    // Détail par type
    const detailsParType: Record<string, number> = {}
    for (const ecriture of ecritures) {
      const key = ecriture.type
      detailsParType[key] = (detailsParType[key] || 0) + ecriture.montant
    }

    // Récupérer aussi les ventes validées pour le CA
    const ventes = await db.vente.findMany({
      where: {
        pharmacieId,
        statut: 'VALIDEE',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        montantTotal: true,
        montantPaye: true,
        montantAssur: true,
        remise: true,
        modePaiement: true,
      },
    })

    const caTotal = ventes.reduce((sum, v) => sum + v.montantTotal, 0)
    const caPaye = ventes.reduce((sum, v) => sum + v.montantPaye, 0)
    const caAssur = ventes.reduce((sum, v) => sum + v.montantAssur, 0)
    const totalRemises = ventes.reduce((sum, v) => sum + v.remise, 0)

    // Ventes par mode de paiement
    const ventesParMode: Record<string, { count: number; montant: number }> = {}
    for (const vente of ventes) {
      const mode = vente.modePaiement
      if (!ventesParMode[mode]) {
        ventesParMode[mode] = { count: 0, montant: 0 }
      }
      ventesParMode[mode].count += 1
      ventesParMode[mode].montant += vente.montantTotal
    }

    // Récupérer le solde antérieur (avant la période)
    const ecrituresAnterieures = await db.ecritureComptable.findMany({
      where: {
        pharmacieId,
        dateEcriture: { lt: startDate },
      },
      select: { type: true, montant: true },
    })

    const entreesAnterieures = ecrituresAnterieures
      .filter((e) => e.type === 'ENTREE')
      .reduce((sum, e) => sum + e.montant, 0)
    const sortiesAnterieures = ecrituresAnterieures
      .filter((e) => e.type === 'SORTIE')
      .reduce((sum, e) => sum + e.montant, 0)
    const soldeAnterieur = entreesAnterieures - sortiesAnterieures

    return NextResponse.json({
      periode: {
        type: periode,
        debut: startDate.toISOString(),
        fin: endDate.toISOString(),
      },
      tresorerie: {
        entrees,
        sorties,
        solde,
        soldeAnterieur,
        soldeCumule: soldeAnterieur + solde,
      },
      chiffreAffaires: {
        total: caTotal,
        paye: caPaye,
        assurance: caAssur,
        remises: totalRemises,
        nbVentes: ventes.length,
        panierMoyen: ventes.length > 0 ? caTotal / ventes.length : 0,
      },
      ventesParMode,
      detailsParType,
      nbEcritures: ecritures.length,
    })
  } catch (error) {
    console.error('Erreur GET tresorerie:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la trésorerie' },
      { status: 500 }
    )
  }
}
