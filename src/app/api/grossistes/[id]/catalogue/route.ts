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

    const data = await db.cataloguePrix.findMany({
      where,
      orderBy: { dci: 'asc' },
      take: 200,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET catalogue:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération du catalogue' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const data = await db.cataloguePrix.create({
      data: {
        grossisteId: id,
        referenceGros: body.referenceGros,
        dci: body.dci,
        nomCommercial: body.nomCommercial,
        forme: body.forme || 'Comprimé',
        dosage: body.dosage || '',
        prixAchat: body.prixAchat || 0,
        disponible: body.disponible !== undefined ? body.disponible : true,
      },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST catalogue:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'ajout au catalogue' }, { status: 500 })
  }
}
