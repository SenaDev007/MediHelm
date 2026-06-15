import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

// GET /api/qualite/dci — Liste des DCI (Dénominations Communes Internationales)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M16_PHARMACOVIGILANCE', 'read')
    if (authResult instanceof Response) return authResult

    const user = authResult
    const { searchParams } = new URL(request.url)

    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    // Récupérer les DCI distinctes des médicaments de la pharmacie
    const medicaments = await db.medicament.findMany({
      where: {
        pharmacieId: user.pharmacieId,
        actif: true,
        ...(search
          ? { dci: { contains: search, mode: 'insensitive' } }
          : {}),
      },
      select: { dci: true, nomCommercial: true, forme: true, dosage: true, surOrdonnance: true, estStupefiant: true, categorieAtc: true },
      orderBy: { dci: 'asc' },
    })

    // Regrouper par DCI
    const dciMap = new Map<string, {
      dci: string
      medicaments: { nomCommercial: string; forme: string; dosage: string; surOrdonnance: boolean; estStupefiant: boolean; categorieAtc: string | null }[]
    }>()

    for (const med of medicaments) {
      if (!dciMap.has(med.dci)) {
        dciMap.set(med.dci, { dci: med.dci, medicaments: [] })
      }
      dciMap.get(med.dci)!.medicaments.push({
        nomCommercial: med.nomCommercial,
        forme: med.forme,
        dosage: med.dosage,
        surOrdonnance: med.surOrdonnance,
        estStupefiant: med.estStupefiant,
        categorieAtc: med.categorieAtc,
      })
    }

    const allDcis = Array.from(dciMap.values())
    const total = allDcis.length
    const paginatedDcis = allDcis.slice(skip, skip + limit)

    return NextResponse.json({
      data: paginatedDcis,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des DCI:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des DCI.' },
      { status: 500 }
    )
  }
}
