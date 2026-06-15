import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET: List webhooks for a grossiste
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const grossiste = await db.grossiste.findUnique({
      where: { id },
      select: { id: true, nom: true },
    })

    if (!grossiste) {
      return NextResponse.json({ error: 'Grossiste non trouvé' }, { status: 404 })
    }

    // Fetch webhooks from the database
    const webhooks = await db.webhookConfig.findMany({
      where: { grossisteId: id },
      select: {
        id: true,
        eventType: true,
        url: true,
        secret: true,
        actif: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(webhooks)
  } catch (error) {
    console.error('Erreur GET grossistes/webhooks:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des webhooks' },
      { status: 500 }
    )
  }
}
