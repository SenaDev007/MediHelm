// Vérification des pins superposés : paires d'officines à moins de 25 m
// (doublons parfaits = pins invisibles l'un derrière l'autre)
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

async function main() {
  const pharmacies = await prisma.pharmacie.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    select: { id: true, nom: true, ville: true, departement: true, latitude: true, longitude: true, numeroAbmed: true },
    orderBy: { nom: 'asc' },
  })
  console.log(`Officines géolocalisées : ${pharmacies.length}\n`)

  const pairs: Array<{ a: typeof pharmacies[0]; b: typeof pharmacies[0]; d: number }> = []
  for (let i = 0; i < pharmacies.length; i++) {
    for (let j = i + 1; j < pharmacies.length; j++) {
      const d = haversine(
        pharmacies[i].latitude!, pharmacies[i].longitude!,
        pharmacies[j].latitude!, pharmacies[j].longitude!
      )
      if (d < 25) pairs.push({ a: pharmacies[i], b: pharmacies[j], d })
    }
  }

  console.log(`=== PAIRES À MOINS DE 25 M : ${pairs.length} ===`)
  for (const p of pairs) {
    console.log(
      `  ${p.d.toFixed(1).padStart(6)} m — ${p.a.nom} (${p.a.numeroAbmed ?? '-'}) ↔ ${p.b.nom} (${p.b.numeroAbmed ?? '-'}) @ ${p.a.ville} / ${p.a.departement}`
    )
  }

  // Coordonnées identiques exactement (doublons de géocodage)
  const exact = pairs.filter((p) => p.d < 0.5)
  console.log(`\n=== DOUBLONS EXACTS (< 0,5 m) : ${exact.length} ===`)

  // Villes: vérifier cohérence ville ↔ coordonnées (centre-ville approx.)
  const VILLE_CENTERS: Record<string, [number, number]> = {
    'Cotonou': [6.3653, 2.4234], 'Parakou': [9.3522, 2.6344], 'Porto-Novo': [6.4969, 2.6061],
    'Abomey': [7.1827, 2.2794], 'Bohicon': [7.1783, 2.0725], 'Djougou': [9.7083, 1.6653],
    'Natitingou': [10.3044, 1.3778], 'Kandi': [11.1339, 2.9383], 'Lokossa': [6.6372, 1.7161],
  }
  console.log('\n=== DISTANCE MAX AU CENTRE-VILLE (sanity, > 15 km = suspect) ===')
  for (const [ville, [vlat, vlng]] of Object.entries(VILLE_CENTERS)) {
    const inVille = pharmacies.filter((p) => p.ville?.toLowerCase().includes(ville.toLowerCase()))
    if (inVille.length === 0) continue
    let maxD = 0; let farName = ''
    for (const p of inVille) {
      const d = haversine(vlat, vlng, p.latitude!, p.longitude!) / 1000
      if (d > maxD) { maxD = d; farName = p.nom }
    }
    console.log(`  ${ville} : ${inVille.length} officines — max ${maxD.toFixed(1)} km${maxD > 15 ? ` ⚠ ${farName}` : ''}`)
  }
}

main().finally(() => prisma.$disconnect())
