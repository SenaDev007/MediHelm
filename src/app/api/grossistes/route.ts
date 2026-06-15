import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

/**
 * GET /api/grossistes
 * List all grossiste entities. Supports ?actif=true|false filter.
 * Requires: M17_GROSSISTES read (GROSSISTE_PARTNER or PLATFORM_ADMIN)
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'read')
  if (auth instanceof Response) return auth

  try {
    const { searchParams } = new URL(request.url)
    const actif = searchParams.get('actif')

    const where: Record<string, unknown> = {}
    if (actif === 'true') where.actif = true
    else if (actif === 'false') where.actif = false

    const grossistes = await db.grossiste.findMany({
      where,
      orderBy: { nom: 'asc' },
      include: {
        _count: {
          select: {
            catalogue: true,
            commandes: true,
          },
        },
      },
    })

    return NextResponse.json(grossistes)
  } catch (error) {
    console.error('Erreur listage grossistes:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des grossistes' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/grossistes
 * Create a new grossiste entity.
 * Requires: M17_GROSSISTES write
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'write')
  if (auth instanceof Response) return auth

  try {
    const body = await request.json()
    const { nom, slug, contact, telephone, email } = body

    if (!nom || !slug) {
      return NextResponse.json(
        { error: 'Nom et slug sont requis' },
        { status: 400 }
      )
    }

    // Check slug uniqueness
    const existing = await db.grossiste.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json(
        { error: 'Un grossiste avec ce slug existe déjà' },
        { status: 409 }
      )
    }

    const grossiste = await db.grossiste.create({
      data: {
        nom,
        slug,
        contact: contact || null,
        telephone: telephone || null,
        email: email || null,
      },
    })

    return NextResponse.json(grossiste, { status: 201 })
  } catch (error) {
    console.error('Erreur création grossiste:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du grossiste' },
      { status: 500 }
    )
  }
}
