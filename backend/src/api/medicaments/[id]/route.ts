import { db } from '@backend/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@backend/lib/api-auth'
import { validate, medicamentUpdateSchema } from '@backend/lib/validations'
import { rateLimit, RATE_LIMITS } from '@backend/lib/rate-limit'

// GET /api/medicaments/[id] — Détail d'un médicament (avec lots et alertes)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_GENERAL)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M01_STOCK', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { id } = await params
    const medicament = await db.medicament.findFirst({
      where: {
        id,
        ...(authResult.roleName === 'PLATFORM_ADMIN' ? {} : { pharmacieId: user.pharmacieId }),
      },
      include: {
        lots: {
          orderBy: [{ dateExpiration: 'asc' }],
        },
        alertesStock: {
          where: { traitee: false },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!medicament) {
      return NextResponse.json({ error: 'Médicament introuvable' }, { status: 404 })
    }

    return NextResponse.json(medicament)
  } catch (error) {
    console.error('Erreur GET medicament:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération du médicament' }, { status: 500 })
  }
}

// PATCH /api/medicaments/[id] — Mise à jour d'un médicament
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_MUTATION)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M01_STOCK', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { id } = await params

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
    }

    const validation = validate(medicamentUpdateSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    // Isolation multi-tenant
    const existant = await db.medicament.findFirst({
      where: {
        id,
        ...(authResult.roleName === 'PLATFORM_ADMIN' ? {} : { pharmacieId: user.pharmacieId }),
      },
      select: { id: true, nomCommercial: true, dci: true, prixPublic: true },
    })
    if (!existant) {
      return NextResponse.json({ error: 'Médicament introuvable dans votre pharmacie' }, { status: 404 })
    }

    const medicament = await db.medicament.update({
      where: { id },
      data,
      include: { lots: { orderBy: { dateExpiration: 'asc' } } },
    })

    await db.auditLog.create({
      data: {
        userId: user.id,
        pharmacieId: medicament.pharmacieId,
        action: 'UPDATE',
        entity: 'Medicament',
        entityId: id,
        details: `Mise à jour de ${medicament.nomCommercial || medicament.dci}: ${Object.keys(data).join(', ')}`,
      },
    })

    return NextResponse.json(medicament)
  } catch (error) {
    console.error('Erreur PATCH medicament:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du médicament' }, { status: 500 })
  }
}

// DELETE /api/medicaments/[id] — Désactivation (soft delete)
// Un médicament ayant de l'historique (ventes, mouvements) n'est jamais
// supprimé physiquement: il est désactivé (actif=false) pour préserver
// l'intégrité référentielle et la traçabilité réglementaire.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_MUTATION)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M01_STOCK', 'delete')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { id } = await params

    const existant = await db.medicament.findFirst({
      where: {
        id,
        ...(authResult.roleName === 'PLATFORM_ADMIN' ? {} : { pharmacieId: user.pharmacieId }),
      },
      select: { id: true, nomCommercial: true, dci: true },
    })
    if (!existant) {
      return NextResponse.json({ error: 'Médicament introuvable dans votre pharmacie' }, { status: 404 })
    }

    const medicament = await db.medicament.update({
      where: { id },
      data: { actif: false },
    })

    await db.auditLog.create({
      data: {
        userId: user.id,
        pharmacieId: medicament.pharmacieId,
        action: 'DEACTIVATE',
        entity: 'Medicament',
        entityId: id,
        details: `Désactivation de ${existant.nomCommercial || existant.dci}`,
      },
    })

    return NextResponse.json({ message: 'Médicament désactivé', id, actif: false })
  } catch (error) {
    console.error('Erreur DELETE medicament:', error)
    return NextResponse.json({ error: 'Erreur lors de la désactivation du médicament' }, { status: 500 })
  }
}
