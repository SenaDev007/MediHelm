import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await db.commandeGrossiste.findMany({
      where: { grossisteId: id },
      include: { pharmacie: true },
      orderBy: { dateEnvoi: 'desc' },
      take: 50,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET commandes grossiste:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des commandes' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const data = await db.commandeGrossiste.create({
      data: {
        ...body,
        grossisteId: id,
      },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST commande grossiste:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'envoi de la commande' }, { status: 500 })
  }
}
