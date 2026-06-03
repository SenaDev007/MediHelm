import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const search = searchParams.get('search')
    const type = searchParams.get('type')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (type === 'grossiste') where.estGrossisteAPI = true
    if (type === 'regular') where.estGrossisteAPI = false
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ]
    }

    const data = await db.fournisseur.findMany({
      where,
      include: {
        conditions: { include: { medicament: { select: { nomCommercial: true } } } },
        evaluations: { orderBy: { dateEvaluation: 'desc' }, take: 5 },
        _count: { select: { commandes: true } },
      },
      orderBy: { nom: 'asc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET fournisseurs:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des fournisseurs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await db.fournisseur.create({ data: body })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST fournisseurs:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du fournisseur' }, { status: 500 })
  }
}
