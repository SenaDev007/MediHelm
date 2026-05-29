import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const statut = searchParams.get('statut')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (statut) where.statut = statut

    const data = await db.commandeFournisseur.findMany({
      where,
      include: {
        fournisseur: true,
        lignes: { include: { medicament: true } },
        receptions: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET commandes:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des commandes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lignes, ...commandeData } = body

    const data = await db.commandeFournisseur.create({
      data: {
        ...commandeData,
        lignes: lignes ? { create: lignes } : undefined,
      },
      include: { lignes: true },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST commandes:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la commande' }, { status: 500 })
  }
}
