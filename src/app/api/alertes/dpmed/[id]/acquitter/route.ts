import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { pharmacieId } = body

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    const diffusion = await db.diffusionAlerte.findFirst({
      where: { alerteId: id, pharmacieId },
    })

    if (!diffusion) {
      return NextResponse.json({ error: 'Diffusion non trouvée pour cette pharmacie' }, { status: 404 })
    }

    const updated = await db.diffusionAlerte.update({
      where: { id: diffusion.id },
      data: { dateAcquittement: new Date() },
    })

    await db.alerteDPMED.update({
      where: { id },
      data: { nbOfficinesAcquittees: { increment: 1 } },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur POST acquitter:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'acquittement' }, { status: 500 })
  }
}
