// ============================================================
// MédiHelm — Fedapay SDK Simulation
// Benin-based payment gateway integration (similar to Stripe)
// In production: POST https://api.fedapay.com/v1/transactions
// ============================================================

import crypto from 'crypto'

export const FEDAPAY_MODES = ['MTN_MONEY', 'MOOV_MONEY', 'WAVE', 'CARTE'] as const
export type FedapayMode = typeof FEDAPAY_MODES[number]

export interface FedapayTransaction {
  id: string
  amount: number
  status: 'pending' | 'approved' | 'declined' | 'cancelled'
  mode: string
  createdAt: Date
  phoneNumber?: string
  customerEmail?: string
  customerName?: string
  metadata?: Record<string, string>
}

export interface InitiatePaymentParams {
  amount: number
  mode: string
  phoneNumber?: string
  customerEmail?: string
  customerName?: string
  metadata?: Record<string, string>
}

/**
 * Initier un paiement Fedapay
 * En production: appel API Fedapay POST /v1/transactions
 * En dev: simulation avec génération d'ID et URL factices
 */
export async function initiatePayment(params: InitiatePaymentParams): Promise<{
  checkoutUrl: string
  transactionId: string
}> {
  const transactionId = `feda_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // In production, call Fedapay API:
  // const response = await fetch('https://api.fedapay.com/v1/transactions', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${process.env.FEDAPAY_API_KEY}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     amount: params.amount,
  //     currency: { iso: 'XOF' },
  //     mode: params.mode,
  //     phone_number: params.phoneNumber,
  //     customer: {
  //       email: params.customerEmail,
  //       firstname: params.customerName?.split(' ')[0],
  //       lastname: params.customerName?.split(' ').slice(1).join(' '),
  //     },
  //     metadata: params.metadata,
  //   }),
  // })
  // const data = await response.json()
  // return { checkoutUrl: data.url, transactionId: data.id }

  // Simulation for development
  const checkoutUrl = `https://fedapay.com/checkout/${transactionId}`
  return { checkoutUrl, transactionId }
}

/**
 * Vérifier la signature d'un webhook Fedapay
 * Utilise HMAC-SHA256 pour valider l'authenticité du webhook
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSig)
    )
  } catch {
    return false
  }
}

/**
 * Formater un mode de paiement Fedapay pour l'affichage
 */
export function getFedapayModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    MTN_MONEY: 'MTN Money',
    MOOV_MONEY: 'Moov Money',
    WAVE: 'Wave',
    CARTE: 'Carte bancaire',
  }
  return labels[mode] || mode
}

/**
 * Formater un statut de transaction Fedapay
 */
export function getFedapayStatusLabel(status: string): {
  label: string
  color: string
} {
  const map: Record<string, { label: string; color: string }> = {
    pending: { label: 'En attente', color: 'bg-amber-400 text-gray-900' },
    approved: { label: 'Approuvé', color: 'bg-primary text-white' },
    declined: { label: 'Refusé', color: 'bg-destructive text-white' },
    cancelled: { label: 'Annulé', color: 'bg-gray-400 text-white' },
  }
  return map[status] || { label: status, color: 'bg-gray-400 text-white' }
}
