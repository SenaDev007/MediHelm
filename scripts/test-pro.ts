// ============================================================
// MediHelm — Tests espace PHARMACIE (Pro)
// Middleware routing + POS/ventes + CRUD + réceptions + persistance
// Usage: bash scripts/serve-and-test.sh scripts/test-pro.ts
// ============================================================

import { PrismaClient } from '@prisma/client'
import { login, api, page, record, summary } from './test-lib'

const prisma = new PrismaClient()
const SUITE = 'PHARMACIE'
const PHARMACIE_EMAILS = ['admin@medihelm.bj', 'pharmacien@medihelm.bj', 'caissier@medihelm.bj', 'magasinier@medihelm.bj', 'owner@medihelm.bj']

async function main() {
  console.log(`\n========== ESPACE PHARMACIE (Pro) ==========\n`)

  // ---------- A. MIDDLEWARE ROUTING ----------
  console.log('--- A. Middleware routing par rôle ---')
  for (const email of PHARMACIE_EMAILS) {
    const l = await login(email, 'demo1234')
    const role = email.split('@')[0]
    record(SUITE, `Login ${email}`, l.ok ? 'PASS' : 'FAIL', l.ok ? 'OK' : 'échec')
    if (l.ok) {
      const p = await page(l.jar, '/pro')
      record(SUITE, `Middleware: ${role} → /pro autorisé`, p.status === 200 ? 'PASS' : 'FAIL', `status=${p.status}`)
    }
  }
  // Rôles non-pharmacie bloqués
  const dpmed = await login('dpmed@medihelm.bj', 'demo1234')
  if (dpmed.ok) {
    const p = await page(dpmed.jar, '/pro')
    record(SUITE, 'Middleware: DPMED_ADMIN → /pro bloqué', p.status === 307 || p.status === 302 ? 'PASS' : 'FAIL', `status=${p.status} → ${p.location?.slice(0, 40)}`)
  }
  const grossisteL = await login('grossiste@medihelm.bj', 'demo1234')
  if (grossisteL.ok) {
    const p = await page(grossisteL.jar, '/pro')
    record(SUITE, 'Middleware: GROSSISTE_PARTNER → /pro bloqué', p.status === 307 || p.status === 302 ? 'PASS' : 'FAIL', `status=${p.status}`)
    const g = await page(grossisteL.jar, '/grossistes')
    record(SUITE, 'Middleware: GROSSISTE_PARTNER → /grossistes autorisé', g.status === 200 ? 'PASS' : 'FAIL', `status=${g.status}`)
  }
  // /admin réservé PLATFORM_ADMIN (rôle inexistant en base)
  const adminL = await login('admin@medihelm.bj', 'demo1234')
  if (adminL.ok) {
    const p = await page(adminL.jar, '/admin')
    record(SUITE, 'Middleware: DIRECTEUR → /admin bloqué (réservé PLATFORM_ADMIN)', p.status === 307 || p.status === 302 ? 'PASS' : 'FAIL', `status=${p.status}`)
    const apiAdmin = await api(adminL.jar, 'GET', '/api/admin/plans')
    record(SUITE, 'Middleware API: DIRECTEUR → /api/admin/* (403)', apiAdmin.status === 403 ? 'PASS' : 'FAIL', `status=${apiAdmin.status}`)
  }
  // Pages /pro clés rendent (200)
  if (adminL.ok) {
    for (const p of ['/pro', '/pro/caisse', '/pro/stock', '/pro/ventes', '/pro/commandes', '/pro/patients', '/pro/ordonnances', '/pro/fournisseurs', '/pro/finance', '/pro/personnel', '/pro/communication', '/pro/abonnement', '/pro/alertes']) {
      const r = await page(adminL.jar, p)
      record(SUITE, `Page ${p}`, r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`)
    }
  }

  const jar = adminL.ok ? adminL.jar : null
  if (!jar) { console.log('❌ login admin impossible'); return }

  // Préparation des données de test
  const pharmacie = await prisma.pharmacie.findFirst({ where: { utilisateurs: { some: { email: 'admin@medihelm.bj' } } }, select: { id: true, nom: true } })
  if (!pharmacie) { console.log('❌ pharmacie introuvable'); return }
  console.log(`   Pharmacie: ${pharmacie.nom}`)

  // Médicament de test dédié (2 lots + 1 lot expiré)
  const suffix = Date.now().toString().slice(-8)
  const medTest = await prisma.medicament.create({
    data: {
      pharmacieId: pharmacie.id,
      dci: `Testophiline-${suffix}`,
      nomCommercial: `TEST-Pharma-${suffix}`,
      forme: 'COMPRIME',
      dosage: '500mg',
      prixPublic: 100,
      stockMinimum: 5,
      actif: true,
    },
  })
  await prisma.lot.createMany({
    data: [
      { pharmacieId: pharmacie.id, medicamentId: medTest.id, numeroLot: `LOT-A-${suffix}`, quantite: 6, quantiteInitiale: 6, prixAchat: 60, dateExpiration: new Date(Date.now() + 100 * 86400000) },
      { pharmacieId: pharmacie.id, medicamentId: medTest.id, numeroLot: `LOT-B-${suffix}`, quantite: 6, quantiteInitiale: 6, prixAchat: 70, dateExpiration: new Date(Date.now() + 200 * 86400000) },
      { pharmacieId: pharmacie.id, medicamentId: medTest.id, numeroLot: `LOT-EXPIRE-${suffix}`, quantite: 10, quantiteInitiale: 10, prixAchat: 50, dateExpiration: new Date(Date.now() - 10 * 86400000) },
    ],
  })

  // ---------- B. POS / VENTES ----------
  console.log('\n--- B. POS: POST /api/ventes (FEFO, stock, traçabilité) ---')
  // B1. Vente simple multi-lots: 8 unités → 6 du LOT-A (FEFO) + 2 du LOT-B
  const stockAvant = await prisma.lot.findMany({ where: { medicamentId: medTest.id, pharmacieId: pharmacie.id }, select: { numeroLot: true, quantite: true } })
  const v1 = await api(jar, 'POST', '/api/ventes', {
    modePaiement: 'ESPECES',
    lignes: [{ medicamentId: medTest.id, quantite: 8 }],
  })
  record(SUITE, 'Vente 8 unités (FEFO multi-lots)', v1.status === 201 ? 'PASS' : 'FAIL', `status=${v1.status} ${v1.text.slice(0, 120)}`)

  if (v1.status === 201) {
    const venteId = v1.json.id
    const venteDb = await prisma.vente.findUnique({ where: { id: venteId }, include: { lignes: true, paiements: true } })
    // Persistance + montants
    record(SUITE, 'Persistance vente (DB)', venteDb ? 'PASS' : 'FAIL', `ref=${venteDb?.reference} montant=${venteDb?.montantTotal} (attendu 800)`)
    record(SUITE, 'Montant exact (8 × 100)', venteDb?.montantTotal === 800 ? 'PASS' : 'FAIL', `montant=${venteDb?.montantTotal}`)
    // Sous-lignes par lot avec lotId
    const lotsUtilises = venteDb?.lignes.map(l => l.lotId).filter(Boolean) ?? []
    record(SUITE, 'Traçabilité: sous-lignes avec lotId (2 lots)', venteDb?.lignes.length === 2 && lotsUtilises.length === 2 ? 'PASS' : 'FAIL', `${venteDb?.lignes.length} sous-lignes`)
    // Stock décrémenté correctement (LOT-A: 0, LOT-B: 4, EXPIRE: 10 intact)
    const stockApres = await prisma.lot.findMany({ where: { medicamentId: medTest.id, pharmacieId: pharmacie.id }, select: { numeroLot: true, quantite: true } })
    const lotA = stockApres.find(l => l.numeroLot === `LOT-A-${suffix}`)
    const lotB = stockApres.find(l => l.numeroLot === `LOT-B-${suffix}`)
    const lotExpire = stockApres.find(l => l.numeroLot === `LOT-EXPIRE-${suffix}`)
    record(SUITE, 'FEFO: lot A (expire 1er) vidé en priorité', lotA?.quantite === 0 ? 'PASS' : 'FAIL', `LOT-A=${lotA?.quantite}/6`)
    record(SUITE, 'FEFO: lot B partiellement entamé', lotB?.quantite === 4 ? 'PASS' : 'FAIL', `LOT-B=${lotB?.quantite}/6`)
    record(SUITE, 'Lot expiré exclu du FEFO', lotExpire?.quantite === 10 ? 'PASS' : 'FAIL', `LOT-EXPIRE=${lotExpire?.quantite}/10`)

    // Mouvements de stock tracés
    const mvts = await prisma.mouvementStock.findMany({ where: { reference: venteDb?.reference, type: 'SORTIE' } })
    record(SUITE, 'MouvementsStock SORTIE créés (2)', mvts.length === 2 ? 'PASS' : 'WARN', `${mvts.length} mouvements`)

    // B2. Stock insuffisant → 409, aucune écriture
    const v2 = await api(jar, 'POST', '/api/ventes', {
      modePaiement: 'ESPECES',
      lignes: [{ medicamentId: medTest.id, quantite: 100 }],
    })
    record(SUITE, 'Stock insuffisant → 409', v2.status === 409 ? 'PASS' : 'FAIL', `status=${v2.status} ${v2.text.slice(0, 90)}`)
    const stockApres2 = await prisma.lot.aggregate({ where: { medicamentId: medTest.id, pharmacieId: pharmacie.id, numeroLot: { not: { contains: 'EXPIRE' } } }, _sum: { quantite: true } })
    record(SUITE, 'Aucune écriture après refus (stock intact)', stockApres2._sum.quantite === 4 ? 'PASS' : 'FAIL', `stock=${stockApres2._sum.quantite}`)

    // B3. Lot expiré explicite → 409
    const lotExpireId = (await prisma.lot.findFirst({ where: { numeroLot: `LOT-EXPIRE-${suffix}` }, select: { id: true } }))?.id
    const v3 = await api(jar, 'POST', '/api/ventes', {
      modePaiement: 'ESPECES',
      lignes: [{ medicamentId: medTest.id, lotId: lotExpireId!, quantite: 1 }],
    })
    record(SUITE, 'Vente sur lot expiré → 409', v3.status === 409 ? 'PASS' : 'FAIL', `status=${v3.status} ${v3.text.slice(0, 90)}`)

    // B4. VIDAGE TOTAL → alerte RUPTURE automatique
    const v4 = await api(jar, 'POST', '/api/ventes', {
      modePaiement: 'ESPECES',
      lignes: [{ medicamentId: medTest.id, quantite: 4 }],
    })
    const alerte = await prisma.alerteStock.findFirst({ where: { medicamentId: medTest.id, type: 'RUPTURE', traitee: false } })
    record(SUITE, 'Vidage total → vente OK', v4.status === 201 ? 'PASS' : 'FAIL', `status=${v4.status}`)
    record(SUITE, 'Alerte RUPTURE générée automatiquement', alerte ? 'PASS' : 'FAIL', alerte ? alerte.message.slice(0, 80) : 'ABSENTE')
  }

  // B5. Vente avec médicament d'une AUTRE pharmacie → 400
  const autrePharma = await prisma.pharmacie.findFirst({ where: { id: { not: pharmacie.id } }, select: { id: true } })
  const medAutre = await prisma.medicament.findFirst({ where: { pharmacieId: autrePharma!.id }, select: { id: true } })
  if (medAutre) {
    const v5 = await api(jar, 'POST', '/api/ventes', {
      modePaiement: 'ESPECES',
      lignes: [{ medicamentId: medAutre.id, quantite: 1 }],
    })
    record(SUITE, 'Isolation: médicament d\'une autre pharmacie → 400', v5.status === 400 ? 'PASS' : 'FAIL', `status=${v5.status}`)
  }

  // B6. GET /api/ventes (liste + stats)
  const lv = await api(jar, 'GET', '/api/ventes?limit=5')
  record(SUITE, 'GET /api/ventes (liste + stats du jour)', lv.status === 200 && Array.isArray(lv.json?.ventes) && lv.json?.stats ? 'PASS' : 'FAIL', `status=${lv.status}, total=${lv.json?.total}, CA jour=${lv.json?.stats?.caDuJour}`)

  // B7. Sync offline: idempotence
  console.log('\n--- B7. Sync offline (idempotence) ---')
  const syncRef = `VTE-SYNC-TEST-${suffix}`
  const s1 = await api(jar, 'POST', '/api/ventes/sync', {
    ventes: [{ reference: syncRef, modePaiement: 'ESPECES', lignes: [{ medicamentId: medTest.id, quantite: 0 }] }],
  })
  // quantite: 0 invalide → failed (validation) — on teste d'abord l'idempotence avec une vente valide
  // Réapprovisionne pour la vente sync
  await prisma.lot.updateMany({ where: { medicamentId: medTest.id, numeroLot: { contains: 'LOT-B' } }, data: { quantite: 5 } })
  const s2 = await api(jar, 'POST', '/api/ventes/sync', {
    ventes: [{ reference: syncRef, modePaiement: 'ESPECES', lignes: [{ medicamentId: medTest.id, quantite: 2 }] }],
  })
  record(SUITE, 'Sync: vente hors ligne acceptée', s2.status === 200 && s2.json?.succeeded === 1 ? 'PASS' : 'FAIL', `status=${s2.status} ${JSON.stringify(s2.json).slice(0, 100)}`)
  const s3 = await api(jar, 'POST', '/api/ventes/sync', {
    ventes: [{ reference: syncRef, modePaiement: 'ESPECES', lignes: [{ medicamentId: medTest.id, quantite: 2 }] }],
  })
  record(SUITE, 'Sync: rejeu idempotent (doublon ignoré)', s3.status === 200 && s3.json?.duplicates === 1 && s3.json?.succeeded === 0 ? 'PASS' : 'FAIL', `duplicates=${s3.json?.duplicates}, succeeded=${s3.json?.succeeded}`)
  const ventesSync = await prisma.vente.findMany({ where: { reference: syncRef } })
  record(SUITE, 'Sync: une seule vente en DB après rejeu', ventesSync.length === 1 ? 'PASS' : 'FAIL', `${ventesSync.length} vente(s)`)

  // ---------- C. MÉDICAMENTS CRUD ----------
  console.log('\n--- C. Médicaments CRUD ---')
  const medNew = await api(jar, 'POST', '/api/medicaments', {
    dci: `Paratest-${suffix}`,
    nomCommercial: `PARATEST-${suffix}`,
    forme: 'GELULE',
    dosage: '250mg',
    prixPublic: 500,
  })
  record(SUITE, 'POST /api/medicaments', medNew.status === 201 ? 'PASS' : 'FAIL', `status=${medNew.status} ${medNew.text.slice(0, 90)}`)
  if (medNew.status === 201) {
    const medDb = await prisma.medicament.findUnique({ where: { id: medNew.json.id } })
    record(SUITE, 'Persistance médicament (DB)', medDb ? 'PASS' : 'FAIL', `${medDb?.nomCommercial} ${medDb?.dosage}`)
    // PATCH prix
    const medPatch = await api(jar, 'PATCH', `/api/medicaments/${medNew.json.id}`, { prixPublic: 600 })
    record(SUITE, 'PATCH /api/medicaments/[id] (prix)', medPatch.status === 200 ? 'PASS' : 'FAIL', `status=${medPatch.status} ${medPatch.text.slice(0, 80)}`)
    const medDb2 = await prisma.medicament.findUnique({ where: { id: medNew.json.id } })
    record(SUITE, 'Persistance prix modifié (DB)', medDb2?.prixPublic === 600 ? 'PASS' : 'FAIL', `prix=${medDb2?.prixPublic}`)
  }
  const medList = await api(jar, 'GET', '/api/medicaments?limit=5')
  record(SUITE, 'GET /api/medicaments', medList.status === 200 ? 'PASS' : 'FAIL', `status=${medList.status}`)

  // ---------- D. RÉCEPTIONS (M03) ----------
  console.log('\n--- D. Réceptions fournisseur (stock + CMUP + commande) ---')
  // Créer un fournisseur + une commande
  const frs = await prisma.fournisseur.findFirst({ where: { pharmacieId: pharmacie.id }, select: { id: true, nom: true } })
  let fournisseurId = frs?.id
  if (!fournisseurId) {
    const frsNew = await api(jar, 'POST', '/api/fournisseurs', { nom: `FOURNISSEUR-TEST-${suffix}`, contact: 'Test' })
    fournisseurId = frsNew.json?.id
  }
  const cmd = await api(jar, 'POST', '/api/commandes', {
    fournisseurId,
    nomFournisseur: `FOURNISSEUR-TEST-${suffix}`,
    lignes: [{ dci: medTest.dci, nomCommercial: medTest.nomCommercial, quantite: 10, prixAchat: 65 }],
  })
  record(SUITE, 'POST /api/commandes (commande fournisseur)', cmd.status === 201 ? 'PASS' : 'FAIL', `status=${cmd.status} ${cmd.text.slice(0, 90)}`)
  const cmdId = cmd.json?.id

  if (cmdId) {
    // Confirmer la commande
    const cmdConfirm = await api(jar, 'PATCH', `/api/commandes/${cmdId}`, { statut: 'CONFIRMEE' })
    record(SUITE, 'PATCH commande → CONFIRMEE', cmdConfirm.status === 200 ? 'PASS' : 'WARN', `status=${cmdConfirm.status}`)

    // Réception avec impact stock
    const stockAvantRec = await prisma.lot.aggregate({ where: { medicamentId: medTest.id, pharmacieId: pharmacie.id, numeroLot: { not: { contains: 'EXPIRE' } } }, _sum: { quantite: true } })
    const cmupAvant = (await prisma.medicament.findUnique({ where: { id: medTest.id }, select: { cmup: true } }))?.cmup ?? 0
    const rec = await api(jar, 'POST', '/api/receptions', {
      commandeId: cmdId,
      fournisseurId,
      numeroBL: `BL-${suffix}`,
      lignes: [{
        medicamentId: medTest.id,
        quantite: 10,
        prixAchat: 65,
        numeroLot: `LOT-C-${suffix}`,
        dateExpiration: new Date(Date.now() + 300 * 86400000).toISOString(),
      }],
    })
    record(SUITE, 'POST /api/receptions (impact stock)', rec.status === 201 ? 'PASS' : 'FAIL', `status=${rec.status} ${rec.text.slice(0, 110)}`)

    if (rec.status === 201) {
      // Lot créé + incrément
      const lotC = await prisma.lot.findFirst({ where: { numeroLot: `LOT-C-${suffix}` } })
      record(SUITE, 'Lot créé en réception (DB)', lotC ? 'PASS' : 'FAIL', lotC ? `${lotC.numeroLot} qte=${lotC.quantite} prixAchat=${lotC.prixAchat}` : 'ABSENT')
      // Mouvement ENTREE
      const mvt = await prisma.mouvementStock.findFirst({ where: { lotId: lotC?.id, type: 'ENTREE', motif: 'RECEPTION' } })
      record(SUITE, 'MouvementStock ENTREE créé', mvt ? 'PASS' : 'FAIL', mvt ? `qte=${mvt.quantite} ref=${mvt.reference?.slice(0, 20)}` : 'ABSENT')
      // LigneReception persistée
      const ligneRec = await prisma.ligneReception.findFirst({ where: { lotId: lotC?.id } })
      record(SUITE, 'LigneReception persistée (document)', ligneRec ? 'PASS' : 'FAIL', ligneRec ? `qte=${ligneRec.quantite}` : 'ABSENT')
      // CMUP recalculé
      const cmupApres = (await prisma.medicament.findUnique({ where: { id: medTest.id }, select: { cmup: true } }))?.cmup ?? 0
      const stockApresRec = (stockAvantRec._sum.quantite ?? 0) + 10
      const attendu = ((stockAvantRec._sum.quantite ?? 0) * cmupAvant + 10 * 65) / stockApresRec
      record(SUITE, 'CMUP recalculé', Math.abs(cmupApres - attendu) < 0.01 ? 'PASS' : 'FAIL', `avant=${cmupAvant} après=${cmupApres} (attendu≈${attendu.toFixed(2)})`)
      // Commande mise à jour
      const cmdDb = await prisma.commandeFournisseur.findUnique({ where: { id: cmdId }, include: { lignes: true } })
      record(SUITE, 'Commande → LIVREE + quantiteLivre', cmdDb?.statut === 'LIVREE' && cmdDb.lignes[0]?.quantiteLivre === 10 ? 'PASS' : 'WARN', `statut=${cmdDb?.statut} livré=${cmdDb?.lignes[0]?.quantiteLivre}/10`)
      // Audit log
      const audit = await prisma.auditLog.findFirst({ where: { entity: 'ReceptionFournisseur', entityId: rec.json.id } })
      record(SUITE, 'Audit log réception', audit ? 'PASS' : 'FAIL', audit?.details?.slice(0, 60) ?? 'ABSENT')
    }

    // Réception fournisseur d'une autre pharmacie → 404
    const recCross = await api(jar, 'POST', '/api/receptions', {
      fournisseurId: '00000000-0000-0000-0000-000000000000',
      lignes: [{ medicamentId: medTest.id, quantite: 1, prixAchat: 10, numeroLot: 'X', dateExpiration: new Date().toISOString() }],
    })
    record(SUITE, 'Isolation: fournisseur inexistant → 404', recCross.status === 404 ? 'PASS' : 'FAIL', `status=${recCross.status}`)
  }

  // ---------- E. NOTIFICATIONS (diffusion pharmacie) ----------
  console.log('\n--- E. Notifications (diffusion + marquage) ---')
  const broad = await api(jar, 'POST', '/api/notifications', {
    pharmacieId: pharmacie.id,
    titre: 'Test diffusion',
    message: 'Notification de test automatisé pour toute l\'équipe',
    type: 'INFO',
  })
  record(SUITE, 'POST /api/notifications (diffusion équipe)', broad.status === 201 ? 'PASS' : 'FAIL', `status=${broad.status} ${broad.text.slice(0, 90)}`)
  if (broad.status === 201) {
    const notifCount = await prisma.notification.count({ where: { titre: 'Test diffusion', utilisateur: { pharmacieId: pharmacie.id } } })
    record(SUITE, 'Notifications créées pour chaque utilisateur actif', notifCount >= 5 ? 'PASS' : 'FAIL', `${notifCount} notifications`)
    // Marquer tout lu
    const markAll = await api(jar, 'PATCH', '/api/notifications', { toutes: true })
    record(SUITE, 'PATCH /api/notifications {toutes:true} (marquage)', markAll.status === 200 ? 'PASS' : 'FAIL', `status=${markAll.status} ${markAll.text.slice(0, 60)}`)
  }

  // ---------- F. RH (employé + congé) ----------
  console.log('\n--- F. RH rapide ---')
  const emp = await api(jar, 'POST', '/api/employes', {
    nom: `TEST-${suffix}`,
    prenom: 'Employe',
    poste: 'Aide-pharmacien',
    typeContrat: 'CDD',
    salaireBrut: 150000,
    dateEmbauche: new Date().toISOString(),
  })
  record(SUITE, 'POST /api/employes', emp.status === 201 ? 'PASS' : 'FAIL', `status=${emp.status} ${emp.text.slice(0, 80)}`)
  if (emp.status === 201) {
    const empDb = await prisma.employe.findUnique({ where: { id: emp.json.id } })
    record(SUITE, 'Persistance employé (DB)', empDb ? 'PASS' : 'FAIL', `${empDb?.nom} ${empDb?.poste}`)
    const cong = await api(jar, 'POST', '/api/conges', {
      employeId: emp.json.id,
      type: 'ANNUEL',
      dateDebut: new Date(Date.now() + 30 * 86400000).toISOString(),
      dateFin: new Date(Date.now() + 40 * 86400000).toISOString(),
    })
    record(SUITE, 'POST /api/conges', cong.status === 201 ? 'PASS' : 'FAIL', `status=${cong.status} ${cong.text.slice(0, 80)}`)
    const congDb = await prisma.conge.findFirst({ where: { employeId: emp.json.id } })
    record(SUITE, 'Persistance congé + employeId (DB)', congDb ? 'PASS' : 'FAIL', `type=${congDb?.type} statut=${congDb?.statut} employe=${congDb?.employeId ? 'lié' : 'NON LIÉ'}`)
    // Approbation (PATCH /api/conges)
    if (cong.status === 201) {
      const appr = await api(jar, 'PATCH', '/api/conges', { id: cong.json.id, statut: 'APPROUVE' })
      record(SUITE, 'PATCH /api/conges (approbation)', appr.status === 200 ? 'PASS' : 'FAIL', `status=${appr.status} ${appr.text.slice(0, 80)}`)
      const apprDb = await prisma.conge.findUnique({ where: { id: cong.json.id } })
      record(SUITE, 'Persistance approbation (statut + approuvePar)', apprDb?.statut === 'APPROUVE' && apprDb?.approuvePar ? 'PASS' : 'FAIL', `statut=${apprDb?.statut} approuvePar=${apprDb?.approuvePar ? 'oui' : 'non'}`)
      // Double décision → 409
      const double = await api(jar, 'PATCH', '/api/conges', { id: cong.json.id, statut: 'REFUSE' })
      record(SUITE, 'Double décision congé rejetée (409)', double.status === 409 ? 'PASS' : 'FAIL', `status=${double.status}`)
    }
  }

  // ---------- G. ORDONNANCES ----------
  console.log('\n--- G. Ordonnances ---')
  const patient = await prisma.patient.findFirst({ where: { pharmacieId: pharmacie.id }, select: { id: true } })
  const ordo = await api(jar, 'POST', '/api/ordonnances', {
    prescripteur: 'Dr. Test',
    dateOrdonnance: new Date().toISOString(),
    patientId: patient?.id,
    lignes: [{ dci: 'Paracétamol', posologie: '1 cp 3x/jour', quantite: 10 }],
  })
  record(SUITE, 'POST /api/ordonnances', ordo.status === 201 ? 'PASS' : 'FAIL', `status=${ordo.status} ${ordo.text.slice(0, 90)}`)
  const ordoList = await api(jar, 'GET', '/api/ordonnances')
  record(SUITE, 'GET /api/ordonnances', ordoList.status === 200 ? 'PASS' : 'FAIL', `status=${ordoList.status}`)

  const s = summary()
  await prisma.$disconnect()
  process.exit(s.fail > 0 ? 1 : 0)
}

main().catch(e => { console.error('ERREUR FATALE:', e); process.exit(1) })
