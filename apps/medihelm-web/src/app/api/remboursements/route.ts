import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { validate, remboursementSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M10_REMBOURSABLES', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut')
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // Récupérer les paiements par assurance pour cette pharmacie
    const where: Record<string, unknown> = {
      mode: 'ASSURANCE',
      vente: { pharmacieId },
    }

    if (statut) {
      where.statut = statut
    }

    if (dateDebut || dateFin) {
      where.createdAt = {
        ...(dateDebut ? { gte: new Date(dateDebut) } : {}),
        ...(dateFin ? { lte: new Date(dateFin + 'T23:59:59.999Z') } : {}),
      }
    }

    const skip = (page - 1) * limit

    const [remboursements, total] = await Promise.all([
      db.paiement.findMany({
        where,
        include: {
          vente: {
            select: {
              id: true,
              reference: true,
              montantTotal: true,
              montantAssur: true,
              patient: {
                select: {
                  id: true,
                  nom: true,
                  prenom: true,
                  assurance: true,
                  numeroAssurance: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.paiement.count({ where }),
    ])

    return NextResponse.json({
      data: remboursements,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erreur GET remboursements:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des remboursements' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M10_REMBOURSABLES', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()
    const validation = validate(remboursementSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    // Vérifier que la vente appartient à la pharmacie de l'utilisateur
    const vente = await db.vente.findFirst({
      where: { id: data.venteId, pharmacieId: user.pharmacieId },
    })

    if (!vente) {
      return NextResponse.json(
        { error: 'Vente introuvable dans cette pharmacie' },
        { status: 404 }
      )
    }

    const paiement = await db.paiement.create({
      data: {
        venteId: data.venteId,
        montant: data.montant,
        mode: 'ASSURANCE',
        reference: data.reference || null,
        statut: 'EN_ATTENTE',
      },
      include: {
        vente: {
          select: {
            id: true,
            reference: true,
            montantTotal: true,
            montantAssur: true,
          },
        },
      },
    })

    return NextResponse.json(paiement, { status: 201 })
  } catch (error) {
    console.error('Erreur POST remboursements:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la demande de remboursement' },
      { status: 500 }
    )
  }
}
