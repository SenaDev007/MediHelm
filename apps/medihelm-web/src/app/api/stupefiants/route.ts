import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { validate, stupefiantSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_GENERAL)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M19_CONFORMITE', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const where: Record<string, unknown> = {
      pharmacieId,
      type: 'REGISTRE_STUPEFIANTS',
    }

    if (search) {
      where.OR = [
        { titre: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (dateDebut || dateFin) {
      where.createdAt = {
        ...(dateDebut ? { gte: new Date(dateDebut) } : {}),
        ...(dateFin ? { lte: new Date(dateFin + 'T23:59:59.999Z') } : {}),
      }
    }

    const skip = (page - 1) * limit

    const [documents, total] = await Promise.all([
      db.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.document.count({ where }),
    ])

    // Récupérer les données de ventes liées aux stupéfiants (médicaments estStupefiant=true)
    const ventesStup = await db.vente.findMany({
      where: {
        pharmacieId,
        lignes: {
          some: {
            medicament: {
              estStupefiant: true,
            },
          },
        },
        createdAt: {
          ...(dateDebut ? { gte: new Date(dateDebut) } : {}),
          ...(dateFin ? { lte: new Date(dateFin + 'T23:59:59.999Z') } : {}),
        },
      },
      include: {
        patient: { select: { id: true, nom: true, prenom: true } },
        lignes: {
          where: {
            medicament: { estStupefiant: true },
          },
          include: {
            medicament: { select: { id: true, nomCommercial: true, dci: true, estStupefiant: true } },
          },
        },
        ordonnance: {
          select: {
            id: true,
            prescripteur: true,
            dateOrdonnance: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      data: {
        registres: documents,
        ventesStup,
      },
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erreur GET stupefiants:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du registre des stupéfiants' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_MUTATION)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M19_CONFORMITE', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const body = await request.json()
    const validation = validate(stupefiantSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    const document = await db.document.create({
      data: {
        pharmacieId,
        type: 'REGISTRE_STUPEFIANTS',
        titre: `${data.type} - ${data.medicamentId} - ${data.quantite}`,
        fichierUrl: null,
        statut: 'BROUILLON',
        dateValidite: null,
        creePar: user.id,
      },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('Erreur POST stupefiants:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout de l\'entrée stupéfiant' },
      { status: 500 }
    )
  }
}
