import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M01_STOCK', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const medicamentId = searchParams.get('medicamentId')

    const where: Record<string, unknown> = { pharmacieId }
    if (medicamentId) where.medicamentId = medicamentId

    const data = await db.lot.findMany({
      where,
      orderBy: { dateExpiration: 'asc' },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET lots:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des lots' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M01_STOCK', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const body = await request.json()

    // Validate required fields
    const { medicamentId, numeroLot, quantite, quantiteInitiale, prixAchat, dateExpiration } = body
    if (!medicamentId || !numeroLot || quantite === undefined || !quantiteInitiale || prixAchat === undefined || !dateExpiration) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const data = await db.lot.create({
      data: {
        pharmacieId,
        medicamentId,
        numeroLot,
        quantite: Number(quantite),
        quantiteInitiale: Number(quantiteInitiale),
        prixAchat: Number(prixAchat),
        dateExpiration: new Date(dateExpiration),
        dateReception: body.dateReception ? new Date(body.dateReception) : undefined,
      },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST lots:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du lot' }, { status: 500 })
  }
}
