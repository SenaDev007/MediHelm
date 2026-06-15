// ============================================================
// MédiHelm — Image / Scan d'ordonnance
// GET /api/ordonnances/[id]/image
// Retourne les détails de l'ordonnance avec l'URL de l'image si disponible
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentification + RBAC
    const authResult = await requireAuth(request, 'M06_ORDONNANCES', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { id } = await params

    // 2. Récupérer l'ordonnance
    const ordonnance = await db.ordonnance.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            telephone: true,
          },
        },
        lignes: true,
      },
    })

    if (!ordonnance) {
      return NextResponse.json(
        { error: 'Ordonnance non trouvée' },
        { status: 404 }
      )
    }

    // 3. Vérifier l'accès à la pharmacie
    if (ordonnance.pharmacieId !== user.pharmacieId) {
      return NextResponse.json(
        { error: 'Accès refusé. Cette ordonnance n\'appartient pas à votre pharmacie.' },
        { status: 403 }
      )
    }

    // 4. Retourner les détails avec l'image
    return NextResponse.json({
      id: ordonnance.id,
      pharmacieId: ordonnance.pharmacieId,
      patientId: ordonnance.patientId,
      prescripteur: ordonnance.prescripteur,
      dateOrdonnance: ordonnance.dateOrdonnance,
      statut: ordonnance.statut,
      imageUrl: ordonnance.imageUrl,
      hasImage: !!ordonnance.imageUrl,
      notes: ordonnance.notes,
      verifiePar: ordonnance.verifiePar,
      verifieLe: ordonnance.verifieLe,
      patient: ordonnance.patient,
      lignes: ordonnance.lignes,
      createdAt: ordonnance.createdAt,
    })

  } catch (error) {
    console.error('Erreur récupération image ordonnance:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'ordonnance' },
      { status: 500 }
    )
  }
}
