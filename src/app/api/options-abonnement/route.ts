import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// Données statiques des plans d'abonnement basées sur l'enum PlanType
const PLANS = [
  {
    id: 'SEED',
    nom: 'Seed',
    description: 'Idéal pour démarrer — Fonctionnalités essentielles pour une pharmacie',
    prix: {
      MENSUEL: 15000,
      TRIMESTRIEL: 40000,
      ANNUEL: 144000,
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
    id: 'GROW',
    nom: 'Grow',
    description: 'Pour la croissance — Outils avancés pour développer votre pharmacie',
    prix: {
      MENSUEL: 35000,
      TRIMESTRIEL: 95000,
      ANNUEL: 336000,
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
    id: 'LEAD',
    nom: 'Lead',
    description: 'Leader du marché — Solution complète pour pharmacie performante',
    prix: {
      MENSUEL: 65000,
      TRIMESTRIEL: 175000,
      ANNUEL: 624000,
    },
    fonctionnalites: [
      'Tout le plan Grow',
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
      MENSUEL: 120000,
      TRIMESTRIEL: 330000,
      ANNUEL: 1152000,
    },
    fonctionnalites: [
      'Tout le plan Lead',
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

// GET /api/options-abonnement — Liste des options d'abonnement
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M14_DASHBOARD', 'read')
    if (authResult instanceof Response) return authResult

    return NextResponse.json({
      data: PLANS,
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
