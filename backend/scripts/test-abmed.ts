// ============================================================
// MediHelm — Tests du registre ABMed & onboarding officine
// 1. Endpoints registre (recherche publique)
// 2. Carte patient (pharmacies-proches avec champs ABMed)
// 3. Inscription : rattachement officine ABMed + nouvelle officine
// ============================================================

import { PrismaClient } from '@prisma/client'
import { BASE, record, results } from './test-lib'

const prisma = new PrismaClient()

let passed = 0
let failed = 0

function finish() {
  console.log('\n──────────────────────────────────────')
  for (const r of results) {
    if (r.status === 'PASS') passed++
    else if (r.status === 'FAIL') failed++
  }
  console.log(`RÉSULTAT: ${passed} PASS / ${failed} FAIL`)
  if (failed > 0) process.exit(1)
}

async function main() {
  const suite = 'ABMED'

  // ─── 1. Registre ABMed : recherche publique ───
  console.log('\n━━━ 1. Registre ABMed (recherche publique) ━━━')

  let res = await fetch(`${BASE}/api/pharmacies?registre=abmed&departement=BORGOU`)
  let data: any = await res.json().catch(() => null)
  if (res.ok && Array.isArray(data) && data.length === 33) {
    record(suite, 'Registre par département (BORGOU)', 'PASS', `${data.length} officines`)
  } else {
    record(suite, 'Registre par département (BORGOU)', 'FAIL', `status=${res.status}, count=${Array.isArray(data) ? data.length : data}`)
  }

  const echantillon = Array.isArray(data) ? data[0] : null
  if (echantillon && echantillon.numeroAbmed && echantillon.zoneSanitaire !== undefined && echantillon.pharmacienTitulaire !== undefined) {
    record(suite, 'Champs ABMed exposés', 'PASS', `${echantillon.nom} (${echantillon.numeroAbmed}) — ZS=${echantillon.zoneSanitaire}, titulaire=${(echantillon.pharmacienTitulaire || '').slice(0, 25)}`)
  } else {
    record(suite, 'Champs ABMed exposés', 'FAIL', JSON.stringify(echantillon).slice(0, 120))
  }

  res = await fetch(`${BASE}/api/pharmacies?registre=abmed&departement=BORGOU&q=Beyerou`)
  data = await res.json().catch(() => null)
  if (res.ok && Array.isArray(data) && data.some((o: any) => o.numeroAbmed === 'P108')) {
    record(suite, 'Recherche par nom (Beyerou → P108)', 'PASS', `${data.length} résultat(s)`)
  } else {
    record(suite, 'Recherche par nom (Beyerou → P108)', 'FAIL', `status=${res.status}, data=${JSON.stringify(data).slice(0, 100)}`)
  }

  res = await fetch(`${BASE}/api/pharmacies?registre=abmed&departement=BORGOU&q=Parakou`)
  data = await res.json().catch(() => null)
  if (res.ok && Array.isArray(data) && data.length >= 20) {
    record(suite, 'Recherche par commune (Parakou)', 'PASS', `${data.length} officines`)
  } else {
    record(suite, 'Recherche par commune (Parakou)', 'FAIL', `status=${res.status}, count=${Array.isArray(data) ? data.length : data}`)
  }

  // LITTORAL = 112 officines → take 100
  res = await fetch(`${BASE}/api/pharmacies?registre=abmed&departement=LITTORAL`)
  data = await res.json().catch(() => null)
  if (res.ok && Array.isArray(data) && data.length === 100) {
    record(suite, 'Cap 100 respecté (LITTORAL)', 'PASS', `${data.length} retournées (112 au registre)`)
  } else {
    record(suite, 'Cap 100 respecté (LITTORAL)', 'FAIL', `count=${Array.isArray(data) ? data.length : data}`)
  }

  // ─── 2. Carte patient : pharmacies-proches avec champs ABMed ───
  console.log('\n━━━ 2. Carte patient (officines officielles) ━━━')

  res = await fetch(`${BASE}/api/patient/pharmacies-proches`)
  data = await res.json().catch(() => null)
  if (res.ok && Array.isArray(data) && data.length === 345) {
    record(suite, 'Carte nationale (345 officines géolocalisées)', 'PASS', `${data.length} officines`)
  } else {
    record(suite, 'Carte nationale (345 officines géolocalisées)', 'FAIL', `status=${res.status}, count=${Array.isArray(data) ? data.length : data}`)
  }

  const beyerouCarte = Array.isArray(data) ? data.find((o: any) => o.numeroAbmed === 'P108') : null
  if (beyerouCarte && beyerouCarte.departement === 'BORGOU' && beyerouCarte.zoneSanitaire === "Parakou - N'Dali" && beyerouCarte.commune === 'Parakou' && beyerouCarte.pharmacienTitulaire) {
    record(suite, 'Fiche Beyerou complète sur la carte', 'PASS', `${beyerouCarte.nom} — ${beyerouCarte.departement}/${beyerouCarte.commune} — ZS ${beyerouCarte.zoneSanitaire} — GPS ${beyerouCarte.latitude},${beyerouCarte.longitude}`)
  } else {
    record(suite, 'Fiche Beyerou complète sur la carte', 'FAIL', JSON.stringify(beyerouCarte).slice(0, 150))
  }

  const officielles = Array.isArray(data) ? data.filter((o: any) => o.officielle === true).length : 0
  if (officielles === 345) {
    record(suite, 'Toutes les officines marquées officielles', 'PASS', `${officielles}/345`)
  } else {
    record(suite, 'Toutes les officines marquées officielles', 'FAIL', `${officielles}/345`)
  }

  // ─── 3. Inscription : rattachement officine ABMed ───
  console.log('\n━━━ 3. Onboarding officine (rattachement ABMed) ━━━')

  // 3a. Une officine du LITTORAL sans compte (ex. P156 Adéchina)
  res = await fetch(`${BASE}/api/pharmacies?registre=abmed&id=` + (await (async () => {
    const p = await prisma.pharmacie.findUnique({ where: { numeroAbmed: 'P156' }, select: { id: true } })
    return p!.id
  })()))
  const officineCible = await res.json().catch(() => null)
  if (res.ok && officineCible?.nom === 'Adéchina') {
    record(suite, 'Consultation officine par id (P156)', 'PASS', `${officineCible.nom} — compte créé: ${officineCible._count.utilisateurs > 0}`)
  } else {
    record(suite, 'Consultation officine par id (P156)', 'FAIL', `status=${res.status}`)
  }

  // 3b. Rattachement (claim) avec mot de passe valide (12+)
  // NB : IPs simulées distinctes — chaque client réel a son propre seau rate-limit
  const emailTest = `adechina.test.${Date.now()}@medihelm.bj`
  res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.60.1.10' },
    body: JSON.stringify({
      officineId: officineCible.id,
      email: emailTest,
      motDePasse: 'MotDePasseTest123!',
      nom: 'ADÉCHINA',
      prenom: 'Test',
      plan: 'SEED',
      periodeFacturation: 'MENSUEL',
    }),
  })
  const claim = await res.json().catch(() => null)
  if (res.status === 201 && claim?.modeRattachement === true && claim?.pharmacie?.numeroAbmed === 'P156') {
    record(suite, 'Rattachement officine P156', 'PASS', `${claim.pharmacie.nom} — compte ${claim.utilisateur.email}`)
  } else {
    record(suite, 'Rattachement officine P156', 'FAIL', `status=${res.status}, ${JSON.stringify(claim).slice(0, 150)}`)
  }

  // 3c. Double rattachement → 409
  res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.60.1.11' },
    body: JSON.stringify({
      officineId: officineCible.id,
      email: `double.${Date.now()}@medihelm.bj`,
      motDePasse: 'MotDePasseTest123!',
      nom: 'DOUBLE',
      prenom: 'Test',
      plan: 'SEED',
      periodeFacturation: 'MENSUEL',
    }),
  })
  if (res.status === 409) {
    record(suite, 'Refus double rattachement', 'PASS', '409 OFFICINE_DEJA_PRISE')
  } else {
    record(suite, 'Refus double rattachement', 'FAIL', `status=${res.status}`)
  }

  // 3d. Vérification persistance : officine a maintenant utilisateur + abonnement + données officielles conservées
  const apres = await prisma.pharmacie.findUnique({
    where: { numeroAbmed: 'P156' },
    include: { utilisateurs: { select: { email: true, role: true } }, abonnements: { take: 1 } },
  })
  if (apres && apres.utilisateurs.length === 1 && apres.utilisateurs[0].email === emailTest && apres.abonnements.length === 1 && apres.pharmacienTitulaire) {
    record(suite, 'Persistance rattachement', 'PASS', `1 utilisateur DIRECTEUR + 1 abonnement SEED — titulaire conservé: ${apres.pharmacienTitulaire.slice(0, 30)}`)
  } else {
    record(suite, 'Persistance rattachement', 'FAIL', JSON.stringify({ users: apres?.utilisateurs.length, abos: apres?.abonnements.length }).slice(0, 120))
  }

  // ─── 4. Inscription : nouvelle officine (champs ABMed complets) ───
  console.log('\n━━━ 4. Onboarding nouvelle officine (formulaire ABMed) ━━━')

  const agrementTest = `AGR-TEST-${Date.now()}`
  res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.60.1.12' },
    body: JSON.stringify({
      pharmacieNom: 'Pharmacie de Test Zogbadjè',
      adresse: 'Quartier Zogbadjè, rue 12',
      ville: 'Abomey-Calavi',
      departement: 'ATLANTIQUE',
      telephone: '97000099',
      emailPharmacie: 'zogbadje.test@medihelm.bj',
      numeroAgrement: agrementTest,
      plan: 'BLOOM',
      periodeFacturation: 'ANNUEL',
      email: `zogbadje.${Date.now()}@medihelm.bj`,
      motDePasse: 'MotDePasseTest123!',
      nom: 'ZOGBADJÈ',
      prenom: 'Test',
      zoneSanitaire: 'Abomey-Calavi',
      commune: 'Abomey-Calavi',
      arrondissement: 'Zogbadjè',
      localisation: 'Carrefour Zogbadjè',
      pharmacienTitulaire: 'TEST Titulaire',
      numeroOnpb: '999',
      latitude: 6.448,
      longitude: 2.355,
    }),
  })
  const nouvelle = await res.json().catch(() => null)
  if (res.status === 201 && nouvelle?.pharmacie?.nom === 'Pharmacie de Test Zogbadjè') {
    record(suite, 'Création nouvelle officine', 'PASS', `${nouvelle.pharmacie.nom} (plan BLOOM)`)
  } else {
    record(suite, 'Création nouvelle officine', 'FAIL', `status=${res.status}, ${JSON.stringify(nouvelle).slice(0, 150)}`)
  }

  const nouvelleDb = await prisma.pharmacie.findUnique({
    where: { numeroAgrement: agrementTest },
  })
  if (nouvelleDb && nouvelleDb.sourceRegistre === 'MANUEL' && nouvelleDb.departement === 'ATLANTIQUE'
    && nouvelleDb.zoneSanitaire === 'Abomey-Calavi' && nouvelleDb.commune === 'Abomey-Calavi'
    && nouvelleDb.arrondissement === 'Zogbadjè' && nouvelleDb.pharmacienTitulaire === 'TEST Titulaire'
    && nouvelleDb.numeroOnpb === '999' && nouvelleDb.latitude === 6.448 && nouvelleDb.longitude === 2.355) {
    record(suite, 'Champs ABMed persistés (nouvelle officine)', 'PASS', 'sourceRegistre=MANUEL, tous champs OK')
  } else {
    record(suite, 'Champs ABMed persistés (nouvelle officine)', 'FAIL', JSON.stringify(nouvelleDb).slice(0, 200))
  }

  // 4b. Agrément déjà pris → 409
  res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.60.1.13' },
    body: JSON.stringify({
      pharmacieNom: 'Doublon',
      adresse: 'Adresse suffisamment longue',
      ville: 'Cotonou',
      departement: 'LITTORAL',
      telephone: '97000098',
      numeroAgrement: agrementTest,
      plan: 'SEED',
      periodeFacturation: 'MENSUEL',
      email: `doublon.${Date.now()}@medihelm.bj`,
      motDePasse: 'MotDePasseTest123!',
      nom: 'DOUBLON',
      prenom: 'Test',
    }),
  })
  if (res.status === 409) {
    record(suite, 'Refus agrément en double', 'PASS', '409')
  } else {
    record(suite, 'Refus agrément en double', 'FAIL', `status=${res.status}`)
  }

  // 4c. Validation : mode rattachement + champs manquants nouvelle officine → 400
  res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.60.1.14' },
    body: JSON.stringify({
      email: `invalide.${Date.now()}@medihelm.bj`,
      motDePasse: 'MotDePasseTest123!',
      nom: 'INVALIDE',
      prenom: 'Test',
      plan: 'SEED',
      periodeFacturation: 'MENSUEL',
    }),
  })
  if (res.status === 400) {
    record(suite, 'Validation champs requis (nouvelle officine)', 'PASS', '400 sans officineId ni champs')
  } else {
    record(suite, 'Validation champs requis (nouvelle officine)', 'FAIL', `status=${res.status}`)
  }

  // ─── 5. Nettoyage des données de test ───
  console.log('\n━━━ 5. Nettoyage ━━━')
  await prisma.abonnement.deleteMany({ where: { pharmacie: { numeroAbmed: 'P156' } } })
  await prisma.utilisateur.deleteMany({ where: { email: emailTest } })
  await prisma.pharmacie.update({
    where: { numeroAbmed: 'P156' },
    data: { plan: 'SEED', modeGardeActif: false },
  })
  const nouv = await prisma.pharmacie.findUnique({ where: { numeroAgrement: agrementTest }, select: { id: true } })
  if (nouv) {
    await prisma.abonnement.deleteMany({ where: { pharmacieId: nouv.id } })
    await prisma.utilisateur.deleteMany({ where: { pharmacieId: nouv.id } })
    await prisma.pharmacie.delete({ where: { id: nouv.id } })
  }
  record(suite, 'Nettoyage', 'PASS', 'officines de test réinitialisées')

  finish()
}

main()
  .catch(async (e) => {
    console.error('❌ Erreur fatale:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
