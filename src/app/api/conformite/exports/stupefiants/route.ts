import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    const destructions = await db.destructionMedicament.findMany({
      where: { pharmacieId, medicament: { estStupefiant: true } },
      include: { medicament: true, lot: true, pharmacien: true, temoin: true },
      orderBy: { dateDestruction: 'desc' },
      take: 100,
    })

    return NextResponse.json({
      pharmacieId,
      registreStupefiants: destructions,
      total: destructions.length,
    })
  } catch (error) {
    console.error('Erreur GET registre stupéfiants:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}
