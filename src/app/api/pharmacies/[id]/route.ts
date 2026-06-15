import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { id } = await params

    const pharmacie = await db.pharmacie.findUnique({
      where: { id },
      include: {
        utilisateurs: {
          select: { id: true, nom: true, prenom: true, email: true, role: true, actif: true },
        },
        _count: {
          select: {
            medicaments: true,
            ventes: true,
            patients: true,
            employes: true,
          },
        },
      },
    })

    if (!pharmacie) {
      return NextResponse.json(
        { error: 'Pharmacie introuvable' },
        { status: 404 }
      )
    }

    // Vérifier l'accès : seul PLATFORM_ADMIN ou utilisateur de la pharmacie peut voir
    if (user.roleName !== 'PLATFORM_ADMIN' && user.pharmacieId !== id) {
      return NextResponse.json(
        { error: 'Accès refusé. Vous n\'avez pas accès à cette pharmacie.' },
        { status: 403 }
      )
    }

    return NextResponse.json(pharmacie)
  } catch (error) {
    console.error('Erreur GET pharmacie:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la pharmacie' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { id } = await params

    // Vérifier que l'utilisateur appartient à cette pharmacie ou est PLATFORM_ADMIN
    if (user.roleName !== 'PLATFORM_ADMIN' && user.pharmacieId !== id) {
      return NextResponse.json(
        { error: 'Accès refusé. Vous ne pouvez modifier que votre propre pharmacie.' },
        { status: 403 }
      )
    }

    const pharmacie = await db.pharmacie.findUnique({ where: { id } })

    if (!pharmacie) {
      return NextResponse.json(
        { error: 'Pharmacie introuvable' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const allowedFields = [
      'nom', 'adresse', 'ville', 'telephone', 'email',
      'latitude', 'longitude', 'logoUrl', 'siteWeb',
      'modeGardeActif',
    ]

    const data: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field]
      }
    }

    // Seul PLATFORM_ADMIN peut modifier le plan et le statut actif
    if (user.roleName === 'PLATFORM_ADMIN') {
      if (body.plan !== undefined) data.plan = body.plan
      if (body.actif !== undefined) data.actif = body.actif
    }

    const updated = await db.pharmacie.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur PATCH pharmacie:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la pharmacie' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { id } = await params

    // Seul PLATFORM_ADMIN peut supprimer une pharmacie
    if (user.roleName !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Accès refusé. Seul un administrateur plateforme peut supprimer une pharmacie.' },
        { status: 403 }
      )
    }

    const pharmacie = await db.pharmacie.findUnique({ where: { id } })

    if (!pharmacie) {
      return NextResponse.json(
        { error: 'Pharmacie introuvable' },
        { status: 404 }
      )
    }

    // Soft-delete : marquer comme inactif
    const deleted = await db.pharmacie.update({
      where: { id },
      data: { actif: false },
    })

    return NextResponse.json({
      message: 'Pharmacie désactivée avec succès',
      pharmacie: deleted,
    })
  } catch (error) {
    console.error('Erreur DELETE pharmacie:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la pharmacie' },
      { status: 500 }
    )
  }
}
