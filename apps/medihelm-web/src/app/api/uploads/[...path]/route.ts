// ============================================================
// MediHelm — Gestion des fichiers uploadés
// GET /api/uploads/[...path] — Servir les métadonnées d'un fichier
// POST /api/uploads/[...path] — Uploader un fichier (simplifié : métadonnées)
// Permission : M13_DOCUMENTS read/write
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET — Récupérer les métadonnées d'un fichier / document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_GENERAL)
  if (rateLimitResult) return rateLimitResult

  try {
    // 1. Authentification + RBAC
    const authResult = await requireAuth(request, 'M13_DOCUMENTS', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { path: pathSegments } = await params

    // 2. Reconstruire le chemin du fichier
    const filePath = pathSegments.join('/')

    // 3. Chercher le document par URL de fichier
    const document = await db.document.findFirst({
      where: {
        pharmacieId: user.pharmacieId,
        fichierUrl: { contains: filePath },
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Fichier non trouvé' },
        { status: 404 }
      )
    }

    // 4. Retourner les métadonnées du fichier
    return NextResponse.json({
      id: document.id,
      type: document.type,
      titre: document.titre,
      fichierUrl: document.fichierUrl,
      statut: document.statut,
      dateValidite: document.dateValidite?.toISOString() || null,
      creePar: document.creePar,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    })

  } catch (error) {
    console.error('Erreur récupération fichier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du fichier' },
      { status: 500 }
    )
  }
}

/**
 * POST — Uploader un fichier (simplifié : enregistrer les métadonnées)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.UPLOAD)
  if (rateLimitResult) return rateLimitResult

  try {
    // 1. Authentification + RBAC
    const authResult = await requireAuth(request, 'M13_DOCUMENTS', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { path: pathSegments } = await params
    const filePath = pathSegments.join('/')

    // 2. Parser le corps de la requête (FormData ou JSON)
    let titre: string | undefined
    let typeDoc: string | undefined
    let fichierUrl: string | undefined

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // Traitement FormData simplifié
      const formData = await request.formData()
      titre = formData.get('titre') as string | undefined
      typeDoc = formData.get('type') as string | undefined
      fichierUrl = formData.get('fichierUrl') as string | undefined
    } else {
      // Traitement JSON
      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return NextResponse.json(
          { error: 'Corps de requête invalide' },
          { status: 400 }
        )
      }
      titre = body.titre as string | undefined
      typeDoc = body.type as string | undefined
      fichierUrl = body.fichierUrl as string | undefined
    }

    // 3. Valider les champs obligatoires
    if (!titre) {
      return NextResponse.json(
        { error: 'Le titre du document est obligatoire' },
        { status: 400 }
      )
    }

    // 4. Créer le document (métadonnées)
    const document = await db.document.create({
      data: {
        pharmacieId: user.pharmacieId,
        type: (typeDoc as 'REGISTRE_STUPEFIANTS' | 'ORDONNANCE' | 'DECLARATION_TRIMESTRIELLE' | 'RAPPORT_PHARMACOVIGILANCE' | 'RAPPORT_DESTRUCTION' | 'CERTIFICATION' | 'LICENCE' | 'AUTRE') || 'AUTRE',
        titre,
        fichierUrl: fichierUrl || `/uploads/${filePath}`,
        statut: 'BROUILLON',
        creePar: user.id,
      },
    })

    // 5. Journaliser
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'DOCUMENT_UPLOADED',
        entity: 'Document',
        entityId: document.id,
        details: JSON.stringify({
          titre,
          type: typeDoc || 'AUTRE',
          fichierUrl: document.fichierUrl,
          pharmacieId: user.pharmacieId,
        }),
      },
    })

    return NextResponse.json({
      message: 'Fichier enregistré avec succès',
      document: {
        id: document.id,
        type: document.type,
        titre: document.titre,
        fichierUrl: document.fichierUrl,
        statut: document.statut,
        createdAt: document.createdAt.toISOString(),
      },
    }, { status: 201 })

  } catch (error) {
    console.error('Erreur upload fichier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement du fichier' },
      { status: 500 }
    )
  }
}
