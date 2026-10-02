import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M18_ALERTES_DPMED', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const alertes = await db.alerteDPMED.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { diffusions: true } },
        diffusions: {
          select: { statut: true, dateAcquittement: true },
        },
      },
    })

    const alertesWithStats = alertes.map(a => {
      const totalDiffusions = a._count.diffusions
      const acquittees = a.diffusions.filter(d => d.dateAcquittement !== null).length
      const enAttente = a.diffusions.filter(d => d.statut === 'EN_ATTENTE').length

      return {
        id: a.id,
        referenceOfficielle: a.referenceOfficielle,
        titre: a.titre,
        typeAlerte: a.typeAlerte,
        niveauUrgence: a.niveauUrgence,
        dciConcernee: a.dciConcernee,
        description: a.description,
        statut: a.statut,
        dateEmissionDPMED: a.dateEmissionDPMED,
        totalDiffusions,
        diffusionsAcquittees: acquittees,
        diffusionsEnAttente: enAttente,
        createdAt: a.createdAt,
      }
    })

    return NextResponse.json({ data: alertesWithStats })
  } catch (error) {
    console.error('Erreur GET admin/alertes-dpmed:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des alertes DPMED' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M18_ALERTES_DPMED', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()
    const { referenceOfficielle, titre, typeAlerte, niveauUrgence, dciConcernee, description, dateEmissionDPMED } = body

    if (!referenceOfficielle || !titre) {
      return NextResponse.json({ error: 'Référence officielle et titre requis' }, { status: 400 })
    }

    // Vérifier l'unicité de la référence
    const existing = await db.alerteDPMED.findUnique({
      where: { referenceOfficielle },
    })
    if (existing) {
      return NextResponse.json({ error: 'Une alerte avec cette référence existe déjà' }, { status: 409 })
    }

    const alerte = await db.alerteDPMED.create({
      data: {
        referenceOfficielle,
        titre,
        typeAlerte: typeAlerte || 'RAPPEL_LOT',
        niveauUrgence: niveauUrgence || 'URGENT',
        dciConcernee: dciConcernee || null,
        description: description || null,
        dateEmissionDPMED: dateEmissionDPMED ? new Date(dateEmissionDPMED) : new Date(),
        statut: 'EN_DIFFUSION',
      },
    })

    // Diffuser à toutes les pharmacies actives
    const pharmacies = await db.pharmacie.findMany({
      where: { actif: true },
      select: { id: true },
    })

    if (pharmacies.length > 0) {
      await db.diffusionAlerte.createMany({
        data: pharmacies.map(p => ({
          alerteId: alerte.id,
          pharmacieId: p.id,
          statut: 'EN_ATTENTE',
        })),
      })
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_DPMED_ALERT',
        entity: 'AlerteDPMED',
        entityId: alerte.id,
        details: `Alerte DPMED créée: ${titre} (${referenceOfficielle}), diffusée à ${pharmacies.length} pharmacies`,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Alerte créée et diffusée à ${pharmacies.length} pharmacies`,
      alerte,
    }, { status: 201 })
  } catch (error) {
    console.error('Erreur POST admin/alertes-dpmed:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de l\'alerte' }, { status: 500 })
  }
}
