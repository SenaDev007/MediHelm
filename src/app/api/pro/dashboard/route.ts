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

    // Stock en alerte (médicaments avec stock total <= stockMinimum)
    const medicaments = await db.medicament.findMany({
      where: { pharmacieId, actif: true },
      include: { lots: { select: { quantite: true } } },
    })
    const stockAlerte = medicaments.filter(m => {
      const totalStock = m.lots.reduce((s, l) => s + l.quantite, 0)
      return totalStock <= m.stockMinimum
    }).length

    // Score conformité
    const scoreConf = await db.scoreConformite.findFirst({
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

    // Alertes stock récentes
    const alertesRecentes = await db.alerteStock.findMany({
      where: { pharmacieId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Alertes DPMED non acquittées (via DiffusionAlerte)
    const alertesDPMED = await db.diffusionAlerte.findMany({
      where: { pharmacieId, dateAcquittement: null },
      include: { alerte: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Top produits — use LigneVente aggregation
    const lignesVentes = await db.ligneVente.findMany({
      where: {
        vente: { pharmacieId, statut: { in: ['VALIDEE', 'EN_COURS'] } },
      },
    })
    const productMap = new Map<string, { nom: string; dci: string; quantite: number; montant: number }>()
    for (const lv of lignesVentes) {
      const existing = productMap.get(lv.medicamentId) || { nom: 'Produit', dci: '', quantite: 0, montant: 0 }
      existing.quantite += lv.quantite
      existing.montant += lv.prixTotal
      productMap.set(lv.medicamentId, existing)
    }
    const topProduits = Array.from(productMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.montant - a.montant)
      .slice(0, 5)

    return NextResponse.json({
      caDuJour,
      nbVentesJour,
      stockAlerte,
      scoreConformite: scoreConf?.scoreTotal ?? 0,
      ventesRecentes,
      alertesRecentes,
      alertesDPMED: alertesDPMED.map(d => ({
        id: d.id,
        dateAcquittement: d.dateAcquittement,
        alerte: {
          titre: d.alerte.titre,
          typeAlerte: d.alerte.typeAlerte,
          niveauUrgence: d.alerte.niveauUrgence,
          dateEmissionDPMED: d.alerte.dateEmissionDPMED,
        },
      })),
      alertesExpiration: [],
      topProduits,
      scoreConf: scoreConf ? {
        scoreTotal: scoreConf.scoreTotal,
        scoreRegistreStup: scoreConf.scoreRegistreStup,
        scoreAlerteDPMED: scoreConf.scoreAlerteDPMED,
        scoreDocuments: scoreConf.scoreDocuments,
        scorePharmacovigi: scoreConf.scorePharmacovigilance,
        scoreDestructions: scoreConf.scoreDestructions,
        certificationDPMED: scoreConf.certificationDPMED,
      } : null,
    })
  } catch (error) {
    console.error('Erreur GET dashboard:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération du dashboard' }, { status: 500 })
  }
}
