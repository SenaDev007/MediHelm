import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const employeId = searchParams.get('employeId')
    const statut = searchParams.get('statut')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (employeId) where.employeId = employeId
    if (statut) where.statut = statut

    const data = await db.conge.findMany({
      where,
      include: { employe: { select: { id: true, nom: true, prenom: true, poste: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET congés:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des congés' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pharmacieId, employeId, typeConge, dateDebut, dateFin, motif } = body

    if (!pharmacieId || !employeId || !typeConge || !dateDebut || !dateFin) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const data = await db.conge.create({
      data: {
        pharmacieId,
        employeId,
        typeConge,
        dateDebut: new Date(dateDebut),
        dateFin: new Date(dateFin),
        motif: motif || null,
        statut: 'DEMANDE',
      },
      include: { employe: { select: { id: true, nom: true, prenom: true } } },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST congé:', error)
    return NextResponse.json({ error: 'Erreur lors de la demande de congé' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, statut, approuvePar } = body

    if (!id || !statut) {
      return NextResponse.json({ error: 'id et statut requis' }, { status: 400 })
    }

    const data = await db.conge.update({
      where: { id },
      data: {
        statut,
        approuvePar: approuvePar || null,
      },
      include: { employe: { select: { id: true, nom: true, prenom: true } } },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur PATCH congé:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du congé' }, { status: 500 })
  }
}
