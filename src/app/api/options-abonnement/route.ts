import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const abonnementId = searchParams.get('abonnementId')

    const where: Record<string, unknown> = {}
    if (abonnementId) where.abonnementId = abonnementId

    const data = await db.optionAbonnement.findMany({
      where,
      include: { abonnement: true },
      orderBy: { debut: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET options-abonnement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des options d\'abonnement' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { abonnementId, code, prix, debut, fin } = body

    if (!abonnementId || !code || prix === undefined || !debut) {
      return NextResponse.json(
        { error: 'abonnementId, code, prix et debut requis' },
        { status: 400 }
      )
    }

    const data = await db.optionAbonnement.create({
      data: {
        abonnementId,
        code,
        prix: parseFloat(String(prix)),
        debut: new Date(debut),
        fin: fin ? new Date(fin) : null,
      },
      include: { abonnement: true },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST options-abonnement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'option d\'abonnement' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'id requis (query param)' },
        { status: 400 }
      )
    }

    const deleted = await db.optionAbonnement.delete({
      where: { id },
    })
    return NextResponse.json(deleted)
  } catch (error) {
    console.error('Erreur DELETE options-abonnement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'option d\'abonnement' },
      { status: 500 }
    )
  }
}
