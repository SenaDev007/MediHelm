import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/ticket — Liste des tickets de support pour la pharmacie
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M14_DASHBOARD', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut')
    const categorie = searchParams.get('categorie')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = { pharmacieId }

    if (statut) {
      where.statut = statut
    }
    if (categorie) {
      where.categorie = categorie
    }

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.ticket.findMany({
        where,
        include: {
          utilisateur: { select: { id: true, nom: true, prenom: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.ticket.count({ where }),
    ])

    // Stats résumées
    const stats = await db.ticket.groupBy({
      by: ['statut'],
      where: { pharmacieId },
      _count: { statut: true },
    })

    const ticketsParStatut: Record<string, number> = {}
    for (const s of stats) {
      ticketsParStatut[s.statut] = s._count.statut
    }

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: ticketsParStatut,
    })
  } catch (error) {
    console.error('Erreur GET ticket:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des tickets' },
      { status: 500 }
    )
  }
}

// POST /api/ticket — Créer un ticket de support
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M14_DASHBOARD', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const body = await request.json()
    const { sujet, description, categorie, priorite } = body

    if (!sujet || !description) {
      return NextResponse.json(
        { error: 'Les champs sujet et description sont requis' },
        { status: 400 }
      )
    }

    const ticket = await db.ticket.create({
      data: {
        pharmacieId,
        userId: user.id,
        sujet,
        description,
        categorie: categorie || 'AUTRE',
        priorite: priorite || 'NORMALE',
        statut: 'OUVERT',
      },
      include: {
        utilisateur: { select: { id: true, nom: true, prenom: true, email: true } },
      },
    })

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    console.error('Erreur POST ticket:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du ticket' },
      { status: 500 }
    )
  }
}
