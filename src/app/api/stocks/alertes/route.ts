import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    const where = pharmacieId ? { pharmacieId } : {}
    const data = await db.alerteExpiration.findMany({
      where,
      include: { lot: { include: { medicament: true } } },
      orderBy: { joursRestants: 'asc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET alertes expiration:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des alertes' }, { status: 500 })
  }
}
