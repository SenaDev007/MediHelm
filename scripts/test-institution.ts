// ============================================================
// MediHelm — Tests espace INSTITUTION (DPMED / SoBAPS / ABRP)
// Middleware routing + gardes de rôles + émission alerte M18 + acquittement
// Usage: bash scripts/serve-and-test.sh scripts/test-institution.ts
// ============================================================

import { PrismaClient } from '@prisma/client'
import { login, api, page, record, summary } from './test-lib'

const prisma = new PrismaClient()
const SUITE = 'INSTITUTION'

async function main() {
  console.log(`\n========== ESPACE INSTITUTION ==========\n`)

  const dpmed = await login('dpmed@medihelm.bj', 'demo1234')
  record(SUITE, 'Login DPMED_ADMIN', dpmed.ok ? 'PASS' : 'FAIL', dpmed.ok ? 'OK' : 'échec')
  const directeur = await login('admin@medihelm.bj', 'demo1234')
  record(SUITE, 'Login DIRECTEUR (test des gardes)', directeur.ok ? 'PASS' : 'FAIL', directeur.ok ? 'OK' : 'échec')
  const pharmacien = await login('pharmacien@medihelm.bj', 'demo1234')
  const caissier = await login('caissier@medihelm.bj', 'demo1234')

  // ---------- A. MIDDLEWARE ROUTING ----------
  console.log('\n--- A. Middleware routing ---')
  if (dpmed.ok) {
    for (const p of ['/institutions', '/institutions/dpmed', '/institutions/sobaps', '/institutions/abrp']) {
      const r = await page(dpmed.jar, p)
      record(SUITE, `Page ${p} (DPMED_ADMIN)`, r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`)
    }
    const pro = await page(dpmed.jar, '/pro')
    record(SUITE, 'Middleware: DPMED_ADMIN → /pro bloqué', pro.status === 307 || pro.status === 302 ? 'PASS' : 'FAIL', `status=${pro.status}`)
  }
  if (directeur.ok) {
    const inst = await page(directeur.jar, '/institutions')
    record(SUITE, 'Middleware: DIRECTEUR → /institutions bloqué', inst.status === 307 || inst.status === 302 ? 'PASS' : 'FAIL', `status=${inst.status}`)
    const dp = await page(directeur.jar, '/institutions/dpmed')
    record(SUITE, 'Middleware: DIRECTEUR → /institutions/dpmed bloqué', dp.status === 307 || dp.status === 302 ? 'PASS' : 'FAIL', `status=${dp.status}`)
    const adm = await page(directeur.jar, '/admin')
    record(SUITE, 'Middleware: DIRECTEUR → /admin bloqué', adm.status === 307 || adm.status === 302 ? 'PASS' : 'FAIL', `status=${adm.status}`)
  }

  // ---------- B. GARDES DE RÔLES (fuites corrigées) ----------
  console.log('\n--- B. Gardes de rôles institutionnels ---')
  if (directeur.ok) {
    // Ces routes étaient accessibles aux rôles pharmacie via permissions M14/M15/M18/M19
    const sobapsDash = await api(directeur.jar, 'GET', '/api/institutions/sobaps/dashboard')
    record(SUITE, 'DIRECTEUR → sobaps/dashboard → 403 (était 200)', sobapsDash.status === 403 ? 'PASS' : 'FAIL', `status=${sobapsDash.status}`)
    const confScores = await api(directeur.jar, 'GET', '/api/institutions/conformite/scores')
    record(SUITE, 'DIRECTEUR → conformite/scores → 403', confScores.status === 403 ? 'PASS' : 'FAIL', `status=${confScores.status}`)
    const abrpDash = await api(directeur.jar, 'GET', '/api/portail/abrp/dashboard')
    record(SUITE, 'DIRECTEUR → abrp/dashboard → 403', abrpDash.status === 403 ? 'PASS' : 'FAIL', `status=${abrpDash.status}`)
    const alertesList = await api(directeur.jar, 'GET', '/api/portail/dpmed/alertes')
    record(SUITE, 'DIRECTEUR → portail/dpmed/alertes (GET) → 403', alertesList.status === 403 ? 'PASS' : 'FAIL', `status=${alertesList.status}`)
    const alertesPost = await api(directeur.jar, 'POST', '/api/portail/dpmed/alertes', {
      titre: 'Alerte frauduleuse', typeAlerte: 'RAPPEL_LOT', niveauUrgence: 'URGENT',
    })
    record(SUITE, 'DIRECTEUR → émission alerte nationale → 403 (était permis!)', alertesPost.status === 403 ? 'PASS' : 'FAIL', `status=${alertesPost.status}`)
    const couverture = await api(directeur.jar, 'GET', '/api/institutions/dpmed/carte-couverture')
    record(SUITE, 'DIRECTEUR → dpmed/carte-couverture → 403', couverture.status === 403 ? 'PASS' : 'FAIL', `status=${couverture.status}`)
  }
  if (caissier.ok) {
    const r = await api(caissier.jar, 'GET', '/api/institutions/conformite/scores')
    record(SUITE, 'CAISSIER → conformite/scores → 403', r.status === 403 ? 'PASS' : 'FAIL', `status=${r.status}`)
  }
  if (dpmed.ok) {
    // L'autorité DPMED accède à SES routes
    const sobaps = await api(dpmed.jar, 'GET', '/api/institutions/sobaps/dashboard')
    record(SUITE, 'DPMED_ADMIN → sobaps/dashboard → 200', sobaps.status === 200 ? 'PASS' : 'FAIL', `status=${sobaps.status}`)
    const conf = await api(dpmed.jar, 'GET', '/api/institutions/conformite/scores')
    record(SUITE, 'DPMED_ADMIN → conformite/scores → 200', conf.status === 200 ? 'PASS' : 'FAIL', `status=${conf.status}`)
    const couv = await api(dpmed.jar, 'GET', '/api/institutions/dpmed/carte-couverture')
    record(SUITE, 'DPMED_ADMIN → carte-couverture → 200', couv.status === 200 ? 'PASS' : 'FAIL', `status=${couv.status}`)
    const stats = await api(dpmed.jar, 'GET', '/api/institutions/stats')
    record(SUITE, 'Stats institutionnelles (agrégats anonymes) → 200', stats.status === 200 ? 'PASS' : 'FAIL', `status=${stats.status}`)
  }

  // ---------- C. ÉMISSION D'ALERTE M18 (chaîne de diffusion) ----------
  console.log('\n--- C. Émission alerte DPMED (diffusion complète) ---')
  let alerteId: string | null = null
  if (dpmed.ok) {
    // Compteurs avant
    const pharmaciesAvant = await prisma.pharmacie.count({ where: { actif: true } })
    const notifsAvant = await prisma.notification.count()
    // Patients ayant acheté du Paracétamol (seed) — existent-ils ?
    const sixMois = new Date(Date.now() - 182 * 86400000)
    const patientsParacetamol = await prisma.patient.count({
      where: {
        actif: true,
        ventes: { some: { createdAt: { gte: sixMois }, lignes: { some: { medicament: { dci: { equals: 'Paracétamol', mode: 'insensitive' } } } } } },
      },
    })

    const em = await api(dpmed.jar, 'POST', '/api/portail/dpmed/alertes', {
      titre: `Alerte test automatisée ${Date.now()}`,
      description: 'Test de la chaîne de diffusion complète',
      typeAlerte: 'RAPPEL_LOT',
      niveauUrgence: 'URGENCE_IMMEDIATE',
      dciConcernee: 'Paracétamol',
      referenceOfficielle: `DPMED-2026-${String(Date.now()).slice(-6)}`,
      dateEmissionDPMED: new Date().toISOString(),
    })
    record(SUITE, 'POST émission alerte (DPMED_ADMIN)', em.status === 201 ? 'PASS' : 'FAIL', `status=${em.status} ${em.text.slice(0, 100)}`)

    if (em.status === 201) {
      alerteId = em.json.id
      // Diffusions créées pour chaque pharmacie active
      const diffusions = await prisma.diffusionAlerte.count({ where: { alerteId } })
      record(SUITE, 'Diffusions créées pour toutes les pharmacies actives', diffusions === pharmaciesAvant ? 'PASS' : 'FAIL', `${diffusions}/${pharmaciesAvant}`)
      // Statut DIFFUSEE persisté
      const alerteDb = await prisma.alerteDPMED.findUnique({ where: { id: alerteId } })
      record(SUITE, 'Statut alerte → DIFFUSEE (DB)', alerteDb?.statut === 'DIFFUSEE' ? 'PASS' : 'FAIL', `statut=${alerteDb?.statut}`)
      // Notifications créées (pharmaciens + patients exposés)
      const notifsApres = await prisma.notification.count()
      const notifDPMED = await prisma.notification.count({ where: { titre: { contains: 'Alerte DPMED' } } })
      const notifPatients = await prisma.notification.count({ where: { titre: { contains: 'médicament que vous avez acheté' } } })
      record(SUITE, 'Notifications pharmaciens créées', notifDPMED >= 1 ? 'PASS' : 'FAIL', `${notifDPMED} notification(s) équipe pharmacie`)
      record(SUITE, 'Notifications patients exposés créées (F-P11)', (patientsParacetamol === 0 ? notifPatients >= 0 : notifPatients >= 1) ? 'PASS' : 'FAIL', `${notifPatients} patient(s) notifié(s) sur ${patientsParacetamol} acheteurs Paracétamol`)
      // Audit log
      const audit = await prisma.auditLog.findFirst({ where: { entity: 'AlerteDPMED', entityId: alerteId } })
      record(SUITE, 'Audit log émission', audit ? 'PASS' : 'FAIL', audit?.details?.slice(0, 90) ?? 'ABSENT')
      // Stats de diffusion dans la réponse
      record(SUITE, 'diffusionStats dans la réponse', em.json?.diffusionStats ? 'PASS' : 'FAIL', JSON.stringify(em.json?.diffusionStats))
    }

    // GET liste
    const list = await api(dpmed.jar, 'GET', '/api/portail/dpmed/alertes?limit=5')
    record(SUITE, 'GET portail/dpmed/alertes (DPMED)', list.status === 200 ? 'PASS' : 'FAIL', `status=${list.status}`)
  }

  // ---------- D. ACCÈS AU DÉTAIL D'ALERTE ----------
  console.log('\n--- D. Détail alerte: isolation des données ---')
  if (alerteId) {
    if (dpmed.ok) {
      const detail = await api(dpmed.jar, 'GET', `/api/alertes/dpmed/${alerteId}`)
      const hasContacts = detail.json?.diffusions?.some((d: any) => d.pharmacie?.telephone) ?? false
      record(SUITE, 'Détail complet pour DPMED (avec coordonnées)', detail.status === 200 && hasContacts ? 'PASS' : 'FAIL', `status=${detail.status}, contacts=${hasContacts}`)
    }
    if (pharmacien.ok) {
      const detail = await api(pharmacien.jar, 'GET', `/api/alertes/dpmed/${alerteId}`)
      const diffusions = detail.json?.diffusions as Array<any> ?? []
      const ownOnly = diffusions.length >= 1 && diffusions.every((d: any) => d.pharmacieId === detail.json?.diffusions?.[0]?.pharmacieId)
      const noContacts = diffusions.every((d: any) => !d.pharmacie?.telephone && !d.pharmacie?.email)
      record(SUITE, 'Pharmacien: sa diffusion uniquement, SANS coordonnées', detail.status === 200 && ownOnly && noContacts ? 'PASS' : 'FAIL',
        `status=${detail.status}, diffusions=${diffusions.length}, contacts=${!noContacts}`)
    }
    // Un employé pharmacie (CAISSIER, M18 read) voit sa diffusion sans coordonnées
    if (caissier.ok) {
      const r = await api(caissier.jar, 'GET', `/api/alertes/dpmed/${alerteId}`)
      const diffs = r.json?.diffusions as Array<any> ?? []
      const noContacts = diffs.every((d: any) => !d.pharmacie?.telephone && !d.pharmacie?.email)
      record(SUITE, 'CAISSIER: sa diffusion, sans coordonnées', r.status === 200 && noContacts ? 'PASS' : 'FAIL', `status=${r.status}, contacts=${!noContacts}`)
    }
  }

  // ---------- E. ACQUITTEMENT ----------
  console.log('\n--- E. Acquittement par la pharmacie ---')
  if (alerteId && pharmacien.ok) {
    const acq = await api(pharmacien.jar, 'POST', `/api/alertes/dpmed/${alerteId}/acquitter`)
    record(SUITE, 'POST acquittement (pharmacien)', acq.status === 200 ? 'PASS' : 'FAIL', `status=${acq.status} ${acq.text.slice(0, 70)}`)
    if (acq.status === 200) {
      const pharmacieCentre = await prisma.pharmacie.findFirst({ where: { utilisateurs: { some: { email: 'pharmacien@medihelm.bj' } } }, select: { id: true } })
      const diffusion = await prisma.diffusionAlerte.findFirst({ where: { alerteId, pharmacieId: pharmacieCentre!.id } })
      record(SUITE, 'Persistance acquittement (ACQUITTEE + date)', diffusion?.statut === 'ACQUITTEE' && diffusion?.dateAcquittement ? 'PASS' : 'FAIL', `statut=${diffusion?.statut}`)
      // Double acquittement → idempotent 200
      const acq2 = await api(pharmacien.jar, 'POST', `/api/alertes/dpmed/${alerteId}/acquitter`)
      record(SUITE, 'Double acquittement idempotent', acq2.status === 200 ? 'PASS' : 'FAIL', `status=${acq2.status}`)
    }
    // Autre pharmacie: acquitte SA diffusion
    const pharmacie2 = await login('pharmacie2@medihelm.bj', 'demo1234')
    if (pharmacie2.ok) {
      const acqOther = await api(pharmacie2.jar, 'POST', `/api/alertes/dpmed/${alerteId}/acquitter`)
      record(SUITE, 'Acquittement autre pharmacie (sa diffusion)', acqOther.status === 200 ? 'PASS' : 'WARN', `status=${acqOther.status}`)
    }
  }

  // ---------- F. LISTE D'ALERTES PHARMACIE ----------
  console.log('\n--- F. Alertes côté pharmacie ---')
  if (pharmacien.ok) {
    const list = await api(pharmacien.jar, 'GET', '/api/alertes/dpmed')
    record(SUITE, 'GET /api/alertes/dpmed (pharmacie: ses alertes diffusées)', list.status === 200 ? 'PASS' : 'FAIL', `status=${list.status}, ${Array.isArray(list.json) ? list.json.length : '?'} alerte(s)`)
    const hasOwn = Array.isArray(list.json) && list.json.some((a: any) => a.id === alerteId)
    record(SUITE, 'La liste contient l\'alerte diffusée', hasOwn ? 'PASS' : 'FAIL', `trouvée=${hasOwn}`)
  }

  const s = summary()
  await prisma.$disconnect()
  process.exit(s.fail > 0 ? 1 : 0)
}

main().catch(e => { console.error('ERREUR FATALE:', e); process.exit(1) })
