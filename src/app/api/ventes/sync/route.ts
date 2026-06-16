import { NextRequest } from 'next/server'
import { syncOfflineVentes, OfflineVente } from '@/lib/offline-sync'
import { requireAuth } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, 'M02_POS', 'write')
  if (authResult instanceof Response) return authResult
  const user = authResult

  try {
    const body = await request.json()
    const { ventes } = body as { ventes: OfflineVente[] }

    if (!ventes || !Array.isArray(ventes)) {
      return Response.json({ error: 'Données de ventes requises' }, { status: 400 })
    }

    // Verify all ventes belong to the user's pharmacy
    const invalidVentes = ventes.filter(v => v.pharmacieId !== user.pharmacieId)
    if (invalidVentes.length > 0) {
      return Response.json({ error: 'Ventes non autorisées pour cette pharmacie' }, { status: 403 })
    }

    const result = await syncOfflineVentes(ventes)

    return Response.json(result)
  } catch (error) {
    console.error('Sync error:', error)
    return Response.json({ error: 'Erreur de synchronisation' }, { status: 500 })
  }
}
