import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

// GET /api/qualite/surveillance — Liste des entrées de surveillance des médicaments
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M16_PHARMACOVIGILANCE', 'read')
    if (authResult instanceof Response) return authResult

    const user = authResult
    const { searchParams } = new URL(request.url)

    const type = searchParams.get('type')
    const niveauRisque = searchParams.get('niveauRisque')
    const actif = searchParams.get('actif')
    const dci = searchParams.get('dci')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    // Filtrer par statut actif/inactif
    if (actif !== null && actif !== undefined && actif !== '') {
      where.statut = actif === 'true' ? 'ACTIVE' : { not: 'ACTIVE' }
    } else {
      // Par défaut, montrer seulement les actives
      where.statut = 'ACTIVE'
    }

    if (type) {
      where.typeSurveillance = type
    }
    if (niveauRisque) {
      where.niveauRisque = niveauRisque
    }
    if (dci) {
      where.dci = { contains: dci, mode: 'insensitive' }
    }

    // DPMED_ADMIN peut voir toutes les surveillances, les autres seulement celles liées à leur pharmacie
    // (Les surveillances sont globales mais on peut filtrer par les médicaments de la pharmacie)
    if (user.roleName !== 'DPMED_ADMIN' && user.roleName !== 'PLATFORM_ADMIN') {
      // Pour les pharmaciens, montrer les surveillances qui concernent leurs médicaments
      const pharmacieMedicaments = await db.medicament.findMany({
        where: { pharmacieId: user.pharmacieId, actif: true },
        select: { dci: true },
      })
      const pharmacieDcis = [...new Set(pharmacieMedicaments.map((m) => m.dci))]
      where.dci = {
        in: pharmacieDcis,
        mode: 'insensitive',
        ...(dci ? { contains: dci } : {}),
      }
    }

    const [surveillances, total] = await Promise.all([
      db.medicamentSurveillance.findMany({
        where,
        orderBy: { dateEmission: 'desc' },
        skip,
        take: limit,
      }),
      db.medicamentSurveillance.count({ where }),
    ])

    return NextResponse.json({
      data: surveillances,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des surveillances:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des entrées de surveillance.' },
      { status: 500 }
    )
  }
}

// POST /api/qualite/surveillance — Créer une nouvelle entrée de surveillance
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M16_PHARMACOVIGILANCE', 'write')
    if (authResult instanceof Response) return authResult

    const user = authResult

    // Seuls DPMED_ADMIN et PHARMACIEN peuvent créer des surveillances
    if (user.roleName !== 'DPMED_ADMIN' && user.roleName !== 'PHARMACIEN' && user.roleName !== 'ADMIN' && user.roleName !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Seuls les administrateurs DPMED, pharmaciens et administrateurs peuvent créer des entrées de surveillance.' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validation des champs requis
    if (!body.dci) {
      return NextResponse.json(
        { error: 'Le champ dci est requis.' },
        { status: 400 }
      )
    }
    if (!body.description) {
      return NextResponse.json(
        { error: 'Le champ description est requis.' },
        { status: 400 }
      )
    }
    if (!body.dateEmission) {
      return NextResponse.json(
        { error: 'Le champ dateEmission est requis.' },
        { status: 400 }
      )
    }

    // Validation du type de surveillance
    const validTypes = ['SOUS_SURVEILLANCE', 'RAPPEL_LOT', 'CONTREFACON', 'AMM_SUSPENDUE', 'INTERDICTION']
    const typeSurveillance = body.typeSurveillance || 'SOUS_SURVEILLANCE'
    if (!validTypes.includes(typeSurveillance)) {
      return NextResponse.json(
        { error: `Type de surveillance invalide. Valeurs autorisées: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validation du niveau de risque
    const validNiveaux = ['FAIBLE', 'MODERE', 'ELEVE', 'CRITIQUE']
    const niveauRisque = body.niveauRisque || 'MODERE'
    if (!validNiveaux.includes(niveauRisque)) {
      return NextResponse.json(
        { error: `Niveau de risque invalide. Valeurs autorisées: ${validNiveaux.join(', ')}` },
        { status: 400 }
      )
    }

    const surveillance = await db.medicamentSurveillance.create({
      data: {
        dci: body.dci,
        nomCommercial: body.nomCommercial || null,
        typeSurveillance,
        description: body.description,
        sourceAlerte: body.sourceAlerte || (user.roleName === 'DPMED_ADMIN' ? 'DPMED' : 'PHARMACIE'),
        dateEmission: new Date(body.dateEmission),
        niveauRisque,
        statut: 'ACTIVE',
        medicamentId: body.medicamentId || null,
      },
    })

    return NextResponse.json(surveillance, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création de la surveillance:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'entrée de surveillance.' },
      { status: 500 }
    )
  }
}
