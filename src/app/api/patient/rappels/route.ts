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
    const { comptePatientId, medicament, heure, frequence } = body

    if (!comptePatientId || !medicament || !heure || !frequence) {
      return NextResponse.json({ error: 'comptePatientId, medicament, heure et frequence requis' }, { status: 400 })
    }

    const rappel = await db.rappelPatient.create({
      data: { comptePatientId, medicament, heure, frequence, actif: true },
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
    const { id, actif } = body

    if (!id) {
      return NextResponse.json({ error: 'id requis' }, { status: 400 })
    }

    const rappel = await db.rappelPatient.update({
      where: { id },
      data: { actif: actif !== undefined ? actif : true },
    })

    return NextResponse.json(rappel)
  } catch (error) {
    console.error('Erreur PATCH rappel patient:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}
