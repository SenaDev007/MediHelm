import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/fournisseurs/[id] — Détail d'un fournisseur
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M04_FOURNISSEURS', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult
    const { id } = await params

    const fournisseur = await db.fournisseur.findUnique({
      where: { id },
      include: {
        commandes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!fournisseur || fournisseur.pharmacieId !== user.pharmacieId) {
      return NextResponse.json(
        { error: 'Fournisseur introuvable' },
        { status: 404 }
      )
    }

    return NextResponse.json(fournisseur)
  } catch (error) {
    console.error('Erreur GET fournisseur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du fournisseur' },
      { status: 500 }
    )
  }
}

// PATCH /api/fournisseurs/[id] — Mettre à jour un fournisseur
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M04_FOURNISSEURS', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult
    const { id } = await params

    const existing = await db.fournisseur.findUnique({ where: { id } })
    if (!existing || existing.pharmacieId !== user.pharmacieId) {
      return NextResponse.json(
        { error: 'Fournisseur introuvable' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    const allowedFields = ['nom', 'contact', 'telephone', 'email', 'adresse', 'actif', 'note']
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const data = await db.fournisseur.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur PATCH fournisseur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du fournisseur' },
      { status: 500 }
    )
  }
}

// DELETE /api/fournisseurs/[id] — Suppression douce (actif=false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M04_FOURNISSEURS', 'delete')
    if (authResult instanceof Response) return authResult
    const user = authResult
    const { id } = await params

    const existing = await db.fournisseur.findUnique({ where: { id } })
    if (!existing || existing.pharmacieId !== user.pharmacieId) {
      return NextResponse.json(
        { error: 'Fournisseur introuvable' },
        { status: 404 }
      )
    }

    const data = await db.fournisseur.update({
      where: { id },
      data: { actif: false },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur DELETE fournisseur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du fournisseur' },
      { status: 500 }
    )
  }
}
