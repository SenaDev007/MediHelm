import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/alertes-operationnelles — Liste des alertes
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M12_COMMUNICATION', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20')
    const type = searchParams.get('type')
    const lue = searchParams.get('lue')

    const where: Record<string, unknown> = {
      pharmacieId: user.pharmacieId,
    }

    if (type) where.type = type
    if (lue !== null && lue !== undefined && lue !== '') {
      where.lue = lue === 'true'
    }

    const [data, total] = await Promise.all([
      db.alerteOperationnelle.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.alerteOperationnelle.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Erreur GET alertes-operationnelles:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des alertes opérationnelles' },
      { status: 500 }
    )
  }
}

// POST /api/alertes-operationnelles — Créer une alerte
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M12_COMMUNICATION', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()

    if (!body.titre || !body.message) {
      return NextResponse.json(
        { error: 'Le titre et le message sont requis' },
        { status: 400 }
      )
    }

    const data = await db.alerteOperationnelle.create({
      data: {
        pharmacieId: user.pharmacieId,
        type: body.type || 'INFO',
        titre: body.titre,
        message: body.message,
        lue: false,
      },
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST alertes-operationnelles:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'alerte opérationnelle' },
      { status: 500 }
    )
  }
}

// PATCH /api/alertes-operationnelles — Marquer comme lue / résolue
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M12_COMMUNICATION', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()

    if (body.ids && Array.isArray(body.ids)) {
      // Marquer plusieurs alertes comme lues
      await db.alerteOperationnelle.updateMany({
        where: {
          id: { in: body.ids },
          pharmacieId: user.pharmacieId,
        },
        data: { lue: true },
      })
      return NextResponse.json({ message: 'Alertes marquées comme lues' })
    }

    if (body.id) {
      const data = await db.alerteOperationnelle.update({
        where: { id: body.id },
        data: { lue: body.lue !== undefined ? body.lue : true },
      })
      return NextResponse.json(data)
    }

    return NextResponse.json(
      { error: 'ID(s) d\'alerte requis' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Erreur PATCH alertes-operationnelles:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'alerte' },
      { status: 500 }
    )
  }
}
