import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const grossisteId = searchParams.get('grossisteId')
    const statut = searchParams.get('statut')

    const where: Record<string, unknown> = {}
    if (grossisteId) where.grossisteId = grossisteId
    if (statut) where.statut = statut

    const data = await db.commandeGrossiste.findMany({
      where,
      include: { grossiste: true, pharmacie: true },
      orderBy: { dateEnvoi: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET commandes grossiste portail:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}
