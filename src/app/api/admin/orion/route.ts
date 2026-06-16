import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M15_ANALYTICS', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    // Statut ORION
    const totalPredictions = await db.predictionIA.count()
    const predictionsRecentes = await db.predictionIA.count({
      where: {
        genereeLe: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })

    // Prédictions récentes
    const recentPredictions = await db.predictionIA.findMany({
      orderBy: { genereeLe: 'desc' },
      take: 20,
    })

    // Prédictions par domaine
    const parDomaine = await db.predictionIA.groupBy({
      by: ['domaine'],
      _count: { domaine: true },
      _avg: { confiance: true },
    })

    // Rapports analytiques récents
    const recentRapports = await db.rapportAnalytique.findMany({
      orderBy: { genereeLe: 'desc' },
      take: 10,
      include: {
        pharmacie: { select: { nom: true } },
      },
    })

    // Audit logs liés à ORION
    const cronLogs = await db.auditLog.findMany({
      where: {
        entity: { in: ['ORION', 'PredictionIA', 'CRON'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      status: {
        actif: true,
        totalPredictions,
        predictionsRecentes,
        derniereExecution: cronLogs[0]?.createdAt || null,
      },
      parDomaine: parDomaine.map(d => ({
        domaine: d.domaine,
        count: d._count.domaine,
        confianceMoyenne: d._avg.confiance ? Math.round(d._avg.confiance * 100) : 0,
      })),
      recentPredictions: recentPredictions.map(p => ({
        id: p.id,
        pharmacieId: p.pharmacieId,
        domaine: p.domaine,
        type: p.type,
        confiance: Math.round(p.confiance * 100),
        genereeLe: p.genereeLe,
        expireLe: p.expireLe,
      })),
      recentRapports: recentRapports.map(r => ({
        id: r.id,
        pharmacieNom: r.pharmacie.nom,
        domaine: r.domaine,
        periode: r.periode,
        genereeLe: r.genereeLe,
      })),
      cronLogs: cronLogs.map(l => ({
        id: l.id,
        action: l.action,
        entity: l.entity,
        details: l.details,
        createdAt: l.createdAt,
      })),
    })
  } catch (error) {
    console.error('Erreur GET admin/orion:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération du statut ORION' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M15_ANALYTICS', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()
    const { domaine, pharmacieId } = body

    // Log la demande de prédiction manuelle
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'MANUAL_PREDICTION_TRIGGER',
        entity: 'ORION',
        details: `Prédiction manuelle déclenchée: domaine=${domaine || 'TOUS'}, pharmacieId=${pharmacieId || 'TOUTES'}`,
      },
    })

    // Créer une prédiction exemple
    const prediction = await db.predictionIA.create({
      data: {
        pharmacieId: pharmacieId || null,
        domaine: domaine || 'STOCK',
        type: 'MANUAL_TRIGGER',
        donnees: '{}',
        prediction: '{}',
        confiance: 0.85,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Prédiction manuelle déclenchée',
      predictionId: prediction.id,
    })
  } catch (error) {
    console.error('Erreur POST admin/orion:', error)
    return NextResponse.json({ error: 'Erreur lors du déclenchement de la prédiction' }, { status: 500 })
  }
}
