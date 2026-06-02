import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId

    const data = await db.coffreNumerique.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET coffre-numerique:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des coffres numériques' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pharmacieId, nom, description } = body

    if (!pharmacieId || !nom) {
      return NextResponse.json(
        { error: 'pharmacieId et nom requis' },
        { status: 400 }
      )
    }

    const data = await db.coffreNumerique.create({
      data: {
        pharmacieId,
        nom,
        description: description || null,
      },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST coffre-numerique:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du coffre numérique' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'id requis (query param)' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.nom !== undefined) updateData.nom = body.nom
    if (body.description !== undefined) updateData.description = body.description

    const updated = await db.coffreNumerique.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur PATCH coffre-numerique:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du coffre numérique' },
      { status: 500 }
    )
  }
}
