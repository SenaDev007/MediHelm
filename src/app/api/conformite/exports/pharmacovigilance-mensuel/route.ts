import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const annee = searchParams.get('annee')
    const mois = searchParams.get('mois')

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    const targetYear = annee ? parseInt(annee) : new Date().getFullYear()
    const targetMonth = mois ? parseInt(mois) : new Date().getMonth() + 1

    const dateDebut = new Date(targetYear, targetMonth - 1, 1)
    const dateFin = new Date(targetYear, targetMonth, 0, 23, 59, 59)

    const signalements = await db.signalementEI.findMany({
      where: {
        pharmacieId,
        createdAt: { gte: dateDebut, lte: dateFin },
      },
      include: {
        medicament: { select: { nomCommercial: true, dci: true } },
        medicamentSurv: { select: { dci: true, typeSurveillance: true } },
        utilisateur: { select: { nom: true, prenom: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const pharmacie = await db.pharmacie.findUnique({
      where: { id: pharmacieId },
      select: { nom: true, adresse: true, numeroAgrement: true },
    })

    const parGravite: Record<string, number> = {}
    const parStatut: Record<string, number> = {}
    for (const s of signalements) {
      parGravite[s.gravite] = (parGravite[s.gravite] || 0) + 1
      parStatut[s.statutEnvoi] = (parStatut[s.statutEnvoi] || 0) + 1
    }

    return NextResponse.json({
      format: 'WHO/DPMED_PHARMACOVIGILANCE_MENSUEL',
      pharmacie,
      periode: {
        annee: targetYear,
        mois: targetMonth,
        dateDebut: dateDebut.toISOString(),
        dateFin: dateFin.toISOString(),
      },
      resume: {
        totalSignalements: signalements.length,
        parGravite: Object.entries(parGravite).map(([gravite, count]) => ({ gravite, count })),
        parStatut: Object.entries(parStatut).map(([statut, count]) => ({ statut, count })),
      },
      signalements: signalements.map((s) => ({
        reference: s.refDPMED || `EI-${s.id.substring(0, 8)}`,
        dci: s.dciConcernee,
        medicament: s.medicament?.nomCommercial || null,
        gravite: s.gravite,
        description: s.descriptionEI,
        dateDebut: s.dateDebut,
        statut: s.statutEnvoi,
        declarant: `${s.utilisateur.prenom} ${s.utilisateur.nom}`,
      })),
      genereLe: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Erreur GET pharmacovigilance mensuel:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération' }, { status: 500 })
  }
}
