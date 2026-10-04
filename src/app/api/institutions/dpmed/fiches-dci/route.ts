import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, checkInstitutionRole } from '@/lib/api-auth'

/**
 * GET /api/institutions/dpmed/fiches-dci — Base nationale DCI (DPMED)
 * Recherche plein texte sur DCI / classe / indications.
 * Accès : DPMED_ADMIN, SOBAPS_VIEWER, ABRP_VIEWER, PLATFORM_ADMIN
 * + rôles pharmacie en LECTURE (référentiel national interactions/posologie).
 * Query : ?q= · ?classe= · ?page= · ?limit=
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'M18_ALERTES_DPMED', 'read')
  if (auth instanceof Response) return auth

  // Le référentiel national est consultable par les institutions,
  // les pharmacies (usage clinique) — pas par les patients.
  const rolePharmacie = ['ADMIN', 'DIRECTEUR', 'PHARMACIEN', 'CAISSIER', 'MAGASINIER', 'COMPTABLE', 'STAGIAIRE', 'PROMOTEUR']
  const roleInstitution = ['DPMED_ADMIN', 'SOBAPS_VIEWER', 'ABRP_VIEWER', 'PLATFORM_ADMIN']
  if (!roleInstitution.includes(auth.roleName) && !rolePharmacie.includes(auth.roleName)) {
    return NextResponse.json({ error: 'Accès réservé aux institutions et professionnels de santé.' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() || undefined
    const classe = searchParams.get('classe') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'))

    const where: Record<string, unknown> = {
      ...(classe ? { classeTherapeutique: { equals: classe, mode: 'insensitive' } } : {}),
      ...(q
        ? {
            OR: [
              { dci: { contains: q, mode: 'insensitive' } },
              { classeTherapeutique: { contains: q, mode: 'insensitive' } },
              { indications: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [fiches, total, classes] = await Promise.all([
      db.ficheDCI.findMany({
        where,
        orderBy: { dci: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.ficheDCI.count({ where }),
      db.ficheDCI.groupBy({ by: ['classeTherapeutique'], _count: true, orderBy: { classeTherapeutique: 'asc' } }),
    ])

    return NextResponse.json({
      fiches: fiches.map((f) => ({
        ...f,
        interactions: safeJson(f.interactions),
        effetsIndesirables: safeJson(f.effetsIndesirables),
      })),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      classes: classes.map((c) => ({ nom: c.classeTherapeutique, nb: c._count })),
    })
  } catch (error) {
    console.error('Erreur GET fiches DCI:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement de la base DCI' }, { status: 500 })
  }
}

/**
 * POST /api/institutions/dpmed/fiches-dci — Créer une fiche DCI
 * CRUD réservé au DPMED_ADMIN (CDC Institutionnel §5 — « Fiches DCI RW »).
 * Champs : dci, classeTherapeutique, mecanisme, indications, posologie,
 * contreIndications, interactions (JSON), effetsIndesirables (JSON),
 * conservation, source.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'M18_ALERTES_DPMED', 'read')
  if (auth instanceof Response) return auth

  const guard = checkInstitutionRole(auth, ['DPMED_ADMIN'])
  if (guard) return guard

  try {
    const body = await request.json()
    const {
      dci,
      classeTherapeutique,
      mecanisme,
      indications,
      posologie,
      contreIndications,
      interactions,
      effetsIndesirables,
      conservation,
      source,
    } = body ?? {}

    if (!dci || !classeTherapeutique) {
      return NextResponse.json(
        { error: 'Champs obligatoires : dci (DCI) et classeTherapeutique' },
        { status: 400 }
      )
    }
    const dciNom = String(dci).trim()
    if (dciNom.length < 2) {
      return NextResponse.json({ error: 'DCI trop courte' }, { status: 400 })
    }

    const existe = await db.ficheDCI.findUnique({ where: { dci: dciNom } })
    if (existe) {
      return NextResponse.json(
        { error: `Une fiche existe déjà pour la DCI « ${dciNom} »` },
        { status: 409 }
      )
    }

    // Les tableaux sont acceptés en JSON ou déjà sérialisés
    const interRaw = typeof interactions === 'string' ? interactions : JSON.stringify(interactions ?? [])
    const eiRaw = typeof effetsIndesirables === 'string' ? effetsIndesirables : JSON.stringify(effetsIndesirables ?? [])
    if (!Array.isArray(safeJson(interRaw))) {
      return NextResponse.json({ error: 'interactions doit être un tableau JSON' }, { status: 400 })
    }
    if (!Array.isArray(safeJson(eiRaw))) {
      return NextResponse.json({ error: 'effetsIndesirables doit être un tableau JSON' }, { status: 400 })
    }

    const fiche = await db.ficheDCI.create({
      data: {
        dci: dciNom,
        classeTherapeutique: String(classeTherapeutique).trim(),
        mecanisme: mecanisme ?? null,
        indications: indications ?? null,
        posologie: posologie ?? null,
        contreIndications: contreIndications ?? null,
        interactions: interRaw,
        effetsIndesirables: eiRaw,
        conservation: conservation ?? null,
        source: source ?? 'DPMED Bénin',
        auteurId: auth.id,
      },
    })

    return NextResponse.json(
      {
        ...fiche,
        interactions: safeJson(fiche.interactions),
        effetsIndesirables: safeJson(fiche.effetsIndesirables),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erreur POST fiche DCI:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la fiche DCI' }, { status: 500 })
  }
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}
