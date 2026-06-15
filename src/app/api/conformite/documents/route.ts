import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

// GET /api/conformite/documents — Liste des documents de conformité de la pharmacie
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M19_CONFORMITE', 'read')
    if (authResult instanceof Response) return authResult

    const user = authResult
    const { searchParams } = new URL(request.url)

    const type = searchParams.get('type')
    const statut = searchParams.get('statut')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      pharmacieId: user.pharmacieId,
    }

    if (type) {
      where.type = type
    }
    if (statut) {
      where.statut = statut
    }

    const [documents, total] = await Promise.all([
      db.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.document.count({ where }),
    ])

    // Ajouter des informations sur l'expiration
    const now = new Date()
    const documentsAvecStatut = documents.map((doc) => ({
      ...doc,
      expire: doc.dateValidite ? new Date(doc.dateValidite) < now : false,
      expireBientot: doc.dateValidite
        ? new Date(doc.dateValidite) < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) && new Date(doc.dateValidite) >= now
        : false,
    }))

    return NextResponse.json({
      data: documentsAvecStatut,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des documents de conformité.' },
      { status: 500 }
    )
  }
}

// POST /api/conformite/documents — Créer un document de conformité (métadonnées)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M19_CONFORMITE', 'write')
    if (authResult instanceof Response) return authResult

    const user = authResult
    const body = await request.json()

    // Validation des champs requis
    if (!body.titre) {
      return NextResponse.json(
        { error: 'Le champ titre est requis.' },
        { status: 400 }
      )
    }
    if (!body.type) {
      return NextResponse.json(
        { error: 'Le champ type est requis.' },
        { status: 400 }
      )
    }

    // Validation du type de document
    const validTypes = ['REGISTRE_STUPEFIANTS', 'ORDONNANCE', 'DECLARATION_TRIMESTRIELLE', 'RAPPORT_PHARMACOVIGILANCE', 'RAPPORT_DESTRUCTION', 'CERTIFICATION', 'LICENCE', 'AUTRE']
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Type de document invalide. Valeurs autorisées: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const document = await db.document.create({
      data: {
        pharmacieId: user.pharmacieId,
        type: body.type,
        titre: body.titre,
        fichierUrl: body.fichierUrl || null,
        statut: body.statut || 'BROUILLON',
        dateValidite: body.dateValidite ? new Date(body.dateValidite) : null,
        creePar: user.id,
      },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du document:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du document de conformité.' },
      { status: 500 }
    )
  }
}
