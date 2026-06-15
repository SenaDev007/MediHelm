// ============================================================
// MediHelm — Webhook DPMED (Direction de la Pharmacie et du Médicament)
// Réception des alertes officielles (rappels, contrefaçons, pharmacovigilance)
// Validation HMAC-SHA256 — Code d'erreur MH-SEC-001 pour signature invalide
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

/**
 * Valide la signature HMAC-SHA256 d'un webhook DPMED.
 *
 * @param payload - Corps brut de la requête (string)
 * @param signature - Valeur de l'en-tête X-DPMED-Signature
 * @param secret - Secret partagé (env DPMED_WEBHOOK_SECRET)
 * @returns true si la signature est valide
 */
function validateSignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

export async function POST(request: NextRequest) {
  try {
    // 1. Récupérer le corps brut pour la vérification de signature
    const rawBody = await request.text()
    const signature = request.headers.get('X-DPMED-Signature')
    const secret = process.env.DPMED_WEBHOOK_SECRET

    // 2. Vérifier la présence du secret et de la signature
    if (!secret) {
      console.error('[DPMED Webhook] Secret DPMED_WEBHOOK_SECRET non configuré')
      return NextResponse.json(
        { error: 'Configuration serveur incomplète' },
        { status: 500 }
      )
    }

    if (!signature) {
      return NextResponse.json(
        { error: 'Signature manquante', code: 'MH-SEC-001' },
        { status: 401 }
      )
    }

    // 3. Valider la signature HMAC-SHA256
    if (!validateSignature(rawBody, signature, secret)) {
      return NextResponse.json(
        { error: 'Signature invalide', code: 'MH-SEC-001' },
        { status: 401 }
      )
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
      pharmaciesConcernees,
    } = data as {
      referenceOfficielle?: string
      titre?: string
      typeAlerte?: string
      niveauUrgence?: string
      dciConcernee?: string
      description?: string
      dateEmissionDPMED?: string
      pharmaciesConcernees?: string[]
    }

    if (!referenceOfficielle || !titre || !dateEmissionDPMED) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants : referenceOfficielle, titre, dateEmissionDPMED' },
        { status: 400 }
      )
    }

    // 6. Vérifier si l'alerte existe déjà (déduplication par référence)
    const existing = await db.alerteDPMED.findUnique({
      where: { referenceOfficielle },
    })

    if (existing) {
      return NextResponse.json(
        { message: 'Alerte déjà reçue', alerteId: existing.id },
        { status: 200 }
      )
    }

    // 7. Créer l'alerte DPMED
    const alerte = await db.alerteDPMED.create({
      data: {
        referenceOfficielle,
        titre,
        typeAlerte: (typeAlerte as 'RAPPEL_LOT' | 'CONTREFACON' | 'AMM_SUSPENDUE' | 'INTERDICTION' | 'INFORMATION' | 'PHARMACOVIGILANCE') || 'INFORMATION',
        niveauUrgence: (niveauUrgence as 'INFO' | 'ATTENTION' | 'URGENT' | 'URGENCE_IMMEDIATE') || 'INFO',
        dciConcernee: dciConcernee || null,
        description: description || null,
        signatureNumerique: signature,
        dateEmissionDPMED: new Date(dateEmissionDPMED),
        statut: 'EN_DIFFUSION',
      },
    })

    // 8. Déterminer les pharmacies concernées
    let pharmacieIds: string[] = []

    if (pharmaciesConcernees && Array.isArray(pharmaciesConcernees) && pharmaciesConcernees.length > 0) {
      // pharmaciesConcernees contient des IDs de pharmacies
      const found = await db.pharmacie.findMany({
        where: {
          id: { in: pharmaciesConcernees },
          actif: true,
        },
        select: { id: true },
      })
      pharmacieIds = found.map((p) => p.id)
    } else {
      // Diffuser à toutes les pharmacies actives
      const allPharmacies = await db.pharmacie.findMany({
        where: { actif: true },
        select: { id: true },
      })
      pharmacieIds = allPharmacies.map((p) => p.id)
    }

    // 9. Créer les diffusions pour chaque pharmacie concernée
    if (pharmacieIds.length > 0) {
      await db.diffusionAlerte.createMany({
        data: pharmacieIds.map((pharmacieId) => ({
          alerteId: alerte.id,
          pharmacieId,
          statut: 'EN_ATTENTE',
        })),
      })
    }

    // 10. Retourner le résultat
    return NextResponse.json({
      alerteId: alerte.id,
      nbPharmaciesNotifiees: pharmacieIds.length,
    }, { status: 200 })

  } catch (error) {
    console.error('[DPMED Webhook] Erreur traitement:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur lors du traitement du webhook' },
      { status: 500 }
    )
  }
}
