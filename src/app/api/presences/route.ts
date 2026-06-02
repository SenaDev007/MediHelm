import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const employeId = searchParams.get('employeId')
    const date = searchParams.get('date')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (employeId) where.employeId = employeId
    if (date) where.date = { gte: new Date(date + 'T00:00:00'), lt: new Date(date + 'T23:59:59') }

    const data = await db.presence.findMany({
      where,
      include: { employe: { select: { id: true, nom: true, prenom: true, poste: true } } },
      orderBy: { date: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET presences:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des présences' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pharmacieId, employeId, date, heureArrivee, heureDepart, statut } = body

    if (!pharmacieId || !employeId || !date) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const data = await db.presence.create({
      data: {
        pharmacieId,
        employeId,
        date: new Date(date),
        heureArrivee: heureArrivee ? new Date(heureArrivee) : new Date(),
        heureDepart: heureDepart ? new Date(heureDepart) : null,
        statut: statut || 'PRESENT',
      },
      include: { employe: { select: { id: true, nom: true, prenom: true } } },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST presence:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'enregistrement de la présence' }, { status: 500 })
  }
}
