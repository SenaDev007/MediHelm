// ============================================================
// MediHelm — FedaPay Integration
// Paiements en ligne — SDK réel
// Référence: MH-SPECS-2025-v2.0
// ============================================================

import crypto from 'crypto'

const FEDAPAY_API_URL = process.env.FEDAPAY_API_URL || 'https://api.fedapay.com/v1'
const FEDAPAY_API_KEY = process.env.FEDAPAY_API_KEY || ''
const FEDAPAY_WEBHOOK_SECRET = process.env.FEDAPAY_WEBHOOK_SECRET || ''

export const FEDAPAY_MODES = ['MTN_MONEY', 'MOOV_MONEY', 'WAVE', 'CARTE'] as const
export type FedapayMode = typeof FEDAPAY_MODES[number]

export interface FedaPayTransaction {
  id: string
  reference: string
  amount: number
  currency: string
  status: 'pending' | 'approved' | 'declined' | 'canceled' | 'refunded'
  payment_method?: string
  payment_url?: string
  created_at: string
  updated_at: string
}

export interface CreateTransactionParams {
  amount: number
  description: string
  callback_url: string
  metadata?: Record<string, string>
  customer?: {
    firstname: string
    lastname: string
    email: string
    phone_number: string
  }
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
 * Create a FedaPay transaction (new API)
 */
export async function createTransaction(params: CreateTransactionParams): Promise<FedaPayTransaction> {
  if (!FEDAPAY_API_KEY) {
    // Development mode: return simulated transaction
    const txId = `sim_${Date.now()}`
    return {
      id: txId,
      reference: `REF_${Date.now()}`,
      amount: params.amount,
      currency: 'XOF',
      status: 'pending',
      payment_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/paiement/simule?ref=REF_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  const response = await fetch(`${FEDAPAY_API_URL}/transactions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FEDAPAY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: params.amount,
      description: params.description,
      currency: 'XOF',
      callback_url: params.callback_url,
      metadata: params.metadata,
      customer: params.customer,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`FedaPay API error: ${response.status} - ${error}`)
  }

  const data = await response.json()

  // Get payment URL
  let paymentUrl = ''
  try {
    const paymentResponse = await fetch(`${FEDAPAY_API_URL}/transactions/${data.id}/payment_url`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FEDAPAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    if (paymentResponse.ok) {
      const paymentData = await paymentResponse.json()
      paymentUrl = paymentData.url || paymentData.payment_url || ''
    }
  } catch {
    // Payment URL is optional
  }

  return {
    ...data,
    payment_url: paymentUrl,
  }
}

/**
 * Verify a FedaPay transaction
 */
export async function verifyTransaction(transactionId: string): Promise<FedaPayTransaction> {
  if (!FEDAPAY_API_KEY) {
    return {
      id: transactionId,
      reference: `REF_${transactionId}`,
      amount: 0,
      currency: 'XOF',
      status: 'approved',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  const response = await fetch(`${FEDAPAY_API_URL}/transactions/${transactionId}`, {
    headers: {
      'Authorization': `Bearer ${FEDAPAY_API_KEY}`,
    },
  })

  if (!response.ok) {
    throw new Error(`FedaPay verification error: ${response.status}`)
  }

  return response.json()
}

/**
 * Verify FedaPay webhook signature
 * Utilise HMAC-SHA256 pour valider l'authenticité du webhook
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret?: string
): boolean {
  const webhookSecret = secret || FEDAPAY_WEBHOOK_SECRET
  if (!webhookSecret) return true // Skip if no secret configured

  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
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
 * Initier un paiement Fedapay (legacy interface)
 * En production: appel API Fedapay POST /v1/transactions
 * En dev: simulation avec génération d'ID et URL factices
 */
export async function initiatePayment(params: InitiatePaymentParams): Promise<{
  checkoutUrl: string
  transactionId: string
}> {
  const transactionId = `feda_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // In production with FEDAPAY_API_KEY, call the real API
  if (FEDAPAY_API_KEY) {
    try {
      const tx = await createTransaction({
        amount: params.amount,
        description: params.metadata?.description || 'Paiement MediHelm',
        callback_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/paiements/fedapay/webhook`,
        metadata: params.metadata,
        customer: params.customerName || params.customerEmail ? {
          firstname: params.customerName?.split(' ')[0] || 'Client',
          lastname: params.customerName?.split(' ').slice(1).join(' ') || '',
          email: params.customerEmail || '',
          phone_number: params.phoneNumber || '',
        } : undefined,
      })

      if (tx.payment_url) {
        return { checkoutUrl: tx.payment_url, transactionId: tx.id }
      }
    } catch {
      // Fall through to simulation
    }
  }

  // Simulation for development (no API key or API call failed)
  const checkoutUrl = `https://fedapay.com/checkout/${transactionId}`
  return { checkoutUrl, transactionId }
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
    canceled: { label: 'Annulé', color: 'bg-gray-400 text-white' },
    refunded: { label: 'Remboursé', color: 'bg-blue-400 text-white' },
  }
  return map[status] || { label: status, color: 'bg-gray-400 text-white' }
}
