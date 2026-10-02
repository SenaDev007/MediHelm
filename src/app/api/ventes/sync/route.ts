import { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { requireAuth } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { validate, venteSchema } from '@/lib/validations'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { executerVente } from '@/lib/ventes'

// POST /api/ventes/sync — Synchronisation des ventes hors ligne vers le serveur
// Idempotence: chaque vente doit porter une `reference` locale unique
// (clé d'idempotence); une vente déjà enregistrée avec cette référence est
// ignorée (comptée comme doublon) — aucune vente n'est rejouée deux fois.
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, 'M02_POS', 'write')
  if (authResult instanceof Response) return authResult

  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_MUTATION)
  if (rateLimitResult) return rateLimitResult

  const user = authResult

  try {
    const body = await request.json()
    const { ventes } = body as { ventes: Array<Record<string, unknown>> }

    if (!ventes || !Array.isArray(ventes)) {
      return Response.json({ error: 'Données de ventes requises' }, { status: 400 })
    }

    const results = { succeeded: 0, failed: 0, duplicates: 0, errors: [] as string[] }

    for (const venteData of ventes) {
      try {
        // Validation de chaque vente
        const validation = validate(venteSchema, venteData)
        if (!validation.success) {
          results.failed++
          results.errors.push(`Vente invalide: ${validation.errors.issues.map(i => i.message).join(', ')}`)
          continue
        }

        const data = validation.data

        // Clé d'idempotence: référence locale fournie par le client,
        // sinon UUID généré (non rejouable — à éviter côté client)
        const reference =
          typeof venteData.reference === 'string' && venteData.reference.length >= 6
            ? venteData.reference
            : `VTE-SYNC-${randomUUID()}`

        // La vente existe déjà (rejeu / reprise réseau) → ignorée
        const existante = await db.vente.findUnique({
          where: { reference },
          select: { id: true },
        })
        if (existante) {
          results.duplicates++
          continue
        }

        // Vérification du patient (isolation par pharmacie)
        if (data.patientId) {
          const patient = await db.patient.findFirst({
            where: { id: data.patientId, pharmacieId: user.pharmacieId },
            select: { id: true },
          })
          if (!patient) {
            results.failed++
            results.errors.push('Patient non trouvé pour cette pharmacie')
            continue
          }
        }

        const resultat = await executerVente({
          pharmacieId: user.pharmacieId,
          utilisateurId: user.id,
          lignes: data.lignes,
          modePaiement: data.modePaiement,
          reference,
          patientId: data.patientId,
          ordonnanceId: data.ordonnanceId,
        })

        if (resultat.ok) {
          results.succeeded++
        } else {
          results.failed++
          results.errors.push(resultat.error)
        }
      } catch (error) {
        results.failed++
        results.errors.push(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
      }
    }

    return Response.json({
      ...results,
      total: ventes.length,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Sync error:', error)
    return Response.json({ error: 'Erreur de synchronisation' }, { status: 500 })
  }
}
