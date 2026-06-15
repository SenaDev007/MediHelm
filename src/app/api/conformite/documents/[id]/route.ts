import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

// GET /api/conformite/documents/[id] — Détail d'un document de conformité
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M19_CONFORMITE', 'read')
    if (authResult instanceof Response) return authResult

    const user = authResult
    const { id } = await params

    const document = await db.document.findFirst({
      where: {
        id,
        pharmacieId: user.pharmacieId,
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document introuvable.' },
        { status: 404 }
      )
    }

    const now = new Date()
    return NextResponse.json({
      ...document,
      expire: document.dateValidite ? new Date(document.dateValidite) < now : false,
      expireBientot: document.dateValidite
        ? new Date(document.dateValidite) < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) && new Date(document.dateValidite) >= now
        : false,
    })
  } catch (error) {
    console.error('Erreur lors de la récupération du document:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du document de conformité.' },
      { status: 500 }
    )
  }
}

// PATCH /api/conformite/documents/[id] — Mettre à jour un document de conformité
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M19_CONFORMITE', 'write')
    if (authResult instanceof Response) return authResult

    const user = authResult
    const { id } = await params
    const body = await request.json()

    // Vérifier que le document existe et appartient à la pharmacie
    const document = await db.document.findFirst({
      where: { id, pharmacieId: user.pharmacieId },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document introuvable.' },
        { status: 404 }
      )
    }

    // Préparer les données de mise à jour
    const updateData: Record<string, unknown> = {}

    if (body.titre !== undefined) updateData.titre = body.titre
    if (body.fichierUrl !== undefined) updateData.fichierUrl = body.fichierUrl
    if (body.statut !== undefined) updateData.statut = body.statut
    if (body.dateValidite !== undefined) {
      updateData.dateValidite = body.dateValidite ? new Date(body.dateValidite) : null
    }
    if (body.type) {
      const validTypes = ['REGISTRE_STUPEFIANTS', 'ORDONNANCE', 'DECLARATION_TRIMESTRIELLE', 'RAPPORT_PHARMACOVIGILANCE', 'RAPPORT_DESTRUCTION', 'CERTIFICATION', 'LICENCE', 'AUTRE']
      if (!validTypes.includes(body.type)) {
        return NextResponse.json(
          { error: `Type de document invalide. Valeurs autorisées: ${validTypes.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.type = body.type
    }

    const updated = await db.document.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du document:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du document de conformité.' },
      { status: 500 }
    )
  }
}

// DELETE /api/conformite/documents/[id] — Supprimer un document de conformité
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M19_CONFORMITE', 'delete')
    if (authResult instanceof Response) return authResult

    const user = authResult
    const { id } = await params

    // Vérifier que le document existe et appartient à la pharmacie
    const document = await db.document.findFirst({
      where: { id, pharmacieId: user.pharmacieId },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document introuvable.' },
        { status: 404 }
      )
    }

    // Supprimer le document
    await db.document.delete({
      where: { id },
    })

    return NextResponse.json({
      message: 'Document supprimé avec succès.',
    })
  } catch (error) {
    console.error('Erreur lors de la suppression du document:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du document de conformité.' },
      { status: 500 }
    )
  }
}
