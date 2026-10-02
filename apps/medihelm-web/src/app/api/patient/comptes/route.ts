import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import { requireAuth } from '@/lib/api-auth'
import { registerPatientSchema } from '@/lib/validations'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const rateLimitResponse = rateLimit(request, RATE_LIMITS.AUTH_REGISTER)
  if (rateLimitResponse) return rateLimitResponse

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const validation = registerPatientSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Données d’inscription invalides', details: validation.error.flatten() },
      { status: 400 }
    )
  }

  const data = validation.data
  try {
    const [existingUser, pharmacie] = await Promise.all([
      db.utilisateur.findUnique({ where: { email: data.email }, select: { id: true } }),
      db.pharmacie.findFirst({ where: { id: data.pharmacieId, actif: true }, select: { id: true } }),
    ])
    if (existingUser) {
      return NextResponse.json({ error: 'Un compte avec cet email existe déjà' }, { status: 409 })
    }
    if (!pharmacie) {
      return NextResponse.json({ error: 'Pharmacie active introuvable' }, { status: 400 })
    }

    const motDePasse = await hashPassword(data.motDePasse)
    const result = await db.$transaction(async tx => {
      const utilisateur = await tx.utilisateur.create({
        data: {
          pharmacieId: pharmacie.id,
          email: data.email,
          motDePasse,
          nom: data.nom,
          prenom: data.prenom,
          telephone: data.telephone,
          role: 'PATIENT',
          actif: true,
        },
        select: { id: true, email: true, nom: true, prenom: true, role: true },
      })
      const patient = await tx.patient.create({
        data: {
          utilisateurId: utilisateur.id,
          pharmacieId: pharmacie.id,
          nom: data.nom,
          prenom: data.prenom,
          telephone: data.telephone,
          email: data.email,
          actif: true,
        },
        select: { id: true, nom: true, prenom: true, email: true },
      })
      return { utilisateur, patient }
    })

    return NextResponse.json(
      { message: 'Compte patient créé avec succès', ...result },
      { status: 201 }
    )
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Un compte avec cet email existe déjà' }, { status: 409 })
    }
    console.error('Erreur POST patient/comptes')
    return NextResponse.json({ error: 'Erreur lors de la création du compte patient' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M05_PATIENTS', 'read')
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')?.trim().toLowerCase()
    const where = authResult.roleName === 'PATIENT'
      ? { id: authResult.id, role: 'PATIENT' as const }
      : {
          ...(authResult.roleName === 'PLATFORM_ADMIN' ? {} : { pharmacieId: authResult.pharmacieId }),
          ...(email ? { email } : {}),
          role: 'PATIENT' as const,
        }

    if (authResult.roleName !== 'PATIENT' && !email) {
      return NextResponse.json({ error: 'Le paramètre email est requis' }, { status: 400 })
    }

    const utilisateur = await db.utilisateur.findFirst({
      where,
      include: { patients: { where: { actif: true }, take: 1 } },
    })
    if (!utilisateur) {
      return NextResponse.json({ error: 'Compte patient non trouvé' }, { status: 404 })
    }

    const patient = utilisateur.patients[0]
    return NextResponse.json({
      utilisateur: {
        id: utilisateur.id,
        email: utilisateur.email,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        role: utilisateur.role,
        telephone: utilisateur.telephone,
        actif: utilisateur.actif,
      },
      patient: patient ? {
        id: patient.id,
        nom: patient.nom,
        prenom: patient.prenom,
        telephone: patient.telephone,
        email: patient.email,
        dateNaissance: patient.dateNaissance,
        sexe: patient.sexe,
        numeroAssurance: patient.numeroAssurance,
        assurance: patient.assurance,
        adresse: patient.adresse,
        pointsFidelite: patient.pointsFidelite,
        actif: patient.actif,
      } : null,
    })
  } catch {
    console.error('Erreur GET patient/comptes')
    return NextResponse.json({ error: 'Erreur lors de la récupération du profil patient' }, { status: 500 })
  }
}
