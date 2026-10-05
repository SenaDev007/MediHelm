// ============================================================
// MediHelm — Tests espace PATIENT
// Middleware routing + CRUD + persistance DB
// Usage: DATABASE_URL=... bun run scripts/test-patient.ts
// ============================================================

import { PrismaClient } from '@prisma/client'
import { login, api, page, record, summary, BASE } from './test-lib'

const prisma = new PrismaClient()
const SUITE = 'PATIENT'

const now = Date.now()
const TEST_EMAIL = `patient.test${now}@test.medihelm.bj`
const TEST_PASSWORD = 'MotDePasseTest123!'

async function main() {
  console.log(`\n========== ESPACE PATIENT ==========\n`)

  // ---------- A. MIDDLEWARE ROUTING ----------
  console.log('--- A. Middleware routing (pages publiques / auth) ---')
  // Depuis la ronde 4 (auth obligatoire) : les pages patient sont PROTÉGÉES —
  // un anonyme est redirigé (307) vers le landing patient. Seules connexion
  // et inscription restent publiques.
  for (const p of ['/patient', '/patient/recherche', '/patient/pharmacies', '/patient/garde', '/patient/urgence', '/patient/comparateur', '/patient/verifier']) {
    const r = await page(null, p)
    const gate = r.status === 307 && (r.location === '/' || (r.location || '').startsWith('/?'))
    record(SUITE, `Page ${p} (anonyme → 307 landing)`, gate ? 'PASS' : 'FAIL', `status=${r.status}${r.location ? ` → ${r.location}` : ''}`)
  }
  for (const p of ['/patient/connexion', '/patient/inscription']) {
    const r = await page(null, p)
    record(SUITE, `Page ${p} (publique)`, r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`)
  }
  // Pages authentifiées côté client — doivent rester accessibles (gate client)
  for (const p of ['/patient/commande', '/patient/suivi', '/patient/profil', '/patient/fidelite', '/patient/notifications', '/patient/ordonnances', '/patient/rappels', '/patient/vaccinations']) {
    const r = await page(null, p)
    record(SUITE, `Page ${p} (anonyme, gate client)`, r.status === 200 ? 'PASS' : 'WARN', `status=${r.status}${r.location ? ` → ${r.location}` : ''}`)
  }

  // API publiques vs protégées
  const pubSearch = await api(null, 'GET', '/api/patient/recherche?q=para')
  record(SUITE, 'API /api/patient/recherche (anonyme, publique)', pubSearch.status === 200 ? 'PASS' : 'FAIL', `status=${pubSearch.status}`)
  const anonCmd = await api(null, 'GET', '/api/patient/commandes')
  record(SUITE, 'API /api/patient/commandes (anonyme → 401)', anonCmd.status === 401 ? 'PASS' : 'FAIL', `status=${anonCmd.status}`)
  const anonFid = await api(null, 'GET', '/api/patient/fidelite')
  record(SUITE, 'API /api/patient/fidelite (anonyme → 401)', anonFid.status === 401 ? 'PASS' : 'FAIL', `status=${anonFid.status}`)

  // ---------- B. INSCRIPTION (CRUD create) + PERSISTANCE ----------
  console.log('\n--- B. Inscription patient (POST /api/patient/comptes) ---')
  const pharmacies = await api(null, 'GET', '/api/pharmacies?public=signup')
  const pharmaList = pharmacies.json as Array<{ id: string; nom: string; ville: string }>
  record(SUITE, 'GET /api/pharmacies?public=signup (public)', pharmacies.status === 200 && Array.isArray(pharmaList) && pharmaList.length > 0 ? 'PASS' : 'FAIL', `status=${pharmacies.status}, ${pharmaList?.length ?? 0} pharmacies`)
  const gardeToday = await api(null, 'GET', '/api/pharmacies?garde=aujourdhui')
  record(SUITE, 'GET /api/pharmacies?garde=aujourdhui (public)', gardeToday.status === 200 ? 'PASS' : 'FAIL', `status=${gardeToday.status}`)
  // Choisit une pharmacie qui A du stock disponible pour les tests de commande
  const pharmacieAvecStock = await prisma.pharmacie.findFirst({
    where: {
      actif: true,
      medicaments: {
        some: {
          actif: true,
          lots: { some: { quantite: { gt: 0 }, dateExpiration: { gt: new Date() } } },
        },
      },
    },
    select: { id: true, nom: true },
  })
  const pharmacie = pharmacieAvecStock ?? pharmaList?.[0]
  if (pharmacieAvecStock) record(SUITE, 'Pharmacie avec stock disponible trouvée', 'PASS', pharmacieAvecStock.nom)

  if (!pharmacie) {
    console.log('❌ Aucune pharmacie — impossible de continuer')
    return
  }
  console.log(`   Pharmacie de test: ${pharmacie.nom} (${pharmacie.id})`)

  const insc = await api(null, 'POST', '/api/patient/comptes', {
    email: TEST_EMAIL,
    nom: 'TEST',
    prenom: 'Patient',
    motDePasse: TEST_PASSWORD,
    telephone: '+22997000001',
    pharmacieId: pharmacie.id,
  })
  record(SUITE, 'POST /api/patient/comptes (inscription)', insc.status === 201 ? 'PASS' : 'FAIL', `status=${insc.status} ${JSON.stringify(insc.json).slice(0, 120)}`)

  // Persistance DB
  if (insc.status === 201) {
    const user = await prisma.utilisateur.findUnique({ where: { email: TEST_EMAIL }, include: { patients: true } })
    const patientDb = user ? await prisma.patient.findFirst({ where: { utilisateurId: user.id } }) : null
    record(SUITE, 'Persistance inscription (Utilisateur + Patient en DB)', user && patientDb ? 'PASS' : 'FAIL',
      user ? `user=${user.id} role=${user.role}, patient=${patientDb?.id ?? 'AUCUN'}, points=${patientDb?.pointsFidelite ?? '-'}` : 'utilisateur ABSENT')

    // ---------- C. LOGIN + SESSION ----------
    console.log('\n--- C. Login patient ---')
    const pl = await login(TEST_EMAIL, TEST_PASSWORD)
    record(SUITE, 'Login patient (NextAuth)', pl.ok ? 'PASS' : 'FAIL', pl.ok ? 'session OK' : 'échec login')
    const jar = pl.jar

    if (pl.ok) {
      // ---------- D. CRUD AUTHENTIFIÉ ----------
      console.log('\n--- D. APIs authentifiées patient ---')
      const me = await api(jar, 'GET', '/api/patient/comptes')
      record(SUITE, 'GET /api/patient/comptes (moi)', me.status === 200 ? 'PASS' : 'FAIL', `status=${me.status} ${JSON.stringify(me.json).slice(0, 100)}`)
      const patientId = me.json?.patient?.id

      for (const [name, path] of [
        ['GET fidelite', '/api/patient/fidelite'],
        ['GET pharmacies-proches', '/api/patient/pharmacies-proches?lat=9.32&lng=2.35&radius=50'],
        ['GET rappels', '/api/patient/rappels'],
        ['GET notifications (sans param, session)', '/api/patient/notifications'],
        ['GET vaccinations', '/api/patient/vaccinations'],
        ['GET categories', '/api/patient/categories'],
        ['GET urgence-infos', '/api/patient/urgence-infos'],
        ['GET fidelite/transactions', '/api/patient/fidelite/transactions'],
        ['GET fidelite/recompenses', '/api/patient/fidelite/recompenses'],
        ['GET moyens-paiement', '/api/patient/moyens-paiement'],
        ['GET ordonnances', '/api/patient/ordonnances'],
      ] as Array<[string, string]>) {
        const r = await api(jar, 'GET', path)
        record(SUITE, name, r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status} ${r.text.slice(0, 90)}`)
      }

      // ---------- E. COMMANDE PATIENT (CRUD create + persistance) ----------
      console.log('\n--- E. Commande patient (POST /api/patient/commandes) ---')
      // médicaments de la pharmacie avec stock
      const meds = await prisma.medicament.findMany({
        where: { pharmacieId: pharmacie.id, actif: true },
        select: { id: true, dci: true, prixPublic: true, lots: { where: { dateExpiration: { gt: new Date() }, quantite: { gt: 0 } }, select: { quantite: true } } },
        take: 5,
      })
      const medsWithStock = meds.filter(m => m.lots.reduce((t, l) => t + l.quantite, 0) > 0)
      if (medsWithStock.length === 0) {
        record(SUITE, 'Commande patient — précondition stock', 'WARN', 'aucun médicament avec stock dans la pharmacie de test')
      } else {
        const med = medsWithStock[0]
        const expectedTotal = med.prixPublic * 2
        const cmd = await api(jar, 'POST', '/api/patient/commandes', {
          pharmacieId: pharmacie.id,
          lignes: [{ medicamentId: med.id, quantite: 2 }],
          notes: 'Commande de test automatisé',
        })
        record(SUITE, 'POST /api/patient/commandes', cmd.status === 201 ? 'PASS' : 'FAIL', `status=${cmd.status} ${cmd.text.slice(0, 140)}`)

        if (cmd.status === 201) {
          const cmdId = cmd.json.id
          // Persistance
          const cmdDb = await prisma.commandePatient.findUnique({ where: { id: cmdId }, include: { lignes: true } })
          record(SUITE, 'Persistance commande (DB)', cmdDb ? 'PASS' : 'FAIL',
            cmdDb ? `id=${cmdDb.id.slice(0, 8)} statut=${cmdDb.statut} montant=${cmdDb.montantTotal} (attendu ${expectedTotal}) lignes=${cmdDb.lignes.length}` : 'ABSENT')
          record(SUITE, 'Montant total exact', cmdDb && Math.abs(cmdDb.montantTotal - expectedTotal) < 0.01 ? 'PASS' : 'FAIL', `montant=${cmdDb?.montantTotal} vs attendu ${expectedTotal}`)
          record(SUITE, 'Statut initial RECUE', cmdDb?.statut === 'RECUE' ? 'PASS' : 'FAIL', `statut=${cmdDb?.statut}`)

          // GET liste
          const list = await api(jar, 'GET', '/api/patient/commandes')
          const found = Array.isArray(list.json) && list.json.some((c: any) => c.id === cmdId)
          record(SUITE, 'GET /api/patient/commandes (liste contient la commande)', list.status === 200 && found ? 'PASS' : 'FAIL', `status=${list.status}, trouvée=${found}`)

          // ---------- E2. CYCLE DE VIE (côté pharmacie) ----------
          console.log('\n--- E2. Cycle de vie commande (PATCH pharmacien) ---')
          const pharmaLogin = await login('pharmacien@medihelm.bj', 'demo1234')
          record(SUITE, 'Login pharmacien (cycle de vie)', pharmaLogin.ok ? 'PASS' : 'FAIL', pharmaLogin.ok ? 'session OK' : 'échec')
          if (pharmaLogin.ok) {
            const pjar = pharmaLogin.jar
            // Liste des commandes patients de la pharmacie
            const listPh = await api(pjar, 'GET', `/api/patients/commandes?patientId=${patientId}`)
            record(SUITE, 'GET /api/patients/commandes (pharmacie)', listPh.status === 200 && (listPh.json?.data?.some((c: any) => c.id === cmdId) ?? false) ? 'PASS' : 'FAIL', `status=${listPh.status}, total=${listPh.json?.total}`)

            // Transition invalide (RECUE → RECUPEREE direct) doit être rejetée
            const bad = await api(pjar, 'PATCH', `/api/patients/commandes/${cmdId}`, { statut: 'RECUPEREE' })
            record(SUITE, 'Transition invalide RECUE→RECUPEREE rejetée (409)', bad.status === 409 ? 'PASS' : 'FAIL', `status=${bad.status} ${bad.text.slice(0, 90)}`)

            // Cycle complet
            const pointsAvant = (await prisma.patient.findUnique({ where: { id: patientId! }, select: { pointsFidelite: true } }))?.pointsFidelite ?? 0
            const t1 = await api(pjar, 'PATCH', `/api/patients/commandes/${cmdId}`, { statut: 'EN_PREPARATION' })
            record(SUITE, 'PATCH → EN_PREPARATION', t1.status === 200 ? 'PASS' : 'FAIL', `status=${t1.status} ${t1.text.slice(0, 80)}`)
            const t2 = await api(pjar, 'PATCH', `/api/patients/commandes/${cmdId}`, { statut: 'PRETE' })
            record(SUITE, 'PATCH → PRETE', t2.status === 200 ? 'PASS' : 'FAIL', `status=${t2.status}`)
            const t3 = await api(pjar, 'PATCH', `/api/patients/commandes/${cmdId}`, { statut: 'RECUPEREE' })
            record(SUITE, 'PATCH → RECUPEREE', t3.status === 200 ? 'PASS' : 'FAIL', `status=${t3.status} ${t3.text.slice(0, 100)}`)

            if (t3.status === 200) {
              const pointsApres = (await prisma.patient.findUnique({ where: { id: patientId! }, select: { pointsFidelite: true } }))?.pointsFidelite ?? 0
              const attendu = Math.floor(medsWithStock[0].prixPublic * 2 / 100) + 50 // 1pt/100FCFA + bonus 1ère commande
              record(SUITE, 'Points fidélité crédités (DB)', pointsApres - pointsAvant === attendu ? 'PASS' : 'FAIL', `avant=${pointsAvant} après=${pointsApres} (attendu +${attendu})`)

              // Notifications patient créées
              const userPatient = await prisma.utilisateur.findUnique({ where: { email: TEST_EMAIL }, select: { id: true } })
              const notifs = await prisma.notification.findMany({ where: { userId: userPatient!.id }, orderBy: { createdAt: 'asc' } })
              record(SUITE, 'Notifications patient créées (statut + fidélité)', notifs.length >= 4 ? 'PASS' : 'WARN', `${notifs.length} notifications: ${notifs.map(n => n.titre).join(' | ').slice(0, 120)}`)

              // Audit log
              const audit = await prisma.auditLog.findFirst({ where: { entity: 'CommandePatient', entityId: cmdId } })
              record(SUITE, 'Audit log de la transition (DB)', audit ? 'PASS' : 'FAIL', audit ? `${audit.action}: ${audit.details?.slice(0, 60)}` : 'ABSENT')
            }

            // Transition depuis un statut terminal → refusée
            const terminal = await api(pjar, 'PATCH', `/api/patients/commandes/${cmdId}`, { statut: 'EN_PREPARATION' })
            record(SUITE, 'Transition depuis statut terminal rejetée (409)', terminal.status === 409 ? 'PASS' : 'FAIL', `status=${terminal.status}`)

            // Cross-tenant: pharmacien d'une autre pharmacie ne peut pas modifier
            const other = await login('pharmacie2@medihelm.bj', 'demo1234')
            if (other.ok) {
              // créer une commande pour le patient puis tenter de la modifier depuis l'autre pharmacie
              const cmd2 = await api(jar, 'POST', '/api/patient/commandes', { pharmacieId: pharmacie.id, lignes: [{ medicamentId: med.id, quantite: 1 }] })
              if (cmd2.status === 201) {
                const cross = await api(other.jar, 'PATCH', `/api/patients/commandes/${cmd2.json.id}`, { statut: 'EN_PREPARATION' })
                record(SUITE, 'Isolation: pharmacien autre pharmacie → 404', cross.status === 404 ? 'PASS' : 'FAIL', `status=${cross.status}`)
                // nettoyer
                await api(pjar, 'PATCH', `/api/patients/commandes/${cmd2.json.id}`, { statut: 'ANNULEE' })
              }
            }
          }

          // Fidélité: points crédités à la création ? (gap connu)
          const fid = await api(jar, 'GET', '/api/patient/fidelite')
          record(SUITE, 'Points fidélité après commande (gap connu: jamais crédités)', fid.json?.pointsFidelite > 0 ? 'PASS' : 'WARN', `points=${fid.json?.pointsFidelite}`)
        }
      }

      // ---------- F. Contrôle d'accès croisé ----------
      console.log('\n--- F. Isolation (cross-tenant) ---')
      // Un patient ne peut pas lire le dossier d'un autre patient
      const otherPatient = await prisma.patient.findFirst({ where: { utilisateur: { email: { not: TEST_EMAIL } } }, select: { id: true } })
      if (otherPatient) {
        const cross = await api(jar, 'GET', `/api/patient/commandes?patientId=${otherPatient.id}`)
        record(SUITE, 'Isolation: lecture commandes d\'un autre patient → 403', cross.status === 403 ? 'PASS' : 'FAIL', `status=${cross.status}`)
      }
      // Le patient ne doit PAS accéder à /pro ni /institutions
      const proPage = await page(jar, '/pro')
      record(SUITE, 'Middleware: patient → /pro bloqué', (proPage.status === 307 || proPage.status === 302) ? 'PASS' : 'FAIL', `status=${proPage.status} → ${proPage.location?.slice(0, 60)}`)
      const instPage = await page(jar, '/institutions')
      record(SUITE, 'Middleware: patient → /institutions bloqué', (instPage.status === 307 || instPage.status === 302) ? 'PASS' : 'FAIL', `status=${instPage.status} → ${instPage.location?.slice(0, 60)}`)
      const apiVentes = await api(jar, 'GET', '/api/ventes')
      record(SUITE, 'RBAC API: patient → /api/ventes (403)', apiVentes.status === 403 || apiVentes.status === 401 ? 'PASS' : 'FAIL', `status=${apiVentes.status}`)
      const apiStocks = await api(jar, 'GET', '/api/stocks')
      record(SUITE, 'RBAC API: patient → /api/stocks (401/403/404)', [401, 403, 404].includes(apiStocks.status) ? 'PASS' : 'FAIL', `status=${apiStocks.status}`)

      // IDOR notifications: lecture des notifications d'un autre utilisateur
      const otherUser = await prisma.utilisateur.findFirst({ where: { email: 'admin@medihelm.bj' }, select: { id: true } })
      if (otherUser) {
        const idor = await api(jar, 'GET', `/api/patient/notifications?userId=${otherUser.id}`)
        record(SUITE, 'IDOR: notifications d\'un autre utilisateur → 403', idor.status === 403 ? 'PASS' : 'FAIL', `status=${idor.status}`)
      }

      // PATCH marquage notification lue (via /api/notifications)
      const notifs = await api(jar, 'GET', '/api/notifications')
      record(SUITE, 'GET /api/notifications (session patient, M14 read)', notifs.status === 200 ? 'PASS' : 'FAIL', `status=${notifs.status} ${notifs.text.slice(0, 80)}`)
      if (notifs.status === 200 && Array.isArray(notifs.json?.data) && notifs.json.data.length > 0) {
        const nid = notifs.json.data[0].id
        const mark = await api(jar, 'PATCH', '/api/notifications', { id: nid, lue: true })
        record(SUITE, 'PATCH /api/notifications {id, lue:true} (marquage)', mark.status === 200 ? 'PASS' : 'FAIL', `status=${mark.status} ${mark.text.slice(0, 80)}`)
        if (mark.status === 200) {
          const notifDb = await prisma.notification.findUnique({ where: { id: nid } })
          record(SUITE, 'Persistance marquage lue (DB)', notifDb?.lue === true ? 'PASS' : 'FAIL', `lue=${notifDb?.lue}`)
        }
      } else {
        // Crée une notification puis la marque lue
        const broad = await api(jar, 'GET', '/api/patient/notifications')
        record(SUITE, 'GET /api/patient/notifications (session)', broad.status === 200 ? 'PASS' : 'FAIL', `status=${broad.status}`)
      }
    }
  }

  const s = summary()
  await prisma.$disconnect()
  process.exit(s.fail > 0 ? 1 : 0)
}

main().catch(e => { console.error('ERREUR FATALE:', e); process.exit(1) })
