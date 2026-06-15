import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

/**
 * GET /api/grossistes/dashboard
 * Aggregate KPIs from CommandeGrossiste + ProduitGrossiste for a given grossiste.
 * Query: ?grossisteId=xxx
 * Requires: M17_GROSSISTES read
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'read')
  if (auth instanceof Response) return auth

  try {
    const { searchParams } = new URL(request.url)
    const grossisteId = searchParams.get('grossisteId')

    if (!grossisteId) {
      return NextResponse.json(
        { error: 'grossisteId est requis' },
        { status: 400 }
      )
    }

    // Verify grossiste exists
    const grossiste = await db.grossiste.findUnique({ where: { id: grossisteId } })
    if (!grossiste) {
      return NextResponse.json(
        { error: 'Grossiste non trouvé' },
        { status: 404 }
      )
    }

    // ─── Command stats ───────────────────────────────────────────
    const totalCommandes = await db.commandeGrossiste.count({
      where: { grossisteId },
    })

    const commandesParStatut = await db.commandeGrossiste.groupBy({
      by: ['statut'],
      where: { grossisteId },
      _count: { id: true },
      _sum: { montantTotal: true },
    })

    // Revenue this month
    const now = new Date()
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1)
    const commandesMois = await db.commandeGrossiste.findMany({
      where: {
        grossisteId,
        createdAt: { gte: debutMois },
      },
      select: { montantTotal: true },
    })
    const caMois = commandesMois.reduce((acc, c) => acc + c.montantTotal, 0)

    // ─── Catalogue stats ─────────────────────────────────────────
    const catalogueCount = await db.produitGrossiste.count({
      where: { grossisteId },
    })
    const catalogueDisponible = await db.produitGrossiste.count({
      where: { grossisteId, actif: true, quantiteDispo: { gt: 0 } },
    })

    // ─── Unique pharmacies ───────────────────────────────────────
    const pharmaciesClientes = await db.commandeGrossiste.groupBy({
      by: ['pharmacieId'],
      where: { grossisteId, pharmacieId: { not: null } },
    })

    // ─── Monthly trend (6 months) ────────────────────────────────
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const commandesAll = await db.commandeGrossiste.findMany({
      where: {
        grossisteId,
        createdAt: { gte: sixMonthsAgo },
      },
      select: { createdAt: true, montantTotal: true, statut: true },
    })

    const monthlyTrend: Array<{ mois: string; commandes: number; montant: number }> = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = d.toLocaleDateString('fr-FR', {
        month: 'short',
        year: '2-digit',
      })
      const monthOrders = commandesAll.filter(c => {
        const cd = new Date(c.createdAt)
        return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear()
      })
      monthlyTrend.push({
        mois: monthStr,
        commandes: monthOrders.length,
        montant: monthOrders.reduce((acc, c) => acc + c.montantTotal, 0),
      })
    }

    // ─── Top pharmacies ──────────────────────────────────────────
    const topPharmaciesRaw = await db.commandeGrossiste.groupBy({
      by: ['pharmacieId'],
      where: { grossisteId, pharmacieId: { not: null } },
      _count: { id: true },
      _sum: { montantTotal: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    })
    const pharmaIds = topPharmaciesRaw
      .map(t => t.pharmacieId!)
      .filter(Boolean)
    const pharmaDetails = pharmaIds.length > 0
      ? await db.pharmacie.findMany({
          where: { id: { in: pharmaIds } },
          select: { id: true, nom: true, ville: true },
        })
      : []
    const pharmaMap = new Map(pharmaDetails.map(p => [p.id, p]))
    const topPharmacies = topPharmaciesRaw.map(t => ({
      ...pharmaMap.get(t.pharmacieId!),
      count: t._count.id,
      montant: t._sum.montantTotal || 0,
    }))

    // ─── Top products by sales volume ────────────────────────────
    const topProductsRaw = await db.ligneCommandeGrossiste.groupBy({
      by: ['dci', 'nomCommercial'],
      where: {
        commande: { grossisteId },
      },
      _sum: { quantite: true, montant: true },
      _count: { id: true },
      orderBy: { _sum: { quantite: 'desc' } },
      take: 10,
    })
    const topProducts = topProductsRaw.map(p => ({
      dci: p.dci,
      nomCommercial: p.nomCommercial || p.dci,
      totalQuantite: p._sum.quantite || 0,
      totalMontant: p._sum.montant || 0,
      nombreCommandes: p._count.id,
    }))

    // ─── Recent orders ───────────────────────────────────────────
    const recentOrders = await db.commandeGrossiste.findMany({
      where: { grossisteId },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        grossiste: {
          select: { id: true, nom: true, slug: true },
        },
        lignes: true,
      },
    })

    // Fetch pharmacie data for recent orders
    const recentPharmacieIds = recentOrders
      .map(c => c.pharmacieId)
      .filter(Boolean) as string[]
    const recentPharmacies =
      recentPharmacieIds.length > 0
        ? await db.pharmacie.findMany({
            where: { id: { in: recentPharmacieIds } },
            select: {
              id: true,
              nom: true,
              ville: true,
              adresse: true,
              telephone: true,
            },
          })
        : []
    const recentPharmaMap = new Map(recentPharmacies.map(p => [p.id, p]))

    const mappedRecentOrders = recentOrders.map(c => ({
      ...c,
      referenceGrossiste: c.reference,
      dateEnvoi: c.createdAt,
      dateConfirmation: null,
      dateLivraisonPrev: null,
      dateLivraisonReelle: null,
      montantTotal: c.montantTotal || 0,
      payload: {},
      reponseGrossiste: null,
      pharmacie: c.pharmacieId
        ? recentPharmaMap.get(c.pharmacieId) || null
        : null,
    }))

    // ─── Status distribution ─────────────────────────────────────
    const statusDistribution: Record<string, number> = {}
    commandesParStatut.forEach(s => {
      statusDistribution[s.statut] = s._count.id
    })

    return NextResponse.json({
      kpis: {
        commandesRecues: totalCommandes,
        commandesEnPreparation: await db.commandeGrossiste.count({
          where: { grossisteId, statut: 'EN_PREPARATION' },
        }),
        commandesEnvoyees: await db.commandeGrossiste.count({
          where: { grossisteId, statut: 'ENVOYEE' },
        }),
        commandesLivrees: await db.commandeGrossiste.count({
          where: { grossisteId, statut: 'LIVREE' },
        }),
        caMois,
        pharmaciesClientes: pharmaciesClientes.length,
        catalogueCount,
        catalogueDisponible,
      },
      statusDistribution,
      monthlyTrend,
      topPharmacies,
      topProducts,
      recentOrders: mappedRecentOrders,
    })
  } catch (error) {
    console.error('Erreur dashboard grossiste:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement du tableau de bord' },
      { status: 500 }
    )
  }
}
