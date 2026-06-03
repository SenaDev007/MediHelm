import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const comptePatientId = searchParams.get('comptePatientId')

    if (!comptePatientId) {
      return NextResponse.json({ error: 'comptePatientId requis' }, { status: 400 })
    }

    const rappels = await db.rappelPatient.findMany({
      where: { comptePatientId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(rappels)
  } catch (error) {
    console.error('Erreur GET rappels patient:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { comptePatientId, medicament, posologie, heure, frequence } = body

    if (!comptePatientId || !medicament || !heure || !frequence) {
      return NextResponse.json({ error: 'comptePatientId, medicament, heure et frequence requis' }, { status: 400 })
    }

    const rappel = await db.rappelPatient.create({
      data: { comptePatientId, medicament, posologie: posologie || '', heure, frequence, actif: true },
    })

    return NextResponse.json(rappel, { status: 201 })
  } catch (error) {
    console.error('Erreur POST rappel patient:', error)
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, actif, medicament, posologie, heure, frequence } = body

    if (!id) {
      return NextResponse.json({ error: 'id requis' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (actif !== undefined) data.actif = actif
    if (medicament !== undefined) data.medicament = medicament
    if (posologie !== undefined) data.posologie = posologie
    if (heure !== undefined) data.heure = heure
    if (frequence !== undefined) data.frequence = frequence

    const rappel = await db.rappelPatient.update({
      where: { id },
      data,
    })

    return NextResponse.json(rappel)
  } catch (error) {
    console.error('Erreur PATCH rappel patient:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'id requis' }, { status: 400 })
    }

    await db.rappelPatient.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE rappel patient:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
