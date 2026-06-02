// ============================================================
// MédiHelm — Webhook DPMED (Direction de la Pharmacie et du Médicament)
// Réception des alertes officielles avec validation HMAC-SHA256
// ============================================================

import { db } from '@/lib/db'
import { validateWebhookRequest } from '@/lib/webhook-security'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Validation HMAC-SHA256 avec le secret DPMED
  const result = await validateWebhookRequest(request, 'DPMED_WEBHOOK_SECRET')

  if (!result.valid) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    )
  }

  const body = result.body

  try {
    const alerte = await db.alerteDPMED.create({
      data: {
        referenceOfficielle: body.referenceOfficielle as string,
        titre: body.titre as string,
        description: body.description as string,
        typeAlerte: body.typeAlerte as string,
        niveauUrgence: body.niveauUrgence as string,
        dciConcernee: body.dciConcernee as string,
        numerosLotConcernes: (body.numerosLotConcernes ?? []) as string[],
        fabricantConcerne: body.fabricantConcerne as string,
        sourceEmission: (body.sourceEmission ?? 'DPMED_WEBHOOK') as string,
        documentOfficielUrl: body.documentOfficielUrl as string,
        signatureNumerique: body.signatureNumerique as string,
        dateEmissionDPMED: body.dateEmissionDPMED ? new Date(body.dateEmissionDPMED as string) : new Date(),
        medicamentSurvId: body.medicamentSurvId as string,
        statut: 'EN_DIFFUSION',
      },
    })

    if (body.pharmacieIds && Array.isArray(body.pharmacieIds)) {
      await db.diffusionAlerte.createMany({
        data: (body.pharmacieIds as string[]).map((pharmacieId: string) => ({
          alerteId: alerte.id,
          pharmacieId,
          lotsConcernes: (body.numerosLotConcernes ?? []) as string[],
          canalEnvoi: ['PUSH', 'IN_APP'],
          dateEnvoi: new Date(),
        })),
      })

      await db.alerteDPMED.update({
        where: { id: alerte.id },
        data: { nbOfficinesNotifiees: (body.pharmacieIds as string[]).length },
      })
    }

    return NextResponse.json({ message: 'Alerte DPMED reçue et diffusée', alerte }, { status: 201 })
  } catch (error) {
    console.error('Erreur POST webhook DPMED:', error)
    return NextResponse.json({ error: 'Erreur lors du traitement de l\'alerte' }, { status: 500 })
  }
}
