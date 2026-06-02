import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dci1 = searchParams.get('dci1')
    const dci2 = searchParams.get('dci2')

    if (!dci1 || !dci2) {
      return NextResponse.json(
        { error: 'Paramètres dci1 et dci2 requis' },
        { status: 400 }
      )
    }

    const fiches = await db.ficheDCI.findMany({
      where: { dci: { in: [dci1, dci2] } },
    })

    const interactions: Array<{
      dci1: string
      dci2: string
      gravite: string
      description: string
    }> = []

    for (const fiche of fiches) {
      const ficheInteractions = fiche.interactions as Array<{
        dciCible: string
        gravite: string
        description: string
      }> | null

      if (ficheInteractions && Array.isArray(ficheInteractions)) {
        for (const inter of ficheInteractions) {
          if (inter.dciCible === dci1 || inter.dciCible === dci2) {
            interactions.push({
              dci1: fiche.dci,
              dci2: inter.dciCible,
              gravite: inter.gravite,
              description: inter.description,
            })
          }
        }
      }
    }

    return NextResponse.json({
      dci1,
      dci2,
      interactions,
      risqueLevel: interactions.some((i) => i.gravite === 'CONTRE_INDIQUEE')
        ? 'CRITIQUE'
        : interactions.some((i) => i.gravite === 'MAJEURE')
          ? 'ELEVE'
          : interactions.length > 0
            ? 'MODERE'
            : 'AUCUN',
    })
  } catch (error) {
    console.error('Erreur GET interactions:', error)
    return NextResponse.json({ error: 'Erreur lors de la vérification des interactions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { dcis } = body as { dcis: string[] }

    if (!dcis || !Array.isArray(dcis) || dcis.length < 2) {
      return NextResponse.json(
        { error: 'Veuillez fournir au moins 2 DCI pour vérifier les interactions' },
        { status: 400 }
      )
    }

    const fiches = await db.ficheDCI.findMany({
      where: { dci: { in: dcis } },
    })

    const interactions: Array<{
      dci1: string
      dci2: string
      gravite: string
      description: string
    }> = []

    for (const fiche of fiches) {
      const ficheInteractions = fiche.interactions as Array<{
        dciCible: string
        gravite: string
        description: string
      }> | null

      if (ficheInteractions && Array.isArray(ficheInteractions)) {
        for (const inter of ficheInteractions) {
          if (dcis.includes(inter.dciCible)) {
            interactions.push({
              dci1: fiche.dci,
              dci2: inter.dciCible,
              gravite: inter.gravite,
              description: inter.description,
            })
          }
        }
      }
    }

    return NextResponse.json({
      dcis,
      interactions,
      risqueLevel: interactions.some((i) => i.gravite === 'CONTRE_INDIQUEE')
        ? 'CRITIQUE'
        : interactions.some((i) => i.gravite === 'MAJEURE')
          ? 'ELEVE'
          : interactions.length > 0
            ? 'MODERE'
            : 'AUCUN',
    })
  } catch (error) {
    console.error('Erreur POST interactions:', error)
    return NextResponse.json({ error: 'Erreur lors de la vérification des interactions' }, { status: 500 })
  }
}
