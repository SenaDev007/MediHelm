import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { validate, notificationBroadcastSchema, notificationMarkReadSchema } from '@/lib/validations'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// GET /api/notifications — Liste des notifications de l'utilisateur courant
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M14_DASHBOARD', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20')
    const lue = searchParams.get('lue')
    const type = searchParams.get('type')

    const where: Record<string, unknown> = {
      userId: user.id,
    }

    if (lue !== null && lue !== undefined && lue !== '') {
      where.lue = lue === 'true'
    }
    if (type) where.type = type

    const [data, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.notification.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Erreur GET notifications:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des notifications' },
      { status: 500 }
    )
  }
}

// PATCH /api/notifications — Marquer des notifications comme lues/non lues
// Corps: { id } | { ids: [...] } | { toutes: true } [, lue: boolean]
// La mise à jour est restreinte aux notifications de l'utilisateur courant.
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof Response) return authResult
    const user = authResult

    const rateLimitResult = rateLimit(request, RATE_LIMITS.API_MUTATION)
    if (rateLimitResult) return rateLimitResult

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
    }

    const validation = validate(notificationMarkReadSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    // Cible restreinte aux notifications possédées par l'utilisateur
    const where: Record<string, unknown> = { userId: user.id }
    if (data.id) where.id = data.id
    else if (data.ids) where.id = { in: data.ids }
    else if (data.toutes) where.lue = !data.lue // « toutes » = toutes les non lues (ou lues si lue=false)

    const result = await db.notification.updateMany({
      where,
      data: { lue: data.lue },
    })

    return NextResponse.json({ updated: result.count, lue: data.lue })
  } catch (error) {
    console.error('Erreur PATCH notifications:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des notifications' },
      { status: 500 }
    )
  }
}

// POST /api/notifications — Diffuser une notification aux utilisateurs d'une pharmacie
// Corps: { pharmacieId, titre, message, type?, lien?, userIds? (ciblage optionnel) }
// Réservé aux rôles pharmacie avec permission M12_COMMUNICATION write.
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M12_COMMUNICATION', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const rateLimitResult = rateLimit(request, RATE_LIMITS.API_MUTATION)
    if (rateLimitResult) return rateLimitResult

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
    }

    const validation = validate(notificationBroadcastSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    // Isolation multi-tenant: la pharmacie ciblée doit être celle de l'émetteur
    // (sauf admin plateforme)
    if (authResult.roleName !== 'PLATFORM_ADMIN' && data.pharmacieId !== user.pharmacieId) {
      return NextResponse.json({ error: 'Accès refusé à cette pharmacie' }, { status: 403 })
    }

    const pharmacie = await db.pharmacie.findFirst({
      where: { id: data.pharmacieId, actif: true },
      select: { id: true },
    })
    if (!pharmacie) {
      return NextResponse.json({ error: 'Pharmacie active introuvable' }, { status: 404 })
    }

    // Destinataires: ciblage optionnel, sinon tous les utilisateurs actifs de la pharmacie
    const destinataires = await db.utilisateur.findMany({
      where: {
        pharmacieId: data.pharmacieId,
        actif: true,
        ...(data.userIds ? { id: { in: data.userIds } } : {}),
      },
      select: { id: true },
    })
    if (destinataires.length === 0) {
      return NextResponse.json({ error: 'Aucun destinataire trouvé' }, { status: 404 })
    }

    const created = await db.notification.createMany({
      data: destinataires.map(d => ({
        userId: d.id,
        titre: data.titre,
        message: data.message,
        type: data.type || 'INFO',
        lien: data.lien || null,
        lue: false,
      })),
    })

    return NextResponse.json(
      { message: 'Notification diffusée', destinataires: destinataires.length, created: created.count },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erreur POST notifications:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la diffusion de la notification' },
      { status: 500 }
    )
  }
}
