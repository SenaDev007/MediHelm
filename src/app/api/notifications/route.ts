import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId

    const data = await db.notification.findMany({
      where,
      include: {
        patient: { select: { id: true, nom: true, prenom: true } },
        utilisateur: { select: { id: true, nom: true, prenom: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET notifications:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des notifications' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const data = await db.notification.create({
      data: {
        pharmacieId: body.pharmacieId,
        utilisateurId: body.utilisateurId || null,
        patientId: body.patientId || null,
        titre: body.titre,
        message: body.message,
        canal: body.canal,
        lu: false,
        typeReference: body.typeReference || null,
        referenceId: body.referenceId || null,
      },
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST notifications:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la notification' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.id) {
      // Mark single notification
      const data = await db.notification.update({
        where: { id: body.id },
        data: { lu: body.lu },
      })
      return NextResponse.json(data)
    }

    if (body.markAll && body.pharmacieId) {
      // Mark all as read for pharmacie
      const data = await db.notification.updateMany({
        where: { pharmacieId: body.pharmacieId, lu: false },
        data: { lu: true },
      })
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  } catch (error) {
    console.error('Erreur PATCH notifications:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour de la notification' }, { status: 500 })
  }
}
