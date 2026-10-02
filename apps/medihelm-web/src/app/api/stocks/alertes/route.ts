import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M01_STOCK', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const traitee = searchParams.get('traitee')

    const where: Record<string, unknown> = { pharmacieId }
    if (type) where.type = type
    if (traitee !== null && traitee !== undefined) {
      where.traitee = traitee === 'true'
    }

    const data = await db.alerteStock.findMany({
      where,
      include: {
        medicament: { select: { nomCommercial: true, dci: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET alertes stock:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des alertes' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M01_STOCK', 'write')
    if (authResult instanceof Response) return authResult

    const body = await request.json()
    const { id, traiteePar } = body

    if (!id) {
      return NextResponse.json({ error: 'ID alerte requis' }, { status: 400 })
    }

    const data = await db.alerteStock.update({
      where: { id },
      data: {
        traitee: true,
        traiteePar: traiteePar || null,
        traiteeLe: new Date(),
      },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur PATCH alertes stock:', error)
    return NextResponse.json({ error: 'Erreur lors du traitement de l\'alerte' }, { status: 500 })
  }
}
