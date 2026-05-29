import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const dci = searchParams.get('dci')

    const where: Record<string, unknown> = { grossisteId: id }
    if (dci) where.dci = { contains: dci, mode: 'insensitive' }

    const data = await db.cataloguePrix.findMany({ where, take: 100 })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET catalogue:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération du catalogue' }, { status: 500 })
  }
}
