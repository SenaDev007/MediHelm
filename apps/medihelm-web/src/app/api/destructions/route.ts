import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { validate, destructionSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_GENERAL)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M11_RETOURS', 'read')
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
      type: 'DESTRUCTION',
    }

    if (dateDebut || dateFin) {
      where.createdAt = {
        ...(dateDebut ? { gte: new Date(dateDebut) } : {}),
        ...(dateFin ? { lte: new Date(dateFin + 'T23:59:59.999Z') } : {}),
      }
    }

    if (search) {
      where.OR = [
        { motif: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { medicament: { nomCommercial: { contains: search, mode: 'insensitive' } } },
        { medicament: { dci: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const skip = (page - 1) * limit

    const [destructions, total] = await Promise.all([
      db.mouvementStock.findMany({
        where,
        include: {
          medicament: { select: { id: true, nomCommercial: true, dci: true } },
          lot: { select: { id: true, numeroLot: true, dateExpiration: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.mouvementStock.count({ where }),
    ])

    return NextResponse.json({
      data: destructions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erreur GET destructions:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des destructions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_MUTATION)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M11_RETOURS', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const body = await request.json()
    const validation = validate(destructionSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    // Process each ligne
    const results: any[] = []
    for (const ligne of data.lignes) {
      // Vérifier que le médicament appartient à la pharmacie
      const medicament = await db.medicament.findFirst({
        where: { id: ligne.medicamentId, pharmacieId },
      })

      if (!medicament) {
        return NextResponse.json(
          { error: `Médicament ${ligne.medicamentId} introuvable dans cette pharmacie` },
          { status: 404 }
        )
      }

      const destruction = await db.mouvementStock.create({
        data: {
          pharmacieId,
          medicamentId: ligne.medicamentId,
          lotId: ligne.lotId || null,
          type: 'DESTRUCTION',
          quantite: ligne.quantite,
          prixUnitaire: null,
          motif: data.motif,
          reference: data.note || null,
          utilisateurId: user.id,
        },
        include: {
          medicament: { select: { id: true, nomCommercial: true, dci: true } },
          lot: { select: { id: true, numeroLot: true, dateExpiration: true } },
        },
      })

      // Décrémenter le stock du lot si applicable
      if (ligne.lotId) {
        await db.lot.update({
          where: { id: ligne.lotId },
          data: { quantite: { decrement: ligne.quantite } },
        })
      }

      results.push(destruction)
    }

    return NextResponse.json(results, { status: 201 })
  } catch (error) {
    console.error('Erreur POST destructions:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement de la destruction' },
      { status: 500 }
    )
  }
}
