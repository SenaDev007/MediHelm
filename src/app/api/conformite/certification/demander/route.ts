import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pharmacieId } = body

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    const pharmacie = await db.pharmacie.findUnique({
      where: { id: pharmacieId },
      select: { id: true, nom: true },
    })

    if (!pharmacie) {
      return NextResponse.json({ error: 'Pharmacie non trouvée' }, { status: 404 })
    }

    const existing = await db.scoreConformite.findUnique({
      where: { pharmacieId },
    })

    if (existing && existing.certificationDPMED) {
      return NextResponse.json(
        { error: 'Une certification est déjà active pour cette pharmacie' },
        { status: 400 }
      )
    }

    const score = existing || await db.scoreConformite.create({
      data: {
        pharmacieId,
        scoreTotal: 0,
        scoreRegistreStup: 0,
        scoreAlerteDPMED: 0,
        scoreDocuments: 0,
        scorePharmacovigi: 0,
        scoreDestructions: 0,
      },
    })

    const updated = await db.scoreConformite.update({
      where: { id: score.id },
      data: {
        certificationDPMED: true,
        dateCertification: new Date(),
        dateExpirCertification: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    })

    return NextResponse.json({
      success: true,
      certification: {
        id: updated.id,
        pharmacieId,
        pharmacieNom: pharmacie.nom,
        certificationDPMED: updated.certificationDPMED,
        dateCertification: updated.dateCertification,
        dateExpirCertification: updated.dateExpirCertification,
        statut: 'EN_COURS',
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Erreur POST demander certification:', error)
    return NextResponse.json({ error: 'Erreur lors de la demande' }, { status: 500 })
  }
}
