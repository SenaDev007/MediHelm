import { NextRequest } from 'next/server'
import { resolveScan } from '@backend/lib/scan-gs1'
import { getAuthUser } from '@backend/lib/api-auth'
import { rateLimit, RATE_LIMITS } from '@backend/lib/rate-limit'

/**
 * POST /api/scan — résolution d'un scan GS1/code-barres.
 *
 * Auth facultative (F-P12 — vérification sans compte) :
 *  - Utilisateur connecté (tenant pharmacie) : scan à portée officine,
 *    contexte VENTE/RECEPTION/INVENTAIRE/PATIENT, scanné et journalisé (ScanLog).
 *  - Visiteur anonyme : portée GLOBALE (santé publique), contexte PATIENT
 *    uniquement — les contextes métier (POS, réception, inventaire) exigent
 *    une session pharmacie. Aucun ScanLog (pharmacieId requis en DB).
 */
export async function POST(request: NextRequest) {
  // Rate limit public (20 req/min/IP) — le scan est exposé sans compte
  const limited = rateLimit(request, RATE_LIMITS.SEARCH)
  if (limited) return limited

  const user = await getAuthUser(request)
  const utilisateur = user ?? null

  try {
    const body = await request.json()
    const { code, contexte = 'PATIENT' } = body

    if (!code) {
      return Response.json({ error: 'Code-barres requis' }, { status: 400 })
    }

    // Un visiteur anonyme ne peut vérifier qu'en mode PATIENT (vérification publique)
    const contexteFinal = utilisateur ? contexte : 'PATIENT'

    const result = await resolveScan(
      code,
      utilisateur?.pharmacieId ?? null,
      contexteFinal,
      utilisateur?.id
    )
    return Response.json(result)
  } catch (error) {
    console.error('Scan error:', error)
    return Response.json({ error: 'Erreur lors du scan' }, { status: 500 })
  }
}
