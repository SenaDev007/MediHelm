import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// GET /api/patients/commandes — Liste des commandes patients de la pharmacie
// Filtres: ?statut=RECUE|EN_PREPARATION|PRETE|RECUPEREE|ANNULEE&patientId=uuid&page=1&limit=20
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M05_PATIENTS', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const rateLimitResult = rateLimit(request, RATE_LIMITS.API_GENERAL)
    if (rateLimitResult) return rateLimitResult

    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut')
    const patientId = searchParams.get('patientId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20))

    // Isolation multi-tenant: seules les commandes de SA pharmacie
    const where: Record<string, unknown> = {
      pharmacieId: authResult.roleName === 'PLATFORM_ADMIN' ? undefined : user.pharmacieId,
      ...(statut ? { statut: statut as 'RECUE' | 'EN_PREPARATION' | 'PRETE' | 'RECUPEREE' | 'ANNULEE' } : {}),
      ...(patientId ? { patientId } : {}),
    }

    const [commandes, total] = await Promise.all([
      db.commandePatient.findMany({
        where,
        include: {
          patient: {
            select: { id: true, nom: true, prenom: true, telephone: true, pointsFidelite: true },
          },
          lignes: {
            include: {
              medicament: { select: { id: true, nomCommercial: true, dci: true, forme: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.commandePatient.count({ where }),
    ])

    return NextResponse.json({
      data: commandes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erreur GET patients/commandes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des commandes patients' },
      { status: 500 }
    )
  }
}
