import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

// GET /api/conformite/exports/declaration-trimestrielle — Générer les données de déclaration trimestrielle
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M19_CONFORMITE', 'read')
    if (authResult instanceof Response) return authResult

    const user = authResult
    const { searchParams } = new URL(request.url)

    // Paramètres de période (trimestre)
    const annee = parseInt(searchParams.get('annee') || new Date().getFullYear().toString())
    const trimestre = parseInt(searchParams.get('trimestre') || String(Math.ceil((new Date().getMonth() + 1) / 3)))

    if (trimestre < 1 || trimestre > 4) {
      return NextResponse.json(
        { error: 'Trimestre invalide. Valeurs autorisées: 1, 2, 3, 4.' },
        { status: 400 }
      )
    }

    // Calculer les dates de début et fin du trimestre
    const dateDebut = new Date(annee, (trimestre - 1) * 3, 1)
    const dateFin = new Date(annee, trimestre * 3, 0, 23, 59, 59)

    // Agréger les ventes du trimestre
    const ventes = await db.vente.findMany({
      where: {
        pharmacieId: user.pharmacieId,
        createdAt: { gte: dateDebut, lte: dateFin },
        statut: 'VALIDEE',
      },
      include: {
        lignes: {
          include: {
            medicament: {
              select: { dci: true, nomCommercial: true, categorieAtc: true, estStupefiant: true },
            },
          },
        },
      },
    })

    // Agréger les mouvements de stock du trimestre
    const mouvements = await db.mouvementStock.findMany({
      where: {
        pharmacieId: user.pharmacieId,
        createdAt: { gte: dateDebut, lte: dateFin },
      },
      include: {
        medicament: {
          select: { dci: true, nomCommercial: true, categorieAtc: true, estStupefiant: true },
        },
      },
    })

    // Calculer les totaux
    const totalVentes = ventes.reduce((sum, v) => sum + v.montantTotal, 0)
    const totalLignesVente = ventes.reduce((sum, v) => sum + v.lignes.length, 0)

    // Agréger par catégorie ATC
    const ventesParCategorie: Record<string, { count: number; montant: number }> = {}
    for (const vente of ventes) {
      for (const ligne of vente.lignes) {
        const cat = ligne.medicament?.categorieAtc || 'AUTRE'
        if (!ventesParCategorie[cat]) {
          ventesParCategorie[cat] = { count: 0, montant: 0 }
        }
        ventesParCategorie[cat].count++
        ventesParCategorie[cat].montant += ligne.prixTotal
      }
    }

    // Agréger les mouvements par type
    const mouvementsParType: Record<string, { count: number; quantite: number }> = {}
    for (const mvt of mouvements) {
      if (!mouvementsParType[mvt.type]) {
        mouvementsParType[mvt.type] = { count: 0, quantite: 0 }
      }
      mouvementsParType[mvt.type].count++
      mouvementsParType[mvt.type].quantite += mvt.quantite
    }

    // Stupéfiants (mouvements spécifiques)
    const mouvementsStup = mouvements.filter((m) => m.medicament?.estStupefiant)
    const ventesStup = ventes.filter((v) =>
      v.lignes.some((l) => l.medicament?.estStupefiant)
    )

    // Signalements d'effets indésirables du trimestre
    const signalements = await db.signalementEI.findMany({
      where: {
        pharmacieId: user.pharmacieId,
        createdAt: { gte: dateDebut, lte: dateFin },
      },
    })

    return NextResponse.json({
      periode: {
        annee,
        trimestre,
        dateDebut,
        dateFin,
        label: `T${trimestre} ${annee}`,
      },
      pharmacieId: user.pharmacieId,
      ventes: {
        total: ventes.length,
        montantTotal: totalVentes,
        lignesTotal: totalLignesVente,
        parCategorie: ventesParCategorie,
      },
      mouvementsStock: {
        total: mouvements.length,
        parType: mouvementsParType,
      },
      stupefiants: {
        ventes: ventesStup.length,
        mouvements: mouvementsStup.length,
        details: mouvementsStup.map((m) => ({
          dci: m.medicament?.dci,
          type: m.type,
          quantite: m.quantite,
          date: m.createdAt,
          motif: m.motif,
        })),
      },
      pharmacovigilance: {
        signalementsTotal: signalements.length,
        parGravite: signalements.reduce((acc, s) => {
          acc[s.gravite] = (acc[s.gravite] || 0) + 1
          return acc
        }, {} as Record<string, number>),
      },
      dateGeneration: new Date(),
    })
  } catch (error) {
    console.error('Erreur lors de la génération de la déclaration trimestrielle:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération de la déclaration trimestrielle.' },
      { status: 500 }
    )
  }
}
