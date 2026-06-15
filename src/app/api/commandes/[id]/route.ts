import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/commandes/[id] — Détail d'une commande
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M03_COMMANDES', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult
    const { id } = await params

    const commande = await db.commandeFournisseur.findUnique({
      where: { id },
      include: {
        fournisseur: true,
        lignes: {
          include: {
            medicament: { select: { id: true, nomCommercial: true, dci: true } },
          },
        },
      },
    })

    if (!commande || commande.pharmacieId !== user.pharmacieId) {
      return NextResponse.json(
        { error: 'Commande introuvable' },
        { status: 404 }
      )
    }

    return NextResponse.json(commande)
  } catch (error) {
    console.error('Erreur GET commande:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la commande' },
      { status: 500 }
    )
  }
}

// PATCH /api/commandes/[id] — Mettre à jour le statut / notes d'une commande
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M03_COMMANDES', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult
    const { id } = await params

    const existing = await db.commandeFournisseur.findUnique({ where: { id } })
    if (!existing || existing.pharmacieId !== user.pharmacieId) {
      return NextResponse.json(
        { error: 'Commande introuvable' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.statut) updateData.statut = body.statut
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.dateLivraisonPrevue !== undefined) {
      updateData.dateLivraisonPrevue = body.dateLivraisonPrevue ? new Date(body.dateLivraisonPrevue) : null
    }
    if (body.dateLivraisonReelle !== undefined) {
      updateData.dateLivraisonReelle = body.dateLivraisonReelle ? new Date(body.dateLivraisonReelle) : null
    }
    if (body.montantTotal !== undefined) updateData.montantTotal = body.montantTotal

    const data = await db.commandeFournisseur.update({
      where: { id },
      data: updateData,
      include: { fournisseur: true, lignes: true },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entity: 'CommandeFournisseur',
        entityId: id,
        details: `Commande mise à jour: ${body.statut ? `statut=${body.statut}` : 'notes/montant'}`,
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur PATCH commande:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la commande' },
      { status: 500 }
    )
  }
}
