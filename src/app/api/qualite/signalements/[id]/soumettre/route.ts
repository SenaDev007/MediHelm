import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const signalement = await db.signalementEI.findUnique({ where: { id } })

    if (!signalement) {
      return NextResponse.json({ error: 'Signalement non trouvé' }, { status: 404 })
    }

    if (signalement.statutEnvoi !== 'EN_ATTENTE') {
      return NextResponse.json(
        { error: 'Le signalement doit être en attente pour être soumis' },
        { status: 400 }
      )
    }

    const refDPMED = `DPMED-EI-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`

    const updated = await db.signalementEI.update({
      where: { id },
      data: {
        statutEnvoi: 'SOUMIS',
        refDPMED,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur POST soumettre signalement:', error)
    return NextResponse.json({ error: 'Erreur lors de la soumission' }, { status: 500 })
  }
}
