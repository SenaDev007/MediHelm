import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    const where = pharmacieId ? { pharmacieId } : {}
    const data = await db.confirmationReceptionSoBAPS.findMany({
      where,
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET confirmations SoBAPS:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}
