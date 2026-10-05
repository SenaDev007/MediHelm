// Diagnostic rapide des comptes utilisateurs en base
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const users = await db.utilisateur.findMany({
    select: {
      email: true,
      role: true,
      actif: true,
      pharmacieId: true,
      grossisteId: true,
      motDePasse: true,
    },
    orderBy: { createdAt: 'asc' },
  })
  console.log(`Total utilisateurs: ${users.length}`)
  for (const u of users) {
    const hashKind = u.motDePasse?.startsWith('$2')
      ? 'bcrypt'
      : u.motDePasse?.length === 64
        ? 'sha256'
        : `autre(${u.motDePasse?.slice(0, 8)}…)`
    console.log(
      `  ${u.email.padEnd(42)} role=${(u.role || '').padEnd(18)} actif=${u.actif ? 'O' : 'N'} pharmacieId=${u.pharmacieId ? u.pharmacieId.slice(0, 8) : 'NULL'} grossisteId=${u.grossisteId ? u.grossisteId.slice(0, 8) : 'NULL'} hash=${hashKind}`,
    )
  }

  const pharmCount = await db.pharmacie.count({ where: { actif: true } })
  console.log(`Pharmacies actives: ${pharmCount}`)
  const patientCount = await db.patient.count()
  console.log(`Enregistrements patient: ${patientCount}`)
}

main()
  .catch(e => {
    console.error('ERREUR:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
