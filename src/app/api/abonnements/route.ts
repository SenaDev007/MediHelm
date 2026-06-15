import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/abonnements — Abonnement actuel de la pharmacie
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M14_DASHBOARD', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const abonnement = await db.abonnement.findFirst({
      where: {
        pharmacieId: user.pharmacieId,
        statut: 'ACTIF',
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!abonnement) {
      // Retourner le dernier abonnement même s'il n'est pas actif
      const lastAbonnement = await db.abonnement.findFirst({
        where: { pharmacieId: user.pharmacieId },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(lastAbonnement || null)
    }

    return NextResponse.json(abonnement)
  } catch (error) {
    console.error('Erreur GET abonnements:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'abonnement' },
      { status: 500 }
    )
  }
}

// POST /api/abonnements — Créer / mettre à jour un abonnement
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M14_DASHBOARD', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()

    if (!body.plan || !body.montant) {
      return NextResponse.json(
        { error: 'Le plan et le montant sont requis' },
        { status: 400 }
      )
    }

    // Désactiver l'abonnement actuel s'il existe
    await db.abonnement.updateMany({
      where: {
        pharmacieId: user.pharmacieId,
        statut: 'ACTIF',
      },
      data: { statut: 'EXPIRE' },
    })

    const data = await db.abonnement.create({
      data: {
        pharmacieId: user.pharmacieId,
        plan: body.plan,
        type: body.type || 'MENSUEL',
        statut: 'ACTIF',
        montant: body.montant,
        dateDebut: body.dateDebut ? new Date(body.dateDebut) : new Date(),
        dateFin: body.dateFin ? new Date(body.dateFin) : new Date(new Date().setMonth(new Date().getMonth() + 1)),
        methodePaiement: body.methodePaiement || null,
      },
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST abonnements:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'abonnement' },
      { status: 500 }
    )
  }
}
