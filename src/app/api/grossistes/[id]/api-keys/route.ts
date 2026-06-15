import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET: List API keys for a grossiste
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

    // Fetch API keys from the database
    const apiKeys = await db.grossisteApiKey.findMany({
      where: { grossisteId: id },
      select: {
        id: true,
        name: true,
        prefix: true,
        createdAt: true,
        lastUsed: true,
        actif: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(apiKeys)
  } catch (error) {
    console.error('Erreur GET grossistes/api-keys:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des clés API' },
      { status: 500 }
    )
  }
}
