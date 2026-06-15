import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create pharmacies
  const pharmacies = await Promise.all([
    prisma.pharmacie.upsert({
      where: { numeroAgrement: 'PH-PPK-001' },
      update: {},
      create: {
        nom: 'Pharmacie du Centre',
        adresse: '123 Avenue de la Liberté',
        ville: 'Parakou',
        telephone: '+229 97 00 00 01',
        email: 'centre@medihelm.bj',
        numeroAgrement: 'PH-PPK-001',
        latitude: 9.3372,
        longitude: 2.6253,
        plan: 'GROW',
        actif: true,
        modeGardeActif: true,
      },
    }),
    prisma.pharmacie.upsert({
      where: { numeroAgrement: 'PH-PPK-002' },
      update: {},
      create: {
        nom: 'Pharmacie de l\'Hôpital',
        adresse: '45 Rue des Soins',
        ville: 'Parakou',
        telephone: '+229 97 00 00 02',
        email: 'hopital@medihelm.bj',
        numeroAgrement: 'PH-PPK-002',
        latitude: 9.3420,
        longitude: 2.6310,
        plan: 'LEAD',
        actif: true,
        modeGardeActif: false,
      },
    }),
    prisma.pharmacie.upsert({
      where: { numeroAgrement: 'PH-PPK-003' },
      update: {},
      create: {
        nom: 'Pharmacie Albarika',
        adresse: '78 Boulevard Albarika',
        ville: 'Parakou',
        telephone: '+229 97 00 00 03',
        email: 'albarika@medihelm.bj',
        numeroAgrement: 'PH-PPK-003',
        latitude: 9.3380,
        longitude: 2.6200,
        plan: 'SEED',
        actif: true,
        modeGardeActif: true,
      },
    }),
    prisma.pharmacie.upsert({
      where: { numeroAgrement: 'PH-COT-001' },
      update: {},
      create: {
        nom: 'Pharmacie Haie Vive',
        adresse: '12 Rue Haie Vive',
        ville: 'Cotonou',
        telephone: '+229 97 00 00 04',
        email: 'haievive@medihelm.bj',
        numeroAgrement: 'PH-COT-001',
        latitude: 6.3700,
        longitude: 2.4200,
        plan: 'LEAD',
        actif: true,
        modeGardeActif: false,
      },
    }),
  ])

  console.log(`✅ Created ${pharmacies.length} pharmacies`)

  // Create users
  const bcrypt = await import('bcryptjs')
  const hashedPassword = await bcrypt.hash('demo1234', 10)

  const users = await Promise.all([
    prisma.utilisateur.upsert({
      where: { email: 'admin@medihelm.bj' },
      update: {},
      create: {
        pharmacieId: pharmacies[0].id,
        email: 'admin@medihelm.bj',
        nom: 'Agossa',
        prenom: 'Dawes',
        role: 'DIRECTEUR',
        motDePasse: hashedPassword,
        actif: true,
      },
    }),
    prisma.utilisateur.upsert({
      where: { email: 'pharmacien@medihelm.bj' },
      update: {},
      create: {
        pharmacieId: pharmacies[0].id,
        email: 'pharmacien@medihelm.bj',
        nom: 'Houénou',
        prenom: 'Marie',
        role: 'PHARMACIEN',
        motDePasse: hashedPassword,
        actif: true,
      },
    }),
    prisma.utilisateur.upsert({
      where: { email: 'caissier@medihelm.bj' },
      update: {},
      create: {
        pharmacieId: pharmacies[0].id,
        email: 'caissier@medihelm.bj',
        nom: 'Dossou',
        prenom: 'Pierre',
        role: 'CAISSIER',
        motDePasse: hashedPassword,
        actif: true,
      },
    }),
    prisma.utilisateur.upsert({
      where: { email: 'dpmed@medihelm.bj' },
      update: {},
      create: {
        pharmacieId: pharmacies[0].id,
        email: 'dpmed@medihelm.bj',
        nom: 'DPMED',
        prenom: 'Admin',
        role: 'DPMED_ADMIN',
        motDePasse: hashedPassword,
        actif: true,
      },
    }),
    prisma.utilisateur.upsert({
      where: { email: 'grossiste@medihelm.bj' },
      update: {},
      create: {
        pharmacieId: pharmacies[0].id,
        email: 'grossiste@medihelm.bj',
        nom: 'UbiPharm',
        prenom: 'Partenaire',
        role: 'GROSSISTE_PARTNER',
        motDePasse: hashedPassword,
        actif: true,
      },
    }),
  ])

  console.log(`✅ Created ${users.length} users`)

  // Create medications
  const meds = [
    { dci: 'Paracétamol', nomCommercial: 'Doliprane 500mg', forme: 'Comprimé', dosage: '500mg', prixPublic: 500, surOrdonnance: false, estStupefiant: false },
    { dci: 'Amoxicilline', nomCommercial: 'Amoxil 500mg', forme: 'Gélule', dosage: '500mg', prixPublic: 2500, surOrdonnance: true, estStupefiant: false },
    { dci: 'Métronidazole', nomCommercial: 'Flagyl 250mg', forme: 'Comprimé', dosage: '250mg', prixPublic: 1500, surOrdonnance: true, estStupefiant: false },
    { dci: 'Cotrimoxazole', nomCommercial: 'Bactrim 480mg', forme: 'Comprimé', dosage: '480mg', prixPublic: 800, surOrdonnance: true, estStupefiant: false },
    { dci: 'Arthéméther+Luméfantrine', nomCommercial: 'Coartem 20/120mg', forme: 'Comprimé', dosage: '20/120mg', prixPublic: 3500, surOrdonnance: true, estStupefiant: false },
    { dci: 'Oméprazole', nomCommercial: 'Mopral 20mg', forme: 'Gélule', dosage: '20mg', prixPublic: 2800, surOrdonnance: true, estStupefiant: false },
    { dci: 'Ibuprofène', nomCommercial: 'Brufen 400mg', forme: 'Comprimé', dosage: '400mg', prixPublic: 1200, surOrdonnance: false, estStupefiant: false },
    { dci: 'Diclofénac', nomCommercial: 'Voltarene 50mg', forme: 'Comprimé', dosage: '50mg', prixPublic: 1800, surOrdonnance: true, estStupefiant: false },
    { dci: 'Azithromycine', nomCommercial: 'Zithromax 250mg', forme: 'Comprimé', dosage: '250mg', prixPublic: 4500, surOrdonnance: true, estStupefiant: false },
    { dci: 'Ciprofloxacine', nomCommercial: 'Ciflox 500mg', forme: 'Comprimé', dosage: '500mg', prixPublic: 3200, surOrdonnance: true, estStupefiant: false },
    { dci: 'Codéine', nomCommercial: 'Codéine 30mg', forme: 'Comprimé', dosage: '30mg', prixPublic: 5000, surOrdonnance: true, estStupefiant: true },
    { dci: 'Diazépam', nomCommercial: 'Valium 5mg', forme: 'Comprimé', dosage: '5mg', prixPublic: 3500, surOrdonnance: true, estStupefiant: true },
    { dci: 'Insuline', nomCommercial: 'Insuline Humaine', forme: 'Injection', dosage: '100UI/ml', prixPublic: 8500, surOrdonnance: true, estStupefiant: false },
    { dci: 'Méthotrexate', nomCommercial: 'Methotrexate 2.5mg', forme: 'Comprimé', dosage: '2.5mg', prixPublic: 6200, surOrdonnance: true, estStupefiant: false },
    { dci: 'Salbutamol', nomCommercial: 'Ventoline', forme: 'Inhalateur', dosage: '100μg/dose', prixPublic: 4500, surOrdonnance: true, estStupefiant: false },
  ]

  const createdMeds = []
  for (const med of meds) {
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
    await prisma.lot.create({
      data: {
        medicamentId: m.id,
        pharmacieId: pharmacies[0].id,
        numeroLot: `LOT-2025-${String(createdMeds.length).padStart(3, '0')}`,
        quantite: Math.floor(Math.random() * 100) + 10,
        quantiteInitiale: Math.floor(Math.random() * 150) + 50,
        prixAchat: med.prixPublic * 0.7,
        dateExpiration: new Date(Date.now() + (Math.random() * 730 + 30) * 24 * 60 * 60 * 1000),
      },
    })
  }

  console.log(`✅ Created ${createdMeds.length} medications with lots`)

  // Create patients
  const patientData = [
    { nom: 'Adambi', prenom: 'Kofi', telephone: '+229 96 11 11 01', assurance: 'CNSS' },
    { nom: 'Bello', prenom: 'Aminatou', telephone: '+229 96 11 11 02', assurance: 'RAMU' },
    { nom: 'Dossou', prenom: 'Jean', telephone: '+229 96 11 11 03' },
    { nom: 'Gandaho', prenom: 'Fatou', telephone: '+229 96 11 11 04', assurance: 'CNSS' },
    { nom: 'Houénou', prenom: 'Paul', telephone: '+229 96 11 11 05' },
    { nom: 'Issifou', prenom: 'Aïcha', telephone: '+229 96 11 11 06', assurance: 'RAMU' },
    { nom: 'Kora', prenom: 'Moussa', telephone: '+229 96 11 11 07' },
    { nom: 'Lawani', prenom: 'Béatrice', telephone: '+229 96 11 11 08', assurance: 'CNSS' },
  ]

  for (const p of patientData) {
    await prisma.patient.create({
      data: {
        pharmacieId: pharmacies[0].id,
        ...p,
        dateNaissance: new Date(1985 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      },
    })
  }

  console.log(`✅ Created ${patientData.length} patients`)

  // Create employes
  const employeData = [
    { nom: 'Agossa', prenom: 'Dawes', poste: 'Directeur', typeContrat: 'CDI', salaireBrut: 350000, dateEmbauche: new Date('2020-01-15') },
    { nom: 'Houénou', prenom: 'Marie', poste: 'Pharmacienne', typeContrat: 'CDI', salaireBrut: 250000, dateEmbauche: new Date('2021-03-01') },
    { nom: 'Dossou', prenom: 'Pierre', poste: 'Caissier', typeContrat: 'CDI', salaireBrut: 120000, dateEmbauche: new Date('2022-06-15') },
    { nom: 'Yacoubou', prenom: 'Ibrahim', poste: 'Magasinier', typeContrat: 'CDD', salaireBrut: 100000, dateEmbauche: new Date('2023-01-10') },
    { nom: 'Tchibozo', prenom: 'Angèle', poste: 'Stagiaire', typeContrat: 'STAGE', salaireBrut: 50000, dateEmbauche: new Date('2025-02-01') },
  ]

  for (const e of employeData) {
    await prisma.employe.create({
      data: {
        pharmacieId: pharmacies[0].id,
        ...e,
      },
    })
  }

  console.log(`✅ Created ${employeData.length} employees`)

  // Create conformity scores
  for (const ph of pharmacies) {
    await prisma.scoreConformite.create({
      data: {
        pharmacieId: ph.id,
        scoreTotal: ph.plan === 'LEAD' ? 92 : ph.plan === 'GROW' ? 78 : 65,
        scoreRegistreStup: ph.plan === 'LEAD' ? 25 : ph.plan === 'GROW' ? 20 : 15,
        scoreAlerteDPMED: ph.plan === 'LEAD' ? 25 : ph.plan === 'GROW' ? 22 : 15,
        scoreDocuments: ph.plan === 'LEAD' ? 18 : ph.plan === 'GROW' ? 15 : 12,
        scorePharmacovigilance: ph.plan === 'LEAD' ? 14 : ph.plan === 'GROW' ? 12 : 10,
        scoreDestructions: ph.plan === 'LEAD' ? 10 : ph.plan === 'GROW' ? 9 : 13,
        certificationDPMED: ph.plan === 'LEAD',
      },
    })
  }

  console.log(`✅ Created conformity scores`)

  // Create some DPMED alerts
  const alertes = [
    {
      referenceOfficielle: 'DPMED-2025-001',
      titre: 'Rappel de lot — Paracétamol 500mg Lot PCK-2024-089',
      typeAlerte: 'RAPPEL_LOT',
      niveauUrgence: 'URGENCE_IMMEDIATE',
      dciConcernee: 'Paracétamol',
      description: 'Détection d\'impuretés au-delà des limites pharmacopées dans le lot PCK-2024-089. Retrait immédiat du marché.',
      dateEmissionDPMED: new Date('2025-06-01'),
    },
    {
      referenceOfficielle: 'DPMED-2025-002',
      titre: 'Médicament contrefait — Faux Amoxil 500mg',
      typeAlerte: 'CONTREFACON',
      niveauUrgence: 'URGENCE_IMMEDIATE',
      dciConcernee: 'Amoxicilline',
      description: 'Circulation de faux Amoxil 500mg identifiés dans la région de Cotonou. Emballage suspect sans numéro de lot valide.',
      dateEmissionDPMED: new Date('2025-06-05'),
    },
    {
      referenceOfficielle: 'DPMED-2025-003',
      titre: 'AMM suspendue — Diazépam 5mg Laborex',
      typeAlerte: 'AMM_SUSPENDUE',
      niveauUrgence: 'URGENT',
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
      },
    })
  }

  console.log(`✅ Created ${alertes.length} DPMED alerts`)

  // Create surveillance entries
  await prisma.medicamentSurveillance.createMany({
    data: [
      {
        dci: 'Paracétamol',
        nomCommercial: 'Doliprane 500mg',
        typeSurveillance: 'RAPPEL_LOT',
        description: 'Lot PCK-2024-089 rappelé pour impuretés',
        sourceAlerte: 'DPMED',
        dateEmission: new Date('2025-06-01'),
        niveauRisque: 'CRITIQUE',
        statut: 'ACTIVE',
      },
      {
        dci: 'Amoxicilline',
        nomCommercial: 'Amoxil 500mg',
        typeSurveillance: 'CONTREFACON',
        description: 'Circulation de faux Amoxil dans la région de Cotonou',
        sourceAlerte: 'LNCQ',
        dateEmission: new Date('2025-06-05'),
        niveauRisque: 'CRITIQUE',
        statut: 'ACTIVE',
      },
      {
        dci: 'Diazépam',
        nomCommercial: 'Valium 5mg',
        typeSurveillance: 'AMM_SUSPENDUE',
        description: 'AMM suspendue par la DPMED suite à des non-conformités',
        sourceAlerte: 'DPMED',
        dateEmission: new Date('2025-05-20'),
        niveauRisque: 'ELEVE',
        statut: 'ACTIVE',
      },
    ],
  })

  console.log(`✅ Created surveillance entries`)

  // Create some sample sales
  for (let i = 0; i < 20; i++) {
    const med = createdMeds[Math.floor(Math.random() * createdMeds.length)]
    const qty = Math.floor(Math.random() * 5) + 1
    const vente = await prisma.vente.create({
      data: {
        pharmacieId: pharmacies[0].id,
        utilisateurId: users[1].id,
        montantTotal: med.prixPublic * qty,
        montantPaye: med.prixPublic * qty,
        reference: `VTE-${String(i + 1).padStart(5, '0')}`,
        statut: 'VALIDEE',
        modePaiement: ['ESPECES', 'WAVE', 'MTN_MONEY', 'MOOV_MONEY'][Math.floor(Math.random() * 4)],
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      },
    })

    await prisma.ligneVente.create({
      data: {
        venteId: vente.id,
        medicamentId: med.id,
        quantite: qty,
        prixUnitaire: med.prixPublic,
        prixTotal: med.prixPublic * qty,
      },
    })
  }

  console.log(`✅ Created 20 sample sales`)

  console.log('\n🎉 Seed completed successfully!')
  console.log('📧 Test accounts:')
  console.log('  admin@medihelm.bj / demo1234 (DIRECTEUR)')
  console.log('  pharmacien@medihelm.bj / demo1234 (PHARMACIEN)')
  console.log('  caissier@medihelm.bj / demo1234 (CAISSIER)')
  console.log('  dpmed@medihelm.bj / demo1234 (DPMED_ADMIN)')
  console.log('  grossiste@medihelm.bj / demo1234 (GROSSISTE_PARTNER)')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
