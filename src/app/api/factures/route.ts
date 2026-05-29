import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const abonnementId = searchParams.get('abonnementId')
    const statut = searchParams.get('statut')

    const where: Record<string, unknown> = {}
    if (abonnementId) where.abonnementId = abonnementId
    if (statut) where.statut = statut

    const data = await db.facture.findMany({
      where,
      include: { abonnement: { include: { pharmacie: true } } },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET factures:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await db.facture.create({ data: body })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST facture:', error)
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
  }
}
