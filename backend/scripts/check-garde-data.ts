import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const total = await db.pharmacie.count({ where: { actif: true } })
  const geoloc = await db.pharmacie.count({ where: { actif: true, latitude: { not: null }, longitude: { not: null } } })
  console.log(`Pharmacies actives: ${total}, géolocalisées: ${geoloc}`)

  // Répartition par département
  const byDept = await db.pharmacie.groupBy({
    by: ['departement'],
    where: { actif: true },
    _count: { _all: true },
    orderBy: { _count: { departement: 'desc' } },
  })
  console.log('\n— Pharmacies par département —')
  byDept.forEach(d => console.log(`${d.departement ?? 'N/A'}: ${d._count._all}`))

  // Plannings de garde aujourd'hui
  const today = new Date()
  const start = new Date(today); start.setHours(0, 0, 0, 0)
  const end = new Date(today); end.setHours(23, 59, 59, 999)
  const gardeToday = await db.planningGarde.count({ where: { date: { gte: start, lte: end } } })
  console.log(`\nPlannings de garde AUJOURD'HUI: ${gardeToday}`)

  // Plannings de garde cette semaine
  const weekStart = new Date(today)
  const day = weekStart.getDay()
  weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1))
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  const gardeWeek = await db.planningGarde.count({ where: { date: { gte: weekStart, lte: weekEnd } } })
  console.log(`Plannings de garde SEMAINE (${weekStart.toISOString().slice(0, 10)} → ${weekEnd.toISOString().slice(0, 10)}): ${gardeWeek}`)

  // Plannings de garde à venir (total)
  const gardeTotal = await db.planningGarde.count()
  const gardeFuture = await db.planningGarde.count({ where: { date: { gte: start } } })
  console.log(`Plannings TOTAL: ${gardeTotal}, à venir: ${gardeFuture}`)

  // Pharmacies distinctes ayant un planning cette semaine + départements
  const withGarde = await db.pharmacie.findMany({
    where: { planningsGarde: { some: { date: { gte: weekStart, lte: weekEnd } } } },
    select: { id: true, nom: true, departement: true, ville: true, telephone: true },
  })
  console.log(`\nPharmacies avec garde cette semaine: ${withGarde.length}`)
  const deptCount: Record<string, number> = {}
  withGarde.forEach(p => { deptCount[p.departement ?? 'N/A'] = (deptCount[p.departement ?? 'N/A'] || 0) + 1 })
  console.log(deptCount)

  // Échantillon de numéros de téléphone (format)
  const sample = await db.pharmacie.findMany({
    where: { actif: true },
    select: { telephone: true, contactPharmacien: true },
    take: 15,
  })
  console.log('\n— Échantillon téléphones (officine / contact pharmacien) —')
  sample.forEach(p => console.log(`${p.telephone} | ${p.contactPharmacien ?? '—'}`))

  // Colonnes dispo sur Pharmacie utiles (telephonePharmacie?)
  const cols = await db.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name='Pharmacie' AND column_name ILIKE '%tel%' OR column_name ILIKE '%phone%' OR column_name ILIKE '%contact%'`)
  console.log('\nColonnes contact Pharmacie:', JSON.stringify(cols))
}

main().finally(() => db.$disconnect())
