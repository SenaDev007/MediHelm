import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Benin department centers for map display
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

export async function GET() {
  try {
    // Get pharmacies grouped by department
    const pharmacies = await db.pharmacie.findMany({
      where: { actif: true },
      select: {
        id: true,
        nom: true,
        departement: true,
        ville: true,
        latitude: true,
        longitude: true,
      },
    })

    // Get active surveillance alerts for tension data
    const alertes = await db.medicamentSurveillance.findMany({
      where: { statut: 'ACTIVE' },
      select: { dci: true },
    })

    // Group by department
    const deptData = new Map<string, {
      pharmaciesCount: number
      alertesDCI: Set<string>
    }>()

    pharmacies.forEach(p => {
      const dept = p.departement || 'Littoral'
      if (!deptData.has(dept)) {
        deptData.set(dept, { pharmaciesCount: 0, alertesDCI: new Set() })
      }
      deptData.get(dept)!.pharmaciesCount++
    })

    // Assign alerts to departments (spread across)
    alertes.forEach(a => {
      deptData.forEach(d => {
        d.alertesDCI.add(a.dci)
      })
    })

    // Calculate supply score per department
    // Score is based on: number of pharmacies (more = better), number of active alerts (fewer = better)
    const maxPharmacies = Math.max(...Array.from(deptData.values()).map(d => d.pharmaciesCount), 1)
    const carteApprovisionnement = Array.from(deptData.entries()).map(([dept, data]) => {
      const pharmacyScore = (data.pharmaciesCount / maxPharmacies) * 80
      const alertPenalty = Math.min(data.alertesDCI.size * 5, 30)
      const scoreApprovisionnement = Math.round(Math.max(10, Math.min(100, pharmacyScore + 20 - alertPenalty)))

      return {
        departement: dept,
        scoreApprovisionnement,
        centre: DEPT_CENTERS[dept] || { lat: 9.3, lng: 2.3 },
        pharmaciesCount: data.pharmaciesCount,
        dciEnTension: Array.from(data.alertesDCI).slice(0, 10),
      }
    })

    // If no data, return Benin default departments
    if (carteApprovisionnement.length === 0) {
      return NextResponse.json(
        Object.entries(DEPT_CENTERS).map(([dept, centre]) => ({
          departement: dept,
          scoreApprovisionnement: 50,
          centre,
          pharmaciesCount: 0,
          dciEnTension: [],
        }))
      )
    }

    // Add missing departments with low score
    Object.entries(DEPT_CENTERS).forEach(([dept, centre]) => {
      if (!deptData.has(dept)) {
        carteApprovisionnement.push({
          departement: dept,
          scoreApprovisionnement: 25,
          centre,
          pharmaciesCount: 0,
          dciEnTension: [],
        })
      }
    })

    return NextResponse.json(carteApprovisionnement)
  } catch (error) {
    console.error('Erreur GET carte approvisionnement:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
