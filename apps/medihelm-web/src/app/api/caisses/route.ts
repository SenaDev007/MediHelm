import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M02_POS', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId

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
    const authResult = await requireAuth(request, 'M02_POS', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const body = await request.json()
    const { nom } = body

    if (!nom) {
      return NextResponse.json({ error: 'nom est requis' }, { status: 400 })
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
