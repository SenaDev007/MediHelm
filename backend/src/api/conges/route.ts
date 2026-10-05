import { db } from '@backend/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@backend/lib/api-auth'
import { validate, congeSchema, congeDecisionSchema } from '@backend/lib/validations'
import { rateLimit, RATE_LIMITS } from '@backend/lib/rate-limit'

// GET /api/conges — Liste des congés (avec employé lié)
export async function GET(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_GENERAL)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M07_RH', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20')
    const type = searchParams.get('type')
    const statut = searchParams.get('statut')
    const employeId = searchParams.get('employeId')
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')

    const where: Record<string, unknown> = {
      pharmacieId: user.pharmacieId,
    }

    if (type) where.type = type
    if (statut) where.statut = statut
    if (employeId) where.employeId = employeId

    if (dateDebut || dateFin) {
      const dateFilter: Record<string, Date> = {}
      if (dateDebut) dateFilter.gte = new Date(dateDebut)
      if (dateFin) dateFilter.lte = new Date(dateFin)
      where.dateDebut = dateFilter
    }

    const [data, total] = await Promise.all([
      db.conge.findMany({
        where,
        include: {
          employe: {
            select: { id: true, nom: true, prenom: true, poste: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.conge.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Erreur GET conges:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des congés' },
      { status: 500 }
    )
  }
}

// POST /api/conges — Créer une demande de congé (liée à un employé)
export async function POST(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_MUTATION)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M07_RH', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()
    const validation = validate(congeSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    // L'employé doit appartenir à la pharmacie
    const employe = await db.employe.findFirst({
      where: { id: data.employeId, pharmacieId: user.pharmacieId, actif: true },
      select: { id: true, nom: true, prenom: true },
    })
    if (!employe) {
      return NextResponse.json({ error: 'Employé introuvable dans votre pharmacie' }, { status: 404 })
    }

    // Cohérence des dates
    if (new Date(data.dateFin) < new Date(data.dateDebut)) {
      return NextResponse.json({ error: 'La date de fin doit être postérieure à la date de début' }, { status: 400 })
    }

    const result = await db.conge.create({
      data: {
        pharmacieId: user.pharmacieId,
        employeId: employe.id,
        type: data.type,
        dateDebut: new Date(data.dateDebut),
        dateFin: new Date(data.dateFin),
        motif: data.motif || null,
        statut: 'EN_ATTENTE',
        approuvePar: null,
      },
      include: {
        employe: { select: { id: true, nom: true, prenom: true, poste: true } },
      },
    })

    await db.auditLog.create({
      data: {
        userId: user.id,
        pharmacieId: user.pharmacieId,
        action: 'CREATE',
        entity: 'Conge',
        entityId: result.id,
        details: `Congé ${data.type} demandé pour ${employe.prenom} ${employe.nom}`,
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Erreur POST conges:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du congé' },
      { status: 500 }
    )
  }
}

// PATCH /api/conges — Approuver ou refuser une demande de congé
// Corps: { id, statut: 'APPROUVE' | 'REFUSE' }
export async function PATCH(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_MUTATION)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M07_RH', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()
    const validation = validate(congeDecisionSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    // Isolation multi-tenant
    const conge = await db.conge.findFirst({
      where: { id: data.id, pharmacieId: user.pharmacieId },
      include: { employe: { select: { nom: true, prenom: true } } },
    })
    if (!conge) {
      return NextResponse.json({ error: 'Congé introuvable' }, { status: 404 })
    }
    if (conge.statut !== 'EN_ATTENTE') {
      return NextResponse.json({ error: `Ce congé a déjà été traité (statut: ${conge.statut})` }, { status: 409 })
    }

    const result = await db.conge.update({
      where: { id: conge.id },
      data: {
        statut: data.statut,
        approuvePar: user.id,
      },
      include: {
        employe: { select: { id: true, nom: true, prenom: true, poste: true } },
      },
    })

    await db.auditLog.create({
      data: {
        userId: user.id,
        pharmacieId: user.pharmacieId,
        action: 'CONGE_DECISION',
        entity: 'Conge',
        entityId: conge.id,
        details: `Congé de ${conge.employe?.prenom ?? ''} ${conge.employe?.nom ?? ''} ${data.statut}`,
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erreur PATCH conges:', error)
    return NextResponse.json(
      { error: 'Erreur lors du traitement du congé' },
      { status: 500 }
    )
  }
}
