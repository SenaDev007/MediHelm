import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { db } from '@/lib/db'

// Définitions des plans d'abonnement (configuration statique des fonctionnalités et limites)
// Les prix sont mis à jour selon les dernières specs (FCFA)
const PLAN_CONFIGS = [
  {
    id: 'SEED',
    nom: 'Seed',
    description: 'Idéal pour démarrer — Fonctionnalités essentielles pour une pharmacie',
    prix: {
      MENSUEL: 19900,
      TRIMESTRIEL: 57000,
      ANNUEL: 214800,
    },
    fonctionnalites: [
      'Gestion du stock (basique)',
      'Point de vente',
      'Gestion des patients',
      'Ordonnances',
      'Support email',
    ],
    limites: {
      utilisateurs: 3,
      produits: 500,
    },
  },
  {
    id: 'BLOOM',
    nom: 'Bloom',
    description: 'Pour la croissance — Outils avancés pour développer votre pharmacie',
    prix: {
      MENSUEL: 34900,
      TRIMESTRIEL: 99900,
      ANNUEL: 376800,
    },
    fonctionnalites: [
      'Tout le plan Seed',
      'Gestion RH (congés, présences)',
      'Commandes fournisseurs',
      'Crédits patients',
      'Alertes DPMED',
      'Rapports financiers',
      'Support prioritaire',
    ],
    limites: {
      utilisateurs: 10,
      produits: 2000,
    },
  },
  {
    id: 'CROWN',
    nom: 'Crown',
    description: 'Leader du marché — Solution complète pour pharmacie performante',
    prix: {
      MENSUEL: 54900,
      TRIMESTRIEL: 157000,
      ANNUEL: 592800,
    },
    fonctionnalites: [
      'Tout le plan Bloom',
      'Pharmacovigilance avancée',
      'Conformité réglementaire',
      'Communications SMS',
      'Garde & planning',
      'Analytics IA (ORION)',
      'Coffre numérique',
      'Support dédié',
    ],
    limites: {
      utilisateurs: 25,
      produits: 10000,
    },
  },
  {
    id: 'NETWORK',
    nom: 'Network',
    description: 'Réseau de pharmacies — Pour les promoteurs multi-officines',
    prix: {
      MENSUEL: -1, // Sur devis
      TRIMESTRIEL: -1,
      ANNUEL: -1,
    },
    fonctionnalites: [
      'Tout le plan Crown',
      'Multi-pharmacies',
      'Dashboard promoteur',
      'Consolidation financière',
      'Transferts inter-pharmacies',
      'API intégrations grossistes',
      'Account manager dédié',
    ],
    limites: {
      utilisateurs: -1, // illimité
      produits: -1, // illimité
    },
  },
]

// GET /api/options-abonnement — Liste des options d'abonnement avec données réelles
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M14_DASHBOARD', 'read')
    if (authResult instanceof Response) return authResult

    // Récupérer les compteurs réels par plan depuis la DB
    const abonnementCounts = await db.abonnement.groupBy({
      by: ['plan'],
      _count: { id: true },
      where: { statut: 'ACTIF' },
    })

    // Récupérer les pharmacies groupées par plan
    const pharmacieCounts = await db.pharmacie.groupBy({
      by: ['plan'],
      _count: { id: true },
    })

    // Construire un map pour un accès rapide
    const abonnementCountMap = new Map(
      abonnementCounts.map((a) => [a.plan, a._count.id])
    )
    const pharmacieCountMap = new Map(
      pharmacieCounts.map((p) => [p.plan, p._count.id])
    )

    // Enrichir les plans avec les données réelles
    const enrichedPlans = PLAN_CONFIGS.map((plan) => ({
      ...plan,
      statistiques: {
        abonnementsActifs: abonnementCountMap.get(plan.id) || 0,
        pharmacies: pharmacieCountMap.get(plan.id) || 0,
      },
      prix: plan.id === 'NETWORK'
        ? { MENSUEL: 'Sur devis', TRIMESTRIEL: 'Sur devis', ANNUEL: 'Sur devis' }
        : plan.prix,
    }))

    return NextResponse.json({
      data: enrichedPlans,
      types: ['MENSUEL', 'TRIMESTRIEL', 'ANNUEL'],
    })
  } catch (error) {
    console.error('Erreur GET options-abonnement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des options d\'abonnement' },
      { status: 500 }
    )
  }
}
