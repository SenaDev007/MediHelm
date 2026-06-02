import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/audit-logs — List audit logs for a pharmacie with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const action = searchParams.get('action') || undefined
    const entite = searchParams.get('entite') || undefined
    const utilisateurId = searchParams.get('utilisateurId') || undefined
    const dateDebut = searchParams.get('dateDebut') || undefined
    const dateFin = searchParams.get('dateFin') || undefined

    const where: Record<string, unknown> = { pharmacieId }

    if (action) {
      where.action = { contains: action, mode: 'insensitive' }
    }
    if (entite) {
      where.entite = entite
    }
    if (utilisateurId) {
      where.utilisateurId = utilisateurId
    }
    if (dateDebut || dateFin) {
      const createdAt: Record<string, Date> = {}
      if (dateDebut) createdAt.gte = new Date(dateDebut)
      if (dateFin) createdAt.lte = new Date(dateFin)
      where.createdAt = createdAt
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          utilisateur: {
            select: { id: true, nom: true, prenom: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ])

    return NextResponse.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur GET audit-logs:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des logs' }, { status: 500 })
  }
}

// POST /api/audit-logs — Create an audit log entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pharmacieId, utilisateurId, action, entite, entiteId, details, adresseIP } = body

    if (!pharmacieId || !action || !entite) {
      return NextResponse.json(
        { error: 'pharmacieId, action et entite sont requis' },
        { status: 400 }
      )
    }

    const log = await db.auditLog.create({
      data: {
        pharmacieId,
        utilisateurId: utilisateurId || undefined,
        action,
        entite,
        entiteId: entiteId || undefined,
        details: details || undefined,
        adresseIP: adresseIP || undefined,
      },
      include: {
        utilisateur: {
          select: { id: true, nom: true, prenom: true },
        },
      },
    })

    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    console.error('Erreur POST audit-logs:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du log' }, { status: 500 })
  }
}
