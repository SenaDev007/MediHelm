import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  // Auth: DPMED_ADMIN, SOBAPS_VIEWER, ABRP_VIEWER or PLATFORM_ADMIN
  const auth = await requireAuth(request, 'M18_ALERTES_DPMED', 'read')
  if (auth instanceof Response) return auth

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const urgence = searchParams.get('urgence')
    const statut = searchParams.get('statut')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (type) where.typeAlerte = type
    if (urgence) where.niveauUrgence = urgence
    if (statut) where.statut = statut

    const [alertes, total] = await Promise.all([
      db.alerteDPMED.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          diffusions: {
            select: {
              id: true,
              statut: true,
              pharmacieId: true,
              pharmacie: {
                select: { id: true, nom: true, ville: true },
              },
            },
          },
        },
      }),
      db.alerteDPMED.count({ where }),
    ])

    return NextResponse.json({
      alertes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur listage alertes DPMED:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des alertes' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  // Auth: DPMED_ADMIN or PLATFORM_ADMIN required for writing alerts
  const auth = await requireAuth(request, 'M18_ALERTES_DPMED', 'write')
  if (auth instanceof Response) return auth

  try {
    const body = await request.json()
    const {
      titre,
      description,
      typeAlerte,
      niveauUrgence,
      dciConcernee,
      numerosLotConcernes,
      fabricantConcerne,
      sourceEmission,
      referenceOfficielle,
      signatureNumerique,
      dateEmissionDPMED,
      statut,
    } = body

    if (!titre || !typeAlerte || !niveauUrgence) {
      return NextResponse.json(
        { error: 'Titre, type et niveau d\'urgence sont requis' },
        { status: 400 }
      )
    }

    // Create the alert
    const alerte = await db.alerteDPMED.create({
      data: {
        titre,
        description: description || '',
        typeAlerte,
        niveauUrgence,
        dciConcernee: dciConcernee || null,
        signatureNumerique: signatureNumerique || `SIG-DPMED-${Date.now()}`,
        referenceOfficielle: referenceOfficielle || `DPMED-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        dateEmissionDPMED: dateEmissionDPMED ? new Date(dateEmissionDPMED) : new Date(),
        statut: statut || 'EN_DIFFUSION',
      },
    })

    // Auto-create DiffusionAlerte for all active pharmacies
    const pharmacies = await db.pharmacie.findMany({
      where: { actif: true },
      select: { id: true },
    })

    if (pharmacies.length > 0) {
      await db.diffusionAlerte.createMany({
        data: pharmacies.map(p => ({
          alerteId: alerte.id,
          pharmacieId: p.id,
          statut: 'EN_ATTENTE',
        })),
      })
    }

    // Return with diffusions included
    const result = await db.alerteDPMED.findUnique({
      where: { id: alerte.id },
      include: {
        diffusions: {
          include: {
            pharmacie: {
              select: { id: true, nom: true, ville: true, telephone: true, email: true },
            },
          },
        },
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Erreur création alerte DPMED:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'alerte' },
      { status: 500 }
    )
  }
}
