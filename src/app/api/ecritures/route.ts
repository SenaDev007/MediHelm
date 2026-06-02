import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const journalId = searchParams.get('journalId')
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (journalId) where.journalId = journalId
    if (dateDebut || dateFin) {
      const dateFilter: Record<string, Date> = {}
      if (dateDebut) dateFilter.gte = new Date(dateDebut)
      if (dateFin) dateFilter.lte = new Date(dateFin)
      where.date = dateFilter
    }

    const data = await db.ecritureComptable.findMany({
      where,
      include: { journal: true },
      orderBy: { date: 'desc' },
      take: 200,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET ecritures:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des écritures' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pharmacieId, journalId, date, numeroPiece, compte, libelle, debit, credit, lettrage } = body

    if (!pharmacieId || !journalId || !compte || !libelle) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const data = await db.ecritureComptable.create({
      data: {
        pharmacieId,
        journalId,
        date: date ? new Date(date) : new Date(),
        numeroPiece: numeroPiece || `ECR-${Date.now()}`,
        compte,
        libelle,
        debit: debit || 0,
        credit: credit || 0,
        lettrage: lettrage || null,
      },
      include: { journal: true },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST ecriture:', error)
    return NextResponse.json({ error: "Erreur lors de la création de l'écriture" }, { status: 500 })
  }
}
