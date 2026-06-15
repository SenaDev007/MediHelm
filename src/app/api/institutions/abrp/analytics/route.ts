import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  // Auth: ABRP_VIEWER or PLATFORM_ADMIN required
  const auth = await requireAuth(request, 'M15_ANALYTICS', 'read')
  if (auth instanceof Response) return auth

  try {
    // Anonymized supply analytics per department for ABRP

    // Stock alert stats by DCI
    const alertesParDCI = await db.alerteStock.groupBy({
      by: ['medicamentId'],
      where: { type: { in: ['RUPTURE', 'SEUIL_MINIMUM'] } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    })

    const medicamentIds = alertesParDCI.map(a => a.medicamentId)
    const medicaments = await db.medicament.findMany({
      where: { id: { in: medicamentIds } },
      select: { id: true, dci: true, forme: true, dosage: true },
    })
    const medMap = new Map(medicaments.map(m => [m.id, m]))

    const tensionsApprovisionnement = alertesParDCI.map(a => ({
      dci: medMap.get(a.medicamentId)?.dci || 'Inconnu',
      forme: medMap.get(a.medicamentId)?.forme || '',
      dosage: medMap.get(a.medicamentId)?.dosage || '',
      alertes: a._count.id,
      niveau: a._count.id > 10 ? 'CRITIQUE' : a._count.id > 5 ? 'ELEVE' : 'MODERE',
    }))

    // Pharmacies by city (anonymized counts only)
    const pharmaciesParVille = await db.pharmacie.groupBy({
      by: ['ville'],
      where: { actif: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })

    // Order volume by city (anonymized)
    const commandesParVilleRaw = await db.commandeFournisseur.findMany({
      select: {
        pharmacie: { select: { ville: true } },
        montantTotal: true,
      },
    })
    const commandesParVilleMap = new Map<string, { count: number; montant: number }>()
    commandesParVilleRaw.forEach(c => {
      const ville = c.pharmacie.ville
      const existing = commandesParVilleMap.get(ville) || { count: 0, montant: 0 }
      commandesParVilleMap.set(ville, {
        count: existing.count + 1,
        montant: existing.montant + c.montantTotal,
      })
    })

    // Signalements EI by DCI
    const signalementsParDCI = await db.signalementEI.groupBy({
      by: ['dciConcernee'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    })

    // Average compliance by city
    const scores = await db.scoreConformite.findMany({
      select: {
        scoreTotal: true,
        pharmacie: { select: { ville: true } },
      },
    })
    const scoresParVilleMap = new Map<string, { total: number; count: number }>()
    scores.forEach(s => {
      const ville = s.pharmacie.ville
      const existing = scoresParVilleMap.get(ville) || { total: 0, count: 0 }
      scoresParVilleMap.set(ville, {
        total: existing.total + s.scoreTotal,
        count: existing.count + 1,
      })
    })
    const conformiteParVille = Array.from(scoresParVilleMap.entries()).map(([ville, data]) => ({
      ville,
      avgScore: Math.round(data.total / data.count),
      count: data.count,
    })).sort((a, b) => b.avgScore - a.avgScore)

    return NextResponse.json({
      tensionsApprovisionnement,
      pharmaciesParVille: pharmaciesParVille.map(p => ({
        ville: p.ville,
        count: p._count.id,
      })),
      commandesParVille: Array.from(commandesParVilleMap.entries()).map(([ville, data]) => ({
        ville,
        count: data.count,
        montant: data.montant,
      })),
      signalementsParDCI: signalementsParDCI.map(s => ({
        dci: s.dciConcernee,
        count: s._count.id,
      })),
      conformiteParVille,
    })
  } catch (error) {
    console.error('Erreur analytics ABRP:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des analytics' },
      { status: 500 }
    )
  }
}
