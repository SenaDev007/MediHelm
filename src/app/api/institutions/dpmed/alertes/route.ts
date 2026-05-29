import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut')
    const typeAlerte = searchParams.get('typeAlerte')
    const niveauUrgence = searchParams.get('niveauUrgence')

    const where: Record<string, unknown> = {}
    if (statut) where.statut = statut
    if (typeAlerte) where.typeAlerte = typeAlerte
    if (niveauUrgence) where.niveauUrgence = niveauUrgence

    const alertes = await db.alerteDPMED.findMany({
      where,
      include: {
        medicamentSurv: true,
        diffusions: {
          include: { pharmacie: { select: { id: true, nom: true, ville: true } } },
        },
      },
      orderBy: { dateEmissionDPMED: 'desc' },
      take: 100,
    })

    const formatted = alertes.map(a => ({
      ...a,
      tauxAcquittement: a.nbOfficinesNotifiees > 0
        ? Math.round((a.nbOfficinesAcquittees / a.nbOfficinesNotifiees) * 100)
        : 0,
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Erreur GET alertes institutionnelles:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const alerte = await db.alerteDPMED.create({ data: body })

    // Create diffusions to all active pharmacies
    const pharmacies = await db.pharmacie.findMany({
      where: { actif: true },
      select: { id: true },
    })

    if (pharmacies.length > 0) {
      await db.diffusionAlerte.createMany({
        data: pharmacies.map(p => ({
          alerteId: alerte.id,
          pharmacieId: p.id,
          lotsConcernes: body.numerosLotConcernes || [],
          canalEnvoi: ['PUSH', 'IN_APP'],
          dateEnvoi: new Date(),
        })),
      })

      await db.alerteDPMED.update({
        where: { id: alerte.id },
        data: { nbOfficinesNotifiees: pharmacies.length },
      })
    }

    return NextResponse.json(alerte, { status: 201 })
  } catch (error) {
    console.error('Erreur POST alerte institutionnelle:', error)
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
  }
}
