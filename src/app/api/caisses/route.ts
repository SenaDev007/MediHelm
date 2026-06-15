import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    const caisses = await db.caisse.findMany({
      where: { pharmacieId },
      include: {
        sessions: {
          where: { statut: 'OUVERTE' },
          take: 1,
          orderBy: { ouvertLe: 'desc' },
        },
      },
      orderBy: { nom: 'asc' },
    })

    return NextResponse.json(caisses)
  } catch (error) {
    console.error('Erreur GET caisses:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des caisses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pharmacieId, nom } = body

    if (!pharmacieId || !nom) {
      return NextResponse.json({ error: 'pharmacieId et nom sont requis' }, { status: 400 })
    }

    const caisse = await db.caisse.create({
      data: { pharmacieId, nom },
    })

    return NextResponse.json(caisse, { status: 201 })
  } catch (error) {
    console.error('Erreur POST caisses:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la caisse' }, { status: 500 })
  }
}
