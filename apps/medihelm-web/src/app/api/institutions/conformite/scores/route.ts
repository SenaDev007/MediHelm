import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  // Auth: DPMED_ADMIN, SOBAPS_VIEWER, ABRP_VIEWER or PLATFORM_ADMIN
  const auth = await requireAuth(request, 'M19_CONFORMITE', 'read')
  if (auth instanceof Response) return auth

  try {
    const { searchParams } = new URL(request.url)
    const ville = searchParams.get('ville')

    const where: Record<string, unknown> = {}
    if (ville) where.ville = ville

    const scores = await db.scoreConformite.findMany({
      where: {},
      include: {
        pharmacie: {
          select: {
            id: true,
            nom: true,
            ville: true,
            numeroAgrement: true,
          },
        },
      },
      orderBy: { scoreTotal: 'desc' },
    })

    // Transform data to match ComplianceOverview component expectations
    // The component expects an array of ScoreData objects directly
    const transformedScores = scores.map(s => ({
      id: s.id,
      pharmacieId: s.pharmacieId,
      scoreTotal: s.scoreTotal,
      scoreRegistreStup: s.scoreRegistreStup,
      scoreAlerteDPMED: s.scoreAlerteDPMED,
      scoreDocuments: s.scoreDocuments,
      scorePharmacovigi: s.scorePharmacovigilance,
      scoreDestructions: s.scoreDestructions,
      certificationDPMED: s.certificationDPMED,
      dateCertification: null as string | null,
      dateExpirCertification: null as string | null,
      calculatedAt: s.dateCalcul.toISOString(),
      pharmacie: s.pharmacie ? {
        id: s.pharmacie.id,
        nom: s.pharmacie.nom,
        ville: s.pharmacie.ville,
        numeroAgrement: s.pharmacie.numeroAgrement,
      } : undefined,
    }))

    return NextResponse.json(transformedScores)
  } catch (error) {
    console.error('Erreur scores conformité:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des scores' },
      { status: 500 }
    )
  }
}
