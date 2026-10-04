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

/**
 * POST /api/auth/register — Inscription d'une officine.
 *
 * Deux modes :
 * 1. `officineId` fourni → rattachement à une officine du registre officiel
 *    ABMed déjà pré-enregistrée en base (données officielles conservées,
 *    champs manquants complétés par le formulaire).
 * 2. Sinon → création d'une nouvelle officine avec les champs ABMed
 *    (mêmes informations que le formulaire de l'agence).
 */
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

  try {
    const existingUser = await db.utilisateur.findUnique({ where: { email }, select: { id: true } })
    if (existingUser) {
      return NextResponse.json({ error: 'Un compte avec cet email existe déjà' }, { status: 409 })
    }

    const hashedPassword = await hashPassword(data.motDePasse)
    const now = new Date()

    const result = await db.$transaction(async (tx) => {
      let pharmacie
      let modeRattachement = false

      if (data.officineId) {
        // ─── Mode 1 : rattachement à une officine officielle ABMed ───
        const officine = await tx.pharmacie.findUnique({
          where: { id: data.officineId },
          include: { _count: { select: { utilisateurs: true } } },
        })
        if (!officine || !officine.numeroAbmed) {
          throw Object.assign(new Error('OFFICINE_INTROUVABLE'), { code: 'OFFICINE_INTROUVABLE' })
        }
        if (officine._count.utilisateurs > 0) {
          throw Object.assign(new Error('OFFICINE_DEJA_PRISE'), { code: 'OFFICINE_DEJA_PRISE' })
        }

        // Compléments éventuels du formulaire (ne modifient pas les données
        // officielles déjà renseignées — uniquement les champs vides).
        const telephone = officine.telephone !== 'Non publié' && officine.telephone
          ? undefined
          : (data.telephone ?? officine.telephone)

        pharmacie = await tx.pharmacie.update({
          where: { id: officine.id },
          data: {
            // Champs de compte
            email: officine.email ?? data.emailPharmacie ?? null,
            ...(telephone ? { telephone } : {}),
            plan: data.plan,
            actif: true,
            modeGardeActif: true,
            // Compléments ABMed pour les champs absents du registre
            ...(data.zoneSanitaire && !officine.zoneSanitaire ? { zoneSanitaire: data.zoneSanitaire } : {}),
            ...(data.arrondissement && !officine.arrondissement ? { arrondissement: data.arrondissement } : {}),
            ...(data.pharmacienResponsable && !officine.pharmacienResponsable ? { pharmacienResponsable: data.pharmacienResponsable } : {}),
            ...(data.contactPharmacien && !officine.contactPharmacien ? { contactPharmacien: data.contactPharmacien } : {}),
            ...(data.referenceAutorisation && !officine.referenceAutorisation ? { referenceAutorisation: data.referenceAutorisation } : {}),
            ...(data.numeroOnpb && !officine.numeroOnpb ? { numeroOnpb: data.numeroOnpb } : {}),
            ...(data.latitude !== undefined && officine.latitude === null ? { latitude: data.latitude } : {}),
            ...(data.longitude !== undefined && officine.longitude === null ? { longitude: data.longitude } : {}),
          },
          select: { id: true, nom: true, slug: true, plan: true, numeroAbmed: true },
        })
        modeRattachement = true

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

        return { pharmacie, abonnement, utilisateur, modeRattachement }
      }

      // ─── Mode 2 : nouvelle officine (champs ABMed complets) ───
      const numeroAgrement = data.numeroAgrement!.trim()
      const existingPharmacy = await tx.pharmacie.findUnique({ where: { numeroAgrement }, select: { id: true } })
      if (existingPharmacy) {
        throw Object.assign(new Error('AGREMENT_PRIS'), { code: 'P2002' })
      }

      pharmacie = await tx.pharmacie.create({
        data: {
          slug: `${slugBase(data.pharmacieNom!)}-${randomUUID().slice(0, 8)}`,
          nom: data.pharmacieNom!,
          adresse: data.adresse!,
          ville: data.ville!,
          telephone: data.telephone!,
          email: data.emailPharmacie || null,
          numeroAgrement,
          plan: data.plan,
          actif: true,
          // ─── Champs ABMed (mêmes informations que le formulaire de l'agence) ───
          sourceRegistre: 'MANUEL',
          departement: data.departement!.trim().toUpperCase(),
          zoneSanitaire: data.zoneSanitaire || null,
          commune: data.commune || data.ville!.trim(),
          arrondissement: data.arrondissement || null,
          localisation: data.localisation || data.adresse!,
          pharmacienTitulaire: data.pharmacienTitulaire || null,
          pharmacienResponsable: data.pharmacienResponsable || data.pharmacienTitulaire || null,
          contactPharmacien: data.contactPharmacien || null,
          courrielPharmacien: data.courrielPharmacien || null,
          referenceAutorisation: data.referenceAutorisation || null,
          dateValiditeAbmed: data.dateValiditeAbmed || null,
          referenceQuitus: data.referenceQuitus || null,
          numeroOnpb: data.numeroOnpb || null,
          ...(data.latitude !== undefined
            ? { latitude: Math.max(-90, Math.min(90, data.latitude)) }
            : {}),
          ...(data.longitude !== undefined
            ? { longitude: Math.max(-180, Math.min(180, data.longitude)) }
            : {}),
        },
        select: { id: true, nom: true, slug: true, plan: true, numeroAbmed: true },
      })

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

      return { pharmacie, abonnement, utilisateur, modeRattachement }
    })

    return NextResponse.json(
      {
        message: result.modeRattachement
          ? 'Compte administrateur rattaché à l’officine officielle ABMed avec succès'
          : 'Pharmacie et compte administrateur créés avec succès',
        ...result,
      },
      { status: 201 }
    )
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: string }).code : undefined
    if (code === 'P2002') {
      return NextResponse.json(
        { error: 'Un compte ou établissement utilise déjà ces informations' },
        { status: 409 }
      )
    }
    if (code === 'OFFICINE_INTROUVABLE') {
      return NextResponse.json(
        { error: 'Officine introuvable au registre ABMed' },
        { status: 404 }
      )
    }
    if (code === 'OFFICINE_DEJA_PRISE') {
      return NextResponse.json(
        { error: 'Cette officine a déjà un compte MediHelm. Contactez son titulaire ou le support.' },
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
