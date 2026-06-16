// ============================================================
// MediHelm — RSA-256 Document Signing & Verification
// Sign official documents, prescriptions, compliance reports
// Référence: MH-SPECS-2025-v2.0 — Sécurité RSA-256
// ============================================================

import { createSign, createVerify, generateKeyPairSync, createHash } from 'crypto'

const PRIVATE_KEY = process.env.RSA_PRIVATE_KEY || ''
const PUBLIC_KEY = process.env.RSA_PUBLIC_KEY || ''

export interface SignedDocument {
  content: string
  signature: string
  algorithm: 'RSA-SHA256'
  timestamp: string
  keyId: string
}

/**
 * Generate RSA-256 key pair (run once, store in env)
 */
export function generateKeyPair(): { privateKey: string; publicKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  return { publicKey, privateKey }
}

/**
 * Create a hash of the public key for identification
 */
function createKeyHash(publicKey: string): string {
  return createHash('sha256').update(publicKey).digest('hex').substring(0, 16)
}

/**
 * Sign a document with RSA-SHA256
 */
export function signDocument(content: string): SignedDocument {
  if (!PRIVATE_KEY) {
    throw new Error('Clé privée RSA non configurée')
  }

  const signer = createSign('RSA-SHA256')
  signer.update(content)
  signer.end()

  const signature = signer.sign(PRIVATE_KEY, 'base64')

  return {
    content,
    signature,
    algorithm: 'RSA-SHA256',
    timestamp: new Date().toISOString(),
    keyId: PUBLIC_KEY ? createKeyHash(PUBLIC_KEY) : 'default',
  }
}

/**
 * Verify a signed document
 */
export function verifyDocument(signed: SignedDocument): boolean {
  if (!PUBLIC_KEY) {
    console.warn('[Signing] Clé publique RSA non configurée — vérification ignorée')
    return true
  }

  const verifier = createVerify('RSA-SHA256')
  verifier.update(signed.content)
  verifier.end()

  return verifier.verify(PUBLIC_KEY, signed.signature, 'base64')
}

/**
 * Sign a prescription for tamper-proof delivery
 */
export function signPrescription(prescriptionData: {
  id: string
  prescripteur: string
  dateOrdonnance: string
  lignes: Array<{ dci: string; posologie?: string }>
  patientId: string
}): SignedDocument {
  const content = JSON.stringify(prescriptionData, null, 0)
  return signDocument(content)
}

/**
 * Sign a compliance report
 */
export function signComplianceReport(reportData: {
  type: string
  pharmacieId: string
  periode: string
  score: number
  details: Record<string, unknown>
}): SignedDocument {
  const content = JSON.stringify(reportData, null, 0)
  return signDocument(content)
}
