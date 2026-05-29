import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    const ordonnances = await db.ordonnance.findMany({
      where: { pharmacieId },
      include: {
        patient: true,
        lignes: { include: { medicament: true } },
        validations: { include: { utilisateur: true } },
      },
      orderBy: { dateOrdonnance: 'desc' },
      take: 100,
    })

    return NextResponse.json({
      pharmacieId,
      registreOrdonnances: ordonnances,
      total: ordonnances.length,
    })
  } catch (error) {
    console.error('Erreur GET registre ordonnances:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}
