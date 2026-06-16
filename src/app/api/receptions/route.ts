import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { validate, receptionSchema } from '@/lib/validations'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_GENERAL)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M03_COMMANDES', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // Récupérer les commandes livrées + les réceptions grossiste
    const commandesWhere: Record<string, unknown> = {
      pharmacieId,
      statut: { in: ['LIVREE', 'LIVREE_PARTIELLEMENT'] },
    }

    if (search) {
      commandesWhere.OR = [
        { nomFournisseur: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (dateDebut || dateFin) {
      commandesWhere.dateLivraisonReelle = {
        ...(dateDebut ? { gte: new Date(dateDebut) } : {}),
        ...(dateFin ? { lte: new Date(dateFin + 'T23:59:59.999Z') } : {}),
      }
    }

    const receptionsWhere: Record<string, unknown> = { pharmacieId }

    if (dateDebut || dateFin) {
      receptionsWhere.dateReception = {
        ...(dateDebut ? { gte: new Date(dateDebut) } : {}),
        ...(dateFin ? { lte: new Date(dateFin + 'T23:59:59.999Z') } : {}),
      }
    }

    const skip = (page - 1) * limit

    // Récupérer les réceptions grossiste
    const [receptionsGrossiste, totalReceptionsGrossiste] = await Promise.all([
      db.receptionGrossiste.findMany({
        where: receptionsWhere,
        include: {
          ordonnanceGrossiste: {
            select: {
              id: true,
              reference: true,
              statut: true,
              montantTotal: true,
              lignes: true,
            },
          },
        },
        orderBy: { dateReception: 'desc' },
        skip,
        take: limit,
      }),
      db.receptionGrossiste.count({ where: receptionsWhere }),
    ])

    // Récupérer les commandes fournisseur livrées
    const commandesLimit = Math.max(limit - receptionsGrossiste.length, 0)
    const [commandesLivrees, totalCommandesLivrees] = await Promise.all([
      db.commandeFournisseur.findMany({
        where: commandesWhere,
        include: {
          fournisseur: { select: { id: true, nom: true } },
          lignes: true,
        },
        orderBy: { dateLivraisonReelle: 'desc' },
        take: commandesLimit > 0 ? commandesLimit : undefined,
      }),
      db.commandeFournisseur.count({ where: commandesWhere }),
    ])

    const total = totalReceptionsGrossiste + totalCommandesLivrees

    return NextResponse.json({
      data: {
        receptionsGrossiste,
        commandesLivrees,
      },
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erreur GET receptions:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des réceptions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_MUTATION)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M03_COMMANDES', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const body = await request.json()
    const validation = validate(receptionSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    // Vérifier que le fournisseur existe
    const fournisseur = await db.fournisseur.findFirst({
      where: { id: data.fournisseurId, pharmacieId },
    })
    if (!fournisseur) {
      return NextResponse.json(
        { error: 'Fournisseur introuvable dans cette pharmacie' },
        { status: 404 }
      )
    }

    // Vérifier la commande si fournie
    if (data.commandeId) {
      const commande = await db.commandeFournisseur.findFirst({
        where: { id: data.commandeId, pharmacieId },
      })
      if (!commande) {
        return NextResponse.json(
          { error: 'Commande introuvable dans cette pharmacie' },
          { status: 404 }
        )
      }
    }

    const reception = await db.receptionGrossiste.create({
      data: {
        pharmacieId,
        ordonnanceGrossisteId: data.commandeId!,
        dateReception: new Date(),
        statut: 'PARTIELLE',
        notes: null,
      },
      include: {
        ordonnanceGrossiste: true,
      },
    })

    return NextResponse.json(reception, { status: 201 })
  } catch (error) {
    console.error('Erreur POST receptions:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la réception' },
      { status: 500 }
    )
  }
}
