import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const hashPassword = (pw: string) => bcrypt.hash(pw, 12)

// === PARAKOU CENTER: 9.3372°N, 2.6253°E ===
// Helper: offset lat/lng by approximate km distances
// 1° latitude ≈ 111 km, 1° longitude ≈ 111 * cos(lat) ≈ 109.5 km at Parakou

function offsetCoords(baseLat: number, baseLng: number, dLatKm: number, dLngKm: number) {
  return {
    lat: baseLat + dLatKm / 111,
    lng: baseLng + dLngKm / 109.5,
  }
}

const PARAKOU_LAT = 9.3372
const PARAKOU_LNG = 2.6253

async function main() {
  console.log('🌱 Début du seeding MédiHelm — Parakou, Bénin...')

  // ============================================================
  // 1. ROLES
  // ============================================================
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

  // ============================================================
  // 2. PHARMACIES IN PARAKOU AREA
  // ============================================================
  console.log('🏥 Création des pharmacies de Parakou...')

  const pharmaciesData = [
    // --- Centre-ville (0-1 km) ---
    {
      nom: 'Pharmacie du Marché Central',
      adresse: '03 Rue du Marché, Quartier Central',
      ville: 'Parakou',
      departement: 'Borgou',
      telephone: '+229 23 61 00 01',
      email: 'marchecentral@medihelm.bj',
      numeroAgrement: 'AGR-PK-2024-001',
      ...offsetCoords(PARAKOU_LAT, PARAKOU_LNG, 0.1, -0.15),
      plan: 'GROW' as const,
      statutAbonnement: 'ACTIF' as const,
      periodeFacturation: 'MENSUEL' as const,
      nbUtilisateursMax: 8,
      nbCaissiersSimut: 3,
      nbPatientsMax: 2000,
      stockageDocuments: 1000,
      apiGrossistesMax: 3,
    },
    {
      nom: 'Pharmacie Albarika',
      adresse: '15 Avenue Albarika, Quartier Albarika',
      ville: 'Parakou',
      departement: 'Borgou',
      telephone: '+229 23 61 00 02',
      email: 'albarika@medihelm.bj',
      numeroAgrement: 'AGR-PK-2024-002',
      ...offsetCoords(PARAKOU_LAT, PARAKOU_LNG, -0.3, 0.2),
      plan: 'LEAD' as const,
      statutAbonnement: 'ACTIF' as const,
      periodeFacturation: 'ANNUEL' as const,
      nbUtilisateursMax: 12,
      nbCaissiersSimut: 4,
      nbPatientsMax: 5000,
      stockageDocuments: 2000,
      apiGrossistesMax: 5,
    },
    {
      nom: 'Pharmacie de la Gare',
      adresse: '07 Boulevard de la Gare, Quartier Gare',
      ville: 'Parakou',
      departement: 'Borgou',
      telephone: '+229 23 61 00 03',
      email: 'gare@medihelm.bj',
      numeroAgrement: 'AGR-PK-2024-003',
      ...offsetCoords(PARAKOU_LAT, PARAKOU_LNG, 0.4, 0.5),
      plan: 'GROW' as const,
      statutAbonnement: 'ACTIF' as const,
      periodeFacturation: 'MENSUEL' as const,
      nbUtilisateursMax: 8,
      nbCaissiersSimut: 3,
      nbPatientsMax: 2000,
      stockageDocuments: 1000,
      apiGrossistesMax: 3,
    },
    {
      nom: 'Pharmacie Arafat',
      adresse: '22 Rue Arafat, Quartier Arafat',
      ville: 'Parakou',
      departement: 'Borgou',
      telephone: '+229 23 61 00 04',
      email: 'arafat@medihelm.bj',
      numeroAgrement: 'AGR-PK-2024-004',
      ...offsetCoords(PARAKOU_LAT, PARAKOU_LNG, -0.5, -0.3),
      plan: 'SEED' as const,
      statutAbonnement: 'ACTIF' as const,
      periodeFacturation: 'MENSUEL' as const,
      nbUtilisateursMax: 5,
      nbCaissiersSimut: 2,
      nbPatientsMax: 800,
      stockageDocuments: 500,
      apiGrossistesMax: 2,
    },
    {
      nom: 'Pharmacie Terminus',
      adresse: '10 Avenue du Terminus, Quartier Terminus',
      ville: 'Parakou',
      departement: 'Borgou',
      telephone: '+229 23 61 00 05',
      email: 'terminus@medihelm.bj',
      numeroAgrement: 'AGR-PK-2024-005',
      ...offsetCoords(PARAKOU_LAT, PARAKOU_LNG, 0.6, -0.4),
      plan: 'GROW' as const,
      statutAbonnement: 'ACTIF' as const,
      periodeFacturation: 'MENSUEL' as const,
      nbUtilisateursMax: 8,
      nbCaissiersSimut: 3,
      nbPatientsMax: 2000,
      stockageDocuments: 1000,
      apiGrossistesMax: 3,
    },

    // --- Quartiers (1-3 km) ---
    {
      nom: 'Pharmacie Camp Guézo',
      adresse: '05 Rue Camp Guézo, Quartier Camp',
      ville: 'Parakou',
      departement: 'Borgou',
      telephone: '+229 23 61 00 06',
      email: 'campguezso@medihelm.bj',
      numeroAgrement: 'AGR-PK-2024-006',
      ...offsetCoords(PARAKOU_LAT, PARAKOU_LNG, 1.5, 0.8),
      plan: 'SEED' as const,
      statutAbonnement: 'ACTIF' as const,
      periodeFacturation: 'MENSUEL' as const,
      nbUtilisateursMax: 5,
      nbCaissiersSimut: 2,
      nbPatientsMax: 800,
      stockageDocuments: 500,
      apiGrossistesMax: 2,
    },
    {
      nom: 'Pharmacie Baka',
      adresse: '18 Rue Baka, Quartier Baka',
      ville: 'Parakou',
      departement: 'Borgou',
      telephone: '+229 23 61 00 07',
      email: 'baka@medihelm.bj',
      numeroAgrement: 'AGR-PK-2024-007',
      ...offsetCoords(PARAKOU_LAT, PARAKOU_LNG, -1.8, 1.2),
      plan: 'GROW' as const,
      statutAbonnement: 'ACTIF' as const,
      periodeFacturation: 'MENSUEL' as const,
      nbUtilisateursMax: 8,
      nbCaissiersSimut: 3,
      nbPatientsMax: 2000,
      stockageDocuments: 1000,
      apiGrossistesMax: 3,
    },
    {
      nom: 'Pharmacie Madina',
      adresse: '30 Avenue Madina, Quartier Madina',
      ville: 'Parakou',
      departement: 'Borgou',
      telephone: '+229 23 61 00 08',
      email: 'madina@medihelm.bj',
      numeroAgrement: 'AGR-PK-2024-008',
      ...offsetCoords(PARAKOU_LAT, PARAKOU_LNG, 2.0, -1.5),
      plan: 'LEAD' as const,
      statutAbonnement: 'ACTIF' as const,
      periodeFacturation: 'ANNUEL' as const,
      nbUtilisateursMax: 12,
      nbCaissiersSimut: 4,
      nbPatientsMax: 5000,
      stockageDocuments: 2000,
      apiGrossistesMax: 5,
    },
    {
      nom: 'Pharmacie Sans Fil',
      adresse: '12 Boulevard Sans Fil, Quartier Sans Fil',
      ville: 'Parakou',
      departement: 'Borgou',
      telephone: '+229 23 61 00 09',
      email: 'sansfil@medihelm.bj',
      numeroAgrement: 'AGR-PK-2024-009',
      ...offsetCoords(PARAKOU_LAT, PARAKOU_LNG, -1.2, -0.8),
      plan: 'SEED' as const,
      statutAbonnement: 'ACTIF' as const,
      periodeFacturation: 'MENSUEL' as const,
      nbUtilisateursMax: 5,
      nbCaissiersSimut: 2,
      nbPatientsMax: 800,
      stockageDocuments: 500,
      apiGrossistesMax: 2,
    },
    {
      nom: 'Pharmacie Zongo',
      adresse: '08 Rue Zongo, Quartier Zongo',
      ville: 'Parakou',
      departement: 'Borgou',
      telephone: '+229 23 61 00 10',
      email: 'zongo@medihelm.bj',
      numeroAgrement: 'AGR-PK-2024-010',
      ...offsetCoords(PARAKOU_LAT, PARAKOU_LNG, 1.0, 1.5),
      plan: 'GROW' as const,
      statutAbonnement: 'ACTIF' as const,
      periodeFacturation: 'MENSUEL' as const,
      nbUtilisateursMax: 8,
      nbCaissiersSimut: 3,
      nbPatientsMax: 2000,
      stockageDocuments: 1000,
      apiGrossistesMax: 3,
    },

    // --- Périphérie (3-5 km) ---
    {
      nom: 'Pharmacie Tourou',
      adresse: '45 Route de Tourou, Tourou',
      ville: 'Parakou',
      departement: 'Borgou',
      telephone: '+229 23 61 00 11',
      email: 'tourou@medihelm.bj',
      numeroAgrement: 'AGR-PK-2024-011',
      ...offsetCoords(PARAKOU_LAT, PARAKOU_LNG, 3.5, 2.0),
      plan: 'SEED' as const,
      statutAbonnement: 'ACTIF' as const,
      periodeFacturation: 'MENSUEL' as const,
      nbUtilisateursMax: 5,
      nbCaissiersSimut: 2,
      nbPatientsMax: 600,
      stockageDocuments: 400,
      apiGrossistesMax: 2,
    },
    {
      nom: 'Pharmacie Biro',
      adresse: '20 Route de Biro, Biro',
      ville: 'Parakou',
      departement: 'Borgou',
      telephone: '+229 23 61 00 12',
      email: 'biro@medihelm.bj',
      numeroAgrement: 'AGR-PK-2024-012',
      ...offsetCoords(PARAKOU_LAT, PARAKOU_LNG, -3.0, -2.5),
      plan: 'SEED' as const,
      statutAbonnement: 'ACTIF' as const,
      periodeFacturation: 'MENSUEL' as const,
      nbUtilisateursMax: 5,
      nbCaissiersSimut: 2,
      nbPatientsMax: 600,
      stockageDocuments: 400,
      apiGrossistesMax: 2,
    },
    {
      nom: 'Pharmacie Pèrèrè',
      adresse: '05 Rue Principale, Pèrèrè',
      ville: 'Pèrèrè',
      departement: 'Borgou',
      telephone: '+229 23 61 00 13',
      email: 'perere@medihelm.bj',
      numeroAgrement: 'AGR-PK-2024-013',
      ...offsetCoords(PARAKOU_LAT, PARAKOU_LNG, 4.0, -3.0),
      plan: 'SEED' as const,
      statutAbonnement: 'ACTIF' as const,
      periodeFacturation: 'MENSUEL' as const,
      nbUtilisateursMax: 5,
      nbCaissiersSimut: 2,
      nbPatientsMax: 400,
      stockageDocuments: 300,
      apiGrossistesMax: 1,
    },

    // --- Communes voisines (5-20 km) ---
    {
      nom: 'Pharmacie de Kika',
      adresse: '10 Avenue Principale, Kika',
      ville: 'Kika',
      departement: 'Borgou',
      telephone: '+229 23 61 00 14',
      email: 'kika@medihelm.bj',
      numeroAgrement: 'AGR-PK-2024-014',
      ...offsetCoords(PARAKOU_LAT, PARAKOU_LNG, -8.0, -10.0),
      plan: 'SEED' as const,
      statutAbonnement: 'ACTIF' as const,
      periodeFacturation: 'MENSUEL' as const,
      nbUtilisateursMax: 5,
      nbCaissiersSimut: 2,
      nbPatientsMax: 400,
      stockageDocuments: 300,
      apiGrossistesMax: 1,
    },
    {
      nom: 'Pharmacie de Tchaourou',
      adresse: '03 Rue de la Mairie, Tchaourou',
      ville: 'Tchaourou',
      departement: 'Borgou',
      telephone: '+229 23 61 00 15',
      email: 'tchaourou@medihelm.bj',
      numeroAgrement: 'AGR-PK-2024-015',
      ...offsetCoords(PARAKOU_LAT, PARAKOU_LNG, -25.0, 10.0),
      plan: 'SEED' as const,
      statutAbonnement: 'ESSAI' as const,
      periodeFacturation: 'MENSUEL' as const,
      nbUtilisateursMax: 5,
      nbCaissiersSimut: 2,
      nbPatientsMax: 400,
      stockageDocuments: 300,
      apiGrossistesMax: 1,
    },
    {
      nom: 'Pharmacie de N\'Dali',
      adresse: '07 Boulevard de la Liberté, N\'Dali',
      ville: 'N\'Dali',
      departement: 'Borgou',
      telephone: '+229 23 61 00 16',
      email: 'ndali@medihelm.bj',
      numeroAgrement: 'AGR-PK-2024-016',
      ...offsetCoords(PARAKOU_LAT, PARAKOU_LNG, 8.0, 5.0),
      plan: 'SEED' as const,
      statutAbonnement: 'ACTIF' as const,
      periodeFacturation: 'MENSUEL' as const,
      nbUtilisateursMax: 5,
      nbCaissiersSimut: 2,
      nbPatientsMax: 400,
      stockageDocuments: 300,
      apiGrossistesMax: 1,
    },

    // --- Cotonou (pour la couverture nationale) ---
    {
      nom: 'Pharmacie du Centre',
      adresse: '12 Avenue de la République',
      ville: 'Cotonou',
      departement: 'Littoral',
      telephone: '+229 97 00 00 00',
      email: 'contact@pharmacieducentre.bj',
      numeroAgrement: 'AGR-CT-2024-001',
      ...offsetCoords(6.3703, 2.3912, 0, 0),
      plan: 'NETWORK' as const,
      statutAbonnement: 'ACTIF' as const,
      periodeFacturation: 'ANNUEL' as const,
      nbUtilisateursMax: 20,
      nbCaissiersSimut: 6,
      nbPatientsMax: 10000,
      stockageDocuments: 5000,
      apiGrossistesMax: 10,
    },
    {
      nom: 'Pharmacie de Ganhi',
      adresse: '45 Boulevard Saint Michel, Ganhi',
      ville: 'Cotonou',
      departement: 'Littoral',
      telephone: '+229 97 00 00 17',
      email: 'ganhi@medihelm.bj',
      numeroAgrement: 'AGR-CT-2024-002',
      ...offsetCoords(6.3703, 2.3912, 1.0, -0.5),
      plan: 'LEAD' as const,
      statutAbonnement: 'ACTIF' as const,
      periodeFacturation: 'ANNUEL' as const,
      nbUtilisateursMax: 12,
      nbCaissiersSimut: 4,
      nbPatientsMax: 5000,
      stockageDocuments: 2000,
      apiGrossistesMax: 5,
    },
  ]

  const createdPharmacies: Record<string, Awaited<ReturnType<typeof prisma.pharmacie.create>>> = {}
  for (const pData of pharmaciesData) {
    const existing = await prisma.pharmacie.findUnique({ where: { numeroAgrement: pData.numeroAgrement } })
    if (!existing) {
      const { lat, lng, ...rest } = pData as any
      createdPharmacies[pData.numeroAgrement] = await prisma.pharmacie.create({
        data: { ...rest, latitude: lat, longitude: lng },
      })
      console.log(`  ✅ ${pData.nom} — ${pData.ville}`)
    } else {
      createdPharmacies[pData.numeroAgrement] = existing
      console.log(`  ⏩ ${pData.nom} existe déjà`)
    }
  }

  // ============================================================
  // 3. UTILISATEURS (Directeur + Pharmacien par pharmacie)
  // ============================================================
  console.log('👤 Création des utilisateurs...')

  const pharmacienUsers: Record<string, any> = {}

  for (const [agrement, pharmacie] of Object.entries(createdPharmacies)) {
    const prefix = agrement.replace('AGR-', '').replace('2024-', '').toLowerCase()

    // Directeur
    const dirEmail = `directeur.${prefix}@medihelm.bj`
    const existingDir = await prisma.utilisateur.findUnique({ where: { email: dirEmail } })
    if (!existingDir) {
      await prisma.utilisateur.create({
        data: {
          pharmacieId: pharmacie.id,
          email: dirEmail,
          motDePasse: await hashPassword('admin123'),
          nom: `Directeur`,
          prenom: `${pharmacie.ville}`,
          roleId: roles.DIRECTEUR.id,
          telephone: pharmacie.telephone.replace('00', '01'),
        },
      })
    }

    // Pharmacien (pour planning garde)
    const pharmaEmail = `pharmacien.${prefix}@medihelm.bj`
    const existingPharma = await prisma.utilisateur.findUnique({ where: { email: pharmaEmail } })
    if (!existingPharma) {
      const user = await prisma.utilisateur.create({
        data: {
          pharmacieId: pharmacie.id,
          email: pharmaEmail,
          motDePasse: await hashPassword('pharma123'),
          nom: `Pharmacien`,
          prenom: `${pharmacie.ville}`,
          roleId: roles.PHARMACIEN.id,
          telephone: pharmacie.telephone.replace('00', '02'),
        },
      })
      pharmacienUsers[agrement] = user
    } else {
      pharmacienUsers[agrement] = existingPharma
    }

    // Caissier
    const caissEmail = `caissier.${prefix}@medihelm.bj`
    const existingCaiss = await prisma.utilisateur.findUnique({ where: { email: caissEmail } })
    if (!existingCaiss) {
      await prisma.utilisateur.create({
        data: {
          pharmacieId: pharmacie.id,
          email: caissEmail,
          motDePasse: await hashPassword('caissier123'),
          nom: `Caissier`,
          prenom: `${pharmacie.ville}`,
          roleId: roles.CAISSIER.id,
          telephone: pharmacie.telephone.replace('00', '03'),
        },
      })
    }
  }

  // ============================================================
  // 4. CAISSES
  // ============================================================
  console.log('💳 Création des caisses...')
  for (const [agrement, pharmacie] of Object.entries(createdPharmacies)) {
    const existingCaisse = await prisma.caisse.findFirst({ where: { pharmacieId: pharmacie.id } })
    if (!existingCaisse) {
      await prisma.caisse.createMany({
        data: [
          { pharmacieId: pharmacie.id, nom: 'Caisse Principale', numero: 1, actif: true },
          { pharmacieId: pharmacie.id, nom: 'Caisse 2', numero: 2, actif: true },
        ],
      })
    }
  }

  // ============================================================
  // 5. MEDICAMENTS + LOTS (pour les 5 premières pharmacies Parakou)
  // ============================================================
  console.log('💊 Création des médicaments...')

  const medicamentsCatalog = [
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
    { dci: 'Sulfadoxine/Pyriméthamine', nomCommercial: 'Fansidar 500/25mg', forme: 'Comprimé', dosage: '500/25mg', unite: 'boîte', prixVente: 2000, prixAchat: 1200, tva: 0.18, estRemboursable: true, stockMin: 30 },
    { dci: 'Albendazole', nomCommercial: 'Zentel 400mg', forme: 'Comprimé', dosage: '400mg', unite: 'boîte', prixVente: 1800, prixAchat: 1000, tva: 0.18, estRemboursable: true, stockMin: 35 },
    { dci: 'Fer/Acide Folique', nomCommercial: 'Ferrograd C', forme: 'Comprimé', dosage: '325mg/500mg', unite: 'boîte', prixVente: 2500, prixAchat: 1500, tva: 0.18, estRemboursable: true, stockMin: 40 },
    { dci: 'Chloroquine', nomCommercial: 'Nivaquine 100mg', forme: 'Comprimé', dosage: '100mg', unite: 'boîte', prixVente: 1200, prixAchat: 700, tva: 0.18, estRemboursable: true, stockMin: 25 },
    { dci: 'Cotrimoxazole', nomCommercial: 'Bactrim 480mg', forme: 'Comprimé', dosage: '480mg', unite: 'boîte', prixVente: 1500, prixAchat: 900, tva: 0.18, estRemboursable: true, stockMin: 30 },
  ]

  // Seed medications for the top 8 Parakou pharmacies
  const pharmacieAgrementsForMeds = [
    'AGR-PK-2024-001', 'AGR-PK-2024-002', 'AGR-PK-2024-003',
    'AGR-PK-2024-004', 'AGR-PK-2024-005', 'AGR-PK-2024-006',
    'AGR-PK-2024-007', 'AGR-PK-2024-008',
  ]

  for (const agrement of pharmacieAgrementsForMeds) {
    const pharmacie = createdPharmacies[agrement]
    if (!pharmacie) continue

    const existingMeds = await prisma.medicament.count({ where: { pharmacieId: pharmacie.id } })
    if (existingMeds > 0) continue

    for (const med of medicamentsCatalog) {
      const m = await prisma.medicament.create({
        data: {
          pharmacieId: pharmacie.id,
          ...med,
          estStupefiant: (med as any).estStupefiant || false,
          estGenerique: false,
          estRemboursable: (med as any).estRemboursable || false,
          stockMax: (med as any).stockMin ? (med as any).stockMin * 3 : 100,
        },
      })
      await prisma.lot.create({
        data: {
          medicamentId: m.id,
          pharmacieId: pharmacie.id,
          numeroLot: `LOT-${m.dci.substring(0, 4).toUpperCase()}-PK-2024-001`,
          dateExpiration: new Date('2026-12-31'),
          quantite: (med as any).estStupefiant ? 20 : Math.floor(Math.random() * 100) + 50,
          prixAchat: med.prixAchat ?? 1000,
          dateReception: new Date('2025-06-15'),
        },
      })
    }
    console.log(`  💊 Médicaments créés pour ${pharmacie.nom}`)
  }

  // Also seed a reduced set for Cotonou pharmacies
  for (const agrement of ['AGR-CT-2024-001', 'AGR-CT-2024-002']) {
    const pharmacie = createdPharmacies[agrement]
    if (!pharmacie) continue
    const existingMeds = await prisma.medicament.count({ where: { pharmacieId: pharmacie.id } })
    if (existingMeds > 0) continue

    for (const med of medicamentsCatalog.slice(0, 10)) {
      const m = await prisma.medicament.create({
        data: {
          pharmacieId: pharmacie.id,
          ...med,
          estStupefiant: (med as any).estStupefiant || false,
          estGenerique: false,
          estRemboursable: (med as any).estRemboursable || false,
          stockMax: (med as any).stockMin ? (med as any).stockMin * 3 : 100,
        },
      })
      await prisma.lot.create({
        data: {
          medicamentId: m.id,
          pharmacieId: pharmacie.id,
          numeroLot: `LOT-${m.dci.substring(0, 4).toUpperCase()}-CT-2024-001`,
          dateExpiration: new Date('2026-12-31'),
          quantite: Math.floor(Math.random() * 80) + 40,
          prixAchat: med.prixAchat ?? 1000,
          dateReception: new Date('2025-06-15'),
        },
      })
    }
  }

  // ============================================================
  // 6. PLANNINGS DE GARDE (cette semaine)
  // ============================================================
  console.log('🌙 Création des plannings de garde...')

  // Get current week dates (Mon-Sun)
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)

  const weekDates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    weekDates.push(d)
  }

  // Assign 2-3 pharmacies on duty each day (rotating)
  const parakouAgrements = Object.keys(createdPharmacies).filter(a => a.startsWith('AGR-PK'))
  const gardeRotations = [
    [0, 3, 7],    // Lundi: Pharmacie Marché Central, Arafat, Madina
    [1, 4, 9],    // Mardi: Albarika, Terminus, Zongo
    [2, 5, 8],    // Mercredi: Gare, Camp Guézo, Sans Fil
    [0, 6, 10],   // Jeudi: Marché Central, Baka, Tourou
    [1, 3, 11],   // Vendredi: Albarika, Arafat, Biro
    [2, 4, 12],   // Samedi: Gare, Terminus, Pèrèrè
    [0, 1, 2],    // Dimanche: Marché Central, Albarika, Gare
  ]

  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const date = weekDates[dayIdx]
    const dayName = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'][dayIdx]

    for (const pharmaIdx of gardeRotations[dayIdx]) {
      if (pharmaIdx >= parakouAgrements.length) continue
      const agrement = parakouAgrements[pharmaIdx]
      const pharmacie = createdPharmacies[agrement]
      if (!pharmacie) continue

      // Check if planning already exists
      const existing = await prisma.planningGarde.findFirst({
        where: {
          pharmacieId: pharmacie.id,
          date: {
            gte: new Date(date.setHours(0, 0, 0, 0)),
            lte: new Date(date.setHours(23, 59, 59, 999)),
          },
        },
      })
      if (existing) continue

      const pharmacien = pharmacienUsers[agrement]

      await prisma.planningGarde.create({
        data: {
          pharmacieId: pharmacie.id,
          date: new Date(date.setHours(0, 0, 0, 0)),
          type: dayIdx >= 5 ? 'WEEKEND' : 'SEMAINE',
          heureDebut: new Date(date.setHours(8, 0, 0, 0)),
          heureFin: new Date(date.setHours(20, 0, 0, 0)),
          pharmacienId: pharmacien?.id,
        },
      })
    }
    console.log(`  🌙 Garde ${dayName}: ${gardeRotations[dayIdx].length} pharmacies`)
  }

  // ============================================================
  // 7. SCORES DE CONFORMITÉ
  // ============================================================
  console.log('✅ Création des scores de conformité...')
  for (const [agrement, pharmacie] of Object.entries(createdPharmacies)) {
    const existingScore = await prisma.scoreConformite.findUnique({ where: { pharmacieId: pharmacie.id } })
    if (existingScore) continue

    const baseScore = 65 + Math.random() * 30
    await prisma.scoreConformite.create({
      data: {
        pharmacieId: pharmacie.id,
        scoreTotal: Math.round(baseScore * 10) / 10,
        scoreRegistreStup: Math.round((baseScore + Math.random() * 10) * 10) / 10,
        scoreAlerteDPMED: Math.round((baseScore + Math.random() * 5) * 10) / 10,
        scoreDocuments: Math.round((baseScore - Math.random() * 10) * 10) / 10,
        scorePharmacovigi: Math.round((baseScore - Math.random() * 5) * 10) / 10,
        scoreDestructions: Math.round((baseScore + Math.random() * 8) * 10) / 10,
      },
    })
  }

  // ============================================================
  // 8. SCORES PHARMACIE (Dashboard)
  // ============================================================
  console.log('📊 Création des scores pharmacie...')
  for (const [agrement, pharmacie] of Object.entries(createdPharmacies)) {
    const existingScore = await prisma.scorePharmacie.findFirst({ where: { pharmacieId: pharmacie.id } })
    if (existingScore) continue

    await prisma.scorePharmacie.create({
      data: {
        pharmacieId: pharmacie.id,
        scoreSante: Math.round((60 + Math.random() * 35) * 10) / 10,
        scoreStock: Math.round((50 + Math.random() * 40) * 10) / 10,
        scoreFinance: Math.round((55 + Math.random() * 40) * 10) / 10,
        scoreConformite: Math.round((65 + Math.random() * 30) * 10) / 10,
        scoreRH: Math.round((70 + Math.random() * 25) * 10) / 10,
        scorePharmacovigilance: Math.round((60 + Math.random() * 30) * 10) / 10,
        scoreQualite: Math.round((65 + Math.random() * 25) * 10) / 10,
      },
    })
  }

  // ============================================================
  // 9. PATIENTS (Parakou)
  // ============================================================
  console.log('👥 Création des patients...')
  const patientsData = [
    { nom: 'Adam', prenom: 'Issouf', telephone: '+229 97 23 00 01', sexe: 'M', estFidele: true, pointsFidelite: 200 },
    { nom: 'Baba', prenom: 'Mariama', telephone: '+229 97 23 00 02', sexe: 'F', estFidele: true, pointsFidelite: 150 },
    { nom: 'Djibril', prenom: 'Moussa', telephone: '+229 97 23 00 03', sexe: 'M', estFidele: false },
    { nom: 'Issa', prenom: 'Fatima', telephone: '+229 97 23 00 04', sexe: 'F', estFidele: true, pointsFidelite: 85 },
    { nom: 'Karim', prenom: 'Abdou', telephone: '+229 97 23 00 05', sexe: 'M', estFidele: false },
    { nom: 'Mama', prenom: 'Aminata', telephone: '+229 97 23 00 06', sexe: 'F', estFidele: true, pointsFidelite: 320 },
    { nom: 'Ouro', prenom: 'Saliou', telephone: '+229 97 23 00 07', sexe: 'M', estFidele: true, pointsFidelite: 45 },
    { nom: 'Saka', prenom: 'Kadijatou', telephone: '+229 97 23 00 08', sexe: 'F', estFidele: false },
    { nom: 'Tahirou', prenom: 'Boubacar', telephone: '+229 97 23 00 09', sexe: 'M', estFidele: true, pointsFidelite: 175 },
    { nom: 'Yaya', prenom: 'Aïchatou', telephone: '+229 97 23 00 10', sexe: 'F', estFidele: true, pointsFidelite: 260 },
    { nom: 'Zoumarou', prenom: 'Bachir', telephone: '+229 97 23 00 11', sexe: 'M', estFidele: false },
    { nom: 'Gani', prenom: 'Rahamatou', telephone: '+229 97 23 00 12', sexe: 'F', estFidele: true, pointsFidelite: 130 },
  ]

  // Distribute patients across Parakou pharmacies
  const parakouPharmacieIds = parakouAgrements.map(a => createdPharmacies[a]?.id).filter(Boolean)
  for (let i = 0; i < patientsData.length; i++) {
    const pData = patientsData[i]
    const pharmacieId = parakouPharmacieIds[i % parakouPharmacieIds.length]
    if (!pharmacieId) continue

    const existingPatient = await prisma.patient.findFirst({
      where: { pharmacieId, telephone: pData.telephone },
    })
    if (existingPatient) continue

    await prisma.patient.create({
      data: {
        pharmacieId,
        ...pData,
        dateNaissance: new Date(1985 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        adresse: `Quartier ${['Central', 'Albarika', 'Gare', 'Arafat', 'Camp Guézo', 'Madina', 'Baka', 'Zongo'][i % 8]}, Parakou`,
        numeroCNSS: `CNSS-PK-${String(i + 1).padStart(4, '0')}`,
      },
    })
  }

  // ============================================================
  // 10. ORGANISMES + TIERS PAYANT
  // ============================================================
  console.log('🏥 Création des organismes d\'assurance...')
  const organismesData = [
    { nom: 'CNSS Bénin', code: 'CNSS-BJ', type: 'ASSURANCE_MALADIE', tauxRemboursement: 0.8 },
    { nom: 'INSA Bénin', code: 'INSA-BJ', type: 'ASSURANCE_PRIVEE', tauxRemboursement: 0.7 },
    { nom: 'RAMU Bénin', code: 'RAMU-BJ', type: 'REGIME_OBLIGATOIRE', tauxRemboursement: 0.6 },
  ]

  for (const orgData of organismesData) {
    for (const pharmacieId of parakouPharmacieIds.slice(0, 5)) {
      const existingOrg = await prisma.organisme.findFirst({
        where: { pharmacieId, code: orgData.code },
      })
      if (existingOrg) continue

      await prisma.organisme.create({
        data: {
          pharmacieId,
          ...orgData,
          actif: true,
        },
      })
    }
  }

  // ============================================================
  // 11. PARTENAIRES GROSSISTES
  // ============================================================
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

  // ============================================================
  // 12. FICHES DCI
  // ============================================================
  console.log('📋 Création des fiches DCI...')
  const existingDCI = await prisma.ficheDCI.count()
  if (existingDCI === 0) {
    await prisma.ficheDCI.createMany({
      data: [
        { dci: 'Paracétamol', classeThera: 'Antalgique', mecanismeAction: 'Inhibition COX centrale', indicationsPrincipales: 'Douleur, fièvre', posologie: '1g x3/jour', contreIndications: 'Insuffisance hépatique', interactions: [{ dciCible: 'Warfarine', gravite: 'MODEREE', description: 'Risque hémorragique' }], effetsIndesirables: [{ nom: 'Hépatotoxicité', frequence: 'Rare' }], conservation: 'T° ambiante', sourceVersion: 'ANSM v2024' },
        { dci: 'Amoxicilline', classeThera: 'Antibiotique', mecanismeAction: 'Inhibition paroi bactérienne', indicationsPrincipales: 'Infections bactériennes', posologie: '1g x3/jour', contreIndications: 'Allergie pénicilline', interactions: [{ dciCible: 'Méthotrexate', gravite: 'MAJEURE', description: 'Toxicité MTX' }], effetsIndesirables: [{ nom: 'Diarrhée', frequence: 'Fréquent' }], conservation: 'T° ambiante', sourceVersion: 'ANSM v2024' },
        { dci: 'Artémether/Luméfantrine', classeThera: 'Antipaludéen', mecanismeAction: 'Inhibition hème', indicationsPrincipales: 'Paludisme', posologie: '4cp x6', contreIndications: 'Hypersensibilité', interactions: [], effetsIndesirables: [{ nom: 'Céphalées', frequence: 'Fréquent' }], conservation: 'T° ambiante', sourceVersion: 'OMS v2024' },
        { dci: 'Ciprofloxacine', classeThera: 'Fluoroquinolone', mecanismeAction: 'Inhibition ADN gyrase', indicationsPrincipales: 'Infections urinaires', posologie: '500mg x2/jour', contreIndications: 'Enfants, grossesse', interactions: [{ dciCible: 'Théophylline', gravite: 'MAJEURE', description: 'Surdosage théophylline' }], effetsIndesirables: [{ nom: 'Tendinite', frequence: 'Peu fréquent' }], conservation: 'T° ambiante', sourceVersion: 'ANSM v2024' },
        { dci: 'Métronidazole', classeThera: 'Antiparasitaire', mecanismeAction: 'Rupture ADN', indicationsPrincipales: 'Infections anaérobies', posologie: '500mg x3/jour', contreIndications: 'Hypersensibilité', interactions: [{ dciCible: 'Alcool', gravite: 'MAJEURE', description: 'Effet antabuse' }], effetsIndesirables: [{ nom: 'Nausées', frequence: 'Fréquent' }], conservation: 'T° ambiante', sourceVersion: 'ANSM v2024' },
      ],
    })
  }

  // ============================================================
  // 13. MEDICAMENT SURVEILLANCE
  // ============================================================
  console.log('⚠️ Création des surveillances...')
  const existingSurv = await prisma.medicamentSurveillance.count()
  if (existingSurv === 0) {
    await prisma.medicamentSurveillance.createMany({
      data: [
        { dci: 'Ciprofloxacine', nomCommercial: 'Ciflox 500mg', fabricant: 'Sanofi', numeroLot: 'LOT-CIPR-2023-042', typeSurveillance: 'RAPPEL_LOT', description: 'Rappel lot pour contamination bactérienne', sourceAlerte: 'ANSM', dateEmission: new Date('2024-03-15'), niveauRisque: 'ELEVE', statut: 'ACTIVE' },
        { dci: 'Paracétamol', nomCommercial: 'Doliprane 500mg', fabricant: 'Sanofi', typeSurveillance: 'SOUS_SURVEILLANCE', description: 'Surveillance hépatotoxicité', sourceAlerte: 'Pharmacovigilance EU', dateEmission: new Date('2024-05-01'), niveauRisque: 'MODERE', statut: 'ACTIVE' },
        { dci: 'Amoxicilline', typeSurveillance: 'CONTREFACON', description: 'Contrefaçon détectée Afrique Ouest', sourceAlerte: 'OMS', dateEmission: new Date('2024-06-20'), niveauRisque: 'CRITIQUE', statut: 'ACTIVE' },
      ],
    })
  }

  // ============================================================
  // 14. ALERTE DPMED + DIFFUSIONS
  // ============================================================
  console.log('🚨 Création des alertes DPMED...')

  // Alerte 1: Rappel Ciprofloxacine
  const alerte1Ref = 'DPMED-2024-ALRT-001'
  const existingAlert1 = await prisma.alerteDPMED.findUnique({ where: { referenceOfficielle: alerte1Ref } })
  if (!existingAlert1) {
    const surv = await prisma.medicamentSurveillance.findFirst({ where: { dci: 'Ciprofloxacine' } })
    const alerte1 = await prisma.alerteDPMED.create({
      data: {
        referenceOfficielle: alerte1Ref,
        titre: 'Rappel lot Ciprofloxacine — Contamination bactérienne',
        description: 'Rappel urgent du lot CIPR-2023-042 pour contamination bactérienne détectée. Toutes les pharmacies doivent retirer les produits et les mettre en quarantaine immédiatement.',
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
        nbOfficinesNotifiees: parakouAgrements.length,
      },
    })

    // Diffuser à toutes les pharmacies Parakou
    for (const agrement of parakouAgrements) {
      const pharmacie = createdPharmacies[agrement]
      if (!pharmacie) continue

      const isCentral = ['AGR-PK-2024-001', 'AGR-PK-2024-002', 'AGR-PK-2024-003'].includes(agrement)
      await prisma.diffusionAlerte.create({
        data: {
          alerteId: alerte1.id,
          pharmacieId: pharmacie.id,
          lotsConcernes: ['LOT-CIPR-2023-042'],
          canalEnvoi: ['PUSH', 'IN_APP'],
          dateEnvoi: new Date('2024-03-15'),
          dateAcquittement: isCentral ? new Date('2024-03-16') : null,
          actionPrise: isCentral ? 'Produits retirés et mis en quarantaine' : null,
        },
      })
    }
  }

  // Alerte 2: Contrefaçon Amoxicilline
  const alerte2Ref = 'DPMED-2024-ALRT-002'
  const existingAlert2 = await prisma.alerteDPMED.findUnique({ where: { referenceOfficielle: alerte2Ref } })
  if (!existingAlert2) {
    const surv2 = await prisma.medicamentSurveillance.findFirst({ where: { dci: 'Amoxicilline' } })
    const alerte2 = await prisma.alerteDPMED.create({
      data: {
        referenceOfficielle: alerte2Ref,
        titre: 'Alerte contrefaçon Amoxicilline — Afrique de l\'Ouest',
        description: 'Des lots contrefaits d\'Amoxicilline 500mg ont été détectés en Afrique de l\'Ouest. Les pharmacies doivent vérifier leurs stocks et signaler tout lot suspect au DPMED.',
        typeAlerte: 'CONTREFACON',
        niveauUrgence: 'URGENCE_IMMEDIATE',
        medicamentSurvId: surv2?.id,
        dciConcernee: 'Amoxicilline',
        numerosLotConcernes: ['LOT-AMOX-FAKE-001', 'LOT-AMOX-FAKE-002'],
        fabricantConcerne: 'Multiple',
        sourceEmission: 'DPMED',
        signatureNumerique: 'SIG-DPMED-002',
        dateEmissionDPMED: new Date('2024-06-20'),
        statut: 'DIFFUSEE',
        nbOfficinesNotifiees: parakouAgrements.length,
      },
    })

    // Diffuser à toutes les pharmacies Parakou
    for (const agrement of parakouAgrements) {
      const pharmacie = createdPharmacies[agrement]
      if (!pharmacie) continue

      const isCentral = ['AGR-PK-2024-001', 'AGR-PK-2024-005'].includes(agrement)
      await prisma.diffusionAlerte.create({
        data: {
          alerteId: alerte2.id,
          pharmacieId: pharmacie.id,
          lotsConcernes: ['LOT-AMOX-FAKE-001', 'LOT-AMOX-FAKE-002'],
          canalEnvoi: ['PUSH', 'SMS', 'IN_APP'],
          dateEnvoi: new Date('2024-06-20'),
          dateAcquittement: isCentral ? new Date('2024-06-21') : null,
          actionPrise: isCentral ? 'Vérification effectuée, aucun lot suspect trouvé' : null,
        },
      })
    }
  }

  // ============================================================
  // 15. CONFIRMATIONS SoBAPS (pour la carte d'approvisionnement)
  // ============================================================
  console.log('📦 Création des confirmations SoBAPS...')
  for (const agrement of parakouAgrements) {
    const pharmacie = createdPharmacies[agrement]
    if (!pharmacie) continue

    const existingConf = await prisma.confirmationReceptionSoBAPS.count({
      where: { pharmacieId: pharmacie.id },
    })
    if (existingConf > 0) continue

    // 2-3 confirmations par pharmacie
    const nbConf = 2 + Math.floor(Math.random() * 2)
    for (let i = 0; i < nbConf; i++) {
      const dateReception = new Date(2026, 5, 1 - i * 7) // recent dates
      await prisma.confirmationReceptionSoBAPS.create({
        data: {
          pharmacieId: pharmacie.id,
          bonLivraisonRef: `BL-SOBAPS-PK-${agrement.slice(-3)}-${String(i + 1).padStart(3, '0')}`,
          dateReception: dateReception,
          statut: Math.random() > 0.3 ? 'CONFORME' : 'AVEC_ECART',
          ecarts: Math.random() > 0.7 ? [{ produit: 'Coartem', attendu: 20, recu: 15 }] : null,
        },
      })
    }
  }

  // ============================================================
  // 16. NOTIFICATIONS (pour le feed d'activité)
  // ============================================================
  console.log('🔔 Création des notifications...')
  for (const agrement of parakouAgrements.slice(0, 5)) {
    const pharmacie = createdPharmacies[agrement]
    if (!pharmacie) continue

    const pharmacien = pharmacienUsers[agrement]
    if (!pharmacien) continue

    const existingNotifs = await prisma.notification.count({ where: { pharmacieId: pharmacie.id } })
    if (existingNotifs > 0) continue

    await prisma.notification.createMany({
      data: [
        {
          pharmacieId: pharmacie.id,
          utilisateurId: pharmacien.id,
          titre: 'Alerte DPMED — Rappel Ciprofloxacine',
          message: 'Un lot de Ciprofloxacine a été rappelé. Vérifiez vos stocks.',
          canal: 'PUSH',
          typeReference: 'ALERTE_DPMED',
        },
        {
          pharmacieId: pharmacie.id,
          utilisateurId: pharmacien.id,
          titre: 'Planning de garde confirmé',
          message: 'Votre planning de garde pour cette semaine a été confirmé.',
          canal: 'IN_APP',
          typeReference: 'PLANNING_GARDE',
        },
        {
          pharmacieId: pharmacie.id,
          titre: 'Nouvelle commande SoBAPS reçue',
          message: 'Une livraison SoBAPS a été réceptionnée avec succès.',
          canal: 'IN_APP',
          typeReference: 'RECEPTION',
        },
      ],
    })
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  const totalPharmacies = await prisma.pharmacie.count()
  const totalUsers = await prisma.utilisateur.count()
  const totalMedicaments = await prisma.medicament.count()
  const totalPlannings = await prisma.planningGarde.count()
  const totalPatients = await prisma.patient.count()
  const totalAlertes = await prisma.alerteDPMED.count()
  const totalDiffusions = await prisma.diffusionAlerte.count()
  const totalConfirmations = await prisma.confirmationReceptionSoBAPS.count()
  const totalScores = await prisma.scoreConformite.count()

  console.log(`
╔══════════════════════════════════════════════════╗
║   🎉 SEEDING MÉDIHELM PARAKOU TERMINÉ !        ║
╠══════════════════════════════════════════════════╣
║   🏥 Pharmacies:         ${String(totalPharmacies).padStart(3)}                    ║
║   👤 Utilisateurs:       ${String(totalUsers).padStart(3)}                    ║
║   💊 Médicaments:        ${String(totalMedicaments).padStart(3)}                    ║
║   🌙 Plannings garde:    ${String(totalPlannings).padStart(3)}                    ║
║   👥 Patients:           ${String(totalPatients).padStart(3)}                    ║
║   🚨 Alertes DPMED:      ${String(totalAlertes).padStart(3)}                    ║
║   📢 Diffusions:         ${String(totalDiffusions).padStart(3)}                    ║
║   📦 Confirmations:      ${String(totalConfirmations).padStart(3)}                    ║
║   ✅ Scores conformité:  ${String(totalScores).padStart(3)}                    ║
╚══════════════════════════════════════════════════╝
  `)
}

main()
  .catch((e) => { console.error('❌ Erreur:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
