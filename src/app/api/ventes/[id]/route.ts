import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await db.vente.findUnique({
      where: { id },
      include: {
        lignes: { include: { medicament: true, lot: true } },
        paiements: true,
        patient: true,
        utilisateur: true,
        ordonnance: true,
      },
    })
    if (!data) return NextResponse.json({ error: 'Vente non trouvée' }, { status: 404 })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET vente:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération de la vente' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = await db.vente.update({ where: { id }, data: body })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur PATCH vente:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour de la vente' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.vente.delete({ where: { id } })
    return NextResponse.json({ message: 'Vente supprimée' })
  } catch (error) {
    console.error('Erreur DELETE vente:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression de la vente' }, { status: 500 })
  }
}
