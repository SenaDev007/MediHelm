import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const statut = searchParams.get('statut')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (statut) where.statut = statut

    const data = await db.vente.findMany({
      where,
      include: {
        lignes: { include: { medicament: true } },
        paiements: true,
        patient: true,
        utilisateur: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET ventes:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des ventes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lignes, paiements, ...venteData } = body

    const data = await db.vente.create({
      data: {
        ...venteData,
        lignes: lignes ? { create: lignes } : undefined,
        paiements: paiements ? { create: paiements } : undefined,
      },
      include: { lignes: true, paiements: true },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST ventes:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la vente' }, { status: 500 })
  }
}
