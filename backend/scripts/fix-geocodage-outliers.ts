// MediHelm — Détection + correction des coordonnées géographiquement incohérentes
// Une officine doit se trouver dans les limites approximatives de son département.
// Les outliers sont repositionnés sur la médiane des officines de leur ville,
// ou privés de coordonnées si aucune référence fiable n'existe.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Boîtes englobantes approximatives des 12 départements du Bénin (lat/lng)
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

const APPLY = process.argv.includes('--apply')

// Coordonnées de référence des villes sans suffisamment d'officines valides
const CITY_COORDS: Record<string, [number, number]> = {
  'banikoara': [11.4336, 2.9289],
  'kalale': [10.2962, 3.3819],
  'dogbo': [6.9500, 1.7800],
  'ouinhi': [7.1480, 2.2770],
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

async function main() {
  const pharmacies = await prisma.pharmacie.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    select: { id: true, nom: true, ville: true, departement: true, latitude: true, longitude: true, numeroAbmed: true },
  })

  const outliers = pharmacies.filter(p => {
    const b = p.departement ? DEPT_BOUNDS[p.departement] : undefined
    if (!b) return false
    const lat = p.latitude!
    const lng = p.longitude!
    return lat < b.latMin || lat > b.latMax || lng < b.lngMin || lng > b.lngMax
  })

  console.log(`Officines géolocalisées : ${pharmacies.length} — hors limites de leur département : ${outliers.length}\n`)
  for (const o of outliers) {
    console.log(`  ✗ ${o.nom} (${o.ville}, ${o.departement}, ${o.numeroAbmed ?? '-'}) @ ${o.latitude!.toFixed(4)},${o.longitude!.toFixed(4)}`)
  }

  // Médianes par (ville, département) sur les officines DANS les limites
  const valid = pharmacies.filter(p => !outliers.includes(p))
  const cityMedian = new Map<string, { lat: number[]; lng: number[] }>()
  for (const p of valid) {
    if (!p.departement) continue
    const key = `${(p.ville || '').trim().toLowerCase()}|${p.departement}`
    const entry = cityMedian.get(key) ?? { lat: [], lng: [] }
    entry.lat.push(p.latitude!)
    entry.lng.push(p.longitude!)
    cityMedian.set(key, entry)
  }

  console.log('\nPlan de correction :')
  const fixes: Array<{ id: string; nom: string; lat: number | null; lng: number | null; mode: string }> = []
  for (const o of outliers) {
    const key = `${(o.ville || '').trim().toLowerCase()}|${o.departement}`
    const entry = cityMedian.get(key)
    const cityKey = (o.ville || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const cityRef = CITY_COORDS[cityKey]
    if (entry && entry.lat.length >= 2) {
      const lat = median(entry.lat)
      const lng = median(entry.lng)
      fixes.push({ id: o.id, nom: o.nom, lat, lng, mode: `médiane ville (${entry.lat.length} références)` })
      console.log(`  → ${o.nom} : ${o.latitude!.toFixed(4)},${o.longitude!.toFixed(4)} ⇒ ${lat.toFixed(4)},${lng.toFixed(4)} [${o.ville}]`)
    } else if (cityRef) {
      fixes.push({ id: o.id, nom: o.nom, lat: cityRef[0], lng: cityRef[1], mode: `référence ville ${o.ville}` })
      console.log(`  → ${o.nom} : ${o.latitude!.toFixed(4)},${o.longitude!.toFixed(4)} ⇒ ${cityRef[0].toFixed(4)},${cityRef[1].toFixed(4)} [réf. ${o.ville}]`)
    } else {
      fixes.push({ id: o.id, nom: o.nom, lat: null, lng: null, mode: 'aucune référence fiable → coordonnées retirées' })
      console.log(`  → ${o.nom} : coordonnées retirées (aucune référence pour ${o.ville})`)
    }
  }

  if (!APPLY) {
    console.log('\nMode simulation — relancer avec --apply pour corriger la base.')
    return
  }

  let n = 0
  for (const f of fixes) {
    await prisma.pharmacie.update({
      where: { id: f.id },
      data: { latitude: f.lat, longitude: f.lng },
    })
    n++
  }
  console.log(`\n${n} officines corrigées.`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
