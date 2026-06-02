import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { db } from '@/lib/db'

// GET /api/stupefiants — Liste du registre des stupéfiants
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, 'M01_STOCK', 'read')
  if (authResult instanceof Response) return authResult
  const user = authResult

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const search = searchParams.get('search') || ''

  const where: Record<string, unknown> = { pharmacieId: user.pharmacieId }
  if (search) {
    where.OR = [
      { medicament: { nomCommercial: { contains: search } } },
      { medicament: { dci: { contains: search } } },
      { patientNom: { contains: search } },
    ]
  }

  const [registres, total] = await Promise.all([
    db.registreStupefiant.findMany({
      where,
      include: {
        medicament: { select: { nomCommercial: true, dci: true } },
        lot: { select: { numeroLot: true, dateExpiration: true } },
        pharmacien: { select: { nom: true, prenom: true } },
        ordonnance: { select: { prescripteurNom: true } },
      },
      orderBy: { dateEntree: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.registreStupefiant.count({ where }),
  ])

  return NextResponse.json({ data: registres, total, page, limit })
}

// POST /api/stupefiants — Nouvelle entrée stupéfiant
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, 'M01_STOCK', 'write')
  if (authResult instanceof Response) return authResult
  const user = authResult

  const body = await request.json()
  const { medicamentId, lotId, quantiteEntree, quantiteSortie, patientNom, prescripteurNom, ordonnanceId } = body

  // Vérifier que le médicament est stupéfiant
  const medicament = await db.medicament.findFirst({
    where: { id: medicamentId, pharmacieId: user.pharmacieId, estStupefiant: true },
  })
  if (!medicament) {
    return NextResponse.json({ error: 'Médicament non trouvé ou non stupéfiant' }, { status: 400 })
  }

  // Calculer le stock restant
  const lastEntry = await db.registreStupefiant.findFirst({
    where: { medicamentId, pharmacieId: user.pharmacieId },
    orderBy: { dateEntree: 'desc' },
  })
  const stockRestant = (lastEntry?.stockRestant || 0) + (quantiteEntree || 0) - (quantiteSortie || 0)

  // Calculer le numéro de page (séquentiel par pharmacie)
  const lastPage = await db.registreStupefiant.findFirst({
    where: { pharmacieId: user.pharmacieId },
    orderBy: { numeroPage: 'desc' },
  })

  const registre = await db.registreStupefiant.create({
    data: {
      pharmacieId: user.pharmacieId,
      medicamentId,
      lotId,
      ordonnanceId,
      quantiteEntree: quantiteEntree || 0,
      quantiteSortie: quantiteSortie || 0,
      stockRestant,
      patientNom,
      prescripteurNom,
      pharmacienId: user.id,
      numeroPage: (lastPage?.numeroPage || 0) + 1,
      dateSortie: quantiteSortie ? new Date() : null,
      statut: quantiteSortie ? 'SORTIE' : 'EN_STOCK',
    },
    include: {
      medicament: true,
      lot: true,
      pharmacien: { select: { nom: true, prenom: true } },
    },
  })

  return NextResponse.json(registre, { status: 201 })
}
