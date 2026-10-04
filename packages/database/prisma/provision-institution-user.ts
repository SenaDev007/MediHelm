import 'dotenv/config'
import { hash } from 'bcryptjs'
import { InstitutionType, PrismaClient, RoleType } from '@prisma/client'

const prisma = new PrismaClient()
const profiles: Record<string, { code: InstitutionType; role: RoleType; name: string }> = {
  DPMED: { code: InstitutionType.DPMED, role: RoleType.DPMED_ADMIN, name: 'DPMED' },
  SOBAPS: { code: InstitutionType.SOBAPS, role: RoleType.SOBAPS_VIEWER, name: 'SoBAPS' },
  ABRP: { code: InstitutionType.ABRP, role: RoleType.ABRP_VIEWER, name: 'ABRP' },
}

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} est obligatoire`)
  return value
}

async function main() {
  const codeInput = required('INSTITUTION_CODE').toUpperCase()
  const profile = profiles[codeInput]
  if (!profile) throw new Error('INSTITUTION_CODE doit être DPMED, SOBAPS ou ABRP')
  const email = required('INSTITUTION_EMAIL').toLowerCase()
  const nom = required('INSTITUTION_LAST_NAME')
  const prenom = required('INSTITUTION_FIRST_NAME')
  const password = required('INSTITUTION_PASSWORD')
  if (password.length < 12 || /^(replace|change|password|123456)/i.test(password)) {
    throw new Error('INSTITUTION_PASSWORD doit être non-placeholder et contenir au moins 12 caractères')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error('INSTITUTION_EMAIL invalide')
  }

  const institution = await prisma.institutionTenant.upsert({
    where: { code: profile.code },
    create: { code: profile.code, nom: process.env.INSTITUTION_NAME?.trim() || profile.name },
    update: { nom: process.env.INSTITUTION_NAME?.trim() || profile.name },
  })
  const existing = await prisma.institutionUser.findUnique({ where: { email } })
  if (existing && existing.institutionId !== institution.id) {
    throw new Error('Cette adresse e-mail est déjà rattachée à un autre tenant institutionnel')
  }
  const motDePasse = await hash(password, 12)
  if (existing) {
    await prisma.institutionUser.update({
      where: { id: existing.id },
      data: { nom, prenom, role: profile.role, motDePasse, actif: true },
    })
    console.log(`Compte institutionnel réactivé/mis à jour: ${email} (${profile.code})`)
  } else {
    await prisma.institutionUser.create({
      data: { institutionId: institution.id, email, nom, prenom, role: profile.role, motDePasse },
    })
    console.log(`Compte institutionnel créé: ${email} (${profile.code})`)
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Échec du provisionnement')
  process.exitCode = 1
}).finally(async () => {
  await prisma.$disconnect()
})
