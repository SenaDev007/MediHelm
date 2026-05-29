import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { statut } = body

    const validStatuses = ['ENVOYEE', 'CONFIRMEE', 'REFUSEE', 'EN_PREPARATION', 'EN_LIVRAISON', 'LIVREE', 'LITIGE']
    if (!statut || !validStatuses.includes(statut)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { statut }

    if (statut === 'CONFIRMEE') {
      updateData.dateConfirmation = new Date()
    }
    if (statut === 'LIVREE') {
      updateData.dateLivraisonReelle = new Date()
    }

    const updated = await db.commandeGrossiste.update({
      where: { id },
      data: updateData,
      include: { pharmacie: true, grossiste: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur PATCH commande grossiste:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const commande = await db.commandeGrossiste.findUnique({
      where: { id },
      include: {
        pharmacie: true,
        grossiste: true,
        commandeInterne: {
          include: {
            lignes: true,
          },
        },
      },
    })

    if (!commande) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })
    }

    return NextResponse.json(commande)
  } catch (error) {
    console.error('Erreur GET commande grossiste:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}
