import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const grossisteId = searchParams.get('grossisteId')

    if (!grossisteId) {
      return NextResponse.json({ error: 'grossisteId requis' }, { status: 400 })
    }

    // Get all orders for this grossiste
    const commandes = await db.commandeGrossiste.findMany({
      where: { grossisteId },
      include: { pharmacie: true },
      orderBy: { dateEnvoi: 'desc' },
    })

    // Get catalogue count
    const catalogueCount = await db.cataloguePrix.count({
      where: { grossisteId },
    })

    const catalogueDisponible = await db.cataloguePrix.count({
      where: { grossisteId, disponible: true },
    })

    // Unique client pharmacies
    const pharmacieIds = [...new Set(commandes.map(c => c.pharmacieId))]

    // KPI calculations
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const commandesRecues = commandes.length
    const commandesEnPreparation = commandes.filter(c =>
      ['CONFIRMEE', 'EN_PREPARATION'].includes(c.statut)
    ).length
    const commandesEnvoyees = commandes.filter(c => c.statut === 'ENVOYEE').length
    const commandesLivrees = commandes.filter(c => c.statut === 'LIVREE').length

    const caMois = commandes
      .filter(c => new Date(c.dateEnvoi) >= startOfMonth && c.statut !== 'REFUSEE')
      .reduce((sum, c) => sum + (c.montantTotal || 0), 0)

    // Status distribution
    const statusDistribution: Record<string, number> = {}
    commandes.forEach(c => {
      statusDistribution[c.statut] = (statusDistribution[c.statut] || 0) + 1
    })

    // Monthly trend (last 6 months)
    const monthlyTrend: Array<{ mois: string; commandes: number; montant: number }> = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const monthCmds = commandes.filter(c => new Date(c.dateEnvoi) >= d && new Date(c.dateEnvoi) < end)
      monthlyTrend.push({
        mois: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        commandes: monthCmds.length,
        montant: monthCmds.reduce((s, c) => s + (c.montantTotal || 0), 0),
      })
    }

    // Top pharmacies by order count
    const pharmacieOrderCount: Record<string, { nom: string; ville: string; count: number; montant: number }> = {}
    commandes.forEach(c => {
      const pId = c.pharmacieId
      if (!pharmacieOrderCount[pId]) {
        pharmacieOrderCount[pId] = {
          nom: c.pharmacie?.nom || 'Inconnu',
          ville: c.pharmacie?.ville || '',
          count: 0,
          montant: 0,
        }
      }
      pharmacieOrderCount[pId].count++
      pharmacieOrderCount[pId].montant += c.montantTotal || 0
    })
    const topPharmacies = Object.entries(pharmacieOrderCount)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Recent orders (last 10)
    const recentOrders = commandes.slice(0, 10)

    return NextResponse.json({
      kpis: {
        commandesRecues,
        commandesEnPreparation,
        commandesEnvoyees,
        commandesLivrees,
        caMois,
        pharmaciesClientes: pharmacieIds.length,
        catalogueCount,
        catalogueDisponible,
      },
      statusDistribution,
      monthlyTrend,
      topPharmacies,
      recentOrders,
    })
  } catch (error) {
    console.error('Erreur GET dashboard grossiste:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des statistiques' }, { status: 500 })
  }
}
