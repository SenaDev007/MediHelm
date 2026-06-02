import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { typeValidation, commentaire, utilisateurId } = body

    if (!typeValidation || !utilisateurId) {
      return NextResponse.json({ error: 'typeValidation et utilisateurId requis' }, { status: 400 })
    }

    const ordonnance = await db.ordonnance.findUnique({ where: { id } })
    if (!ordonnance) {
      return NextResponse.json({ error: 'Ordonnance non trouvée' }, { status: 404 })
    }

    // Créer la validation
    const validation = await db.validationPharmacien.create({
      data: {
        ordonnanceId: id,
        utilisateurId,
        typeValidation,
        commentaire: commentaire || null,
      },
    })

    // Mettre à jour le statut de l'ordonnance
    let newStatut = ordonnance.statut
    if (typeValidation === 'VALIDATION') {
      newStatut = 'VALIDEE'
    } else if (typeValidation === 'REFUS') {
      newStatut = 'REFUSEE'
    } else if (typeValidation === 'EN_COURS') {
      newStatut = 'EN_COURS_VALIDATION'
    }

    await db.ordonnance.update({
      where: { id },
      data: { statut: newStatut },
    })

    return NextResponse.json({ validation, newStatut }, { status: 201 })
  } catch (error) {
    console.error('Erreur POST valider ordonnance:', error)
    return NextResponse.json({ error: "Erreur lors de la validation" }, { status: 500 })
  }
}
