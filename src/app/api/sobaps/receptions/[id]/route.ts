import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const reception = await db.confirmationReceptionSoBAPS.findUnique({
      where: { id },
      include: {
        pharmacie: { select: { id: true, nom: true, adresse: true } },
      },
    })

    if (!reception) {
      return NextResponse.json({ error: 'Réception non trouvée' }, { status: 404 })
    }

    return NextResponse.json(reception)
  } catch (error) {
    console.error('Erreur GET réception detail:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}
