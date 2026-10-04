import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { checkInteractions, getNiveauRisqueGlobal } from '@/lib/interactions-db'

// GET /api/qualite/interactions — Vérifier les interactions médicamenteuses pour une liste de DCI
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M16_PHARMACOVIGILANCE', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { searchParams } = new URL(request.url)

    // Accepter dci[] ou liste séparée par des virgules
    let dcis: string[] = []
    const dciParam = searchParams.get('dci')
    const dciArrayParams = searchParams.getAll('dci[]')

    if (dciArrayParams.length > 0) {
      dcis = dciArrayParams
    } else if (dciParam) {
      dcis = dciParam.split(',').map((d) => d.trim()).filter(Boolean)
    }

    if (dcis.length === 0) {
      return NextResponse.json(
        { error: 'Veuillez fournir au moins une DCI via le paramètre dci ou dci[]. Ex: ?dci=paracetamol,ibuprofene' },
        { status: 400 }
      )
    }

    if (dcis.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 DCI autorisées par requête.' },
        { status: 400 }
      )
    }

    // Vérifier les interactions entre les DCI fournies (via le moteur de règles)
    const interactions = checkInteractions(dcis)

    // Enrichir avec les données réelles de la DB pour chaque DCI
    const enrichments = await Promise.all(
      dcis.map(async (dci) => {
        const medicaments = await db.medicament.findMany({
          where: {
            pharmacieId: user.pharmacieId,
            dci: { equals: dci, mode: 'insensitive' },
            actif: true,
          },
          select: {
            id: true,
            nomCommercial: true,
            dci: true,
            forme: true,
            surOrdonnance: true,
            estStupefiant: true,
            remboursable: true,
            lots: {
              where: { quantite: { gt: 0 }, dateExpiration: { gt: new Date() } },
              select: { id: true, quantite: true, dateExpiration: true },
            },
          },
        })

        // Statut de surveillance pour cette DCI
        const surveillances = await db.medicamentSurveillance.findMany({
          where: {
            dci: { equals: dci, mode: 'insensitive' },
            statut: 'ACTIVE',
          },
          select: {
            id: true,
            typeSurveillance: true,
            niveauRisque: true,
            description: true,
          },
        })

        const totalStock = medicaments.reduce(
          (sum, m) => sum + m.lots.reduce((s, l) => s + l.quantite, 0),
          0
        )

        return {
          dci,
          trouve: medicaments.length > 0,
          nbMedicaments: medicaments.length,
          stockTotal: totalStock,
          enRupture: totalStock === 0,
          nomsCommerciaux: medicaments.map((m) => m.nomCommercial),
          surOrdonnance: medicaments.some((m) => m.surOrdonnance),
          estStupefiant: medicaments.some((m) => m.estStupefiant),
          remboursable: medicaments.some((m) => m.remboursable),
          surveillances: surveillances.length > 0 ? surveillances : null,
        }
      })
    )

    return NextResponse.json({
      dcis: dcis,
      interactions: interactions,
      nbInteractions: interactions.length,
      niveauRisqueGlobal: getNiveauRisqueGlobal(interactions),
      enrichissements: enrichments,
    })
  } catch (error) {
    console.error('Erreur lors de la vérification des interactions:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la vérification des interactions médicamenteuses.' },
      { status: 500 }
    )
  }
}
