import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M14_DASHBOARD', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const skip = (page - 1) * limit

    const [links, total] = await Promise.all([
      db.promoPharmacieLink.findMany({
        where: { pharmacieId },
        include: {
          promoteur: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              email: true,
              telephone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.promoPharmacieLink.count({ where: { pharmacieId } }),
    ])

    return NextResponse.json({
      data: links,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erreur GET reseaux:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des informations réseau' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M14_DASHBOARD', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const body = await request.json()
    const { promoteurId } = body

    if (!promoteurId) {
      return NextResponse.json(
        { error: 'Le champ promoteurId est requis' },
        { status: 400 }
      )
    }

    // Vérifier que le promoteur existe
    const promoteur = await db.promoteur.findUnique({
      where: { id: promoteurId },
    })

    if (!promoteur) {
      return NextResponse.json(
        { error: 'Promoteur introuvable' },
        { status: 404 }
      )
    }

    // Vérifier que le lien n'existe pas déjà
    const existingLink = await db.promoPharmacieLink.findUnique({
      where: {
        promoteurId_pharmacieId: { promoteurId, pharmacieId },
      },
    })

    if (existingLink) {
      return NextResponse.json(
        { error: 'Ce promoteur est déjà lié à cette pharmacie' },
        { status: 409 }
      )
    }

    const link = await db.promoPharmacieLink.create({
      data: {
        promoteurId,
        pharmacieId,
      },
      include: {
        promoteur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
          },
        },
      },
    })

    return NextResponse.json(link, { status: 201 })
  } catch (error) {
    console.error('Erreur POST reseaux:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du lien réseau' },
      { status: 500 }
    )
  }
}
