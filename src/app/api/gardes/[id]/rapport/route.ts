import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/gardes/[id]/rapport — Rapport d'une garde spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M09_GARDE', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult
    const { id } = await params

    const garde = await db.planningGarde.findUnique({
      where: { id },
    })

    if (!garde || garde.pharmacieId !== user.pharmacieId) {
      return NextResponse.json(
        { error: 'Planning de garde introuvable' },
        { status: 404 }
      )
    }

    // Récupérer les ventes de la période de garde
    const ventes = await db.vente.findMany({
      where: {
        pharmacieId: user.pharmacieId,
        createdAt: {
          gte: garde.dateDebut,
          lte: garde.dateFin,
        },
        statut: 'VALIDEE',
      },
      include: {
        lignes: {
          include: {
            medicament: { select: { nomCommercial: true, dci: true } },
          },
        },
      },
    })

    const montantTotalVentes = ventes.reduce((sum, v) => sum + v.montantTotal, 0)
    const montantPaye = ventes.reduce((sum, v) => sum + v.montantPaye, 0)
    const nombreVentes = ventes.length

    // Top médicaments vendus
    const medicamentCounts: Record<string, { nom: string; quantite: number; montant: number }> = {}
    for (const vente of ventes) {
      for (const ligne of vente.lignes) {
        const key = ligne.medicamentId
        if (!medicamentCounts[key]) {
          medicamentCounts[key] = {
            nom: ligne.medicament?.nomCommercial || 'Inconnu',
            quantite: 0,
            montant: 0,
          }
        }
        medicamentCounts[key].quantite += ligne.quantite
        medicamentCounts[key].montant += ligne.prixTotal
      }
    }

    const topMedicaments = Object.values(medicamentCounts)
      .sort((a, b) => b.montant - a.montant)
      .slice(0, 10)

    return NextResponse.json({
      garde: {
        id: garde.id,
        date: garde.date,
        dateDebut: garde.dateDebut,
        dateFin: garde.dateFin,
        type: garde.type,
        rapport: garde.rapport,
      },
      resume: {
        nombreVentes,
        montantTotalVentes,
        montantPaye,
        montantAssurance: ventes.reduce((sum, v) => sum + v.montantAssur, 0),
      },
      topMedicaments,
    })
  } catch (error) {
    console.error('Erreur GET rapport garde:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du rapport de garde' },
      { status: 500 }
    )
  }
}
