import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_5TK7YFxdoRlk@ep-rapid-leaf-ag0eyijw-pooler.c-2.eu-central-1.aws.neon.tech/MediHelm?sslmode=require' } }
})

const updates = [
  { agrement: 'AGR-PK-2024-001', data: { nom: "Pharmacie Albarika", latitude: 9.3380, longitude: 2.6317, adresse: "Quartier Albarika, Parakou" } },
  { agrement: 'AGR-PK-2024-002', data: { nom: "Pharmacie La Grace", latitude: 9.3427, longitude: 2.6212, adresse: "3ème Arrondissement, Cathédrale St Pierre, Parakou" } },
  { agrement: 'AGR-PK-2024-003', data: { nom: "Pharmacie de la Gare", latitude: 9.3438, longitude: 2.6103, adresse: "2ème Arrondissement, Parakou" } },
  { agrement: 'AGR-PK-2024-004', data: { nom: "Pharmacie Arafat", latitude: 9.3341, longitude: 2.6509, adresse: "Quartier Arafat, Parakou" } },
  { agrement: 'AGR-PK-2024-005', data: { nom: "Pharmacie du Camp Séro Kpéra", latitude: 9.3505, longitude: 2.6374, adresse: "Rond Point Papini, Parakou" } },
  { agrement: 'AGR-PK-2024-006', data: { nom: "Pharmacie du Lycée", latitude: 9.3522, longitude: 2.6162, adresse: "Zone Aéroport, Parakou" } },
  { agrement: 'AGR-PK-2024-007', data: { nom: "Pharmacie Banikani", latitude: 9.3323, longitude: 2.6334, adresse: "Quartier Banikani, Parakou" } },
  { agrement: 'AGR-PK-2024-008', data: { nom: "Pharmacie Tranza", latitude: 9.3565, longitude: 2.6266, adresse: "1er Arrondissement, Parakou" } },
  { agrement: 'AGR-PK-2024-009', data: { nom: "Pharmacie du Campus", latitude: 9.3305, longitude: 2.6386, adresse: "Campus Universitaire, Parakou" } },
  { agrement: 'AGR-PK-2024-010', data: { nom: "Pharmacie Zongo II", latitude: 9.3645, longitude: 2.6243, adresse: "Quartier Zongo, Parakou" } },
  { agrement: 'AGR-PK-2024-011', data: { nom: "Pharmacie Vita-Plus", latitude: 9.3763, longitude: 2.6239, adresse: "RNIE2, Parakou" } },
  { agrement: 'AGR-PK-2024-012', data: { nom: "Pharmacie de Nima", latitude: 9.3496, longitude: 2.6479, adresse: "Quartier Nima, Parakou" } },
  { agrement: 'AGR-PK-2024-013', data: { nom: "Santé Vitale", latitude: 9.3429, longitude: 2.5936, adresse: "Parakou" } },
  { agrement: 'AGR-PK-2024-014', data: { nom: "Pharmacie Saint Benoît", latitude: 9.3238, longitude: 2.6444, adresse: "Parakou" } },
  { agrement: 'AGR-PK-2024-015', data: { nom: "Pharmacie Imane", latitude: 9.3637, longitude: 2.6395, adresse: "Parakou" } },
  { agrement: 'AGR-PK-2024-016', data: { nom: "Pharmacie du Plateau", latitude: 9.3825, longitude: 2.6344, adresse: "Quartier du Plateau, Parakou" } },
]

async function main() {
  console.log('🔄 Mise à jour des pharmacies avec coordonnées réelles OSM...')
  
  for (const update of updates) {
    try {
      const result = await prisma.pharmacie.updateMany({
        where: { numeroAgrement: update.agrement },
        data: update.data,
      })
      console.log(`  ✅ ${update.data.nom} → lat: ${update.data.latitude}, lng: ${update.data.longitude} (${result.count} updated)`)
    } catch (e: any) {
      console.error(`  ❌ ${update.data.nom}: ${e.message?.substring(0, 100)}`)
      // Retry once after a delay
      await new Promise(r => setTimeout(r, 2000))
      try {
        const result = await prisma.pharmacie.updateMany({
          where: { numeroAgrement: update.agrement },
          data: update.data,
        })
        console.log(`  ✅ ${update.data.nom} (retry) → (${result.count} updated)`)
      } catch (e2: any) {
        console.error(`  ❌ ${update.data.nom} (retry failed): ${e2.message?.substring(0, 100)}`)
      }
    }
    // Small delay between updates
    await new Promise(r => setTimeout(r, 500))
  }
  
  console.log('\n📊 Vérification...')
  const pharmacies = await prisma.pharmacie.findMany({
    where: { departement: 'Borgou' },
    select: { nom: true, latitude: true, longitude: true, ville: true },
    orderBy: { nom: 'asc' }
  })
  console.log(`Total pharmacies Borgou: ${pharmacies.length}`)
  for (const p of pharmacies) {
    console.log(`  ${p.nom} | ${p.ville} | ${p.latitude}, ${p.longitude}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
