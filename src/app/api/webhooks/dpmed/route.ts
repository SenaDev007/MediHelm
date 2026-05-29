import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const alerte = await db.alerteDPMED.create({
      data: {
        referenceOfficielle: body.referenceOfficielle,
        titre: body.titre,
        description: body.description,
        typeAlerte: body.typeAlerte,
        niveauUrgence: body.niveauUrgence,
        dciConcernee: body.dciConcernee,
        numerosLotConcernes: body.numerosLotConcernes ?? [],
        fabricantConcerne: body.fabricantConcerne,
        sourceEmission: body.sourceEmission ?? 'DPMED_WEBHOOK',
        documentOfficielUrl: body.documentOfficielUrl,
        signatureNumerique: body.signatureNumerique,
        dateEmissionDPMED: body.dateEmissionDPMED ? new Date(body.dateEmissionDPMED) : new Date(),
        medicamentSurvId: body.medicamentSurvId,
        statut: 'EN_DIFFUSION',
      },
    })

    if (body.pharmacieIds && Array.isArray(body.pharmacieIds)) {
      await db.diffusionAlerte.createMany({
        data: body.pharmacieIds.map((pharmacieId: string) => ({
          alerteId: alerte.id,
          pharmacieId,
          lotsConcernes: body.numerosLotConcernes ?? [],
          canalEnvoi: ['PUSH', 'IN_APP'],
          dateEnvoi: new Date(),
        })),
      })

      await db.alerteDPMED.update({
        where: { id: alerte.id },
        data: { nbOfficinesNotifiees: body.pharmacieIds.length },
      })
    }

    return NextResponse.json({ message: 'Alerte DPMED reçue et diffusée', alerte }, { status: 201 })
  } catch (error) {
    console.error('Erreur POST webhook DPMED:', error)
    return NextResponse.json({ error: 'Erreur lors du traitement de l\'alerte' }, { status: 500 })
  }
}
