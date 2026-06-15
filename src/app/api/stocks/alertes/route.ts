import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    // Use AlerteStock instead of non-existent AlerteExpiration
    const where = pharmacieId ? { pharmacieId } : {}
    const data = await db.alerteStock.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET alertes stock:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des alertes' }, { status: 500 })
  }
}
