import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId

    const data = await db.tiersPayant.findMany({
      where,
      include: {
        patient: { select: { id: true, nom: true, prenom: true } },
        organisme: { select: { id: true, nom: true, code: true, tauxRemboursement: true } },
        _count: { select: { remboursements: true } },
      },
      orderBy: { patient: { nom: 'asc' } },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET tiers-payants:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des tiers payants' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await db.tiersPayant.create({ data: body })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST tiers-payants:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du tiers payant' }, { status: 500 })
  }
}
