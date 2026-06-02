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

    const data = await db.ordonnance.findMany({
      where,
      include: { patient: true, lignes: { include: { medicament: true } }, validations: { include: { utilisateur: { select: { id: true, nom: true, prenom: true } } }, orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET ordonnances:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des ordonnances' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lignes, ...ordonnanceData } = body

    const data = await db.ordonnance.create({
      data: {
        ...ordonnanceData,
        lignes: lignes ? { create: lignes } : undefined,
      },
      include: { lignes: true },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST ordonnances:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de l\'ordonnance' }, { status: 500 })
  }
}
