import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/employes/[id] — Détail d'un employé
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M07_RH', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult
    const { id } = await params

    const employe = await db.employe.findUnique({ where: { id } })

    if (!employe || employe.pharmacieId !== user.pharmacieId) {
      return NextResponse.json(
        { error: 'Employé introuvable' },
        { status: 404 }
      )
    }

    return NextResponse.json(employe)
  } catch (error) {
    console.error('Erreur GET employé:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'employé' },
      { status: 500 }
    )
  }
}

// PATCH /api/employes/[id] — Mettre à jour un employé
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M07_RH', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult
    const { id } = await params

    const existing = await db.employe.findUnique({ where: { id } })
    if (!existing || existing.pharmacieId !== user.pharmacieId) {
      return NextResponse.json(
        { error: 'Employé introuvable' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    const allowedFields = ['nom', 'prenom', 'poste', 'telephone', 'email', 'typeContrat', 'salaireBrut', 'actif']
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (body.dateEmbauche) {
      updateData.dateEmbauche = new Date(body.dateEmbauche)
    }

    const data = await db.employe.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur PATCH employé:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'employé' },
      { status: 500 }
    )
  }
}

// DELETE /api/employes/[id] — Suppression douce (actif=false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M07_RH', 'delete')
    if (authResult instanceof Response) return authResult
    const user = authResult
    const { id } = await params

    const existing = await db.employe.findUnique({ where: { id } })
    if (!existing || existing.pharmacieId !== user.pharmacieId) {
      return NextResponse.json(
        { error: 'Employé introuvable' },
        { status: 404 }
      )
    }

    const data = await db.employe.update({
      where: { id },
      data: { actif: false },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur DELETE employé:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'employé' },
      { status: 500 }
    )
  }
}
