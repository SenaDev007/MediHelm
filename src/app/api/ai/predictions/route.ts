// ============================================================
// MédiHelm — Prédictions IA
// GET /api/ai/predictions — Liste des prédictions pour la pharmacie
// POST /api/ai/predictions — Générer une nouvelle prédiction (simplifié)
// Permission : M15_ANALYTICS read/write
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

/**
 * GET — Récupérer les prédictions IA pour la pharmacie
 * Filtres : type (stock_forecast, sales_trend, etc.), domaine
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authentification + RBAC
    const authResult = await requireAuth(request, 'M15_ANALYTICS', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    // 2. Extraire les paramètres de filtre
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as string | null
    const domaine = searchParams.get('domaine') as string | null
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)

    // 3. Construire les filtres
    const where: Record<string, unknown> = {
      pharmacieId: user.pharmacieId,
    }

    if (type) {
      where.type = type
    }

    if (domaine) {
      where.domaine = domaine
    }

    // 4. Récupérer les prédictions
    const [predictions, total] = await Promise.all([
      db.predictionIA.findMany({
        where,
        orderBy: { genereeLe: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.predictionIA.count({ where }),
    ])

    // 5. Retourner les résultats
    return NextResponse.json({
      data: predictions.map((p) => ({
        ...p,
        donnees: typeof p.donnees === 'string' ? JSON.parse(p.donnees) : p.donnees,
        prediction: typeof p.prediction === 'string' ? JSON.parse(p.prediction) : p.prediction,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })

  } catch (error) {
    console.error('Erreur récupération prédictions IA:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des prédictions' },
      { status: 500 }
    )
  }
}

/**
 * POST — Générer une nouvelle prédiction (simplifié : enregistre la demande)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentification + RBAC
    const authResult = await requireAuth(request, 'M15_ANALYTICS', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

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

    const { type, domaine, donnees } = body as {
      type?: string
      domaine?: string
      donnees?: Record<string, unknown>
    }

    // 3. Valider les champs obligatoires
    if (!type || !domaine) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants : type, domaine' },
        { status: 400 }
      )
    }

    // 4. Types de prédiction valides
    const validTypes = [
      'stock_forecast',
      'sales_trend',
      'demand_prediction',
      'expiry_risk',
      'reorder_suggestion',
      'seasonal_analysis',
    ]

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Type de prédiction invalide. Types acceptés : ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // 5. Générer une prédiction simplifiée (en production, appel au modèle IA)
    // Pour le moment, on crée un enregistrement avec des données de base
    const prediction = await db.predictionIA.create({
      data: {
        pharmacieId: user.pharmacieId,
        type,
        domaine,
        donnees: JSON.stringify(donnees || {}),
        prediction: JSON.stringify({
          status: 'generated',
          generatedAt: new Date().toISOString(),
          modele: 'simplified_v1',
          pharmacieId: user.pharmacieId,
        }),
        confiance: 0.75,
        genereeLe: new Date(),
        expireLe: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expire dans 7 jours
      },
    })

    // 6. Journaliser
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'PREDICTION_IA_GENEREE',
        entity: 'PredictionIA',
        entityId: prediction.id,
        details: JSON.stringify({
          type,
          domaine,
          pharmacieId: user.pharmacieId,
        }),
      },
    })

    return NextResponse.json({
      message: 'Prédiction générée avec succès',
      prediction: {
        ...prediction,
        donnees: typeof prediction.donnees === 'string' ? JSON.parse(prediction.donnees) : prediction.donnees,
        prediction: typeof prediction.prediction === 'string' ? JSON.parse(prediction.prediction) : prediction.prediction,
      },
    }, { status: 201 })

  } catch (error) {
    console.error('Erreur génération prédiction IA:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération de la prédiction' },
      { status: 500 }
    )
  }
}
