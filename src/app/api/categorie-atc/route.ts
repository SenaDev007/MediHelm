import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    const where: Record<string, unknown> = {}
    if (code) where.code = { contains: code, mode: 'insensitive' }

    const data = await db.categorieATC.findMany({
      where,
      include: {
        _count: { select: { medicaments: true } },
        parent: true,
        enfants: true,
      },
      orderBy: { code: 'asc' },
      take: 200,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET categorie-atc:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des catégories ATC' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, nom, niveau, parentId } = body

    if (!code || !nom || niveau === undefined) {
      return NextResponse.json(
        { error: 'code, nom et niveau requis' },
        { status: 400 }
      )
    }

    const data = await db.categorieATC.create({
      data: {
        code,
        nom,
        niveau: parseInt(String(niveau), 10),
        parentId: parentId || null,
      },
      include: {
        parent: true,
        enfants: true,
        _count: { select: { medicaments: true } },
      },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST categorie-atc:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la catégorie ATC' },
      { status: 500 }
    )
  }
}
