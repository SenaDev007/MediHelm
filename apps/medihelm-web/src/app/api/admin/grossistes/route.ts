import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M17_GROSSISTES', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { contact: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [grossistes, total] = await Promise.all([
      db.grossiste.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { catalogue: true, commandes: true } },
        },
      }),
      db.grossiste.count({ where }),
    ])

    return NextResponse.json({
      data: grossistes.map(g => ({
        id: g.id,
        nom: g.nom,
        slug: g.slug,
        contact: g.contact,
        telephone: g.telephone,
        email: g.email,
        actif: g.actif,
        nbProduits: g._count.catalogue,
        nbCommandes: g._count.commandes,
        createdAt: g.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur GET admin/grossistes:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des grossistes' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M17_GROSSISTES', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()
    const { id, action } = body

    if (!id || !action) {
      return NextResponse.json({ error: 'ID et action requis' }, { status: 400 })
    }

    const grossiste = await db.grossiste.findUnique({ where: { id } })
    if (!grossiste) {
      return NextResponse.json({ error: 'Grossiste introuvable' }, { status: 404 })
    }

    switch (action) {
      case 'suspend':
        await db.grossiste.update({ where: { id }, data: { actif: false } })
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: 'SUSPEND_GROSSISTE',
            entity: 'Grossiste',
            entityId: id,
            details: `Grossiste ${grossiste.nom} désactivé`,
          },
        })
        return NextResponse.json({ success: true, message: 'Grossiste désactivé' })

      case 'reactivate':
        await db.grossiste.update({ where: { id }, data: { actif: true } })
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: 'REACTIVATE_GROSSISTE',
            entity: 'Grossiste',
            entityId: id,
            details: `Grossiste ${grossiste.nom} réactivé`,
          },
        })
        return NextResponse.json({ success: true, message: 'Grossiste réactivé' })

      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    }
  } catch (error) {
    console.error('Erreur PATCH admin/grossistes:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'action sur le grossiste' }, { status: 500 })
  }
}
