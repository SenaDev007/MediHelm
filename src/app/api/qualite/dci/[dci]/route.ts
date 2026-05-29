import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dci: string }> }
) {
  try {
    const { dci } = await params
    const data = await db.ficheDCI.findUnique({ where: { dci } })
    if (!data) return NextResponse.json({ error: 'Fiche DCI non trouvée' }, { status: 404 })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET fiche DCI by name:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}
