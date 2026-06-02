import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    const signalements = await db.signalementEI.findMany({
      where: { pharmacieId },
      select: { gravite: true, statutEnvoi: true },
    })

    const totalSignalements = signalements.length
    const soumis = signalements.filter((s) => s.statutEnvoi === 'SOUMIS' || s.statutEnvoi === 'ACCUSE_RECEPTION' || s.statutEnvoi === 'CLOTURE').length
    const graves = signalements.filter((s) => s.gravite === 'GRAVE' || s.gravite === 'FATAL').length

    const scorePharmacovigilance = totalSignalements > 0
      ? Math.round((soumis / totalSignalements) * 60 + (1 - graves / totalSignalements) * 40)
      : 100

    const scoreConformite = await db.scoreConformite.findUnique({
      where: { pharmacieId },
    })

    if (scoreConformite) {
      await db.scoreConformite.update({
        where: { pharmacieId },
        data: { scorePharmacovigi: scorePharmacovigilance },
      })
    }

    return NextResponse.json({
      pharmacieId,
      scorePharmacovigilance,
      totalSignalements,
      soumis,
      graves,
      tauxSoumission: totalSignalements > 0 ? ((soumis / totalSignalements) * 100).toFixed(1) : '0',
    })
  } catch (error) {
    console.error('Erreur GET score pharmacovigilance:', error)
    return NextResponse.json({ error: 'Erreur lors du calcul du score' }, { status: 500 })
  }
}
