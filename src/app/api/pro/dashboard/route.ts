import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    // CA du jour
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const ventesAujourdhui = await db.vente.findMany({
      where: {
        pharmacieId,
        createdAt: { gte: today },
        statut: { in: ['VALIDEE', 'EN_COURS'] },
      },
      select: { montantTotal: true },
    })
    const caDuJour = ventesAujourdhui.reduce((sum, v) => sum + v.montantTotal, 0)

    // Nombre de ventes du jour
    const nbVentesJour = ventesAujourdhui.length

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

    // Ventes des 7 derniers jours pour graphique
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const ventesRecentes = await db.vente.findMany({
      where: {
        pharmacieId,
        createdAt: { gte: sevenDaysAgo },
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
    })
  } catch (error) {
    console.error('Erreur GET dashboard:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération du dashboard' }, { status: 500 })
  }
}
