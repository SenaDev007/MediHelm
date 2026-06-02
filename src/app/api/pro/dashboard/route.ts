import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const periode = searchParams.get('periode') || '7j'

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    const days = periode === '30j' ? 30 : periode === '14j' ? 14 : 7
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - days)
    periodStart.setHours(0, 0, 0, 0)

    // CA total de la période
    const ventesPeriode = await db.vente.findMany({
      where: {
        pharmacieId,
        createdAt: { gte: periodStart },
        statut: { in: ['VALIDEE', 'EN_COURS'] },
      },
      select: { montantTotal: true },
    })
    const caDuJour = ventesPeriode.reduce((sum, v) => sum + v.montantTotal, 0)

    // Nombre de ventes de la période
    const nbVentesJour = ventesPeriode.length

    // Stock en alerte (médicaments avec stock total <= stockMin)
    const medicaments = await db.medicament.findMany({
      where: { pharmacieId, actif: true },
      include: { lots: { select: { quantite: true } } },
    })
    const stockAlerte = medicaments.filter(m => {
      const totalStock = m.lots.reduce((s, l) => s + l.quantite, 0)
      return totalStock <= m.stockMin
    }).length

    // Score conformité
    const scoreConf = await db.scoreConformite.findUnique({
      where: { pharmacieId },
    })

    // Ventes de la période pour graphique
    const ventesRecentes = await db.vente.findMany({
      where: {
        pharmacieId,
        createdAt: { gte: periodStart },
        statut: { in: ['VALIDEE', 'EN_COURS'] },
      },
      select: { montantTotal: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    // Alertes récentes
    const alertesRecentes = await db.alerteOperationnelle.findMany({
      where: { pharmacieId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Alertes DPMED non acquittées
    const diffusions = await db.diffusionAlerte.findMany({
      where: { pharmacieId, dateAcquittement: null },
      include: { alerte: { include: { medicamentSurv: true } } },
      orderBy: { dateEnvoi: 'desc' },
      take: 5,
    })

    // Alertes expiration
    const alertesExpiration = await db.alerteExpiration.findMany({
      where: { pharmacieId, joursRestants: { lte: 90 } },
      include: { lot: { include: { medicament: true } } },
      orderBy: { joursRestants: 'asc' },
      take: 5,
    })

    // Top produits
    const lignesVentes = await db.ligneVente.findMany({
      where: {
        vente: { pharmacieId, statut: { in: ['VALIDEE', 'EN_COURS'] } },
      },
      include: { medicament: true },
    })
    const productMap = new Map<string, { nom: string; dci: string; quantite: number; montant: number }>()
    for (const lv of lignesVentes) {
      const existing = productMap.get(lv.medicamentId) || { nom: lv.medicament.nomCommercial, dci: lv.medicament.dci, quantite: 0, montant: 0 }
      existing.quantite += lv.quantite
      existing.montant += lv.montant
      productMap.set(lv.medicamentId, existing)
    }
    const topProduits = Array.from(productMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.montant - a.montant)
      .slice(0, 5)

    // Score pharmacie (radar)
    const scorePharmacie = await db.scorePharmacie.findFirst({
      where: { pharmacieId },
      orderBy: { calculatedAt: 'desc' },
    })

    // === Pharmacovigilance domain data ===
    const signalementsPeriode = await db.signalementEI.findMany({
      where: {
        pharmacieId,
        createdAt: { gte: periodStart },
      },
      select: { gravite: true, statutEnvoi: true },
    })

    const eiStats = {
      total: signalementsPeriode.length,
      leger: signalementsPeriode.filter(s => s.gravite === 'LEGER').length,
      modere: signalementsPeriode.filter(s => s.gravite === 'MODERE').length,
      grave: signalementsPeriode.filter(s => s.gravite === 'GRAVE').length,
      fatal: signalementsPeriode.filter(s => s.gravite === 'FATAL').length,
      enAttente: signalementsPeriode.filter(s => s.statutEnvoi === 'EN_ATTENTE').length,
      soumis: signalementsPeriode.filter(s => s.statutEnvoi === 'SOUMIS').length,
    }

    const surveillancesActives = await db.medicamentSurveillance.count({
      where: { statut: 'ACTIVE' },
    })

    // === Conformité domain data ===
    const conformiteData = {
      scoreTotal: scoreConf?.scoreTotal ?? 0,
      scoreRegistreStup: scoreConf?.scoreRegistreStup ?? 0,
      scoreAlerteDPMED: scoreConf?.scoreAlerteDPMED ?? 0,
      scoreDocuments: scoreConf?.scoreDocuments ?? 0,
      scorePharmacovigi: scoreConf?.scorePharmacovigi ?? 0,
      scoreDestructions: scoreConf?.scoreDestructions ?? 0,
      certificationDPMED: scoreConf?.certificationDPMED ?? false,
      pendingAlertesDPMED: diffusions.length,
      documentsExpirant: await db.documentReglementaire.count({
        where: { pharmacieId, statut: 'EXPIRE_BIENTOT' },
      }),
    }

    // Predictions
    const predictions = await db.predictionIA.findMany({
      where: { pharmacieId },
      orderBy: { datePrediction: 'desc' },
      take: 6,
    })

    return NextResponse.json({
      caDuJour,
      nbVentesJour,
      stockAlerte,
      scoreConformite: scoreConf?.scoreTotal ?? 0,
      ventesRecentes,
      alertesRecentes,
      alertesDPMED: diffusions.map(d => ({
        ...d,
        alerte: d.alerte,
      })),
      alertesExpiration,
      topProduits,
      scorePharmacie,
      scoreConf,
      eiStats,
      surveillancesActives,
      conformiteData,
      predictions,
    })
  } catch (error) {
    console.error('Erreur GET dashboard:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération du dashboard' }, { status: 500 })
  }
}
