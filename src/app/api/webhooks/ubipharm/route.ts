import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.referenceCommande) {
      const commande = await db.commandeGrossiste.findFirst({
        where: { referenceGrossiste: body.referenceCommande },
      })

      if (commande) {
        await db.commandeGrossiste.update({
          where: { id: commande.id },
          data: {
            statut: body.statut ?? 'CONFIRMEE',
            dateConfirmation: new Date(),
            reponseGrossiste: body,
          },
        })
      }
    }

    return NextResponse.json({ message: 'Confirmation UbiPharm reçue' })
  } catch (error) {
    console.error('Erreur POST webhook UbiPharm:', error)
    return NextResponse.json({ error: 'Erreur lors du traitement' }, { status: 500 })
  }
}
