// Vérification des données géographiques : officines hors limites de leur département
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Boîtes englobantes des 12 départements du Bénin (lat/lng) — mêmes bornes que fix-geocodage-outliers.ts
const DEPT_BOUNDS: Record<string, { latMin: number; latMax: number; lngMin: number; lngMax: number }> = {
  ALIBORI:    { latMin: 10.9, latMax: 12.0, lngMin: 2.55, lngMax: 3.65 },
  ATACORA:    { latMin: 9.9,  latMax: 11.15, lngMin: 0.75, lngMax: 2.15 },
  DONGA:      { latMin: 9.3,  latMax: 9.95, lngMin: 1.15, lngMax: 1.95 },
  BORGOU:     { latMin: 8.7,  latMax: 10.45, lngMin: 2.15, lngMax: 3.35 },
  LITTORAL:   { latMin: 6.15, latMax: 6.48, lngMin: 2.25, lngMax: 2.55 },
  ATLANTIQUE: { latMin: 6.15, latMax: 6.95, lngMin: 1.85, lngMax: 2.45 },
  OUEME:      { latMin: 6.15, latMax: 6.85, lngMin: 2.25, lngMax: 2.95 },
  PLATEAU:    { latMin: 6.55, latMax: 7.45, lngMin: 2.15, lngMax: 2.95 },
  COUFFO:     { latMin: 6.65, latMax: 7.15, lngMin: 1.45, lngMax: 2.05 },
  ZOU:        { latMin: 6.9,  latMax: 7.55, lngMin: 1.85, lngMax: 2.45 },
  COLLINES:   { latMin: 7.35, latMax: 8.65, lngMin: 1.65, lngMax: 2.65 },
  MONO:       { latMin: 6.15, latMax: 6.75, lngMin: 1.55, lngMax: 2.05 },
}

// Frontières approximatives du Bénin (pour détecter les points hors du pays)
const BENIN = { latMin: 6.05, latMax: 12.45, lngMin: 0.7, lngMax: 3.9 }

async function main() {
  const pharmacies = await prisma.pharmacie.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    select: { id: true, nom: true, ville: true, departement: true, latitude: true, longitude: true, numeroAbmed: true },
  })
  console.log(`Officines géolocalisées : ${pharmacies.length}`)

  const outBenin = pharmacies.filter(p =>
    p.latitude! < BENIN.latMin || p.latitude! > BENIN.latMax ||
    p.longitude! < BENIN.lngMin || p.longitude! > BENIN.lngMax)
  console.log(`\n=== HORS DU BÉNIN : ${outBenin.length} ===`)
  for (const o of outBenin) {
    console.log(`  ✗ ${o.nom} (${o.ville}, ${o.departement}, ${o.numeroAbmed ?? '-'}) @ ${o.latitude!.toFixed(4)},${o.longitude!.toFixed(4)}`)
  }

  const outliers = pharmacies.filter(p => {
    const b = p.departement ? DEPT_BOUNDS[p.departement] : undefined
    if (!b) return false
    return p.latitude! < b.latMin || p.latitude! > b.latMax || p.longitude! < b.lngMin || p.longitude! > b.lngMax
  })
  console.log(`\n=== HORS LIMITES DE LEUR DÉPARTEMENT : ${outliers.length} ===`)
  for (const o of outliers) {
    console.log(`  ✗ ${o.nom} (${o.ville}, ${o.departement}, ${o.numeroAbmed ?? '-'}) @ ${o.latitude!.toFixed(4)},${o.longitude!.toFixed(4)}`)
  }

  // Répartition par département + centroïde réel des officines
  console.log(`\n=== RÉPARTITION + CENTROÏDE DES OFFICINES PAR DÉPARTEMENT ===`)
  const byDept = new Map<string, { count: number; lats: number[]; lngs: number[] }>()
  for (const p of pharmacies) {
    const d = (p.departement ?? 'SANS').toUpperCase()
    const e = byDept.get(d) ?? { count: 0, lats: [], lngs: [] }
    e.count++
    e.lats.push(p.latitude!)
    e.lngs.push(p.longitude!)
    byDept.set(d, e)
  }
  for (const [dept, e] of [...byDept.entries()].sort((a, b) => b[1].count - a[1].count)) {
    const lat = e.lats.reduce((a, b) => a + b, 0) / e.count
    const lng = e.lngs.reduce((a, b) => a + b, 0) / e.count
    console.log(`  ${dept}: ${e.count} officines — centroïde ${lat.toFixed(3)},${lng.toFixed(3)}`)
  }
}

main().catch(e => { console.error(e.message); process.exit(1) }).finally(() => prisma.$disconnect())
