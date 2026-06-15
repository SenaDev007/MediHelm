import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const statut = searchParams.get('statut')
    const patientId = searchParams.get('patientId')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (statut) where.statut = statut
    if (patientId) where.patientId = patientId

    const data = await db.ordonnance.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        patient: { select: { id: true, nom: true, prenom: true } },
        lignes: {
          select: {
            id: true,
            dci: true,
            posologie: true,
            quantite: true,
            delivree: true,
            medicamentId: true,
          },
        },
      },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET ordonnances:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des ordonnances' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await db.ordonnance.create({ data: body })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST ordonnances:', error)
    return NextResponse.json(
      { error: "Erreur lors de la création de l'ordonnance" },
      { status: 500 }
    )
  }
}
