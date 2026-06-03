import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await db.fournisseur.findUnique({
      where: { id },
      include: {
        conditions: { include: { medicament: { select: { nomCommercial: true, dci: true } } } },
        evaluations: { orderBy: { dateEvaluation: 'desc' } },
        commandes: { orderBy: { dateCommande: 'desc' }, take: 10 },
      },
    })
    if (!data) {
      return NextResponse.json({ error: 'Fournisseur non trouvé' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET fournisseur:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération du fournisseur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = await db.fournisseur.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur PATCH fournisseur:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du fournisseur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await db.fournisseur.update({
      where: { id },
      data: { actif: false },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur DELETE fournisseur:', error)
    return NextResponse.json({ error: 'Erreur lors de la désactivation du fournisseur' }, { status: 500 })
  }
}
