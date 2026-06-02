import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/**
 * Hash un mot de passe avec bcrypt (identique à auth.ts)
 */
const hashPassword = (pw: string) => bcrypt.hash(pw, 12)

async function main() {
  console.log('🌱 Début du seeding MédiHelm...')

  // 1. Create Roles (skip if exists)
  console.log('📋 Création des rôles...')
  const roleNames = [
    'ADMIN', 'DIRECTEUR', 'PHARMACIEN', 'CAISSIER', 'MAGASINIER', 'PROMOTEUR',
    'DPMED_ADMIN', 'SOBAPS_VIEWER', 'ABRP_VIEWER', 'GROSSISTE_PARTNER', 'PLATFORM_ADMIN',
  ]
  const roles: Record<string, { id: string }> = {}
  for (const nom of roleNames) {
    const existing = await prisma.role.findUnique({ where: { nom } })
    if (existing) {
      roles[nom] = existing
    } else {
      roles[nom] = await prisma.role.create({ data: { nom, description: `Rôle ${nom}` } })
    }
  }

  // 2. Create Demo Pharmacy
  console.log('🏥 Création de la pharmacie de démo...')
  const pharmacie = await prisma.pharmacie.findUnique({ where: { numeroAgrement: 'AGR-2024-001' } })
  if (!pharmacie) {
    await prisma.pharmacie.create({
      data: {
        nom: 'Pharmacie du Centre',
        adresse: '12 Avenue de la République',
        ville: 'Cotonou',
        departement: 'Littoral',
        telephone: '+229 97 00 00 00',
        email: 'contact@pharmacieducentre.bj',
        numeroAgrement: 'AGR-2024-001',
        latitude: 6.3703,
        longitude: 2.3912,
        plan: 'SEED',
        statutAbonnement: 'ACTIF',
        periodeFacturation: 'MENSUEL',
        nbUtilisateursMax: 5,
        nbCaissiersSimut: 2,
        stockageDocuments: 500,
        apiGrossistesMax: 2,
      },
    })
  }
  const pharmacieData = await prisma.pharmacie.findUniqueOrThrow({ where: { numeroAgrement: 'AGR-2024-001' } })

  // 3. Create Demo Admin (Directeur) User
  console.log('👤 Création de l\'utilisateur admin démo...')
  const existingAdmin = await prisma.utilisateur.findUnique({ where: { email: 'admin@medihelm.bj' } })
  if (!existingAdmin) {
    await prisma.utilisateur.create({
      data: {
        pharmacieId: pharmacieData.id,
        email: 'admin@medihelm.bj',
        motDePasse: await hashPassword('admin123'),
        nom: 'Houénou',
        prenom: 'Aminou',
        roleId: roles.DIRECTEUR.id,
        telephone: '+229 97 00 00 01',
      },
    })
  }

  // 3b. Create Demo Caissier User
  console.log('👤 Création de l\'utilisateur caissier démo...')
  const existingCaissier = await prisma.utilisateur.findUnique({ where: { email: 'caissier@medihelm.bj' } })
  if (!existingCaissier) {
    await prisma.utilisateur.create({
      data: {
        pharmacieId: pharmacieData.id,
        email: 'caissier@medihelm.bj',
        motDePasse: await hashPassword('caissier123'),
        nom: 'Dossou',
        prenom: 'Marie',
        roleId: roles.CAISSIER.id,
        telephone: '+229 97 00 00 02',
      },
    })
  }

  // 3c. Create Demo Caisse for the pharmacy
  console.log('💳 Création de la caisse démo...')
  const existingCaisse = await prisma.caisse.findFirst({ where: { pharmacieId: pharmacieData.id } })
  if (!existingCaisse) {
    await prisma.caisse.create({
      data: {
        pharmacieId: pharmacieData.id,
        nom: 'Caisse Principale',
        numero: 1,
        actif: true,
      },
    })
    await prisma.caisse.create({
      data: {
        pharmacieId: pharmacieData.id,
        nom: 'Caisse 2',
        numero: 2,
        actif: true,
      },
    })
  }

  // 4. Create Sample Medications
  console.log('💊 Création des médicaments démo...')
  const existingMeds = await prisma.medicament.count({ where: { pharmacieId: pharmacieData.id } })
  if (existingMeds === 0) {
    const medicamentsData = [
      { dci: 'Paracétamol', nomCommercial: 'Doliprane 500mg', forme: 'Comprimé', dosage: '500mg', unite: 'boîte', prixVente: 1500, prixAchat: 900, tva: 0.18, estRemboursable: true, stockMin: 50 },
      { dci: 'Amoxicilline', nomCommercial: 'Clamoxyl 500mg', forme: 'Gélule', dosage: '500mg', unite: 'boîte', prixVente: 3500, prixAchat: 2200, tva: 0.18, estRemboursable: true, stockMin: 30 },
      { dci: 'Métronidazole', nomCommercial: 'Flagyl 250mg', forme: 'Comprimé', dosage: '250mg', unite: 'boîte', prixVente: 2800, prixAchat: 1700, tva: 0.18, estRemboursable: true, stockMin: 25 },
      { dci: 'Artémether/Luméfantrine', nomCommercial: 'Coartem 20/120mg', forme: 'Comprimé', dosage: '20/120mg', unite: 'boîte', prixVente: 5000, prixAchat: 3200, tva: 0.18, estRemboursable: true, stockMin: 40 },
      { dci: 'Ciprofloxacine', nomCommercial: 'Ciflox 500mg', forme: 'Comprimé', dosage: '500mg', unite: 'boîte', prixVente: 4200, prixAchat: 2800, tva: 0.18, estRemboursable: true, stockMin: 20 },
      { dci: 'Oméprazole', nomCommercial: 'Mopral 20mg', forme: 'Gélule', dosage: '20mg', unite: 'boîte', prixVente: 3800, prixAchat: 2400, tva: 0.18, estRemboursable: true, stockMin: 30 },
      { dci: 'Ibuprofène', nomCommercial: 'Brufen 400mg', forme: 'Comprimé', dosage: '400mg', unite: 'boîte', prixVente: 2200, prixAchat: 1300, tva: 0.18, estRemboursable: true, stockMin: 40 },
      { dci: 'Azithromycine', nomCommercial: 'Zithromax 250mg', forme: 'Comprimé', dosage: '250mg', unite: 'boîte', prixVente: 6500, prixAchat: 4200, tva: 0.18, estRemboursable: true, stockMin: 15 },
      { dci: 'Diazépam', nomCommercial: 'Valium 5mg', forme: 'Comprimé', dosage: '5mg', unite: 'boîte', prixVente: 3000, prixAchat: 1800, tva: 0.18, estStupefiant: true, estRemboursable: false, stockMin: 10 },
      { dci: 'Morphine', nomCommercial: 'Skenan 30mg', forme: 'Gélule', dosage: '30mg', unite: 'boîte', prixVente: 12000, prixAchat: 8000, tva: 0.18, estStupefiant: true, estRemboursable: false, stockMin: 5 },
    ]

    for (const med of medicamentsData) {
      const m = await prisma.medicament.create({
        data: { pharmacieId: pharmacieData.id, ...med },
      })
      await prisma.lot.create({
        data: {
          medicamentId: m.id,
          pharmacieId: pharmacieData.id,
          numeroLot: `LOT-${m.dci.substring(0, 4).toUpperCase()}-2024-001`,
          dateExpiration: new Date('2025-12-31'),
          quantite: med.dci === 'Morphine' ? 20 : med.dci === 'Diazépam' ? 30 : Math.floor(Math.random() * 100) + 50,
          prixAchat: med.prixAchat ?? 1000,
          dateReception: new Date('2024-06-15'),
        },
      })
    }
  }

  // 5. Create 2 PartenaireGrossiste
  console.log('🏭 Création des grossistes...')
  const ubipharm = await prisma.partenaireGrossiste.findUnique({ where: { codeGrossiste: 'UBIPHARM-BJ' } })
  if (!ubipharm) {
    await prisma.partenaireGrossiste.create({
      data: {
        nom: 'UbiPharm Bénin',
        codeGrossiste: 'UBIPHARM-BJ',
        apiEndpoint: 'https://api.ubipharm.bj/v2',
        apiKeyHash: 'hash_ubipharm_demo_key',
        webhookSecret: 'whsec_ubipharm_demo',
      },
    })
  }
  const promopharma = await prisma.partenaireGrossiste.findUnique({ where: { codeGrossiste: 'PROMOPHARMA-BJ' } })
  if (!promopharma) {
    await prisma.partenaireGrossiste.create({
      data: {
        nom: 'Promopharma Bénin',
        codeGrossiste: 'PROMOPHARMA-BJ',
        apiEndpoint: 'https://api.promopharma.bj/v1',
        apiKeyHash: 'hash_promopharma_demo_key',
        webhookSecret: 'whsec_promopharma_demo',
      },
    })
  }

  // 6. Create FichesDCI
  console.log('📋 Création des fiches DCI...')
  const existingDCI = await prisma.ficheDCI.count()
  if (existingDCI === 0) {
    await prisma.ficheDCI.createMany({
      data: [
        { dci: 'Paracétamol', classeThera: 'Antalgique', mecanismeAction: 'Inhibition COX centrale', indicationsPrincipales: 'Douleur, fièvre', posologie: '1g x3/jour', contreIndications: 'Insuffisance hépatique', interactions: [{ dciCible: 'Warfarine', gravite: 'MODEREE', description: 'Risque hémorragique' }], effetsIndesirables: [{ nom: 'Hépatotoxicité', frequence: 'Rare' }], conservation: 'T° ambiante', sourceVersion: 'ANSM v2024' },
        { dci: 'Amoxicilline', classeThera: 'Antibiotique', mecanismeAction: 'Inhibition paroi bactérienne', indicationsPrincipales: 'Infections bactériennes', posologie: '1g x3/jour', contreIndications: 'Allergie pénicilline', interactions: [{ dciCible: 'Méthotrexate', gravite: 'MAJEURE', description: 'Toxicité MTX' }], effetsIndesirables: [{ nom: 'Diarrhée', frequence: 'Fréquent' }], conservation: 'T° ambiante', sourceVersion: 'ANSM v2024' },
        { dci: 'Métronidazole', classeThera: 'Antiparasitaire', mecanismeAction: 'Rupture ADN', indicationsPrincipales: 'Infections anaérobies', posologie: '500mg x3/jour', contreIndications: 'Hypersensibilité', interactions: [{ dciCible: 'Alcool', gravite: 'MAJEURE', description: 'Effet antabuse' }], effetsIndesirables: [{ nom: 'Nausées', frequence: 'Fréquent' }], conservation: 'T° ambiante', sourceVersion: 'ANSM v2024' },
        { dci: 'Artémether/Luméfantrine', classeThera: 'Antipaludéen', mecanismeAction: 'Inhibition hème', indicationsPrincipales: 'Paludisme', posologie: '4cp x6', contreIndications: 'Hypersensibilité', interactions: [], effetsIndesirables: [{ nom: 'Céphalées', frequence: 'Fréquent' }], conservation: 'T° ambiante', sourceVersion: 'OMS v2024' },
        { dci: 'Ciprofloxacine', classeThera: 'Fluoroquinolone', mecanismeAction: 'Inhibition ADN gyrase', indicationsPrincipales: 'Infections urinaires', posologie: '500mg x2/jour', contreIndications: 'Enfants, grossesse', interactions: [{ dciCible: 'Théophylline', gravite: 'MAJEURE', description: 'Surdosage théophylline' }], effetsIndesirables: [{ nom: 'Tendinite', frequence: 'Peu fréquent' }], conservation: 'T° ambiante', sourceVersion: 'ANSM v2024' },
      ],
    })
  }

  // 7. Create Sample Surveillance
  console.log('⚠️ Création des surveillances...')
  const existingSurv = await prisma.medicamentSurveillance.count()
  if (existingSurv === 0) {
    await prisma.medicamentSurveillance.createMany({
      data: [
        { dci: 'Ciprofloxacine', nomCommercial: 'Ciflox 500mg', fabricant: 'Sanofi', numeroLot: 'LOT-CIPR-2023-042', typeSurveillance: 'RAPPEL_LOT', description: 'Rappel lot pour contamination', sourceAlerte: 'ANSM', dateEmission: new Date('2024-03-15'), niveauRisque: 'ELEVE', statut: 'ACTIVE' },
        { dci: 'Paracétamol', nomCommercial: 'Doliprane 500mg', fabricant: 'Sanofi', typeSurveillance: 'SOUS_SURVEILLANCE', description: 'Surveillance hépatotoxicité', sourceAlerte: 'Pharmacovigilance EU', dateEmission: new Date('2024-05-01'), niveauRisque: 'MODERE', statut: 'ACTIVE' },
        { dci: 'Amoxicilline', typeSurveillance: 'CONTREFACON', description: 'Contrefaçon détectée Afrique Ouest', sourceAlerte: 'OMS', dateEmission: new Date('2024-06-20'), niveauRisque: 'CRITIQUE', statut: 'ACTIVE' },
      ],
    })
  }

  // 8. Create ScoreConformite
  console.log('✅ Création du score de conformité...')
  const existingScore = await prisma.scoreConformite.findUnique({ where: { pharmacieId: pharmacieData.id } })
  if (!existingScore) {
    await prisma.scoreConformite.create({
      data: {
        pharmacieId: pharmacieData.id,
        scoreTotal: 78.5,
        scoreRegistreStup: 92.0,
        scoreAlerteDPMED: 85.0,
        scoreDocuments: 70.0,
        scorePharmacovigi: 65.0,
        scoreDestructions: 80.0,
      },
    })
  }

  // 9. Create patients
  console.log('👥 Création des patients démo...')
  const existingPatients = await prisma.patient.count({ where: { pharmacieId: pharmacieData.id } })
  if (existingPatients === 0) {
    await prisma.patient.createMany({
      data: [
        { pharmacieId: pharmacieData.id, nom: 'Agossou', prenom: 'Fatou', telephone: '+229 97 23 45 67', sexe: 'F', estFidele: true, pointsFidelite: 150 },
        { pharmacieId: pharmacieData.id, nom: 'Houénou', prenom: 'Kofi', telephone: '+229 96 34 56 78', sexe: 'M', estFidele: true, pointsFidelite: 85 },
        { pharmacieId: pharmacieData.id, nom: 'Dossou', prenom: 'Aïcha', telephone: '+229 97 45 67 89', sexe: 'F' },
      ],
    })
  }

  // 9b. Create Demo Organisme (CNSS Bénin) and Tiers Payant
  console.log('🏥 Création de l\'organisme CNSS Bénin...')
  const existingOrg = await prisma.organisme.findFirst({
    where: { pharmacieId: pharmacieData.id, code: 'CNSS-BJ' },
  })
  if (!existingOrg) {
    const org = await prisma.organisme.create({
      data: {
        pharmacieId: pharmacieData.id,
        nom: 'CNSS Bénin',
        code: 'CNSS-BJ',
        type: 'ASSURANCE_MALADIE',
        tauxRemboursement: 0.8,
        actif: true,
      },
    })

    // Create Tiers Payant for the first demo patient (Agossou Fatou)
    const firstPatient = await prisma.patient.findFirst({
      where: { pharmacieId: pharmacieData.id, nom: 'Agossou' },
    })
    if (firstPatient) {
      const existingTP = await prisma.tiersPayant.findFirst({
        where: { patientId: firstPatient.id, organismeId: org.id },
      })
      if (!existingTP) {
        await prisma.tiersPayant.create({
          data: {
            pharmacieId: pharmacieData.id,
            patientId: firstPatient.id,
            organismeId: org.id,
            numeroAdhesion: 'CNSS-2024-001',
            tauxPriseEnCharge: 0.8,
            plafondAnnuel: 500000,
            actif: true,
          },
        })
      }
    }
  }

  // 10. Create DPMED Alert
  console.log('🚨 Création alerte DPMED démo...')
  const existingAlert = await prisma.alerteDPMED.findUnique({ where: { referenceOfficielle: 'DPMED-2024-ALRT-001' } })
  if (!existingAlert) {
    const surv = await prisma.medicamentSurveillance.findFirst({ where: { dci: 'Ciprofloxacine' } })
    const alerte = await prisma.alerteDPMED.create({
      data: {
        referenceOfficielle: 'DPMED-2024-ALRT-001',
        titre: 'Rappel lot Ciprofloxacine',
        description: 'Rappel urgent lot CIPR-2023-042 pour contamination bactérienne',
        typeAlerte: 'RAPPEL_LOT',
        niveauUrgence: 'URGENT',
        medicamentSurvId: surv?.id,
        dciConcernee: 'Ciprofloxacine',
        numerosLotConcernes: ['LOT-CIPR-2023-042'],
        fabricantConcerne: 'Sanofi',
        sourceEmission: 'DPMED',
        signatureNumerique: 'SIG-DPMED-001',
        dateEmissionDPMED: new Date('2024-03-15'),
        statut: 'DIFFUSEE',
        nbOfficinesNotifiees: 1,
      },
    })

    await prisma.diffusionAlerte.create({
      data: {
        alerteId: alerte.id,
        pharmacieId: pharmacieData.id,
        lotsConcernes: ['LOT-CIPR-2023-042'],
        canalEnvoi: ['PUSH', 'IN_APP'],
        dateEnvoi: new Date('2024-03-15'),
        dateAcquittement: new Date('2024-03-16'),
        actionPrise: 'Produits retirés et mis en quarantaine',
      },
    })
  }

  console.log('✅ Seeding terminé !')
}

main()
  .catch((e) => { console.error('❌ Erreur:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
