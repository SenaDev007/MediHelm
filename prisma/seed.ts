// ============================================================
// MediHelm — Seed Script (Neon PostgreSQL)
// Données de développement pour tous les espaces
// ============================================================

import { PrismaClient, PlanType, RoleType, FormeGalenique, TypeGarde, StatutVente, StatutCommande, StatutOrdonnance, TypeAlerteDPMED, NiveauUrgence, TypeSurveillance, NiveauRisque, StatutAlerte, StatutDiffusion, ModePaiement } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding MediHelm database (PostgreSQL / Neon)...')

  // === 1. Pharmacies ===
  console.log('\n📦 Creating pharmacies...')
  const pharmacies = await Promise.all([
    prisma.pharmacie.create({
      data: {
        slug: 'pharmacie-du-centre',
        nom: 'Pharmacie du Centre',
        adresse: '123 Avenue de la Liberté',
        ville: 'Parakou',
        telephone: '+229 97 00 00 01',
        email: 'centre@medihelm.bj',
        numeroAgrement: 'PH-PPK-001',
        latitude: 9.3372,
        longitude: 2.6253,
        plan: PlanType.BLOOM,
        actif: true,
        modeGardeActif: true,
      },
    }),
    prisma.pharmacie.create({
      data: {
        slug: 'pharmacie-hopital',
        nom: 'Pharmacie de l\'Hôpital',
        adresse: '45 Rue des Soins',
        ville: 'Parakou',
        telephone: '+229 97 00 00 02',
        email: 'hopital@medihelm.bj',
        numeroAgrement: 'PH-PPK-002',
        latitude: 9.3420,
        longitude: 2.6310,
        plan: PlanType.CROWN,
        actif: true,
        modeGardeActif: false,
      },
    }),
    prisma.pharmacie.create({
      data: {
        slug: 'pharmacie-albarika',
        nom: 'Pharmacie Albarika',
        adresse: '78 Boulevard Albarika',
        ville: 'Parakou',
        telephone: '+229 97 00 00 03',
        email: 'albarika@medihelm.bj',
        numeroAgrement: 'PH-PPK-003',
        latitude: 9.3380,
        longitude: 2.6200,
        plan: PlanType.SEED,
        actif: true,
        modeGardeActif: true,
      },
    }),
    prisma.pharmacie.create({
      data: {
        slug: 'pharmacie-haie-vive',
        nom: 'Pharmacie Haie Vive',
        adresse: '12 Rue Haie Vive',
        ville: 'Cotonou',
        telephone: '+229 97 00 00 04',
        email: 'haievive@medihelm.bj',
        numeroAgrement: 'PH-COT-001',
        latitude: 6.3700,
        longitude: 2.4200,
        plan: PlanType.CROWN,
        actif: true,
        modeGardeActif: false,
      },
    }),
    prisma.pharmacie.create({
      data: {
        slug: 'pharmacie-akpakpa',
        nom: 'Pharmacie Akpakpa',
        adresse: '34 Quartier Akpakpa',
        ville: 'Cotonou',
        telephone: '+229 97 00 00 05',
        email: 'akpakpa@medihelm.bj',
        numeroAgrement: 'PH-COT-002',
        latitude: 6.3550,
        longitude: 2.4400,
        plan: PlanType.NETWORK,
        actif: true,
        modeGardeActif: true,
      },
    }),
  ])
  console.log(`  ✅ ${pharmacies.length} pharmacies created`)

  // === 2. Utilisateurs ===
  console.log('\n👥 Creating users...')
  const hashedPassword = await bcrypt.hash('demo1234', 12)

  const users = await Promise.all([
    prisma.utilisateur.create({
      data: {
        pharmacieId: pharmacies[0].id,
        email: 'admin@medihelm.bj',
        nom: 'Agossa',
        prenom: 'Dawes',
        role: RoleType.DIRECTEUR,
        motDePasse: hashedPassword,
        actif: true,
        telephone: '+229 97 11 11 01',
      },
    }),
    prisma.utilisateur.create({
      data: {
        pharmacieId: pharmacies[0].id,
        email: 'pharmacien@medihelm.bj',
        nom: 'Houénou',
        prenom: 'Marie',
        role: RoleType.PHARMACIEN,
        motDePasse: hashedPassword,
        actif: true,
        telephone: '+229 97 11 11 02',
      },
    }),
    prisma.utilisateur.create({
      data: {
        pharmacieId: pharmacies[0].id,
        email: 'caissier@medihelm.bj',
        nom: 'Dossou',
        prenom: 'Pierre',
        role: RoleType.CAISSIER,
        motDePasse: hashedPassword,
        actif: true,
        telephone: '+229 97 11 11 03',
      },
    }),
    prisma.utilisateur.create({
      data: {
        pharmacieId: pharmacies[0].id,
        email: 'dpmed@medihelm.bj',
        nom: 'DPMED',
        prenom: 'Admin',
        role: RoleType.DPMED_ADMIN,
        motDePasse: hashedPassword,
        actif: true,
        telephone: '+229 97 11 11 04',
      },
    }),
    prisma.utilisateur.create({
      data: {
        pharmacieId: pharmacies[0].id,
        email: 'grossiste@medihelm.bj',
        nom: 'UbiPharm',
        prenom: 'Partenaire',
        role: RoleType.GROSSISTE_PARTNER,
        motDePasse: hashedPassword,
        actif: true,
        telephone: '+229 97 11 11 05',
      },
    }),
    prisma.utilisateur.create({
      data: {
        pharmacieId: pharmacies[0].id,
        email: 'owner@medihelm.bj',
        nom: 'Adambi',
        prenom: 'Kofi',
        role: RoleType.OWNER,
        motDePasse: hashedPassword,
        actif: true,
        telephone: '+229 97 11 11 06',
      },
    }),
    prisma.utilisateur.create({
      data: {
        pharmacieId: pharmacies[0].id,
        email: 'magasinier@medihelm.bj',
        nom: 'Yacoubou',
        prenom: 'Ibrahim',
        role: RoleType.MAGASINIER,
        motDePasse: hashedPassword,
        actif: true,
        telephone: '+229 97 11 11 07',
      },
    }),
    prisma.utilisateur.create({
      data: {
        pharmacieId: pharmacies[1].id,
        email: 'pharmacie2@medihelm.bj',
        nom: 'Bello',
        prenom: 'Aminatou',
        role: RoleType.DIRECTEUR,
        motDePasse: hashedPassword,
        actif: true,
        telephone: '+229 97 11 11 08',
      },
    }),
  ])
  console.log(`  ✅ ${users.length} users created`)

  // === 3. Médicaments + Lots ===
  console.log('\n💊 Creating medications and lots...')
  const medsData = [
    { dci: 'Paracétamol', nomCommercial: 'Doliprane 500mg', forme: FormeGalenique.COMPRIME, dosage: '500mg', prixPublic: 500, surOrdonnance: false, estStupefiant: false },
    { dci: 'Amoxicilline', nomCommercial: 'Amoxil 500mg', forme: FormeGalenique.GELULE, dosage: '500mg', prixPublic: 2500, surOrdonnance: true, estStupefiant: false },
    { dci: 'Métronidazole', nomCommercial: 'Flagyl 250mg', forme: FormeGalenique.COMPRIME, dosage: '250mg', prixPublic: 1500, surOrdonnance: true, estStupefiant: false },
    { dci: 'Cotrimoxazole', nomCommercial: 'Bactrim 480mg', forme: FormeGalenique.COMPRIME, dosage: '480mg', prixPublic: 800, surOrdonnance: true, estStupefiant: false },
    { dci: 'Arthéméther+Luméfantrine', nomCommercial: 'Coartem 20/120mg', forme: FormeGalenique.COMPRIME, dosage: '20/120mg', prixPublic: 3500, surOrdonnance: true, estStupefiant: false },
    { dci: 'Oméprazole', nomCommercial: 'Mopral 20mg', forme: FormeGalenique.GELULE, dosage: '20mg', prixPublic: 2800, surOrdonnance: true, estStupefiant: false },
    { dci: 'Ibuprofène', nomCommercial: 'Brufen 400mg', forme: FormeGalenique.COMPRIME, dosage: '400mg', prixPublic: 1200, surOrdonnance: false, estStupefiant: false },
    { dci: 'Diclofénac', nomCommercial: 'Voltarene 50mg', forme: FormeGalenique.COMPRIME, dosage: '50mg', prixPublic: 1800, surOrdonnance: true, estStupefiant: false },
    { dci: 'Azithromycine', nomCommercial: 'Zithromax 250mg', forme: FormeGalenique.COMPRIME, dosage: '250mg', prixPublic: 4500, surOrdonnance: true, estStupefiant: false },
    { dci: 'Ciprofloxacine', nomCommercial: 'Ciflox 500mg', forme: FormeGalenique.COMPRIME, dosage: '500mg', prixPublic: 3200, surOrdonnance: true, estStupefiant: false },
    { dci: 'Codéine', nomCommercial: 'Codéine 30mg', forme: FormeGalenique.COMPRIME, dosage: '30mg', prixPublic: 5000, surOrdonnance: true, estStupefiant: true },
    { dci: 'Diazépam', nomCommercial: 'Valium 5mg', forme: FormeGalenique.COMPRIME, dosage: '5mg', prixPublic: 3500, surOrdonnance: true, estStupefiant: true },
    { dci: 'Insuline', nomCommercial: 'Insuline Humaine', forme: FormeGalenique.INJECTION, dosage: '100UI/ml', prixPublic: 8500, surOrdonnance: true, estStupefiant: false },
    { dci: 'Méthotrexate', nomCommercial: 'Methotrexate 2.5mg', forme: FormeGalenique.COMPRIME, dosage: '2.5mg', prixPublic: 6200, surOrdonnance: true, estStupefiant: false },
    { dci: 'Salbutamol', nomCommercial: 'Ventoline', forme: FormeGalenique.INHALATEUR, dosage: '100μg/dose', prixPublic: 4500, surOrdonnance: true, estStupefiant: false },
  ]

  const createdMeds = []
  for (const med of medsData) {
    const m = await prisma.medicament.create({
      data: {
        pharmacieId: pharmacies[0].id,
        ...med,
        stockMinimum: 5,
        stockSecurite: 10,
      },
    })
    createdMeds.push(m)

    // Create lots for each medication
    const qty = Math.floor(Math.random() * 100) + 10
    await prisma.lot.create({
      data: {
        medicamentId: m.id,
        pharmacieId: pharmacies[0].id,
        numeroLot: `LOT-2025-${String(createdMeds.length).padStart(3, '0')}`,
        quantite: qty,
        quantiteInitiale: qty + Math.floor(Math.random() * 50) + 20,
        prixAchat: med.prixPublic * 0.7,
        dateExpiration: new Date(Date.now() + (Math.random() * 730 + 30) * 24 * 60 * 60 * 1000),
      },
    })
  }
  console.log(`  ✅ ${createdMeds.length} medications with lots created`)

  // === 4. Patients ===
  console.log('\n🏥 Creating patients...')
  const patientData = [
    { nom: 'Adambi', prenom: 'Kofi', telephone: '+229 96 11 11 01', assurance: 'CNSS', numeroAssurance: 'CNSS-001234' },
    { nom: 'Bello', prenom: 'Aminatou', telephone: '+229 96 11 11 02', assurance: 'RAMU', numeroAssurance: 'RAMU-005678' },
    { nom: 'Dossou', prenom: 'Jean', telephone: '+229 96 11 11 03' },
    { nom: 'Gandaho', prenom: 'Fatou', telephone: '+229 96 11 11 04', assurance: 'CNSS', numeroAssurance: 'CNSS-002345' },
    { nom: 'Houénou', prenom: 'Paul', telephone: '+229 96 11 11 05' },
    { nom: 'Issifou', prenom: 'Aïcha', telephone: '+229 96 11 11 06', assurance: 'RAMU', numeroAssurance: 'RAMU-006789' },
    { nom: 'Kora', prenom: 'Moussa', telephone: '+229 96 11 11 07' },
    { nom: 'Lawani', prenom: 'Béatrice', telephone: '+229 96 11 11 08', assurance: 'CNSS', numeroAssurance: 'CNSS-003456' },
  ]

  const createdPatients = []
  for (const p of patientData) {
    const patient = await prisma.patient.create({
      data: {
        pharmacieId: pharmacies[0].id,
        ...p,
        dateNaissance: new Date(1985 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      },
    })
    createdPatients.push(patient)
  }
  console.log(`  ✅ ${createdPatients.length} patients created`)

  // === 5. Employés ===
  console.log('\n👔 Creating employees...')
  const employeData = [
    { nom: 'Agossa', prenom: 'Dawes', poste: 'Directeur', salaireBrut: 350000, dateEmbauche: new Date('2020-01-15') },
    { nom: 'Houénou', prenom: 'Marie', poste: 'Pharmacienne', salaireBrut: 250000, dateEmbauche: new Date('2021-03-01') },
    { nom: 'Dossou', prenom: 'Pierre', poste: 'Caissier', salaireBrut: 120000, dateEmbauche: new Date('2022-06-15') },
    { nom: 'Yacoubou', prenom: 'Ibrahim', poste: 'Magasinier', salaireBrut: 100000, dateEmbauche: new Date('2023-01-10') },
    { nom: 'Tchibozo', prenom: 'Angèle', poste: 'Stagiaire', salaireBrut: 50000, dateEmbauche: new Date('2025-02-01') },
  ]

  for (const e of employeData) {
    await prisma.employe.create({
      data: {
        pharmacieId: pharmacies[0].id,
        ...e,
      },
    })
  }
  console.log(`  ✅ ${employeData.length} employees created`)

  // === 6. Fournisseurs ===
  console.log('\n🚚 Creating suppliers...')
  const fournisseurs = await Promise.all([
    prisma.fournisseur.create({
      data: {
        pharmacieId: pharmacies[0].id,
        nom: 'UbiPharm Bénin',
        contact: 'M. Koffi Mensah',
        telephone: '+229 21 30 00 00',
        email: 'commandes@ubipharm.bj',
        adresse: 'Cotonou, Zone Industrielle',
        actif: true,
        note: 4.5,
      },
    }),
    prisma.fournisseur.create({
      data: {
        pharmacieId: pharmacies[0].id,
        nom: 'Promopharm',
        contact: 'Mme Adjo Dossou',
        telephone: '+229 21 31 00 00',
        email: 'ventes@promopharm.bj',
        adresse: 'Cotonou, Akpakpa',
        actif: true,
        note: 4.0,
      },
    }),
    prisma.fournisseur.create({
      data: {
        pharmacieId: pharmacies[0].id,
        nom: 'Laborex Bénin',
        contact: 'M. Toure Amadou',
        telephone: '+229 21 32 00 00',
        email: 'info@laborex.bj',
        adresse: 'Parakou, Albarika',
        actif: true,
        note: 3.8,
      },
    }),
  ])
  console.log(`  ✅ ${fournisseurs.length} suppliers created`)

  // === 7. Caisses ===
  console.log('\n💰 Creating caisses...')
  const caisses = await Promise.all([
    prisma.caisse.create({
      data: {
        pharmacieId: pharmacies[0].id,
        nom: 'Caisse Principale',
        actif: true,
      },
    }),
    prisma.caisse.create({
      data: {
        pharmacieId: pharmacies[0].id,
        nom: 'Caisse 2',
        actif: true,
      },
    }),
  ])
  console.log(`  ✅ ${caisses.length} caisses created`)

  // === 8. Organismes ===
  console.log('\n🏢 Creating organismes...')
  const organismes = await Promise.all([
    prisma.organisme.create({
      data: { nom: 'CNSS', type: 'CNSS', actif: true },
    }),
    prisma.organisme.create({
      data: { nom: 'RAMU', type: 'RAMU', actif: true },
    }),
    prisma.organisme.create({
      data: { nom: 'Assurance Sanitaire Bénin', type: 'ASSURANCE_PRIVEE', actif: true },
    }),
  ])

  for (const org of organismes) {
    await prisma.pharmacieTierPayant.create({
      data: {
        pharmacieId: pharmacies[0].id,
        organismeId: org.id,
        tauxRemboursement: org.type === 'CNSS' ? 80 : org.type === 'RAMU' ? 60 : 50,
        actif: true,
      },
    })
  }
  console.log(`  ✅ ${organismes.length} organismes with tier-payant links created`)

  // === 9. Ventes ===
  console.log('\n🧾 Creating sales...')
  const modesPaiement = [ModePaiement.ESPECES, ModePaiement.WAVE, ModePaiement.MTN_MONEY, ModePaiement.MOOV_MONEY]

  for (let i = 0; i < 30; i++) {
    const med = createdMeds[Math.floor(Math.random() * createdMeds.length)]
    const qty = Math.floor(Math.random() * 5) + 1
    const total = med.prixPublic * qty

    const vente = await prisma.vente.create({
      data: {
        pharmacieId: pharmacies[0].id,
        utilisateurId: users[1].id,
        patientId: i < 8 ? createdPatients[i].id : undefined,
        montantTotal: total,
        montantPaye: total,
        reference: `VTE-${String(i + 1).padStart(5, '0')}`,
        statut: StatutVente.VALIDEE,
        modePaiement: modesPaiement[Math.floor(Math.random() * modesPaiement.length)],
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      },
    })

    await prisma.ligneVente.create({
      data: {
        venteId: vente.id,
        medicamentId: med.id,
        quantite: qty,
        prixUnitaire: med.prixPublic,
        prixTotal: total,
      },
    })
  }
  console.log('  ✅ 30 sales with line items created')

  // === 10. Commandes Fournisseurs ===
  console.log('\n📦 Creating supplier orders...')
  for (let i = 0; i < 5; i++) {
    const med = createdMeds[Math.floor(Math.random() * createdMeds.length)]
    const qty = Math.floor(Math.random() * 50) + 10
    const prix = med.prixPublic * 0.7

    await prisma.commandeFournisseur.create({
      data: {
        pharmacieId: pharmacies[0].id,
        fournisseurId: fournisseurs[Math.floor(Math.random() * fournisseurs.length)].id,
        nomFournisseur: fournisseurs[0].nom,
        statut: [StatutCommande.BROUILLON, StatutCommande.ENVOYEE, StatutCommande.CONFIRMEE, StatutCommande.LIVREE][i % 4],
        montantTotal: prix * qty,
        lignes: {
          create: {
            medicamentId: med.id,
            dci: med.dci,
            nomCommercial: med.nomCommercial,
            quantite: qty,
            prixAchat: prix,
            montant: prix * qty,
          },
        },
      },
    })
  }
  console.log('  ✅ 5 supplier orders created')

  // === 11. Conformité ===
  console.log('\n📋 Creating conformity scores...')
  for (const ph of pharmacies) {
    await prisma.scoreConformite.create({
      data: {
        pharmacieId: ph.id,
        scoreTotal: ph.plan === PlanType.CROWN ? 92 : ph.plan === PlanType.BLOOM ? 78 : ph.plan === PlanType.NETWORK ? 95 : 65,
        scoreRegistreStup: ph.plan === PlanType.CROWN ? 25 : ph.plan === PlanType.BLOOM ? 20 : 15,
        scoreAlerteDPMED: ph.plan === PlanType.CROWN ? 25 : ph.plan === PlanType.BLOOM ? 22 : 15,
        scoreDocuments: ph.plan === PlanType.CROWN ? 18 : ph.plan === PlanType.BLOOM ? 15 : 12,
        scorePharmacovigilance: ph.plan === PlanType.CROWN ? 14 : ph.plan === PlanType.BLOOM ? 12 : 10,
        scoreDestructions: ph.plan === PlanType.CROWN ? 10 : ph.plan === PlanType.BLOOM ? 9 : 13,
        certificationDPMED: ph.plan === PlanType.CROWN || ph.plan === PlanType.NETWORK,
      },
    })
  }
  console.log('  ✅ Conformity scores created')

  // === 12. Alertes DPMED ===
  console.log('\n🚨 Creating DPMED alerts...')
  const alertes = [
    {
      referenceOfficielle: 'DPMED-2025-001',
      titre: 'Rappel de lot — Paracétamol 500mg Lot PCK-2024-089',
      typeAlerte: TypeAlerteDPMED.RAPPEL_LOT,
      niveauUrgence: NiveauUrgence.URGENCE_IMMEDIATE,
      dciConcernee: 'Paracétamol',
      description: 'Détection d\'impuretés au-delà des limites pharmacopées dans le lot PCK-2024-089. Retrait immédiat du marché.',
      dateEmissionDPMED: new Date('2025-06-01'),
    },
    {
      referenceOfficielle: 'DPMED-2025-002',
      titre: 'Médicament contrefait — Faux Amoxil 500mg',
      typeAlerte: TypeAlerteDPMED.CONTREFACON,
      niveauUrgence: NiveauUrgence.URGENCE_IMMEDIATE,
      dciConcernee: 'Amoxicilline',
      description: 'Circulation de faux Amoxil 500mg identifiés dans la région de Cotonou. Emballage suspect sans numéro de lot valide.',
      dateEmissionDPMED: new Date('2025-06-05'),
    },
    {
      referenceOfficielle: 'DPMED-2025-003',
      titre: 'AMM suspendue — Diazépam 5mg Laborex',
      typeAlerte: TypeAlerteDPMED.AMM_SUSPENDUE,
      niveauUrgence: NiveauUrgence.URGENT,
      dciConcernee: 'Diazépam',
      description: 'Suspension de l\'AMM du Diazépam 5mg du fabricant Laborex suite à des non-conformités détectées lors du contrôle LNCQ.',
      dateEmissionDPMED: new Date('2025-05-20'),
    },
  ]

  for (const alerte of alertes) {
    await prisma.alerteDPMED.create({
      data: {
        ...alerte,
        signatureNumerique: 'RSA-SHA256-SIGNATURE',
        statut: StatutAlerte.EN_DIFFUSION,
      },
    })
  }
  console.log(`  ✅ ${alertes.length} DPMED alerts created`)

  // Diffusion des alertes aux pharmacies
  for (const alerte of alertes) {
    const created = await prisma.alerteDPMED.findUnique({ where: { referenceOfficielle: alerte.referenceOfficielle } })
    if (created) {
      for (const ph of pharmacies) {
        await prisma.diffusionAlerte.create({
          data: {
            alerteId: created.id,
            pharmacieId: ph.id,
            statut: StatutDiffusion.EN_ATTENTE,
          },
        })
      }
    }
  }
  console.log('  ✅ Alert diffusions created')

  // === 13. Médicaments sous surveillance ===
  console.log('\n🔬 Creating surveillance entries...')
  await prisma.medicamentSurveillance.createMany({
    data: [
      {
        dci: 'Paracétamol',
        nomCommercial: 'Doliprane 500mg',
        typeSurveillance: TypeSurveillance.RAPPEL_LOT,
        description: 'Lot PCK-2024-089 rappelé pour impuretés',
        sourceAlerte: 'DPMED',
        dateEmission: new Date('2025-06-01'),
        niveauRisque: NiveauRisque.CRITIQUE,
        statut: 'ACTIVE',
      },
      {
        dci: 'Amoxicilline',
        nomCommercial: 'Amoxil 500mg',
        typeSurveillance: TypeSurveillance.CONTREFACON,
        description: 'Circulation de faux Amoxil dans la région de Cotonou',
        sourceAlerte: 'LNCQ',
        dateEmission: new Date('2025-06-05'),
        niveauRisque: NiveauRisque.CRITIQUE,
        statut: 'ACTIVE',
      },
      {
        dci: 'Diazépam',
        nomCommercial: 'Valium 5mg',
        typeSurveillance: TypeSurveillance.AMM_SUSPENDUE,
        description: 'AMM suspendue par la DPMED suite à des non-conformités',
        sourceAlerte: 'DPMED',
        dateEmission: new Date('2025-05-20'),
        niveauRisque: NiveauRisque.ELEVE,
        statut: 'ACTIVE',
      },
    ],
  })
  console.log('  ✅ Surveillance entries created')

  // === 14. Plannings de garde ===
  console.log('\n🌙 Creating garde plannings...')
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    const phIndex = i % pharmacies.length
    if (pharmacies[phIndex].modeGardeActif) {
      await prisma.planningGarde.create({
        data: {
          pharmacieId: pharmacies[phIndex].id,
          date: date,
          dateDebut: new Date(date.setHours(8, 0, 0)),
          dateFin: new Date(date.setHours(8, 0, 0) + 24 * 60 * 60 * 1000),
          type: TypeGarde.NORMALE,
        },
      })
    }
  }
  console.log('  ✅ Garde plannings created')

  // === 15. Documents ===
  console.log('\n📄 Creating documents...')
  await prisma.document.createMany({
    data: [
      {
        pharmacieId: pharmacies[0].id,
        type: 'REGISTRE_STUPEFIANTS',
        titre: 'Registre des Stupéfiants — Juin 2025',
        statut: 'VALIDE',
        dateValidite: new Date('2025-12-31'),
      },
      {
        pharmacieId: pharmacies[0].id,
        type: 'DECLARATION_TRIMESTRIELLE',
        titre: 'Déclaration Trimestrielle T2 2025',
        statut: 'BROUILLON',
        dateValidite: new Date('2025-06-30'),
      },
    ],
  })
  console.log('  ✅ Documents created')

  // === 16. Abonnement ===
  console.log('\n💎 Creating subscriptions...')
  await prisma.abonnement.create({
    data: {
      pharmacieId: pharmacies[0].id,
      plan: PlanType.BLOOM,
      type: 'MENSUEL',
      statut: 'ACTIF',
      montant: 15000,
      dateDebut: new Date('2025-01-01'),
      dateFin: new Date('2025-12-31'),
      methodePaiement: ModePaiement.WAVE,
    },
  })
  console.log('  ✅ Subscription created')

  // === 17. Grossistes ===
  console.log('\n🏭 Creating grossistes...')
  const grossistes = await Promise.all([
    prisma.grossiste.create({
      data: {
        nom: 'UbiPharm Bénin',
        slug: 'ubipharm-benin',
        contact: 'M. Koffi Mensah',
        telephone: '+229 21 30 00 00',
        email: 'commandes@ubipharm.bj',
        actif: true,
      },
    }),
    prisma.grossiste.create({
      data: {
        nom: 'Promopharm',
        slug: 'promopharm',
        contact: 'Mme Adjo Dossou',
        telephone: '+229 21 31 00 00',
        email: 'ventes@promopharm.bj',
        actif: true,
      },
    }),
  ])

  // Produits grossiste
  for (const g of grossistes) {
    for (const med of medsData.slice(0, 5)) {
      await prisma.produitGrossiste.create({
        data: {
          grossisteId: g.id,
          dci: med.dci,
          nomCommercial: med.nomCommercial,
          forme: med.forme.toString(),
          dosage: med.dosage,
          prixUnitaire: med.prixPublic * 0.75,
          quantiteDispo: Math.floor(Math.random() * 500) + 50,
          actif: true,
        },
      })
    }
  }
  console.log(`  ✅ ${grossistes.length} grossistes with products created`)

  // === 18. Notifications ===
  console.log('\n🔔 Creating notifications...')
  await prisma.notification.createMany({
    data: [
      { userId: users[0].id, titre: 'Alerte DPMED', message: 'Rappel de lot Paracétamol — consultez les détails', type: 'ALERTE' },
      { userId: users[0].id, titre: 'Stock bas', message: 'Le stock de Doliprane 500mg est en dessous du seuil minimum', type: 'STOCK' },
      { userId: users[1].id, titre: 'Nouvelle ordonnance', message: 'Une ordonnance a été reçue pour le patient Kofi Adambi', type: 'INFO' },
      { userId: users[0].id, titre: 'Bienvenue', message: 'Bienvenue sur MediHelm Pro ! Configurez votre pharmacie pour commencer.', type: 'INFO' },
    ],
  })
  console.log('  ✅ Notifications created')

  // === Summary ===
  console.log('\n🎉 Seed completed successfully!')
  console.log('\n📧 Test accounts:')
  console.log('  admin@medihelm.bj / demo1234 (DIRECTEUR)')
  console.log('  pharmacien@medihelm.bj / demo1234 (PHARMACIEN)')
  console.log('  caissier@medihelm.bj / demo1234 (CAISSIER)')
  console.log('  magasinier@medihelm.bj / demo1234 (MAGASINIER)')
  console.log('  dpmed@medihelm.bj / demo1234 (DPMED_ADMIN)')
  console.log('  grossiste@medihelm.bj / demo1234 (GROSSISTE_PARTNER)')
  console.log('  owner@medihelm.bj / demo1234 (OWNER)')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
