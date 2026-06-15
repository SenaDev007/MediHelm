import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

// GET /api/qualite/signalements — Liste des signalements d'effets indésirables
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M16_PHARMACOVIGILANCE', 'read')
    if (authResult instanceof Response) return authResult

    const user = authResult
    const { searchParams } = new URL(request.url)

    const gravite = searchParams.get('gravite')
    const statut = searchParams.get('statut')
    const dci = searchParams.get('dci')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      pharmacieId: user.pharmacieId,
    }

    if (gravite) {
      where.gravite = gravite
    }
    if (statut) {
      where.statutEnvoi = statut
    }
    if (dci) {
      where.dciConcernee = { contains: dci, mode: 'insensitive' }
    }

    const [signalements, total] = await Promise.all([
      db.signalementEI.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.signalementEI.count({ where }),
    ])

    return NextResponse.json({
      data: signalements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des signalements:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des signalements d\'effets indésirables.' },
      { status: 500 }
    )
  }
}

// POST /api/qualite/signalements — Créer un nouveau signalement d'effet indésirable
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M16_PHARMACOVIGILANCE', 'write')
    if (authResult instanceof Response) return authResult

    const user = authResult
    const body = await request.json()

    // Validation des champs requis
    if (!body.dciConcernee) {
      return NextResponse.json(
        { error: 'Le champ dciConcernee est requis.' },
        { status: 400 }
      )
    }
    if (!body.descriptionEI) {
      return NextResponse.json(
        { error: 'Le champ descriptionEI est requis.' },
        { status: 400 }
      )
    }
    if (!body.dateDebut) {
      return NextResponse.json(
        { error: 'Le champ dateDebut est requis.' },
        { status: 400 }
      )
    }

    // Validation de la gravité
    const validGravites = ['MINEUR', 'MODERE', 'GRAVE', 'VITAL']
    const gravite = body.gravite || 'MODERE'
    if (!validGravites.includes(gravite)) {
      return NextResponse.json(
        { error: `Gravité invalide. Valeurs autorisées: ${validGravites.join(', ')}` },
        { status: 400 }
      )
    }

    const signalement = await db.signalementEI.create({
      data: {
        pharmacieId: user.pharmacieId,
        dciConcernee: body.dciConcernee,
        descriptionEI: body.descriptionEI,
        gravite,
        dateDebut: new Date(body.dateDebut),
        statutEnvoi: 'EN_ATTENTE',
        refDPMED: body.refDPMED || null,
      },
    })

    return NextResponse.json(signalement, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du signalement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du signalement d\'effet indésirable.' },
      { status: 500 }
    )
  }
}
