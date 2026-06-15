import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/rapports-financiers — Rapport financier pour la pharmacie
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M08_FINANCE', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'mensuel' // journalier, hebdomadaire, mensuel, trimestriel
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')

    // Calculer la plage de dates selon le type de rapport
    const now = new Date()
    let startDate: Date
    let endDate: Date = dateFin ? new Date(dateFin + 'T23:59:59.999Z') : now

    if (dateDebut) {
      startDate = new Date(dateDebut)
    } else {
      switch (type) {
        case 'journalier':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'hebdomadaire': {
          const dayOfWeek = now.getDay()
          const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff)
          break
        }
        case 'mensuel':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'trimestriel': {
          const quarter = Math.floor(now.getMonth() / 3)
          startDate = new Date(now.getFullYear(), quarter * 3, 1)
          break
        }
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      }
    }

    // --- Chiffre d'affaires ---
    const ventes = await db.vente.findMany({
      where: {
        pharmacieId,
        statut: 'VALIDEE',
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        lignes: {
          include: {
            medicament: { select: { id: true, nomCommercial: true, dci: true } },
          },
        },
        paiements: true,
      },
    })

    const caTotal = ventes.reduce((sum, v) => sum + v.montantTotal, 0)
    const caPaye = ventes.reduce((sum, v) => sum + v.montantPaye, 0)
    const caAssur = ventes.reduce((sum, v) => sum + v.montantAssur, 0)
    const totalRemises = ventes.reduce((sum, v) => sum + v.remise, 0)

    // --- Marges (estimées: prixPublic - prixAchat pour chaque ligne) ---
    let margeTotale = 0
    const lignesDetail: Array<{
      medicament: string
      dci: string
      quantite: number
      ca: number
    }> = []

    for (const vente of ventes) {
      for (const ligne of vente.lignes) {
        const caLigne = ligne.prixTotal
        // Estimation de la marge (on utilise un taux moyen de 30% si pas de données d'achat)
        const margeEstimee = caLigne * 0.3
        margeTotale += margeEstimee

        lignesDetail.push({
          medicament: ligne.medicament.nomCommercial,
          dci: ligne.medicament.dci,
          quantite: ligne.quantite,
          ca: caLigne,
        })
      }
    }

    const tauxMarge = caTotal > 0 ? (margeTotale / caTotal) * 100 : 0

    // --- TVA collectée (estimée à 18% au Bénin) ---
    const tauxTVA = 0.18
    const tvaCollectee = caTotal * (tauxTVA / (1 + tauxTVA))

    // --- Dépenses (écritures SORTIE) ---
    const ecrituresSortie = await db.ecritureComptable.findMany({
      where: {
        pharmacieId,
        type: 'SORTIE',
        dateEcriture: { gte: startDate, lte: endDate },
      },
    })

    const totalDepenses = ecrituresSortie.reduce((sum, e) => sum + e.montant, 0)

    // Dépenses par catégorie
    const depensesParCategorie: Record<string, number> = {}
    for (const ecriture of ecrituresSortie) {
      const cat = ecriture.libelle || 'Autre'
      depensesParCategorie[cat] = (depensesParCategorie[cat] || 0) + ecriture.montant
    }

    // --- Entrées (écritures ENTREE) ---
    const ecrituresEntree = await db.ecritureComptable.findMany({
      where: {
        pharmacieId,
        type: 'ENTREE',
        dateEcriture: { gte: startDate, lte: endDate },
      },
    })

    const totalEntrees = ecrituresEntree.reduce((sum, e) => sum + e.montant, 0)

    // --- Ventes par mode de paiement ---
    const ventesParMode: Record<string, { count: number; montant: number }> = {}
    for (const vente of ventes) {
      const mode = vente.modePaiement
      if (!ventesParMode[mode]) {
        ventesParMode[mode] = { count: 0, montant: 0 }
      }
      ventesParMode[mode].count += 1
      ventesParMode[mode].montant += vente.montantTotal
    }

    // --- Top produits vendus ---
    const produitsMap: Record<string, { nom: string; dci: string; quantite: number; ca: number }> = {}
    for (const vente of ventes) {
      for (const ligne of vente.lignes) {
        const key = ligne.medicamentId
        if (!produitsMap[key]) {
          produitsMap[key] = {
            nom: ligne.medicament.nomCommercial,
            dci: ligne.medicament.dci,
            quantite: 0,
            ca: 0,
          }
        }
        produitsMap[key].quantite += ligne.quantite
        produitsMap[key].ca += ligne.prixTotal
      }
    }

    const topProduits = Object.values(produitsMap)
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 10)

    // --- Résultat net ---
    const resultatNet = caTotal + totalEntrees - totalDepenses

    // --- Période précédente pour comparaison ---
    const periodDuration = endDate.getTime() - startDate.getTime()
    const prevStartDate = new Date(startDate.getTime() - periodDuration)
    const prevEndDate = new Date(startDate.getTime() - 1)

    const ventesPrecedentes = await db.vente.findMany({
      where: {
        pharmacieId,
        statut: 'VALIDEE',
        createdAt: { gte: prevStartDate, lte: prevEndDate },
      },
      select: { montantTotal: true },
    })

    const caPrecedent = ventesPrecedentes.reduce((sum, v) => sum + v.montantTotal, 0)
    const evolutionCA = caPrecedent > 0 ? ((caTotal - caPrecedent) / caPrecedent) * 100 : 0

    return NextResponse.json({
      type,
      periode: {
        debut: startDate.toISOString(),
        fin: endDate.toISOString(),
      },
      chiffreAffaires: {
        total: caTotal,
        paye: caPaye,
        assurance: caAssur,
        remises: totalRemises,
        nbVentes: ventes.length,
        panierMoyen: ventes.length > 0 ? caTotal / ventes.length : 0,
        evolution: evolutionCA,
        precedent: caPrecedent,
      },
      marges: {
        totale: margeTotale,
        taux: tauxMarge,
      },
      tva: {
        taux: tauxTVA * 100,
        collectee: tvaCollectee,
      },
      depenses: {
        total: totalDepenses,
        parCategorie: depensesParCategorie,
      },
      entrees: {
        total: totalEntrees,
      },
      resultatNet,
      ventesParMode,
      topProduits,
    })
  } catch (error) {
    console.error('Erreur GET rapports-financiers:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du rapport financier' },
      { status: 500 }
    )
  }
}
