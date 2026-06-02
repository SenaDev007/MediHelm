import { db } from '@/lib/db'

export interface StockPrediction {
  medicamentId: string
  medicamentNom: string
  predictedDemand: number
  confidence: number
  currentStock: number
  reorderNeeded: boolean
  suggestedOrderQty: number
}

export interface RevenuePrediction {
  month: string
  predicted: number
  lowerBound: number
  upperBound: number
}

export async function predictStockNeeds(pharmacieId: string): Promise<StockPrediction[]> {
  // Get last 3 months of sales data
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const ventes = await db.ligneVente.findMany({
    where: {
      vente: { pharmacieId, createdAt: { gte: threeMonthsAgo } },
    },
    include: { medicament: true },
  })

  // Aggregate by medicament
  const salesByMed = new Map<string, { nom: string; totalQty: number; count: number }>()
  ventes.forEach(lv => {
    const existing = salesByMed.get(lv.medicamentId) || { nom: lv.medicament.nomCommercial, totalQty: 0, count: 0 }
    existing.totalQty += lv.quantite
    existing.count += 1
    salesByMed.set(lv.medicamentId, existing)
  })

  // Simple moving average prediction
  const predictions: StockPrediction[] = []
  for (const [medId, data] of salesByMed) {
    const monthlyAvg = data.totalQty / 3
    const predictedDemand = Math.round(monthlyAvg * 1.1) // 10% safety margin

    const med = await db.medicament.findUnique({
      where: { id: medId },
      include: { lots: true },
    })

    if (!med) continue

    const currentStock = med.lots.reduce((sum, lot) => sum + lot.quantite, 0)
    const reorderNeeded = currentStock < predictedDemand * 1.5

    predictions.push({
      medicamentId: medId,
      medicamentNom: data.nom,
      predictedDemand,
      confidence: Math.min(0.95, 0.5 + (data.count / 100)),
      currentStock,
      reorderNeeded,
      suggestedOrderQty: reorderNeeded ? Math.round((predictedDemand * 2) - currentStock) : 0,
    })
  }

  return predictions.sort((a, b) => (b.reorderNeeded ? 1 : 0) - (a.reorderNeeded ? 1 : 0))
}

export async function predictRevenue(pharmacieId: string, months: number = 6): Promise<RevenuePrediction[]> {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const ventes = await db.vente.findMany({
    where: { pharmacieId, createdAt: { gte: sixMonthsAgo }, statut: 'VALIDEE' },
    orderBy: { createdAt: 'asc' },
  })

  // Group by month
  const monthlyRevenue = new Map<string, number>()
  ventes.forEach(v => {
    const monthKey = v.createdAt.toISOString().slice(0, 7)
    monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) || 0) + v.montantTotal)
  })

  const revenues = Array.from(monthlyRevenue.values())
  const avgRevenue = revenues.length > 0 ? revenues.reduce((a, b) => a + b, 0) / revenues.length : 0
  const growthRate = revenues.length >= 2 ? (revenues[revenues.length - 1] - revenues[0]) / revenues.length : 0

  const predictions: RevenuePrediction[] = []
  const now = new Date()
  for (let i = 1; i <= months; i++) {
    const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const month = futureDate.toISOString().slice(0, 7)
    const predicted = avgRevenue + growthRate * i
    predictions.push({
      month,
      predicted: Math.round(predicted),
      lowerBound: Math.round(predicted * 0.85),
      upperBound: Math.round(predicted * 1.15),
    })
  }

  return predictions
}
