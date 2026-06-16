// ============================================================
// MediHelm — Webhook DPMED (Direction de la Pharmacie et du Médicament)
// Réception des alertes officielles (rappels, contrefaçons, pharmacovigilance)
// 10-step pipeline: reception → HMAC verification → IP whitelist →
//   RSA-256 → deduplication → DB → pharmacy identification →
//   patient identification → push FCM → SMS AfricasTalking
// Validation HMAC-SHA256 — Code d'erreur MH-SEC-001 pour signature invalide
// Référence: MH-SPECS-2025-v2.0 — M18 Alertes DPMED
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { processDPMEDAlert, type DPMEDAlertPayload } from '@/lib/dpmed-alert-pipeline'
import { verifyWebhookHMAC, getWebhookSignature, isIPWhitelisted, getClientIP } from '@/lib/webhook-hmac'

/**
 * Valide la signature HMAC-SHA256 d'un webhook DPMED.
 *
 * @param payload - Corps brut de la requête (string)
 * @param signature - Valeur de l'en-tête X-DPMED-Signature
 * @param secret - Secret partagé (env DPMED_WEBHOOK_SECRET)
 * @returns true si la signature est valide
 */
function verifyHMAC(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Récupérer le corps brut pour la vérification de signature
    const rawBody = await request.text()

    // 2. Extract client IP and verify whitelist
    const clientIp = getClientIP(request)
    if (!isIPWhitelisted('dpmed', clientIp)) {
      console.warn(`[DPMED Webhook] IP non autorisée: ${clientIp}`)
      return NextResponse.json(
        { error: `IP ${clientIp} non autorisée`, code: 'MH-SEC-002' },
        { status: 403 }
      )
    }

    // 3. Vérifier la signature HMAC-SHA256
    const signature = request.headers.get('X-DPMED-Signature') || getWebhookSignature(request, 'dpmed')
    const secret = process.env.DPMED_WEBHOOK_SECRET

    if (secret && !signature) {
      return NextResponse.json(
        { error: 'Signature manquante', code: 'MH-SEC-001' },
        { status: 401 }
      )
    }

    if (secret && signature && !verifyHMAC(rawBody, signature, secret)) {
      return NextResponse.json(
        { error: 'Signature invalide', code: 'MH-SEC-001' },
        { status: 401 }
      )
    }

    // Also use the centralized HMAC verification as a secondary check
    if (signature && secret) {
      if (!verifyWebhookHMAC('dpmed', rawBody, signature)) {
        return NextResponse.json(
          { error: 'Signature HMAC invalide', code: 'MH-SEC-001' },
          { status: 401 }
        )
      }
    }

    // 4. Parser le corps de la requête
    let data: Record<string, unknown>
    try {
      data = JSON.parse(rawBody)
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête JSON invalide' },
        { status: 400 }
      )
    }

    // 5. Valider les champs obligatoires
    const {
      referenceOfficielle,
      titre,
      typeAlerte,
      niveauUrgence,
      dciConcernee,
      description,
      dateEmissionDPMED,
      signatureNumerique,
      pharmaciesConcernees,
    } = data as {
      referenceOfficielle?: string
      titre?: string
      typeAlerte?: string
      niveauUrgence?: string
      dciConcernee?: string
      description?: string
      dateEmissionDPMED?: string
      signatureNumerique?: string
      pharmaciesConcernees?: string[]
    }

    if (!referenceOfficielle || !titre || !dateEmissionDPMED) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants : referenceOfficielle, titre, dateEmissionDPMED' },
        { status: 400 }
      )
    }

    // 6. Build the DPMED alert payload and run the full 10-step pipeline
    const payload: DPMEDAlertPayload = {
      referenceOfficielle,
      titre,
      typeAlerte: (typeAlerte as DPMEDAlertPayload['typeAlerte']) || 'INFORMATION',
      niveauUrgence: (niveauUrgence as DPMEDAlertPayload['niveauUrgence']) || 'INFO',
      dciConcernee: dciConcernee || undefined,
      description: description || undefined,
      dateEmissionDPMED,
      signatureNumerique: signatureNumerique || undefined,
      pharmaciesConcernees: pharmaciesConcernees || undefined,
    }

    const result = await processDPMEDAlert(payload, clientIp)

    // 7. Retourner le résultat du pipeline
    if (!result.success) {
      return NextResponse.json(
        { error: 'Erreur de traitement', details: result.errors },
        { status: 500 }
      )
    }

    return NextResponse.json({
      alerteId: result.alerteId,
      nbPharmaciesNotifiees: result.pharmaciesNotifiees,
      nbPatientsNotifies: result.patientsNotifies,
      tempsTotal: result.tempsTotal,
      warnings: result.errors,
    }, { status: 200 })

  } catch (error) {
    console.error('[DPMED Webhook] Erreur traitement:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur lors du traitement du webhook' },
      { status: 500 }
    )
  }
}
