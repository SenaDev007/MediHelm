// ============================================================
// MédiHelm — Validation d'ordonnance (vérification pharmacien)
// POST /api/ordonnances/[id]/validate
// Change le statut de EN_VERIFICATION vers VALIDEE ou REFUSEE
// Enregistre le pharmacien validateur
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentification + RBAC
    const authResult = await requireAuth(request, 'M06_ORDONNANCES', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { id } = await params

    // 2. Parser le corps de la requête
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête JSON invalide' },
        { status: 400 }
      )
    }

    const { statut, motifRefus } = body as { statut?: string; motifRefus?: string }

    // 3. Valider le statut demandé
    if (!statut || !['VALIDEE', 'REFUSEE'].includes(statut)) {
      return NextResponse.json(
        { error: 'Statut invalide. Valeurs acceptées : VALIDEE, REFUSEE' },
        { status: 400 }
      )
    }

    // 4. Récupérer l'ordonnance
    const ordonnance = await db.ordonnance.findUnique({
      where: { id },
    })

    if (!ordonnance) {
      return NextResponse.json(
        { error: 'Ordonnance non trouvée' },
        { status: 404 }
      )
    }

    // 5. Vérifier l'accès à la pharmacie
    if (ordonnance.pharmacieId !== user.pharmacieId) {
      return NextResponse.json(
        { error: 'Accès refusé. Cette ordonnance n\'appartient pas à votre pharmacie.' },
        { status: 403 }
      )
    }

    // 6. Vérifier que l'ordonnance est en cours de vérification
    if (ordonnance.statut !== 'EN_VERIFICATION') {
      return NextResponse.json(
        { error: `L'ordonnance ne peut pas être validée. Statut actuel : ${ordonnance.statut}. Seules les ordonnances en vérification peuvent être validées.` },
        { status: 400 }
      )
    }

    // 7. Si REFUSEE, un motif est obligatoire
    if (statut === 'REFUSEE' && !motifRefus) {
      return NextResponse.json(
        { error: 'Le motif de refus est obligatoire lors du refus d\'une ordonnance' },
        { status: 400 }
      )
    }

    // 8. Mettre à jour l'ordonnance
    const updatedOrdonnance = await db.ordonnance.update({
      where: { id },
      data: {
        statut: statut as 'VALIDEE' | 'REFUSEE',
        verifiePar: user.id,
        verifieLe: new Date(),
        ...(statut === 'REFUSEE' && motifRefus && {
          notes: ordonnance.notes
            ? `${ordonnance.notes}\n[Motif de refus] ${motifRefus}`
            : `[Motif de refus] ${motifRefus}`,
        }),
      },
    })

    // 9. Journaliser la validation
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: statut === 'VALIDEE' ? 'ORDONNANCE_VALIDEE' : 'ORDONNANCE_REFUSEE',
        entity: 'Ordonnance',
        entityId: id,
        details: JSON.stringify({
          ancienStatut: ordonnance.statut,
          nouveauStatut: statut,
          pharmacieId: user.pharmacieId,
          motifRefus: statut === 'REFUSEE' ? motifRefus : null,
        }),
      },
    })

    return NextResponse.json({
      message: statut === 'VALIDEE'
        ? 'Ordonnance validée avec succès'
        : 'Ordonnance refusée',
      ordonnance: updatedOrdonnance,
    }, { status: 200 })

  } catch (error) {
    console.error('Erreur validation ordonnance:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la validation de l\'ordonnance' },
      { status: 500 }
    )
  }
}
