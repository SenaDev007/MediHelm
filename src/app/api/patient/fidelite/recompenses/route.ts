import { NextResponse } from 'next/server'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// GET /api/patient/fidelite/recompenses — Rewards catalog for loyalty program
// Public endpoint — returns available rewards for the patient loyalty program
export async function GET(request: Request) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.SEARCH)
  if (rateLimitResult) return rateLimitResult

  try {
    // In production, rewards would come from a RecompenseFidelite table
    // For now, return the configured rewards catalog
    // TODO: Migrate to db.recompenseFidelite.findMany() when model is created
    const rewards = [
      { id: '1', nom: 'Remise 5%', description: '5% de remise sur votre prochaine commande', pointsRequis: 100, categorie: 'remise', disponible: true },
      { id: '2', nom: 'Remise 10%', description: '10% de remise sur votre prochaine commande', pointsRequis: 250, categorie: 'remise', disponible: true },
      { id: '3', nom: 'Livraison gratuite', description: 'Livraison offerte pour une commande', pointsRequis: 150, categorie: 'livraison', disponible: true },
      { id: '4', nom: 'Consultation offerte', description: 'Consultation pharmacienne gratuite', pointsRequis: 500, categorie: 'service', disponible: true },
      { id: '5', nom: 'Remise 20%', description: '20% de remise sur votre prochaine commande', pointsRequis: 600, categorie: 'remise', disponible: true },
      { id: '6', nom: 'Coffret bien-être', description: 'Coffret produits bien-être offert', pointsRequis: 1000, categorie: 'cadeau', disponible: false },
    ]

    // Loyalty level definitions
    const levels = [
      { min: 0, name: 'Bronze', color: 'text-amber-700', icon: '🥉' },
      { min: 200, name: 'Argent', color: 'text-gray-500', icon: '🥈' },
      { min: 500, name: 'Or', color: 'text-yellow-600', icon: '🥇' },
      { min: 1000, name: 'Diamant', color: 'text-blue-600', icon: '💎' },
    ]

    // Points earning rules
    const earningRules = [
      { description: 'Chaque achat en pharmacie', points: '1 pt / 100 FCFA', type: 'purchase' },
      { description: 'Première commande', points: '+50 pts', type: 'bonus' },
      { description: "Parrainage d'un ami", points: '+100 pts', type: 'referral' },
      { description: 'Avis sur une pharmacie', points: '+20 pts', type: 'review' },
    ]

    return NextResponse.json({
      rewards,
      levels,
      earningRules,
    })
  } catch (error) {
    console.error('Erreur GET recompenses:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des récompenses' },
      { status: 500 }
    )
  }
}
