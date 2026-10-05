/**
 * Rotation nationale de démonstration des pharmacies de garde.
 *
 * La base ne contenait que 7 plannings (uniquement Parakou) — la page
 * « Pharmacie de garde » n'avait donc aucun sens au niveau national. Ce script
 * génère une rotation réaliste sur 60 jours :
 *
 *   - chaque jour, 1 à 3 officines de garde JOUR (08:00 → 20:00) par
 *     département selon sa taille (Littoral 3, Atlantique/Ouémé 3, Borgou/Zou 2,
 *     autres 1) ;
 *   - dans les grands départements, 1 à 2 gardes de NUIT (20:00 → 08:00 le
 *     lendemain) ;
 *   - la rotation parcourt la liste des officines du département (priorité aux
 *     géolocalisées) pour que chacun passe à tour de rôle.
 *
 * Usage : DATABASE_URL=… npx tsx scripts/seed-garde-nationale.ts
 */

import { PrismaClient, TypeGarde } from '@prisma/client'

const db = new PrismaClient()

/** Officines de garde simultanées (jour) par département selon la taille */
const DAY_SLOTS: Record<string, number> = {
  LITTORAL: 3,
  ATLANTIQUE: 3,
  OUEME: 3,
  BORGOU: 2,
  ZOU: 2,
  COLLINES: 1,
  MONO: 1,
  COUFFO: 1,
  ALIBORI: 1,
  PLATEAU: 1,
  ATACORA: 1,
  DONGA: 1,
}

/** Gardes de nuit par département (grands centres urbains) */
const NIGHT_SLOTS: Record<string, number> = {
  LITTORAL: 2,
  ATLANTIQUE: 1,
  OUEME: 1,
  BORGOU: 1,
}

const DAYS = 60

function at(date: Date, h: number, m = 0): Date {
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return d
}

async function main() {
  const pharmacies = await db.pharmacie.findMany({
    where: { actif: true },
    select: { id: true, nom: true, departement: true, latitude: true, longitude: true },
    orderBy: { nom: 'asc' },
  })

  // Regroupement par département — géolocalisées en priorité (carte)
  const byDept = new Map<string, typeof pharmacies>()
  pharmacies.forEach(p => {
    const dept = (p.departement ?? 'AUTRE').toUpperCase()
    const list = byDept.get(dept) ?? []
    list.push(p)
    byDept.set(dept, list)
  })
  byDept.forEach(list => list.sort((a, b) => {
    const aGeo = a.latitude != null && a.longitude != null ? 0 : 1
    const bGeo = b.latitude != null && b.longitude != null ? 0 : 1
    return aGeo - bGeo
  }))

  const departments = Array.from(byDept.keys()).sort()
  console.log(`Officines par département :`)
  departments.forEach(d => console.log(`  ${d}: ${byDept.get(d)!.length}`))

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  type Row = {
    pharmacieId: string
    date: Date
    dateDebut: Date
    dateFin: Date
    type: TypeGarde
  }
  const rows: Row[] = []

  for (let dayOffset = 0; dayOffset < DAYS; dayOffset++) {
    const day = new Date(today)
    day.setDate(day.getDate() + dayOffset)

    for (const dept of departments) {
      const list = byDept.get(dept)!
      if (list.length === 0) continue

      const daySlots = Math.min(DAY_SLOTS[dept] ?? 1, list.length)
      const nightSlots = Math.min(NIGHT_SLOTS[dept] ?? 0, list.length)

      // Rotation : fenêtre glissante sur la liste du département
      for (let s = 0; s < daySlots; s++) {
        const p = list[(dayOffset * daySlots + s) % list.length]
        rows.push({
          pharmacieId: p.id,
          date: day,
          dateDebut: at(day, 8),
          dateFin: at(day, 20),
          type: TypeGarde.NORMALE,
        })
      }
      for (let s = 0; s < nightSlots; s++) {
        const idx = (dayOffset * Math.max(daySlots, 1) + daySlots + s) % list.length
        const p = list[idx]
        const next = new Date(day)
        next.setDate(next.getDate() + 1)
        rows.push({
          pharmacieId: p.id,
          date: day,
          dateDebut: at(day, 20),
          dateFin: at(next, 8),
          type: TypeGarde.NORMALE,
        })
      }
    }
  }

  // Remplacement atomique des plannings de démonstration
  await db.$transaction(async (tx) => {
    await tx.planningGarde.deleteMany({})
    for (let i = 0; i < rows.length; i += 500) {
      await tx.planningGarde.createMany({ data: rows.slice(i, i + 500) })
    }
  })

  console.log(`\nRotation créée : ${rows.length} plannings sur ${DAYS} jours.`)
  console.log(`Exemple (jour 0) : ${rows.filter(r => r.date.getTime() === today.getTime()).length} officines de garde aujourd'hui.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
