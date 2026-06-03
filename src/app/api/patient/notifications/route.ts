import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    const where: Record<string, unknown> = { canal: 'IN_APP' }
    if (patientId) where.patientId = patientId

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Erreur GET notifications patient:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { patientId, pharmacieId, titre, message, typeReference, referenceId } = body

    if (!titre || !message) {
      return NextResponse.json({ error: 'titre et message requis' }, { status: 400 })
    }

    const notification = await db.notification.create({
      data: {
        pharmacieId: pharmacieId || 'default',
        patientId: patientId || null,
        titre,
        message,
        canal: 'IN_APP',
        typeReference: typeReference || null,
        referenceId: referenceId || null,
      },
    })

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error('Erreur POST notification patient:', error)
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, lu } = body

    if (!id) {
      return NextResponse.json({ error: 'id requis' }, { status: 400 })
    }

    const notification = await db.notification.update({
      where: { id },
      data: { lu: lu !== undefined ? lu : true },
    })

    return NextResponse.json(notification)
  } catch (error) {
    console.error('Erreur PATCH notification patient:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    if (!patientId) {
      return NextResponse.json({ error: 'patientId requis' }, { status: 400 })
    }

    await db.notification.updateMany({
      where: { patientId, lu: false },
      data: { lu: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur PUT mark all read:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}
