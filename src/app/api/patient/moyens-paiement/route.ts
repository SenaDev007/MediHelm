import { NextResponse } from 'next/server'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// GET /api/patient/moyens-paiement — Available payment methods
// Returns payment methods supported by MediHelm
export async function GET(request: Request) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.SEARCH)
  if (rateLimitResult) return rateLimitResult

  try {
    // Payment methods configuration
    // In production, this could come from a Configuration table
    // to allow dynamic enabling/disabling of payment providers
    const methods = [
      { id: 'fedapay', label: 'Fedapay', desc: 'Mobile Money, carte bancaire', icon: '💳', actif: true },
      { id: 'wave', label: 'Wave', desc: 'Paiement mobile Wave', icon: '🌊', actif: true },
      { id: 'mtn', label: 'MTN MoMo', desc: 'Mobile Money MTN', icon: '📱', actif: true },
      { id: 'especes', label: 'Espèces', desc: 'Payer à la pharmacie', icon: '💵', actif: true },
    ]

    return NextResponse.json({
      methods: methods.filter(m => m.actif),
      defaultProvider: 'fedapay',
    })
  } catch (error) {
    console.error('Erreur GET moyens-paiement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des moyens de paiement' },
      { status: 500 }
    )
  }
}
