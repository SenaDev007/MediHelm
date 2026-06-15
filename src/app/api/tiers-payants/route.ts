import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M10_REMBOURSABLES', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const actif = searchParams.get('actif')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const where: Record<string, unknown> = { pharmacieId }

    if (actif !== null && actif !== undefined) {
      where.actif = actif === 'true'
    }

    const skip = (page - 1) * limit

    const [tiersPayants, total] = await Promise.all([
      db.pharmacieTierPayant.findMany({
        where,
        include: {
          organisme: {
            select: {
              id: true,
              nom: true,
              type: true,
              actif: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.pharmacieTierPayant.count({ where }),
    ])

    return NextResponse.json({
      data: tiersPayants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erreur GET tiers-payants:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des tiers-payants' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M10_REMBOURSABLES', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const body = await request.json()
    const { organismeId, tauxRemboursement, actif } = body

    if (!organismeId) {
      return NextResponse.json(
        { error: 'Le champ organismeId est requis' },
        { status: 400 }
      )
    }

    // Vérifier que l'organisme existe
    const organisme = await db.organisme.findUnique({
      where: { id: organismeId },
    })

    if (!organisme) {
      return NextResponse.json(
        { error: 'Organisme introuvable' },
        { status: 404 }
      )
    }

    // Vérifier que le lien n'existe pas déjà
    const existingLink = await db.pharmacieTierPayant.findUnique({
      where: {
        pharmacieId_organismeId: { pharmacieId, organismeId },
      },
    })

    if (existingLink) {
      return NextResponse.json(
        { error: 'Cet organisme est déjà lié à cette pharmacie' },
        { status: 409 }
      )
    }

    const tierPayant = await db.pharmacieTierPayant.create({
      data: {
        pharmacieId,
        organismeId,
        tauxRemboursement: tauxRemboursement ? parseFloat(String(tauxRemboursement)) : 0,
        actif: actif !== undefined ? actif : true,
      },
      include: {
        organisme: {
          select: {
            id: true,
            nom: true,
            type: true,
            actif: true,
          },
        },
      },
    })

    return NextResponse.json(tierPayant, { status: 201 })
  } catch (error) {
    console.error('Erreur POST tiers-payants:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du lien tiers-payant' },
      { status: 500 }
    )
  }
}
