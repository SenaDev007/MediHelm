import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { pharmacieId, actionPrise } = body

    if (!pharmacieId || !actionPrise) {
      return NextResponse.json({ error: 'pharmacieId et actionPrise requis' }, { status: 400 })
    }

    const diffusion = await db.diffusionAlerte.findFirst({
      where: { alerteId: id, pharmacieId },
    })

    if (!diffusion) {
      return NextResponse.json({ error: 'Diffusion non trouvée' }, { status: 404 })
    }

    const updated = await db.diffusionAlerte.update({
      where: { id: diffusion.id },
      data: { actionPrise },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur POST action:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'enregistrement de l\'action' }, { status: 500 })
  }
}
