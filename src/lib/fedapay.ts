// ============================================================
// MediHelm — Fedapay Payment Integration
// Real API integration with Fedapay (Bénin payment gateway)
// Supports: Mobile Money (MTN, Moov), Wave, Card
// Référence: MH-SPECS-2025-v2.0 — Paiement Fedapay
// ============================================================

const FEDAPAY_BASE_URL = process.env.FEDAPAY_ENV === 'live'
  ? 'https://api.fedapay.com/v1'
  : 'https://sandbox-api.fedapay.com/v1'

const FEDAPAY_SECRET_KEY = process.env.FEDAPAY_SECRET_KEY || ''

export interface FedapayTransactionRequest {
  amount: number
  description: string
  currency?: string
  email?: string
  phone_number?: string
  first_name?: string
  last_name?: string
  callback_url?: string
  metadata?: Record<string, string>
}

export interface FedapayTransaction {
  id: number
  reference: string
  amount: number
  status: 'pending' | 'approved' | 'declined' | 'canceled' | 'refunded'
  created_at: string
  updated_at: string
  payment_url?: string
  payment_method?: string
}

export interface FedapayPayoutRequest {
  amount: number
  account_number: string
  account_type: 'MOBILE_MONEY' | 'BANK_ACCOUNT'
  provider?: 'MTN' | 'MOOV' | 'WAVE'
  phone_number?: string
  reason?: string
}

/**
 * Create a Fedapay transaction (initiate payment)
 */
export async function createTransaction(
  data: FedapayTransactionRequest
): Promise<FedapayTransaction> {
  const response = await fetch(`${FEDAPAY_BASE_URL}/transactions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: data.amount,
      description: data.description,
      currency: data.currency || 'XOF',
      callback_url: data.callback_url || `${process.env.NEXT_PUBLIC_APP_URL}/api/paiements/fedapay/webhook`,
      customer: {
        email: data.email,
        phone_number: data.phone_number,
        first_name: data.first_name,
        last_name: data.last_name,
      },
      metadata: data.metadata,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`Fedapay createTransaction failed: ${error.message || response.statusText}`)
  }

  const result = await response.json()
  return result.data || result
}

/**
 * Generate a payment link for a transaction
 */
export async function generatePaymentLink(
  transactionId: number
): Promise<string> {
  const response = await fetch(`${FEDAPAY_BASE_URL}/transactions/${transactionId}/payment_link`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Fedapay generatePaymentLink failed')
  }

  const result = await response.json()
  return result.data?.url || result.url
}

/**
 * Verify a transaction status
 */
export async function verifyTransaction(
  transactionId: number | string
): Promise<FedapayTransaction> {
  const response = await fetch(`${FEDAPAY_BASE_URL}/transactions/${transactionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Fedapay verifyTransaction failed')
  }

  const result = await response.json()
  return result.data || result
}

/**
 * Process a mobile money payment
 */
export async function processMobilePayment(
  transactionId: number,
  phoneNumber: string,
  provider: 'MTN' | 'MOOV' | 'WAVE'
): Promise<{ status: string; reference: string }> {
  const response = await fetch(`${FEDAPAY_BASE_URL}/transactions/${transactionId}/mobile`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone_number: phoneNumber,
      provider,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`Fedapay mobile payment failed: ${error.message || response.statusText}`)
  }

  const result = await response.json()
  return result.data || result
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  signature: string,
  payload: string
): boolean {
  if (!FEDAPAY_SECRET_KEY) return false

  const crypto = require('crypto')
  const expectedSignature = crypto
    .createHmac('sha256', FEDAPAY_SECRET_KEY)
    .update(payload)
    .digest('hex')

  return signature === expectedSignature
}

/**
 * Map Fedapay status to MediHelm status
 */
export function mapFedapayStatus(
  status: string
): 'EN_ATTENTE' | 'CONFIRMEE' | 'ECHOUEE' | 'REMBOURSEE' | 'ANNULEE' {
  switch (status) {
    case 'approved':
      return 'CONFIRMEE'
    case 'declined':
      return 'ECHOUEE'
    case 'canceled':
      return 'ANNULEE'
    case 'refunded':
      return 'REMBOURSEE'
    default:
      return 'EN_ATTENTE'
  }
}
