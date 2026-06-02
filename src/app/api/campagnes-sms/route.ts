import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId

    const data = await db.campagneSMS.findMany({
      where,
      orderBy: { dateEnvoi: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET campagnes-sms:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des campagnes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const destinataires: string[] = body.destinataires || []

    const data = await db.campagneSMS.create({
      data: {
        pharmacieId: body.pharmacieId,
        titre: body.titre,
        message: body.message,
        destinataires,
        nbEnvoyes: destinataires.length,
        nbDelivres: 0,
        dateEnvoi: new Date(),
        statut: 'ENVOYEE',
      },
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST campagnes-sms:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la campagne' }, { status: 500 })
  }
}
