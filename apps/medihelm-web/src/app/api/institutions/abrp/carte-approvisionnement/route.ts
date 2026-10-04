import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

// Department centers for Benin
const DEPT_CENTERS: Record<string, { lat: number; lng: number }> = {
  'Littoral': { lat: 6.3703, lng: 2.3912 },
  'Atlantique': { lat: 6.4919, lng: 2.0239 },
  'Ouémé': { lat: 6.5333, lng: 2.6167 },
  'Plateau': { lat: 7.3000, lng: 2.5500 },
  'Zou': { lat: 7.3833, lng: 2.0667 },
  'Collines': { lat: 7.8500, lng: 2.2500 },
  'Borgou': { lat: 9.3000, lng: 2.6167 },
  'Alibori': { lat: 10.8000, lng: 2.9500 },
  'Atacora': { lat: 10.3167, lng: 1.3833 },
  'Donga': { lat: 9.7000, lng: 1.6667 },
  'Mono': { lat: 6.3333, lng: 1.7833 },
  'Couffo': { lat: 7.1667, lng: 1.9500 },
}

// City to department mapping
function getDepartmentFromCity(ville: string): string {
  if (ville.includes('Porto') || ville.includes('Natitingou')) return 'Atacora'
  if (ville.includes('Parakou')) return 'Borgou'
  if (ville.includes('Malanville') || ville.includes('Kandi')) return 'Alibori'
  if (ville.includes('Abomey') || ville.includes('Bohicon')) return 'Zou'
  if (ville.includes('Savalou') || ville.includes('Dassa')) return 'Collines'
  if (ville.includes('Porto-Novo') || ville.includes('Adjara')) return 'Ouémé'
  if (ville.includes('Kétou') || ville.includes('Pobè')) return 'Plateau'
  if (ville.includes('Lokossa') || ville.includes('Athiémé')) return 'Mono'
  if (ville.includes('Dogbo') || ville.includes('Aplahoué')) return 'Couffo'
  if (ville.includes('Allada') || ville.includes('Ouidah') || ville.includes('Tori')) return 'Atlantique'
  if (ville.includes('Cotonou')) return 'Littoral'
  if (ville.includes('Djougou')) return 'Donga'
  return 'Littoral'
}

interface PharmacieWithStats {
  id: string
  ville: string
  alertesCount: number
  rupturesCount: number
  pendingOrdersCount: number
  dciTensions: string[]
}

export async function GET(request: Request) {
  // Auth: ABRP_VIEWER or PLATFORM_ADMIN required
  const auth = await requireAuth(request, 'M15_ANALYTICS', 'read')
  if (auth instanceof Response) return auth

  try {
    // Get all active pharmacies
    const pharmacies = await db.pharmacie.findMany({
      where: { actif: true },
      select: {
        id: true,
        ville: true,
      },
    })

    // Get stock alert stats per pharmacy
    const alertesByPharmacie = await db.alerteStock.groupBy({
      by: ['pharmacieId'],
      where: { type: { in: ['RUPTURE', 'SEUIL_MINIMUM'] } },
      _count: { id: true },
    })

    // Get rupture alerts per pharmacy
    const rupturesByPharmacie = await db.alerteStock.groupBy({
      by: ['pharmacieId'],
      where: { type: 'RUPTURE' },
      _count: { id: true },
    })

    // Get pending orders per pharmacy
    const ordersByPharmacie = await db.commandeFournisseur.groupBy({
      by: ['pharmacieId'],
      where: { statut: { in: ['ENVOYEE', 'CONFIRMEE'] } },
      _count: { id: true },
    })

    // Get DCI tensions from stock alerts
    const alerteStocksWithMed = await db.alerteStock.findMany({
      where: { type: { in: ['RUPTURE', 'SEUIL_MINIMUM'] } },
      select: {
        pharmacieId: true,
        medicament: { select: { dci: true } },
      },
    })

    // Build pharmacy stats map
    const alertesMap = new Map(alertesByPharmacie.map(a => [a.pharmacieId, a._count.id]))
    const rupturesMap = new Map(rupturesByPharmacie.map(r => [r.pharmacieId, r._count.id]))
    const ordersMap = new Map(ordersByPharmacie.map(o => [o.pharmacieId, o._count.id]))

    // DCI tensions per pharmacy
    const dciByPharmacie = new Map<string, Set<string>>()
    alerteStocksWithMed.forEach(a => {
      const dci = a.medicament?.dci
      if (!dci) return
      if (!dciByPharmacie.has(a.pharmacieId)) dciByPharmacie.set(a.pharmacieId, new Set())
      dciByPharmacie.get(a.pharmacieId)!.add(dci)
    })

    // Build enriched pharmacy data
    const enrichedPharmacies: PharmacieWithStats[] = pharmacies.map(p => ({
      id: p.id,
      ville: p.ville,
      alertesCount: alertesMap.get(p.id) || 0,
      rupturesCount: rupturesMap.get(p.id) || 0,
      pendingOrdersCount: ordersMap.get(p.id) || 0,
      dciTensions: Array.from(dciByPharmacie.get(p.id) || []),
    }))

    // Group pharmacies by department
    const deptPharmaciesMap = new Map<string, PharmacieWithStats[]>()

    enrichedPharmacies.forEach(p => {
      const dept = getDepartmentFromCity(p.ville)
      if (!deptPharmaciesMap.has(dept)) deptPharmaciesMap.set(dept, [])
      deptPharmaciesMap.get(dept)!.push(p)
    })

    // Calculate supply score per department
    const departementData = Array.from(deptPharmaciesMap.entries()).map(([dept, pharms]) => {
      const pharmaciesCount = pharms.length
      const totalRuptures = pharms.reduce((acc, p) => acc + p.rupturesCount, 0)
      const totalAlertes = pharms.reduce((acc, p) => acc + p.alertesCount, 0)
      const pendingOrders = pharms.reduce((acc, p) => acc + p.pendingOrdersCount, 0)

      // Supply score: 100 = perfect, decreases with ruptures and alerts
      let score = 100
      if (pharmaciesCount > 0) {
        score = Math.max(0, Math.round(100 - (totalRuptures / pharmaciesCount) * 30 - (totalAlertes / pharmaciesCount) * 20 - (pendingOrders / pharmaciesCount) * 10))
      }

      // DCIs in tension for this department
      const dciTensionMap = new Map<string, number>()
      pharms.forEach(p => {
        p.dciTensions.forEach(dci => {
          dciTensionMap.set(dci, (dciTensionMap.get(dci) || 0) + 1)
        })
      })
      const dciEnTension = Array.from(dciTensionMap.entries())
        .filter(([, count]) => count > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([dci]) => dci)

      return {
        departement: dept,
        scoreApprovisionnement: score,
        centre: DEPT_CENTERS[dept] || { lat: 6.3703, lng: 2.3912 },
        pharmaciesCount,
        dciEnTension,
      }
    })

    return NextResponse.json({
      departements: departementData,
      summary: {
        totalDepartements: departementData.length,
        bienApprovisionnes: departementData.filter(d => d.scoreApprovisionnement >= 70).length,
        tensionModeree: departementData.filter(d => d.scoreApprovisionnement >= 50 && d.scoreApprovisionnement < 70).length,
        sousApprovisionnes: departementData.filter(d => d.scoreApprovisionnement < 50).length,
      },
    })
  } catch (error) {
    console.error('Erreur carte approvisionnement:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des données d\'approvisionnement' },
      { status: 500 }
    )
  }
}
