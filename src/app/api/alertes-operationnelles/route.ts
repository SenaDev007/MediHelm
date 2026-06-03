import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { NiveauAlerte } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const niveau = searchParams.get('niveau')
    const estLu = searchParams.get('estLu')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (niveau && Object.values(NiveauAlerte).includes(niveau as NiveauAlerte)) {
      where.niveau = niveau
    }
    if (estLu !== null && estLu !== undefined && estLu !== '') {
      where.estLu = estLu === 'true'
    }

    const data = await db.alerteOperationnelle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET alertes-operationnelles:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des alertes opérationnelles' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pharmacieId, type, niveau, message, actionUrl } = body

    if (!pharmacieId || !type || !niveau || !message) {
      return NextResponse.json(
        { error: 'pharmacieId, type, niveau et message requis' },
        { status: 400 }
      )
    }

    const data = await db.alerteOperationnelle.create({
      data: {
        pharmacieId,
        type,
        niveau,
        message,
        actionUrl: actionUrl || null,
      },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST alertes-operationnelles:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'alerte opérationnelle' },
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

    const updated = await db.alerteOperationnelle.update({
      where: { id },
      data: { estLu: true },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur PATCH alertes-operationnelles:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'alerte opérationnelle' },
      { status: 500 }
    )
  }
}
