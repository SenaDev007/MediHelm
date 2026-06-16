import { NextRequest } from 'next/server'
import { resolveScan } from '@/lib/scan-gs1'
import { requireAuth } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof Response) return authResult
  const user = authResult

  try {
    const body = await request.json()
    const { code, contexte = 'VENTE' } = body

    if (!code) {
      return Response.json({ error: 'Code-barres requis' }, { status: 400 })
    }

    const result = await resolveScan(code, user.pharmacieId, contexte, user.id)
    return Response.json(result)
  } catch (error) {
    console.error('Scan error:', error)
    return Response.json({ error: 'Erreur lors du scan' }, { status: 500 })
  }
}
