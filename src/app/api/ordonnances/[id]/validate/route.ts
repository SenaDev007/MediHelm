import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/ordonnances/[id]/validate
// Accepts type: 'APPROBATION' | 'REFUS' (maps to VALIDATION/REFUS internally)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { type, commentaire, utilisateurId } = body

    if (!type || !utilisateurId) {
      return NextResponse.json({ error: 'type et utilisateurId requis' }, { status: 400 })
    }

    const ordonnance = await db.ordonnance.findUnique({ where: { id } })
    if (!ordonnance) {
      return NextResponse.json({ error: 'Ordonnance non trouvée' }, { status: 404 })
    }

    // Map APPROBATION → VALIDATION, REFUS → REFUS
    let internalType = type
    if (type === 'APPROBATION') internalType = 'VALIDATION'

    // Determine new status based on type
    let newStatut = ordonnance.statut
    if (internalType === 'VALIDATION') {
      newStatut = 'VALIDEE'
    } else if (internalType === 'REFUS') {
      newStatut = 'REFUSEE'
    } else if (internalType === 'EN_COURS') {
      newStatut = 'EN_COURS_VALIDATION'
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      RECUE: ['EN_COURS_VALIDATION', 'VALIDEE', 'REFUSEE'],
      EN_COURS_VALIDATION: ['VALIDEE', 'REFUSEE'],
      VALIDEE: ['DELIVREE', 'PARTIELLEMENT_DELIVREE'],
      PARTIELLEMENT_DELIVREE: ['DELIVREE'],
    }

    const allowedNext = validTransitions[ordonnance.statut] || []
    if (!allowedNext.includes(newStatut)) {
      return NextResponse.json({
        error: `Transition invalide: ${ordonnance.statut} → ${newStatut}. Transitions autorisées: ${allowedNext.join(', ')}`,
      }, { status: 400 })
    }

    // Create ValidationPharmacien record
    const validation = await db.validationPharmacien.create({
      data: {
        ordonnanceId: id,
        utilisateurId,
        typeValidation: internalType,
        commentaire: commentaire || null,
      },
      include: {
        utilisateur: { select: { id: true, nom: true, prenom: true } },
      },
    })

    // Update ordonnance status
    await db.ordonnance.update({
      where: { id },
      data: { statut: newStatut },
    })

    return NextResponse.json({
      validation,
      newStatut,
    }, { status: 201 })
  } catch (error) {
    console.error('Erreur POST validate ordonnance:', error)
    return NextResponse.json({ error: 'Erreur lors de la validation' }, { status: 500 })
  }
}
