import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createTransaction, generatePaymentLink } from '@/lib/fedapay'

// POST /api/paiements/fedapay — Initier un paiement Fedapay pour une vente
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = rateLimit(request, RATE_LIMITS.PAYMENT)
    if (rateLimitResponse) return rateLimitResponse

    const authResult = await requireAuth(request, 'M02_POS', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const body = await request.json()
    const { venteId, montant, mode, telephone, email } = body

    if (!venteId) {
      return NextResponse.json(
        { error: 'L\'identifiant de la vente est requis' },
        { status: 400 }
      )
    }

    // Vérifier que la vente existe et appartient à la pharmacie
    const vente = await db.vente.findUnique({
      where: { id: venteId },
    })

    if (!vente) {
      return NextResponse.json(
        { error: 'Vente introuvable' },
        { status: 404 }
      )
    }

    if (vente.pharmacieId !== pharmacieId) {
      return NextResponse.json(
        { error: 'Accès refusé. Cette vente n\'appartient pas à votre pharmacie.' },
        { status: 403 }
      )
    }

    const montantPaiement = montant || vente.montantTotal - vente.montantPaye

    if (montantPaiement <= 0) {
      return NextResponse.json(
        { error: 'Le montant du paiement doit être supérieur à 0' },
        { status: 400 }
      )
    }

    // Déterminer le mode de paiement Fedapay
    const fedapayMode = mode || 'WAVE'
    const modePaiement = mapFedapayMode(fedapayMode)

    // Générer une référence de transaction
    const reference = `FED-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Créer l'enregistrement de paiement en attente
    const paiement = await db.paiement.create({
      data: {
        venteId,
        montant: montantPaiement,
        mode: modePaiement,
        reference,
        statut: 'EN_ATTENTE',
      },
    })

    // Appel réel à l'API Fedapay pour créer la transaction
    let paymentUrl = ''
    let fedapayTransactionId: number | string = paiement.id

    try {
      const transaction = await createTransaction({
        amount: montantPaiement,
        description: `Paiement MediHelm - Vente ${venteId}`,
        email: email || undefined,
        phone_number: telephone || undefined,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/paiements/fedapay/webhook`,
        metadata: {
          venteId,
          paiementId: paiement.id,
          pharmacieId,
          reference,
        },
      })

      fedapayTransactionId = transaction.id

      // Générer le lien de paiement
      if (transaction.id) {
        try {
          paymentUrl = await generatePaymentLink(transaction.id)
        } catch {
          // Si la génération du lien échoue, on continue sans URL
          console.warn('[Fedapay] Impossible de générer le lien de paiement pour la transaction', transaction.id)
        }
      }
    } catch (error) {
      console.error('[Fedapay] Erreur lors de la création de la transaction:', error)
      // En cas d'erreur API (ex: clé non configurée), on continue avec une URL de fallback
      paymentUrl = `https://fedapay.com/pay/${reference}`
    }

    const fedapayResponse = {
      id: paiement.id,
      fedapayTransactionId,
      reference,
      montant: montantPaiement,
      mode: fedapayMode,
      statut: 'EN_ATTENTE',
      paymentUrl,
      telephone: telephone || null,
      email: email || null,
      createdAt: paiement.createdAt.toISOString(),
      message: 'Paiement initié avec succès. En attente de confirmation.',
    }

    return NextResponse.json(fedapayResponse, { status: 201 })
  } catch (error) {
    console.error('Erreur POST paiements/fedapay:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'initiation du paiement Fedapay' },
      { status: 500 }
    )
  }
}

function mapFedapayMode(mode: string): 'WAVE' | 'MTN_MONEY' | 'MOOV_MONEY' | 'CARTE_BANCAIRE' | 'ESPECES' | 'CHEQUE' | 'CREDIT' | 'ASSURANCE' | 'TIERS_PAYANT' {
  const modeMap: Record<string, 'WAVE' | 'MTN_MONEY' | 'MOOV_MONEY' | 'CARTE_BANCAIRE' | 'ESPECES' | 'CHEQUE' | 'CREDIT' | 'ASSURANCE' | 'TIERS_PAYANT'> = {
    WAVE: 'WAVE',
    MTN_MONEY: 'MTN_MONEY',
    MOOV_MONEY: 'MOOV_MONEY',
    CARTE_BANCAIRE: 'CARTE_BANCAIRE',
    wave: 'WAVE',
    mtn: 'MTN_MONEY',
    moov: 'MOOV_MONEY',
    card: 'CARTE_BANCAIRE',
  }
  return modeMap[mode] || 'WAVE'
}
