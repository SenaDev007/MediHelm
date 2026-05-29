import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await db.signalementEI.findUnique({
      where: { id },
      include: { medicament: true, medicamentSurv: true, utilisateur: true },
    })
    if (!data) return NextResponse.json({ error: 'Signalement non trouvé' }, { status: 404 })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET signalement:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = await db.signalementEI.update({ where: { id }, data: body })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur PATCH signalement:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}
