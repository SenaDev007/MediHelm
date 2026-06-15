import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/fournisseurs — Liste des fournisseurs de la pharmacie
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M04_FOURNISSEURS', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const actif = searchParams.get('actif')

    const where: Record<string, unknown> = {
      pharmacieId: user.pharmacieId,
    }

    if (actif !== null && actif !== undefined) {
      where.actif = actif === 'true'
    }

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { contact: { contains: search, mode: 'insensitive' } },
        { adresse: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await Promise.all([
      db.fournisseur.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.fournisseur.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Erreur GET fournisseurs:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des fournisseurs' },
      { status: 500 }
    )
  }
}

// POST /api/fournisseurs — Créer un nouveau fournisseur
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M04_FOURNISSEURS', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()

    if (!body.nom) {
      return NextResponse.json(
        { error: 'Le nom du fournisseur est requis' },
        { status: 400 }
      )
    }

    const data = await db.fournisseur.create({
      data: {
        pharmacieId: user.pharmacieId,
        nom: body.nom,
        contact: body.contact || null,
        telephone: body.telephone || null,
        email: body.email || null,
        adresse: body.adresse || null,
        actif: body.actif !== undefined ? body.actif : true,
        note: body.note || null,
      },
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST fournisseurs:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du fournisseur' },
      { status: 500 }
    )
  }
}
