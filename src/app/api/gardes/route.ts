import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const type = searchParams.get('type')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (type) where.type = type

    const data = await db.planningGarde.findMany({
      where,
      include: {
        pharmacien: { select: { id: true, nom: true, prenom: true } },
        rapportGarde: true,
      },
      orderBy: { date: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET gardes:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des gardes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pharmacieId, date, type, heureDebut, heureFin, pharmacienId } = body

    if (!pharmacieId || !date || !type) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const data = await db.planningGarde.create({
      data: {
        pharmacieId,
        date: new Date(date),
        type,
        heureDebut: heureDebut ? new Date(heureDebut) : new Date(date + 'T20:00:00'),
        heureFin: heureFin ? new Date(heureFin) : new Date(date + 'T08:00:00'),
        pharmacienId: pharmacienId || null,
      },
      include: {
        pharmacien: { select: { id: true, nom: true, prenom: true } },
      },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST garde:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du planning de garde' }, { status: 500 })
  }
}
