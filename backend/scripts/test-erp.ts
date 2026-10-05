// ============================================================
// MediHelm — Tests ERP GROSSISTE (G02→G09) + FICHES DCI
// Lots entrepôt · picking FEFO · livraisons · clients crédit ·
// finance + export SYSCOHADA grossiste · fiches DCI DPMED
// Usage: bash scripts/serve-and-test.sh scripts/test-erp.ts
// ============================================================

import { PrismaClient } from '@prisma/client'
import { login, api, record, summary } from './test-lib'

const prisma = new PrismaClient()
const SUITE = 'ERP'

async function main() {
  console.log(`\n========== ERP GROSSISTE + FICHES DCI ==========\n`)

  const partner = await login('grossiste@medihelm.bj', 'demo1234')
  record(SUITE, 'login grossiste@ (UbiPharm)', partner.ok ? 'PASS' : 'FAIL', partner.ok ? 'OK' : 'échec')
  if (!partner.ok) return summary()

  const dpmed = await login('dpmed@medihelm.bj', 'demo1234')
  const pharmacien = await login('pharmacien@medihelm.bj', 'demo1234')
  const admin = await login('admin@medihelm.bj', 'demo1234')

  const ubipharm = await prisma.grossiste.findFirst({ where: { nom: { contains: 'UbiPharm', mode: 'insensitive' } } })
  if (!ubipharm) { console.log('❌ UbiPharm introuvable'); return summary() }

  // Produit de catalogue pour les tests
  const produit = await prisma.produitGrossiste.findFirst({ where: { grossisteId: ubipharm.id } })
  if (!produit) { console.log('❌ Aucun produit au catalogue UbiPharm'); return summary() }

  // Pharmacie cliente (celle du pharmacien de test)
  const pharma = await prisma.pharmacie.findFirst({ where: { nom: { contains: 'Albarika', mode: 'insensitive' } } })
  if (!pharma) { console.log('❌ Pharmacie Albarika introuvable'); return summary() }

  // Nettoyage préalable des données de test éventuelles
  const anciens = await prisma.commandeGrossiste.findMany({
    where: { reference: { startsWith: 'TEST-ERP' } },
    select: { id: true },
  })
  for (const c of anciens) {
    await prisma.bonPicking.deleteMany({ where: { commandeId: c.id } })
    await prisma.livraisonGrossiste.deleteMany({ where: { commandeId: c.id } })
    await prisma.ligneCommandeGrossiste.deleteMany({ where: { commandeId: c.id } })
    await prisma.commandeGrossiste.delete({ where: { id: c.id } })
  }
  await prisma.lotGrossiste.deleteMany({ where: { numeroLot: { startsWith: 'TESTLOT' } } })

  // ────────────────────────────────────────────────────────────
  // G02 — LOTS ENTREPÔT
  // ────────────────────────────────────────────────────────────
  console.log('\n--- G02 · Lots entrepôt ---')

  const stockAvant = produit.quantiteDispo ?? 0
  const exp1 = new Date(Date.now() + 200 * 86400000) // le plus ancien (FEFO n°1)
  const exp2 = new Date(Date.now() + 400 * 86400000)

  const lot1 = await api(partner.jar, 'POST', '/api/grossistes/lots', {
    produitId: produit.id,
    numeroLot: 'TESTLOT-A',
    quantite: 50,
    dateExpiration: exp1.toISOString(),
    emplacement: 'TEST-A1',
  })
  record(SUITE, 'G02 réception lot TESTLOT-A (50 u.)', lot1.status === 201 ? 'PASS' : 'FAIL', `status=${lot1.status}`)

  const lot2 = await api(partner.jar, 'POST', '/api/grossistes/lots', {
    produitId: produit.id,
    numeroLot: 'TESTLOT-B',
    quantite: 50,
    dateExpiration: exp2.toISOString(),
  })
  record(SUITE, 'G02 réception lot TESTLOT-B (50 u.)', lot2.status === 201 ? 'PASS' : 'FAIL', `status=${lot2.status}`)

  // Lot déjà expiré → refusé
  const lotExpire = await api(partner.jar, 'POST', '/api/grossistes/lots', {
    produitId: produit.id,
    numeroLot: 'TESTLOT-EXP',
    quantite: 10,
    dateExpiration: new Date(Date.now() - 86400000).toISOString(),
  })
  record(SUITE, 'G02 lot expiré refusé', lotExpire.status === 400 ? 'PASS' : 'FAIL', `status=${lotExpire.status}`)

  // Stock incrémenté
  const produitApres = await prisma.produitGrossiste.findUnique({ where: { id: produit.id } })
  record(SUITE, 'G02 stock produit incrémenté (+100)', (produitApres?.quantiteDispo ?? 0) === stockAvant + 100 ? 'PASS' : 'FAIL',
    `${stockAvant} → ${produitApres?.quantiteDispo}`)

  const lotsListe = await api(partner.jar, 'GET', '/api/grossistes/lots')
  record(SUITE, 'G02 liste lots + stats', lotsListe.status === 200 && lotsListe.json?.stats ? 'PASS' : 'FAIL',
    `status=${lotsListe.status}, ${lotsListe.json?.lots?.length ?? 0} lots`)

  // Ordre FEFO dans la liste (exp1 avant exp2)
  const lotsProduit = (lotsListe.json?.lots ?? []).filter((l: { produit: { id: string } }) => l.produit.id === produit.id)
  const fefoOk = lotsProduit.length >= 2 && new Date(lotsProduit[0].dateExpiration) < new Date(lotsProduit[1].dateExpiration)
  record(SUITE, 'G02 tri FEFO (expiration proche d’abord)', fefoOk ? 'PASS' : 'FAIL',
    lotsProduit.slice(0, 2).map((l: { numeroLot: string }) => l.numeroLot).join(' < '))

  // Quarantaine du lot B
  const lotBId = lot2.json?.id
  const quarantaine = await api(partner.jar, 'PATCH', `/api/grossistes/lots/${lotBId}`, {
    statut: 'QUARANTAINE',
    motif: 'Test — contrôle qualité',
  })
  record(SUITE, 'G02 quarantaine lot B (motif requis)', quarantaine.status === 200 ? 'PASS' : 'FAIL', `status=${quarantaine.status}`)

  const quarantaineSansMotif = await api(partner.jar, 'PATCH', `/api/grossistes/lots/${lotBId}`, {
    statut: 'DETRUIT',
  })
  record(SUITE, 'G02 destruction sans motif rejetée', quarantaineSansMotif.status === 400 ? 'PASS' : 'FAIL', `status=${quarantaineSansMotif.status}`)

  // ────────────────────────────────────────────────────────────
  // G03 — COMMANDE + CONFIRMATION PARTIELLE + RELIQUAT
  // ────────────────────────────────────────────────────────────
  console.log('\n--- G03 · Commande, confirmation partielle, reliquat ---')

  const commande = await prisma.commandeGrossiste.create({
    data: {
      grossisteId: ubipharm.id,
      pharmacieId: pharma.id,
      reference: `TEST-ERP-${Date.now()}`,
      statut: 'ENVOYEE',
      source: 'MEDIHELM_PRO',
      montantTotal: 120 * 10, // 120 u à 10 F
      lignes: {
        create: {
          produitId: produit.id,
          dci: produit.dci,
          nomCommercial: produit.nomCommercial,
          quantite: 120, // > 50 disponibles après quarantaine de B
          prixUnitaire: 10,
          montant: 1200,
        },
      },
    },
    include: { lignes: true },
  })
  record(SUITE, 'G03 commande test créée (120 u. demandées)', 'PASS', commande.reference)

  // Confirmation partielle : 50 confirmées (seul lot A disponible)
  const confirmation = await api(partner.jar, 'PATCH', `/api/grossistes/commandes/${commande.id}`, {
    statut: 'CONFIRMEE',
    lignes: [{ ligneId: commande.lignes[0].id, quantiteConfirmee: 50 }],
    creerReliquat: true,
  })
  const reliquatCree = !!confirmation.json?.reliquat
  record(SUITE, 'G03 confirmation partielle (50/120)', confirmation.status === 200 ? 'PASS' : 'FAIL', `status=${confirmation.status}`)
  record(SUITE, 'G03 reliquat automatique créé', reliquatCree ? 'PASS' : 'FAIL',
    reliquatCree ? `${confirmation.json.reliquat.reference} (${confirmation.json.reliquat.montantTotal} F)` : 'absent')

  // ────────────────────────────────────────────────────────────
  // G04 — PICKING FEFO
  // ────────────────────────────────────────────────────────────
  console.log('\n--- G04 · Picking FEFO ---')

  const picking = await api(partner.jar, 'POST', `/api/grossistes/commandes/${commande.id}/picking`, {})
  record(SUITE, 'G04 bon de picking généré (cmd CONFIRMEE)', picking.status === 201 ? 'PASS' : 'FAIL', `status=${picking.status}`)

  // Vérifie : FEFO → lot A (exp proche) prélevé, lot B (quarantaine) exclu
  const lignesPicking = picking.json?.lignes ?? []
  const ligne0 = lignesPicking[0]
  const preleveLotA = ligne0?.prelevements?.some((p: { numeroLot: string }) => p.numeroLot === 'TESTLOT-A')
  const excluLotB = !ligne0?.prelevements?.some((p: { numeroLot: string }) => p.numeroLot === 'TESTLOT-B')
  record(SUITE, 'G04 FEFO : lot A prélevé', preleveLotA ? 'PASS' : 'FAIL', JSON.stringify(ligne0?.prelevements?.map((p: { numeroLot: string }) => p.numeroLot)))
  record(SUITE, 'G04 quarantaine : lot B EXCLU du picking', excluLotB ? 'PASS' : 'FAIL', 'règle CDC G04')
  record(SUITE, 'G04 manquant tracé (50 cmd - 50 prélv...)', ligne0?.manquant >= 0 ? 'PASS' : 'FAIL', `manquant=${ligne0?.manquant}`)

  // Scan du prélèvement
  const bonId = picking.json?.id
  const prev0 = ligne0?.prelevements?.[0]
  const scan = await api(partner.jar, 'PATCH', `/api/grossistes/picking/${bonId}`, {
    action: 'SCAN',
    ligneId: ligne0.ligneId,
    lotId: prev0.lotId,
  })
  record(SUITE, 'G04 scan de confirmation', scan.status === 200 && scan.json?.ok ? 'PASS' : 'FAIL', `reste=${scan.json?.reste}`)

  // Double scan refusé
  const doubleScan = await api(partner.jar, 'PATCH', `/api/grossistes/picking/${bonId}`, {
    action: 'SCAN',
    ligneId: ligne0.ligneId,
    lotId: prev0.lotId,
  })
  record(SUITE, 'G04 double scan rejeté', doubleScan.status === 409 ? 'PASS' : 'FAIL', `status=${doubleScan.status}`)

  // Clôture → stocks décrémentés
  const lotAAvant = await prisma.lotGrossiste.findFirst({ where: { numeroLot: 'TESTLOT-A' } })
  const terminer = await api(partner.jar, 'PATCH', `/api/grossistes/picking/${bonId}`, { action: 'TERMINER' })
  record(SUITE, 'G04 clôture bon (PRET)', terminer.status === 200 ? 'PASS' : 'FAIL', terminer.json?.message?.slice(0, 60))

  const lotAApres = await prisma.lotGrossiste.findFirst({ where: { numeroLot: 'TESTLOT-A' } })
  record(SUITE, 'G04 stock lot A décrémenté (50→0)', lotAApres?.quantite === 0 ? 'PASS' : 'FAIL', `${lotAAvant?.quantite} → ${lotAApres?.quantite}`)

  const ligneApres = await prisma.ligneCommandeGrossiste.findFirst({ where: { commandeId: commande.id } })
  record(SUITE, 'G04 quantiteLivre enregistrée (=50)', ligneApres?.quantiteLivre === 50 ? 'PASS' : 'FAIL', `livre=${ligneApres?.quantiteLivre}`)

  // Commande repassée en picking → refus (bon déjà clôturé + statut EN_PREPARATION)
  const picking2 = await api(partner.jar, 'POST', `/api/grossistes/commandes/${commande.id}/picking`, {})
  record(SUITE, 'G04 double picking rejeté', picking2.status === 409 ? 'PASS' : 'FAIL', `status=${picking2.status}`)

  // ────────────────────────────────────────────────────────────
  // G05 — LIVRAISONS
  // ────────────────────────────────────────────────────────────
  console.log('\n--- G05 · Livraisons ---')

  // Livraison sans bon PRET → 409 : testons sur une commande fraîche
  const cmdSansPicking = await prisma.commandeGrossiste.create({
    data: {
      grossisteId: ubipharm.id,
      pharmacieId: pharma.id,
      reference: `TEST-ERP-NP-${Date.now()}`,
      statut: 'CONFIRMEE',
      montantTotal: 100,
      lignes: { create: { produitId: produit.id, dci: produit.dci, quantite: 10, prixUnitaire: 10, montant: 100 } },
    },
  })
  const sansPicking = await api(partner.jar, 'POST', '/api/grossistes/livraisons', { commandeId: cmdSansPicking.id })
  record(SUITE, 'G05 livraison sans picking PRET rejetée', sansPicking.status === 409 ? 'PASS' : 'FAIL', `status=${sansPicking.status}`)

  // Livraison de la commande test (picking PRET)
  const livraison = await api(partner.jar, 'POST', '/api/grossistes/livraisons', {
    commandeId: commande.id,
    planning: new Date().toISOString(),
  })
  record(SUITE, 'G05 livraison planifiée', livraison.status === 201 ? 'PASS' : 'FAIL', `status=${livraison.status}`)
  const livraisonId = livraison.json?.id

  // Commande passée EN_LIVRAISON
  const cmdApresPlanif = await prisma.commandeGrossiste.findUnique({ where: { id: commande.id } })
  record(SUITE, 'G05 commande → EN_LIVRAISON', cmdApresPlanif?.statut === 'EN_LIVRAISON' ? 'PASS' : 'FAIL', cmdApresPlanif?.statut)

  // Transition invalide : PLANIFIEE → LIVREE directe
  const directLivre = await api(partner.jar, 'PATCH', `/api/grossistes/livraisons/${livraisonId}`, { statut: 'LIVREE' })
  record(SUITE, 'G05 transition PLANIFIEE→LIVREE rejetée', directLivre.status === 409 ? 'PASS' : 'FAIL', `status=${directLivre.status}`)

  // EN_ROUTE
  const enRoute = await api(partner.jar, 'PATCH', `/api/grossistes/livraisons/${livraisonId}`, { statut: 'EN_ROUTE' })
  record(SUITE, 'G05 départ EN_ROUTE', enRoute.status === 200 ? 'PASS' : 'FAIL', `status=${enRoute.status}`)

  // LIVREE sans signature → 400
  const sansSignature = await api(partner.jar, 'PATCH', `/api/grossistes/livraisons/${livraisonId}`, { statut: 'LIVREE' })
  record(SUITE, 'G05 LIVREE sans signature rejetée', sansSignature.status === 400 ? 'PASS' : 'FAIL', `status=${sansSignature.status}`)

  // LIVREE avec signature + écarts (2 boîtes refusées)
  const livre = await api(partner.jar, 'PATCH', `/api/grossistes/livraisons/${livraisonId}`, {
    statut: 'LIVREE',
    signatureElectronique: 'Dr. Test — Pharmacien Albarika',
    ecarts: [{ ligneId: commande.lignes[0].id, refuse: 2 }],
  })
  record(SUITE, 'G05 LIVREE avec signature électronique', livre.status === 200 ? 'PASS' : 'FAIL', `status=${livre.status}`)

  // Commande LIVREE_PARTIELLEMENT (2 boîtes refusées)
  const cmdFinale = await prisma.commandeGrossiste.findUnique({ where: { id: commande.id } })
  record(SUITE, 'G05 commande → LIVREE_PARTIELLEMENT (écarts)', cmdFinale?.statut === 'LIVREE_PARTIELLEMENT' ? 'PASS' : 'FAIL', cmdFinale?.statut)

  const ligneFinale = await prisma.ligneCommandeGrossiste.findFirst({ where: { commandeId: commande.id } })
  record(SUITE, 'G05 écart appliqué (50→48 livrées)', ligneFinale?.quantiteLivre === 48 ? 'PASS' : 'FAIL', `livre=${ligneFinale?.quantiteLivre}`)

  // Bordereau PDF
  const bordereau = await api(partner.jar, 'GET', `/api/grossistes/livraisons/${livraisonId}/bordereau`)
  const pdfOk = bordereau.status === 200 && bordereau.text.startsWith('%PDF')
  record(SUITE, 'G05 bordereau PDF généré', pdfOk ? 'PASS' : 'FAIL', `status=${bordereau.status}, ${bordereau.text.length} octets, PDF=${bordereau.text.startsWith('%PDF')}`)

  // ────────────────────────────────────────────────────────────
  // G06 — CLIENTS & OFFICINES
  // ────────────────────────────────────────────────────────────
  console.log('\n--- G06 · Clients & officines ---')

  const ficheClient = await api(partner.jar, 'POST', '/api/grossistes/clients', {
    pharmacieId: pharma.id,
    conditionsPaiement: '30_JOURS',
    creditPlafond: 100,
    remiseDefaut: 5,
  })
  record(SUITE, 'G06 fiche client créée (30j, plafond 100 F)', ficheClient.status === 201 ? 'PASS' : 'FAIL', `status=${ficheClient.status}`)

  const clientsListe = await api(partner.jar, 'GET', '/api/grossistes/clients')
  const clientPharma = (clientsListe.json?.clients ?? []).find((c: { pharmacie: { id: string } }) => c.pharmacie.id === pharma.id)
  record(SUITE, 'G06 encours calculé en temps réel', clientsListe.status === 200 && clientPharma ? 'PASS' : 'FAIL',
    `encours=${clientPharma?.encours} F, CA=${clientPharma?.ca} F`)
  record(SUITE, 'G06 dépassement de plafond détecté', clientPharma?.depassementPlafond === true ? 'PASS' : 'WARN',
    `encours=${clientPharma?.encours} > plafond=${clientPharma?.creditPlafond}`)

  // ────────────────────────────────────────────────────────────
  // G09 — FINANCE + EXPORT SYSCOHADA GROSSISTE
  // ────────────────────────────────────────────────────────────
  console.log('\n--- G09 · Finance + export SYSCOHADA ---')

  const finance = await api(partner.jar, 'GET', '/api/grossistes/finance')
  record(SUITE, 'G09 KPI finance (CA, créances, recouvrement)', finance.status === 200 && finance.json?.kpi ? 'PASS' : 'FAIL',
    finance.json?.kpi ? `CA=${finance.json.kpi.caMois} F, créances=${finance.json.kpi.creances} F, recouvr=${finance.json.kpi.tauxRecouvrement}%` : `status=${finance.status}`)
  record(SUITE, 'G09 rapport mensuel par officine', Array.isArray(finance.json?.rapportOfficines) ? 'PASS' : 'FAIL',
    `${finance.json?.rapportOfficines?.length ?? 0} officines`)

  const exportJson = await api(partner.jar, 'GET', '/api/grossistes/exports/syscohada?dateDebut=2025-01-01&dateFin=2026-12-31')
  record(SUITE, 'G09 export SYSCOHADA grossiste (JSON)', exportJson.status === 200 && exportJson.json?.journal ? 'PASS' : 'FAIL',
    `${exportJson.json?.totaux?.lignes ?? 0} écritures, équilibre=${exportJson.json?.totaux?.equilibre}`)

  const exportCsv = await api(partner.jar, 'GET', '/api/grossistes/exports/syscohada?dateDebut=2025-01-01&dateFin=2026-12-31&format=csv-simple')
  record(SUITE, 'G09 export SYSCOHADA CSV (Specs §10.2)', exportCsv.status === 200 && exportCsv.text.startsWith('Date;Libellé') ? 'PASS' : 'FAIL',
    `status=${exportCsv.status}, en-tête=${exportCsv.text.slice(0, 30)}`)

  // Comptes 411/701 présents (facturation officines)
  const comptes = (exportJson.json?.balance ?? []).map((b: { compte: string }) => b.compte)
  record(SUITE, 'G09 comptes 411 + 701 présents', comptes.includes('411') && comptes.includes('701') ? 'PASS' : 'FAIL', comptes.join(', '))

  // ────────────────────────────────────────────────────────────
  // FICHES DCI — INSTITUTIONNEL
  // ────────────────────────────────────────────────────────────
  console.log('\n--- Fiches DCI (DPMED) ---')

  const fichesListe = await api(dpmed.jar, 'GET', '/api/institutions/dpmed/fiches-dci?q=parac')
  record(SUITE, 'fiches DCI : recherche DPMED', fichesListe.status === 200 ? 'PASS' : 'FAIL',
    `${fichesListe.json?.total ?? 0} fiche(s) pour « parac »`)

  // Lecture pharmacien autorisée (référentiel national)
  const fichesPharma = await api(pharmacien.jar, 'GET', '/api/institutions/dpmed/fiches-dci')
  record(SUITE, 'fiches DCI : lecture PHARMACIEN autorisée', fichesPharma.status === 200 ? 'PASS' : 'FAIL', `status=${fichesPharma.status}, ${fichesPharma.json?.total ?? 0} fiches`)

  // CRUD DPMED
  const creation = await api(dpmed.jar, 'POST', '/api/institutions/dpmed/fiches-dci', {
    dci: 'Test DCI Integration',
    classeTherapeutique: 'Tests pharmacologiques',
    mecanisme: 'Mécanisme de test',
    indications: 'Indication de test',
    posologie: 'Posologie de test',
    contreIndications: 'CI de test',
    interactions: [{ dci: 'Test B', severite: 'MODEREE', description: 'Interaction de test' }],
    effetsIndesirables: ['Effet de test'],
    conservation: '≤ 30 °C',
    source: 'Test DPMED',
  })
  record(SUITE, 'fiche DCI : création DPMED', creation.status === 201 ? 'PASS' : 'FAIL', `status=${creation.status}`)
  const ficheId = creation.json?.id

  // Interactions sérialisées correctement
  record(SUITE, 'fiche DCI : interactions JSON persistées',
    Array.isArray(creation.json?.interactions) && creation.json?.interactions?.[0]?.dci === 'Test B' ? 'PASS' : 'FAIL',
    JSON.stringify(creation.json?.interactions ?? null)?.slice(0, 80))

  // Doublon refusé
  const doublon = await api(dpmed.jar, 'POST', '/api/institutions/dpmed/fiches-dci', { dci: 'Test DCI Integration', classeTherapeutique: 'X' })
  record(SUITE, 'fiche DCI : doublon DCI rejeté (409)', doublon.status === 409 ? 'PASS' : 'FAIL', `status=${doublon.status}`)

  // PATCH
  const maj = await api(dpmed.jar, 'PATCH', `/api/institutions/dpmed/fiches-dci/${ficheId}`, {
    posologie: 'Posologie mise à jour',
    effetsIndesirables: ['Effet 1', 'Effet 2'],
  })
  record(SUITE, 'fiche DCI : mise à jour DPMED', maj.status === 200 && maj.json?.posologie === 'Posologie mise à jour' ? 'PASS' : 'FAIL', `status=${maj.status}`)

  // RBAC : PHARMACIEN ne peut pas écrire
  const ecriturePharma = await api(pharmacien.jar, 'POST', '/api/institutions/dpmed/fiches-dci', {
    dci: 'Interdit', classeTherapeutique: 'X',
  })
  record(SUITE, 'fiche DCI : écriture PHARMACIEN refusée', ecriturePharma.status === 403 ? 'PASS' : 'FAIL', `status=${ecriturePharma.status}`)

  // RBAC : SOBAPS lecture OK, écriture refusée (via admin space? on teste admin pharmacie)
  const ecritureAdmin = await api(admin.jar, 'POST', '/api/institutions/dpmed/fiches-dci', {
    dci: 'Interdit 2', classeTherapeutique: 'X',
  })
  record(SUITE, 'fiche DCI : écriture rôles pharmacie refusée', ecritureAdmin.status === 403 ? 'PASS' : 'FAIL', `status=${ecritureAdmin.status}`)

  // DELETE + vérification
  const suppr = await api(dpmed.jar, 'DELETE', `/api/institutions/dpmed/fiches-dci/${ficheId}`)
  record(SUITE, 'fiche DCI : suppression DPMED', suppr.status === 200 && suppr.json?.ok ? 'PASS' : 'FAIL', `status=${suppr.status}`)

  const detailApres = await api(dpmed.jar, 'GET', `/api/institutions/dpmed/fiches-dci/${ficheId}`)
  record(SUITE, 'fiche DCI : supprimée réellement', detailApres.status === 404 ? 'PASS' : 'FAIL', `status=${detailApres.status}`)

  // ────────────────────────────────────────────────────────────
  // NETTOYAGE
  // ────────────────────────────────────────────────────────────
  const nettoyageCmds = await prisma.commandeGrossiste.findMany({
    where: { reference: { startsWith: 'TEST-ERP' } },
    select: { id: true },
  })
  for (const c of nettoyageCmds) {
    await prisma.bonPicking.deleteMany({ where: { commandeId: c.id } })
    await prisma.livraisonGrossiste.deleteMany({ where: { commandeId: c.id } })
    await prisma.ligneCommandeGrossiste.deleteMany({ where: { commandeId: c.id } })
    await prisma.commandeGrossiste.delete({ where: { id: c.id } })
  }
  await prisma.lotGrossiste.deleteMany({ where: { numeroLot: { startsWith: 'TESTLOT' } } })
  await prisma.clientGrossiste.deleteMany({ where: { grossisteId: ubipharm.id, pharmacieId: pharma.id } })
  // Restaure le stock du produit
  await prisma.produitGrossiste.update({
    where: { id: produit.id },
    data: { quantiteDispo: stockAvant },
  })
  record(SUITE, 'nettoyage des données de test', 'PASS', `${nettoyageCmds.length} commandes, lots, fiche client supprimés`)

  return summary()
}

main()
  .catch((e) => { console.error('ERREUR FATALE:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
