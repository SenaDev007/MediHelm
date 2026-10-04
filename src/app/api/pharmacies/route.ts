import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

function slugBase(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'pharmacie'
}

function dayRange(date: Date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/** Champs du registre ABMed exposés publiquement (recherche onboarding) */
const REGISTRE_SELECT = {
  id: true,
  numeroAbmed: true,
  nom: true,
  departement: true,
  zoneSanitaire: true,
  commune: true,
  arrondissement: true,
  localisation: true,
  adresse: true,
  ville: true,
  telephone: true,
  email: true,
  latitude: true,
  longitude: true,
  pharmacienTitulaire: true,
  pharmacienResponsable: true,
  contactPharmacien: true,
  courrielPharmacien: true,
  referenceAutorisation: true,
  dateValiditeAbmed: true,
  referenceQuitus: true,
  numeroOnpb: true,
  statutAbmed: true,
  sourceUrlAbmed: true,
  _count: { select: { utilisateurs: true } },
} as const

function mapPublicPharmacies(data: Array<{
  id: string
  nom: string
  adresse: string
  ville: string
  telephone: string
  latitude: number | null
  longitude: number | null
  numeroAbmed: string | null
  departement: string | null
  zoneSanitaire: string | null
  commune: string | null
  arrondissement: string | null
  localisation: string | null
  pharmacienTitulaire: string | null
  planningsGarde: Array<{ date: Date; dateDebut: Date; dateFin: Date; type: string }>
}>) {
  return data.map(pharmacie => ({
    id: pharmacie.id,
    nom: pharmacie.nom,
    adresse: pharmacie.adresse,
    ville: pharmacie.ville,
    telephone: pharmacie.telephone,
    latitude: pharmacie.latitude,
    longitude: pharmacie.longitude,
    numeroAbmed: pharmacie.numeroAbmed,
    officielle: pharmacie.numeroAbmed !== null,
    departement: pharmacie.departement,
    zoneSanitaire: pharmacie.zoneSanitaire,
    commune: pharmacie.commune,
    arrondissement: pharmacie.arrondissement,
    localisation: pharmacie.localisation,
    pharmacienTitulaire: pharmacie.pharmacienTitulaire,
    planningsGarde: pharmacie.planningsGarde.map(planning => ({
      date: planning.date.toISOString(),
      heureDebut: planning.dateDebut.toISOString(),
      heureFin: planning.dateFin.toISOString(),
      type: planning.type,
    })),
  }))
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const garde = searchParams.get('garde')
    const publicSignupList = searchParams.get('public') === 'signup'
    const publicGarde = garde === 'semaine' || garde === 'aujourdhui'

    // ─── Registre ABMed : recherche d'officines pour l'onboarding ───
    // GET /api/pharmacies?registre=abmed[&departement=BORGOU][&q=bedo][&id=uuid]
    // Public (rate-limité) — utilisé par la page d'inscription pour retrouver
    // une officine officielle et pré-remplir sa fiche.
    if (searchParams.get('registre') === 'abmed') {
      const rateLimitResponse = rateLimit(request, RATE_LIMITS.SEARCH)
      if (rateLimitResponse) return rateLimitResponse

      const registreId = searchParams.get('id')
      if (registreId) {
        const officine = await db.pharmacie.findUnique({
          where: { id: registreId },
          select: REGISTRE_SELECT,
        })
        if (!officine || !officine.numeroAbmed) {
          return NextResponse.json({ error: 'Officine introuvable au registre ABMed' }, { status: 404 })
        }
        return NextResponse.json(officine)
      }

      const departement = searchParams.get('departement')?.trim().toUpperCase() || undefined
      const q = searchParams.get('q')?.trim() || undefined
      const officines = await db.pharmacie.findMany({
        where: {
          numeroAbmed: { not: null },
          ...(departement ? { departement } : {}),
          ...(q ? {
            OR: [
              { nom: { contains: q, mode: 'insensitive' } },
              { commune: { contains: q, mode: 'insensitive' } },
              { zoneSanitaire: { contains: q, mode: 'insensitive' } },
              { localisation: { contains: q, mode: 'insensitive' } },
              { pharmacienTitulaire: { contains: q, mode: 'insensitive' } },
            ],
          } : {}),
        },
        select: REGISTRE_SELECT,
        orderBy: [{ departement: 'asc' }, { nom: 'asc' }],
        take: 100,
      })
      return NextResponse.json(officines)
    }

    if (publicSignupList || publicGarde) {
      const rateLimitResponse = rateLimit(request, RATE_LIMITS.SEARCH)
      if (rateLimitResponse) return rateLimitResponse

      if (publicSignupList) {
        // Liste compacte pour l'inscription patient (choix de la pharmacie de proximité)
        const pharmacies = await db.pharmacie.findMany({
          where: { actif: true, utilisateurs: { some: {} } },
          select: { id: true, nom: true, ville: true, departement: true },
          orderBy: [{ departement: 'asc' }, { nom: 'asc' }],
          take: 200,
        })
        return NextResponse.json(pharmacies)
      }

      const now = new Date()
      let range = dayRange(now)
      if (garde === 'semaine') {
        const start = new Date(now)
        const day = start.getDay()
        start.setDate(start.getDate() - (day === 0 ? 6 : day - 1))
        start.setHours(0, 0, 0, 0)
        const end = new Date(start)
        end.setDate(end.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        range = { start, end }
      }

      const pharmacies = await db.pharmacie.findMany({
        where: {
          actif: true,
          planningsGarde: { some: { date: { gte: range.start, lte: range.end } } },
        },
        select: {
          id: true,
          nom: true,
          adresse: true,
          ville: true,
          telephone: true,
          latitude: true,
          longitude: true,
          numeroAbmed: true,
          departement: true,
          zoneSanitaire: true,
          commune: true,
          arrondissement: true,
          localisation: true,
          pharmacienTitulaire: true,
          planningsGarde: {
            where: { date: { gte: range.start, lte: range.end } },
            orderBy: { date: 'asc' },
            select: { date: true, dateDebut: true, dateFin: true, type: true },
          },
        },
        orderBy: { nom: 'asc' },
        take: 100,
      })
      return NextResponse.json(mapPublicPharmacies(pharmacies))
    }

    const authResult = await requireAuth(request, 'M09_GARDE', 'read')
    if (authResult instanceof Response) return authResult

    const pharmacieId = searchParams.get('pharmacieId')
    const numeroAgrement = searchParams.get('numeroAgrement')
    const includeGarde = searchParams.get('includeGarde') === 'true'
    const where: Record<string, unknown> = {}
    if (pharmacieId) where.id = pharmacieId
    if (numeroAgrement) where.numeroAgrement = numeroAgrement

    const today = dayRange(new Date())
    const data = await db.pharmacie.findMany({
      where,
      include: {
        scoreConformite: true,
        ...(includeGarde ? {
          planningsGarde: {
            where: { date: { gte: today.start, lte: today.end } },
            take: 1,
          },
        } : {}),
      },
      take: 100,
    })
    return NextResponse.json(data)
  } catch {
    console.error('Erreur GET pharmacies')
    return NextResponse.json({ error: 'Erreur lors de la récupération des pharmacies' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof Response) return authResult
    if (authResult.roleName !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ error: 'Seul un administrateur plateforme peut créer une pharmacie' }, { status: 403 })
    }

    const body = await request.json()
    const required = ['nom', 'adresse', 'ville', 'telephone', 'numeroAgrement']
    if (required.some(key => typeof body[key] !== 'string' || !body[key].trim())) {
      return NextResponse.json({ error: 'nom, adresse, ville, telephone et numeroAgrement sont requis' }, { status: 400 })
    }

    const filteredData: Prisma.PharmacieUncheckedCreateInput = {
      slug: `${slugBase(body.nom)}-${randomUUID().slice(0, 8)}`,
      nom: body.nom.trim(),
      adresse: body.adresse.trim(),
      ville: body.ville.trim(),
      telephone: body.telephone.trim(),
      numeroAgrement: body.numeroAgrement.trim(),
    }
    if (typeof body.email === 'string') filteredData.email = body.email.trim().toLowerCase()
    if (body.latitude !== undefined) {
      const latitude = Number(body.latitude)
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        return NextResponse.json({ error: 'Latitude invalide' }, { status: 400 })
      }
      filteredData.latitude = latitude
    }
    if (body.longitude !== undefined) {
      const longitude = Number(body.longitude)
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        return NextResponse.json({ error: 'Longitude invalide' }, { status: 400 })
      }
      filteredData.longitude = longitude
    }
    if (typeof body.plan === 'string' && ['SEED', 'BLOOM', 'CROWN', 'NETWORK'].includes(body.plan)) {
      filteredData.plan = body.plan as Prisma.PharmacieUncheckedCreateInput['plan']
    }
    if (typeof body.actif === 'boolean') filteredData.actif = body.actif
    if (typeof body.modeGardeActif === 'boolean') filteredData.modeGardeActif = body.modeGardeActif

    const data = await db.pharmacie.create({ data: filteredData })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Une pharmacie utilise déjà ces informations' }, { status: 409 })
    }
    console.error('Erreur POST pharmacies')
    return NextResponse.json({ error: 'Erreur lors de la création de la pharmacie' }, { status: 500 })
  }
}
