import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import { registerSchema } from '@/lib/validations'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

function slugBase(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'pharmacie'
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = rateLimit(request, RATE_LIMITS.AUTH_REGISTER)
  if (rateLimitResponse) return rateLimitResponse

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const validation = registerSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Données d’inscription invalides', details: validation.error.flatten() },
      { status: 400 }
    )
  }

  const data = validation.data
  const email = data.email
  const numeroAgrement = data.numeroAgrement.trim()

  try {
    const [existingUser, existingPharmacy] = await Promise.all([
      db.utilisateur.findUnique({ where: { email }, select: { id: true } }),
      db.pharmacie.findUnique({ where: { numeroAgrement }, select: { id: true } }),
    ])

    if (existingUser) {
      return NextResponse.json({ error: 'Un compte avec cet email existe déjà' }, { status: 409 })
    }
    if (existingPharmacy) {
      return NextResponse.json({ error: 'Un établissement utilise déjà ce numéro d’agrément' }, { status: 409 })
    }

    const hashedPassword = await hashPassword(data.motDePasse)
    const pharmacySlug = `${slugBase(data.pharmacieNom)}-${randomUUID().slice(0, 8)}`

    const result = await db.$transaction(async (tx) => {
      const pharmacie = await tx.pharmacie.create({
        data: {
          slug: pharmacySlug,
          nom: data.pharmacieNom,
          adresse: data.adresse,
          ville: data.ville,
          telephone: data.telephone,
          email: data.emailPharmacie || null,
          numeroAgrement,
          plan: data.plan,
          actif: true,
        },
        select: { id: true, nom: true, slug: true, plan: true },
      })

      const now = new Date()
      const abonnement = await tx.abonnement.create({
        data: {
          pharmacieId: pharmacie.id,
          plan: data.plan,
          type: data.periodeFacturation,
          statut: 'ACTIF',
          montant: ({ SEED: 19900, BLOOM: 34900, CROWN: 54900, NETWORK: 0 } as const)[data.plan],
          dateDebut: now,
          dateFin: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        },
        select: { id: true, plan: true, type: true, statut: true, dateDebut: true, dateFin: true },
      })

      const utilisateur = await tx.utilisateur.create({
        data: {
          pharmacieId: pharmacie.id,
          email,
          motDePasse: hashedPassword,
          nom: data.nom,
          prenom: data.prenom,
          role: 'DIRECTEUR',
          actif: true,
        },
        select: { id: true, email: true, nom: true, prenom: true, role: true },
      })

      return { pharmacie, abonnement, utilisateur }
    })

    return NextResponse.json(
      {
        message: 'Pharmacie et compte administrateur créés avec succès',
        ...result,
      },
      { status: 201 }
    )
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Un compte ou établissement utilise déjà ces informations' },
        { status: 409 }
      )
    }
    console.error('Erreur POST inscription pharmacie')
    return NextResponse.json(
      { error: 'Erreur lors de la création du compte et de la pharmacie' },
      { status: 500 }
    )
  }
}
