import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    if (!patientId) {
      return NextResponse.json({ error: 'patientId requis' }, { status: 400 })
    }

    const patient = await db.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        nom: true,
        prenom: true,
        estFidele: true,
        pointsFidelite: true,
        transactionsFidelite: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient non trouvé' }, { status: 404 })
    }

    return NextResponse.json({
      points: patient.pointsFidelite,
      estFidele: patient.estFidele,
      transactions: patient.transactionsFidelite,
      prochainPalier: Math.ceil((patient.pointsFidelite + 1) / 200) * 200,
    })
  } catch (error) {
    console.error('Erreur GET fidélité:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { patientId, type, points, description, referenceId } = body

    if (!patientId || !type || points === undefined) {
      return NextResponse.json({ error: 'patientId, type et points requis' }, { status: 400 })
    }

    const transaction = await db.transactionFidelite.create({
      data: { patientId, type, points, description: description || '', referenceId },
    })

    if (type === 'EARN') {
      await db.patient.update({
        where: { id: patientId },
        data: { pointsFidelite: { increment: points } },
      })
    } else if (type === 'SPEND') {
      await db.patient.update({
        where: { id: patientId },
        data: { pointsFidelite: { decrement: Math.abs(points) } },
      })
    }

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Erreur POST fidélité:', error)
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
  }
}
