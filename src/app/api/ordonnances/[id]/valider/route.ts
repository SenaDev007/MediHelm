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

    // Validate status flow: RECUE → EN_COURS_VALIDATION → VALIDEE/REFUSEE → DELIVREE
    const validTransitions: Record<string, string[]> = {
      RECUE: ['EN_COURS_VALIDATION', 'VALIDEE', 'REFUSEE'],
      EN_COURS_VALIDATION: ['VALIDEE', 'REFUSEE'],
      VALIDEE: ['DELIVREE', 'PARTIELLEMENT_DELIVREE'],
      PARTIELLEMENT_DELIVREE: ['DELIVREE'],
    }

    // Determine the new status based on validation type
    let newStatut = ordonnance.statut
    if (typeValidation === 'VALIDATION') {
      newStatut = 'VALIDEE'
    } else if (typeValidation === 'REFUS') {
      newStatut = 'REFUSEE'
    } else if (typeValidation === 'EN_COURS') {
      newStatut = 'EN_COURS_VALIDATION'
    } else if (typeValidation === 'DELIVREE') {
      newStatut = 'DELIVREE'
    }

    // Check if transition is valid
    const allowedNext = validTransitions[ordonnance.statut] || []
    if (!allowedNext.includes(newStatut)) {
      return NextResponse.json({ 
        error: `Transition invalide: ${ordonnance.statut} → ${newStatut}. Transitions autorisées: ${allowedNext.join(', ')}` 
      }, { status: 400 })
    }

    // Create the validation record
    const validation = await db.validationPharmacien.create({
      data: {
        ordonnanceId: id,
        utilisateurId,
        typeValidation,
        commentaire: commentaire || null,
      },
      include: {
        utilisateur: { select: { id: true, nom: true, prenom: true } },
      },
    })

    // Update the ordonnance status
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
