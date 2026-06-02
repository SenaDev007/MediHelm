import { NextRequest, NextResponse } from 'next/server'
import { predictStockNeeds, predictRevenue } from '@/lib/ai-predictions'

// GET /api/ai/predictions?type=stock|revenue&pharmacieId=xxx
export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get('type') || 'stock'
    const pharmacieId = request.nextUrl.searchParams.get('pharmacieId')

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    if (type === 'stock') {
      const predictions = await predictStockNeeds(pharmacieId)
      return NextResponse.json({ type: 'stock', data: predictions })
    }

    if (type === 'revenue') {
      const months = parseInt(request.nextUrl.searchParams.get('months') || '6', 10)
      const predictions = await predictRevenue(pharmacieId, months)
      return NextResponse.json({ type: 'revenue', data: predictions })
    }

    return NextResponse.json({ error: 'Type invalide. Utilisez "stock" ou "revenue"' }, { status: 400 })
  } catch (error) {
    console.error('Erreur prédictions IA:', error)
    return NextResponse.json({ error: 'Erreur lors du calcul des prédictions' }, { status: 500 })
  }
}
