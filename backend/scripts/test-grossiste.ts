// ============================================================
// MediHelm — Tests espace GROSSISTE
// Middleware routing + isolation tenant + CRUD commandes/statuts + catalogue
// Usage: bash scripts/serve-and-test.sh scripts/test-grossiste.ts
// ============================================================

import { PrismaClient } from '@prisma/client'
import { login, api, page, record, summary } from './test-lib'

const prisma = new PrismaClient()
const SUITE = 'GROSSISTE'

async function main() {
  console.log(`\n========== ESPACE GROSSISTE ==========\n`)

  const partner = await login('grossiste@medihelm.bj', 'demo1234')
  record(SUITE, 'Login GROSSISTE_PARTNER', partner.ok ? 'PASS' : 'FAIL', partner.ok ? 'OK (rattaché à UbiPharm)' : 'échec')

  const pharmacien = await login('pharmacien@medihelm.bj', 'demo1234')
  record(SUITE, 'Login PHARMACIEN (relation commerciale)', pharmacien.ok ? 'PASS' : 'FAIL', pharmacien.ok ? 'OK' : 'échec')

  // Grossistes en base
  const ubipharm = await prisma.grossiste.findFirst({ where: { nom: { contains: 'UbiPharm', mode: 'insensitive' } } })
  const promopharm = await prisma.grossiste.findFirst({ where: { nom: { contains: 'Promopharm', mode: 'insensitive' } } })
  if (!ubipharm || !promopharm) { console.log('❌ grossistes seedés introuvables'); return }
  record(SUITE, 'Compte grossiste@ rattaché à UbiPharm', 'PASS', `grossisteId=${ubipharm.id.slice(0, 8)}`)

  // ---------- A. MIDDLEWARE ROUTING ----------
  console.log('\n--- A. Middleware routing ---')
  if (partner.ok) {
    for (const p of ['/grossistes', '/grossistes/catalogue', '/grossistes/commandes', '/grossistes/statistiques', '/grossistes/parametres']) {
      const r = await page(partner.jar, p)
      record(SUITE, `Page ${p} (GROSSISTE_PARTNER)`, r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`)
    }
    const pro = await page(partner.jar, '/pro')
    record(SUITE, 'Middleware: GROSSISTE_PARTNER → /pro bloqué', pro.status === 307 || pro.status === 302 ? 'PASS' : 'FAIL', `status=${pro.status}`)
    const inst = await page(partner.jar, '/institutions')
    record(SUITE, 'Middleware: GROSSISTE_PARTNER → /institutions bloqué', inst.status === 307 || inst.status === 302 ? 'PASS' : 'FAIL', `status=${inst.status}`)
    const dpmedPage = await page(partner.jar, '/institutions/dpmed')
    record(SUITE, 'Middleware: GROSSISTE_PARTNER → /institutions/dpmed bloqué', dpmedPage.status === 307 || dpmedPage.status === 302 ? 'PASS' : 'FAIL', `status=${dpmedPage.status}`)
  }
  if (pharmacien.ok) {
    const g = await page(pharmacien.jar, '/grossistes')
    record(SUITE, 'Middleware: PHARMACIEN → /grossistes autorisé', g.status === 200 ? 'PASS' : 'FAIL', `status=${g.status}`)
  }

  // ---------- B. ISOLATION TENANT ----------
  console.log('\n--- B. Isolation tenant grossiste ---')
  if (partner.ok) {
    const listPartner = await api(partner.jar, 'GET', '/api/grossistes')
    const listPartnerJson = listPartner.json as Array<{ id: string; nom: string }>
    record(SUITE, 'GET /api/grossistes (partenaire): SON grossiste uniquement', listPartner.status === 200 && listPartnerJson?.length === 1 && listPartnerJson[0].id === ubipharm.id ? 'PASS' : 'FAIL',
      `status=${listPartner.status}, ${listPartnerJson?.length} grossiste(s): ${listPartnerJson?.map(g => g.nom).join(', ')}`)

    const listPharma = await api(pharmacien.jar, 'GET', '/api/grossistes')
    record(SUITE, 'GET /api/grossistes (pharmacien): tous les grossistes', listPharma.status === 200 && (listPharma.json as Array<any>)?.length >= 2 ? 'PASS' : 'FAIL',
      `status=${listPharma.status}, ${(listPharma.json as Array<any>)?.length} grossiste(s)`)

    // Commandes de SON grossiste vs un autre
    const own = await api(partner.jar, 'GET', `/api/grossistes/${ubipharm.id}/commandes`)
    record(SUITE, 'GET commandes de SON grossiste', own.status === 200 ? 'PASS' : 'FAIL', `status=${own.status}`)
    const other = await api(partner.jar, 'GET', `/api/grossistes/${promopharm.id}/commandes`)
    record(SUITE, 'Isolation: commandes d\'un AUTRE grossiste → 403', other.status === 403 ? 'PASS' : 'FAIL', `status=${other.status}`)

    // Dashboard
    const dashOwn = await api(partner.jar, 'GET', `/api/grossistes/dashboard?grossisteId=${ubipharm.id}`)
    record(SUITE, 'Dashboard de SON grossiste', dashOwn.status === 200 ? 'PASS' : 'FAIL', `status=${dashOwn.status} ${dashOwn.text.slice(0, 60)}`)
    const dashOther = await api(partner.jar, 'GET', `/api/grossistes/dashboard?grossisteId=${promopharm.id}`)
    record(SUITE, 'Isolation: dashboard d\'un AUTRE grossiste → 403', dashOther.status === 403 ? 'PASS' : 'FAIL', `status=${dashOther.status}`)

    // API keys / webhooks: propre vs pharmacien
    const keysOwn = await api(partner.jar, 'GET', `/api/grossistes/${ubipharm.id}/api-keys`)
    record(SUITE, 'API keys de SON grossiste (partenaire)', keysOwn.status === 200 ? 'PASS' : 'FAIL', `status=${keysOwn.status}`)
    const keysPharma = await api(pharmacien.jar, 'GET', `/api/grossistes/${ubipharm.id}/api-keys`)
    record(SUITE, 'Isolation: API keys vues par un pharmacien → 403', keysPharma.status === 403 ? 'PASS' : 'FAIL', `status=${keysPharma.status}`)
    const hooksPharma = await api(pharmacien.jar, 'GET', `/api/grossistes/${ubipharm.id}/webhooks`)
    record(SUITE, 'Isolation: webhooks vus par un pharmacien → 403', hooksPharma.status === 403 ? 'PASS' : 'FAIL', `status=${hooksPharma.status}`)
  }

  // ---------- C. PORTAIL GROSSISTE (fix 403) ----------
  console.log('\n--- C. Portail grossiste ---')
  if (partner.ok) {
    const portail = await api(partner.jar, 'GET', '/api/portail/grossiste/commandes')
    record(SUITE, 'GET /api/portail/grossiste/commandes (partenaire, était 403)', portail.status === 200 ? 'PASS' : 'FAIL', `status=${portail.status} ${portail.text.slice(0, 80)}`)
    const portailOther = await api(partner.jar, 'GET', `/api/portail/grossiste/commandes?grossisteId=${promopharm.id}`)
    record(SUITE, 'Isolation: portail d\'un autre grossiste → 403', portailOther.status === 403 ? 'PASS' : 'FAIL', `status=${portailOther.status}`)
  }
  if (pharmacien.ok) {
    const portailPh = await api(pharmacien.jar, 'GET', '/api/portail/grossiste/commandes')
    record(SUITE, 'Portail grossiste (pharmacien: ses commandes)', portailPh.status === 200 ? 'PASS' : 'WARN', `status=${portailPh.status}`)
  }

  // ---------- D. COMMANDES GROSSISTE: CRUD + NOUVEAUX STATUTS ----------
  console.log('\n--- D. Commandes grossiste (statuts EN_LIVRAISON/REFUSEE/LITIGE) ---')
  // Crée 2 commandes seed pour UbiPharm + 1 pour Promopharm
  const pharmacieCentre = await prisma.pharmacie.findFirst({ where: { utilisateurs: { some: { email: 'pharmacien@medihelm.bj' } } }, select: { id: true } })
  const suffix = Date.now().toString().slice(-8)
  const cmdA = await prisma.commandeGrossiste.create({
    data: {
      pharmacieId: pharmacieCentre!.id,
      grossisteId: ubipharm.id,
      reference: `CMDG-A-${suffix}`,
      statut: 'ENVOYEE',
      montantTotal: 100000,
      lignes: { create: [{ dci: 'Paracétamol', quantite: 100, prixUnitaire: 50, montant: 5000 }] },
    },
  })
  const cmdB = await prisma.commandeGrossiste.create({
    data: {
      pharmacieId: pharmacieCentre!.id,
      grossisteId: ubipharm.id,
      reference: `CMDG-B-${suffix}`,
      statut: 'ENVOYEE',
      montantTotal: 50000,
    },
  })
  const cmdP = await prisma.commandeGrossiste.create({
    data: {
      pharmacieId: pharmacieCentre!.id,
      grossisteId: promopharm.id,
      reference: `CMDG-P-${suffix}`,
      statut: 'ENVOYEE',
      montantTotal: 30000,
    },
  })

  if (partner.ok) {
    const pjar = partner.jar
    // Cycle complet ENVOYEE → CONFIRMEE → EN_PREPARATION → EN_LIVRAISON → LIVREE
    const t1 = await api(pjar, 'PATCH', `/api/grossistes/commandes/${cmdA.id}`, { statut: 'CONFIRMEE' })
    record(SUITE, 'PATCH → CONFIRMEE', t1.status === 200 ? 'PASS' : 'FAIL', `status=${t1.status}`)
    const t2 = await api(pjar, 'PATCH', `/api/grossistes/commandes/${cmdA.id}`, { statut: 'EN_PREPARATION' })
    record(SUITE, 'PATCH → EN_PREPARATION', t2.status === 200 ? 'PASS' : 'FAIL', `status=${t2.status}`)
    const t3 = await api(pjar, 'PATCH', `/api/grossistes/commandes/${cmdA.id}`, { statut: 'EN_LIVRAISON' })
    record(SUITE, 'PATCH → EN_LIVRAISON (enum manquait → 500 avant)', t3.status === 200 ? 'PASS' : 'FAIL', `status=${t3.status} ${t3.text.slice(0, 80)}`)
    const t4 = await api(pjar, 'PATCH', `/api/grossistes/commandes/${cmdA.id}`, { statut: 'LIVREE' })
    record(SUITE, 'PATCH → LIVREE', t4.status === 200 ? 'PASS' : 'FAIL', `status=${t4.status}`)

    // Persistance
    const cmdADb = await prisma.commandeGrossiste.findUnique({ where: { id: cmdA.id } })
    record(SUITE, 'Persistance statut LIVREE (DB)', cmdADb?.statut === 'LIVREE' ? 'PASS' : 'FAIL', `statut=${cmdADb?.statut}`)

    // Transition invalide depuis un statut terminal
    const bad = await api(pjar, 'PATCH', `/api/grossistes/commandes/${cmdA.id}`, { statut: 'CONFIRMEE' })
    record(SUITE, 'Transition invalide LIVREE→CONFIRMEE rejetée (400)', bad.status === 400 ? 'PASS' : 'FAIL', `status=${bad.status}`)

    // REFUSEE (nouvel enum)
    const ref = await api(pjar, 'PATCH', `/api/grossistes/commandes/${cmdB.id}`, { statut: 'REFUSEE' })
    record(SUITE, 'PATCH → REFUSEE (enum manquait)', ref.status === 200 ? 'PASS' : 'FAIL', `status=${ref.status}`)
    const refDb = await prisma.commandeGrossiste.findUnique({ where: { id: cmdB.id } })
    record(SUITE, 'Persistance REFUSEE (DB)', refDb?.statut === 'REFUSEE' ? 'PASS' : 'FAIL', `statut=${refDb?.statut}`)

    // LITIGE (nouvel enum): recrée une commande EN_PREPARATION
    const cmdC = await prisma.commandeGrossiste.create({
      data: { pharmacieId: pharmacieCentre!.id, grossisteId: ubipharm.id, reference: `CMDG-C-${suffix}`, statut: 'EN_PREPARATION', montantTotal: 20000 },
    })
    const lit = await api(pjar, 'PATCH', `/api/grossistes/commandes/${cmdC.id}`, { statut: 'LITIGE' })
    record(SUITE, 'PATCH → LITIGE (enum manquait)', lit.status === 200 ? 'PASS' : 'FAIL', `status=${lit.status}`)

    // Isolation: commande d'un autre grossiste
    const cross = await api(pjar, 'PATCH', `/api/grossistes/commandes/${cmdP.id}`, { statut: 'CONFIRMEE' })
    record(SUITE, 'Isolation: PATCH commande d\'un autre grossiste → 403', cross.status === 403 ? 'PASS' : 'FAIL', `status=${cross.status}`)
    const crossGet = await api(pjar, 'GET', `/api/grossistes/commandes/${cmdP.id}`)
    record(SUITE, 'Isolation: GET commande d\'un autre grossiste → 403', crossGet.status === 403 ? 'PASS' : 'FAIL', `status=${crossGet.status}`)

    // GET détail propre
    const getA = await api(pjar, 'GET', `/api/grossistes/commandes/${cmdA.id}`)
    record(SUITE, 'GET détail commande (propre)', getA.status === 200 ? 'PASS' : 'FAIL', `status=${getA.status}`)
  }

  // ---------- E. CATALOGUE ----------
  console.log('\n--- E. Catalogue CRUD ---')
  if (partner.ok) {
    const pjar = partner.jar
    const cat = await api(pjar, 'GET', `/api/grossistes/${ubipharm.id}/catalogue?limit=5`)
    record(SUITE, 'GET catalogue de SON grossiste', cat.status === 200 ? 'PASS' : 'FAIL', `status=${cat.status} ${cat.text.slice(0, 70)}`)

    // POST produit (propre)
    const prod = await api(pjar, 'POST', `/api/grossistes/${ubipharm.id}/catalogue`, {
      dci: `Testgabantine-${suffix}`,
      nomCommercial: `TEST-GROSSISTE-${suffix}`,
      forme: 'COMPRIME',
      dosage: '100mg',
      prixUnitaire: 250,
      quantiteDispo: 500,
    })
    record(SUITE, 'POST produit catalogue (propre)', prod.status === 201 ? 'PASS' : 'FAIL', `status=${prod.status} ${prod.text.slice(0, 80)}`)

    if (prod.status === 201) {
      const prodDb = await prisma.produitGrossiste.findUnique({ where: { id: prod.json.id } })
      record(SUITE, 'Persistance produit (DB)', prodDb ? 'PASS' : 'FAIL', `${prodDb?.nomCommercial} ${prodDb?.prixUnitaire} FCFA`)

      // PATCH prix
      const patch = await api(pjar, 'PATCH', `/api/grossistes/catalogue/${prod.json.id}`, { prixUnitaire: 275 })
      record(SUITE, 'PATCH prix produit', patch.status === 200 ? 'PASS' : 'FAIL', `status=${patch.status}`)
      const prodDb2 = await prisma.produitGrossiste.findUnique({ where: { id: prod.json.id } })
      record(SUITE, 'Persistance prix produit (DB)', prodDb2?.prixUnitaire === 275 ? 'PASS' : 'FAIL', `prix=${prodDb2?.prixUnitaire}`)

      // Isolation: PATCH produit d'un autre grossiste
      const otherProduct = await prisma.produitGrossiste.findFirst({ where: { grossisteId: promopharm.id }, select: { id: true } })
      if (otherProduct) {
        const crossProd = await api(pjar, 'PATCH', `/api/grossistes/catalogue/${otherProduct.id}`, { prixUnitaire: 999 })
        record(SUITE, 'Isolation: PATCH produit d\'un autre grossiste → 403', crossProd.status === 403 ? 'PASS' : 'FAIL', `status=${crossProd.status}`)
      }
    }

    // POST produit dans le catalogue d'un autre grossiste → 403
    const crossPost = await api(pjar, 'POST', `/api/grossistes/${promopharm.id}/catalogue`, {
      dci: 'Hack', nomCommercial: 'Hack', prixUnitaire: 1,
    })
    record(SUITE, 'Isolation: POST produit chez un autre grossiste → 403', crossPost.status === 403 ? 'PASS' : 'FAIL', `status=${crossPost.status}`)
  }

  const s = summary()
  await prisma.$disconnect()
  process.exit(s.fail > 0 ? 1 : 0)
}

main().catch(e => { console.error('ERREUR FATALE:', e); process.exit(1) })
