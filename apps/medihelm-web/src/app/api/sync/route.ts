import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { db } from '@/lib/db'

// GET /api/sync — Get latest data for offline sync
// Returns incremental updates based on lastSync timestamp
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M14_DASHBOARD', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { searchParams } = new URL(request.url)
    const lastSync = searchParams.get('lastSync')
    const modules = searchParams.get('modules')?.split(',') || ['stock', 'patients', 'ventes']

    const since = lastSync ? new Date(lastSync) : new Date(Date.now() - 24 * 60 * 60 * 1000)
    const pharmacieId = user.pharmacieId

    const result: Record<string, unknown[]> = {}

    // Sync stock data (medicaments + lots)
    if (modules.includes('stock')) {
      const medicaments = await db.medicament.findMany({
        where: { pharmacieId, actif: true, updatedAt: { gt: since } },
        include: {
          lots: {
            where: { quantite: { gt: 0 } },
            select: {
              id: true, numeroLot: true, quantite: true,
              dateExpiration: true, prixAchat: true, updatedAt: true,
            },
          },
        },
      })
      result.medicaments = medicaments
    }

    // Sync patients
    if (modules.includes('patients')) {
      const patients = await db.patient.findMany({
        where: { pharmacieId, updatedAt: { gt: since } },
        select: {
          id: true, nom: true, prenom: true, telephone: true,
          email: true, dateNaissance: true, sexe: true,
          updatedAt: true,
        },
      })
      result.patients = patients
    }

    // Sync recent ventes
    if (modules.includes('ventes')) {
      const ventes = await db.vente.findMany({
        where: { pharmacieId, updatedAt: { gt: since } },
        select: {
          id: true, reference: true, montantTotal: true,
          statut: true, modePaiement: true, createdAt: true,
          lignes: {
            select: {
              medicamentId: true, quantite: true, prixUnitaire: true,
            },
          },
        },
        take: 200,
        orderBy: { createdAt: 'desc' },
      })
      result.ventes = ventes
    }

    // Sync alerts
    if (modules.includes('alertes')) {
      const alertes = await db.alerteDPMED.findMany({
        where: { statut: 'EN_DIFFUSION', updatedAt: { gt: since } },
        take: 50,
      })
      result.alertes = alertes
    }

    // Sync employes
    if (modules.includes('rh')) {
      const employes = await db.employe.findMany({
        where: { pharmacieId, actif: true, updatedAt: { gt: since } },
        select: {
          id: true, nom: true, prenom: true, poste: true,
          telephone: true, actif: true, updatedAt: true,
        },
      })
      result.employes = employes
    }

    return NextResponse.json({
      syncedAt: new Date().toISOString(),
      pharmacieId,
      since: since.toISOString(),
      data: result,
    })
  } catch (error) {
    console.error('Erreur sync:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la synchronisation' },
      { status: 500 }
    )
  }
}
