import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.pharmacieId) {
      await db.confirmationReceptionSoBAPS.create({
        data: {
          pharmacieId: body.pharmacieId,
          bonLivraisonRef: body.bonLivraisonRef,
          dateReception: body.dateReception ? new Date(body.dateReception) : new Date(),
          statut: body.statut ?? 'CONFORME',
          ecarts: body.ecarts,
          webhookSent: true,
          webhookSentAt: new Date(),
        },
      })
    }

    return NextResponse.json({ message: 'Confirmation SoBAPS reçue' })
  } catch (error) {
    console.error('Erreur POST webhook SoBAPS:', error)
    return NextResponse.json({ error: 'Erreur lors du traitement' }, { status: 500 })
  }
}
