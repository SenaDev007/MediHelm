import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { delivree } = body

    const ligne = await db.ligneOrdonnance.findUnique({
      where: { id },
      include: { ordonnance: true },
    })

    if (!ligne) {
      return NextResponse.json({ error: 'Ligne non trouvée' }, { status: 404 })
    }

    // Update the line
    const updated = await db.ligneOrdonnance.update({
      where: { id },
      data: { delivree: delivree !== undefined ? delivree : !ligne.delivree },
      include: { medicament: true },
    })

    // Update ordonnance status based on delivery progress
    const allLignes = await db.ligneOrdonnance.findMany({
      where: { ordonnanceId: ligne.ordonnanceId },
    })
    const allDelivered = allLignes.every(l => l.delivree)
    const someDelivered = allLignes.some(l => l.delivree)

    let newStatut = ligne.ordonnance.statut
    if (allDelivered && ligne.ordonnance.statut !== 'REFUSEE') {
      newStatut = 'DELIVREE'
    } else if (someDelivered && ligne.ordonnance.statut === 'VALIDEE') {
      newStatut = 'PARTIELLEMENT_DELIVREE'
    }

    if (newStatut !== ligne.ordonnance.statut) {
      await db.ordonnance.update({
        where: { id: ligne.ordonnanceId },
        data: { statut: newStatut },
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur PATCH ligne ordonnance:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour de la ligne' }, { status: 500 })
  }
}
