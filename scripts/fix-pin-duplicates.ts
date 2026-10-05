// Micro-séparation des doublons de coordonnées EXACTES (0 m).
//
// Deux officines distinctes du registre ABMed partagent parfois les mêmes
// coordonnées de géocodage (niveau quartier) — leurs pins se superposent
// alors parfaitement et l'une masque l'autre. Ce script écarte chaque paire
// de ~25 m de façon SYMÉTRIQUE autour du point d'origine (le centroïde du
// groupe reste exactement l'ancienne position) : à l'échelle de la carte,
// le déplacement est invisible, mais chaque pin devient discernable et
// cliquable — le spiderfy reste disponible au clic pour les voir en cercle.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const M_PER_DEG_LAT = 110540

async function main() {
  const pharmacies = await prisma.pharmacie.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    select: { id: true, nom: true, ville: true, departement: true, latitude: true, longitude: true, numeroAbmed: true },
    orderBy: [{ latitude: 'asc' }, { longitude: 'asc' }],
  })

  // Groupes d'officines aux coordonnées EXACTEMENT identiques
  const groups = new Map<string, typeof pharmacies>()
  for (const p of pharmacies) {
    const key = `${p.latitude!.toFixed(6)},${p.longitude!.toFixed(6)}`
    const arr = groups.get(key) ?? []
    arr.push(p)
    groups.set(key, arr)
  }

  let fixed = 0
  for (const [key, group] of groups) {
    if (group.length < 2) continue
    const [lat, lng] = key.split(',').map(Number)
    const mPerDegLng = 111320 * Math.cos((lat * Math.PI) / 180)
    const n = group.length

    console.log(`\nGroupe ${key} — ${n} officines superposées :`)
    for (let i = 0; i < n; i++) {
      const p = group[i]
      // Disposition en petit cercle régulier de rayon 16 m — symétrique,
      // le centroïde du groupe reste le point d'origine.
      const angle = (2 * Math.PI * i) / n - Math.PI / 2
      const dLat = (16 * Math.sin(angle)) / M_PER_DEG_LAT
      const dLng = (16 * Math.cos(angle)) / mPerDegLng
      const newLat = Number((lat + dLat).toFixed(6))
      const newLng = Number((lng + dLng).toFixed(6))
      await prisma.pharmacie.update({
        where: { id: p.id },
        data: { latitude: newLat, longitude: newLng },
      })
      fixed++
      console.log(`  ${p.nom} (${p.numeroAbmed ?? '-'}) → ${newLat}, ${newLng} (Δ ≈ 16 m, angle ${((angle * 180) / Math.PI).toFixed(0)}°)`)
    }
  }

  console.log(`\n${fixed} officines micro-séparées (${groups.size - [...groups.values()].filter(g => g.length < 2).length} groupes).`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
