import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const employeId = searchParams.get('employeId')
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (employeId) where.employeId = employeId
    if (dateDebut || dateFin) {
      const dateFilter: Record<string, Date> = {}
      if (dateDebut) dateFilter.gte = new Date(dateDebut)
      if (dateFin) dateFilter.lte = new Date(dateFin)
      where.date = dateFilter
    }

    const data = await db.planningEmploye.findMany({
      where,
      include: { employe: { select: { id: true, nom: true, prenom: true, poste: true } } },
      orderBy: { date: 'asc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET plannings:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des plannings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pharmacieId, employeId, date, heureDebut, heureFin, poste } = body

    if (!pharmacieId || !employeId || !date || !heureDebut || !heureFin) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const data = await db.planningEmploye.create({
      data: {
        pharmacieId,
        employeId,
        date: new Date(date),
        heureDebut: new Date(heureDebut),
        heureFin: new Date(heureFin),
        poste: poste || 'PHARMACIEN',
      },
      include: { employe: { select: { id: true, nom: true, prenom: true, poste: true } } },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST planning:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du planning' }, { status: 500 })
  }
}
