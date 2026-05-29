import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await db.commandeFournisseur.findUnique({
      where: { id },
      include: {
        fournisseur: true,
        lignes: { include: { medicament: true } },
        receptions: { include: { lignes: true } },
      },
    })
    if (!data) return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET commande:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération de la commande' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = await db.commandeFournisseur.update({ where: { id }, data: body })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur PATCH commande:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour de la commande' }, { status: 500 })
  }
}
