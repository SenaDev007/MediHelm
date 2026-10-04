import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M01_STOCK', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const medicamentId = searchParams.get('medicamentId')
    const type = searchParams.get('type')

    const where: Record<string, unknown> = { pharmacieId }
    if (medicamentId) where.medicamentId = medicamentId
    if (type) where.type = type

    const data = await db.mouvementStock.findMany({
      where,
      include: {
        medicament: { select: { nomCommercial: true, dci: true } },
        lot: { select: { numeroLot: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET mouvements stock:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des mouvements' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M01_STOCK', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const body = await request.json()

    // Validate required fields
    const { medicamentId, type, quantite } = body
    if (!medicamentId || !type || quantite === undefined) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    // Use transaction to ensure atomicity of movement creation + lot update
    const data = await db.$transaction(async (tx) => {
      const mouvement = await tx.mouvementStock.create({
        data: {
          pharmacieId,
          medicamentId,
          lotId: body.lotId || null,
          type,
          quantite: Number(quantite),
          prixUnitaire: body.prixUnitaire ? Number(body.prixUnitaire) : null,
          motif: body.motif || null,
          reference: body.reference || null,
          utilisateurId: body.utilisateurId || null,
        },
      })

      // Update lot quantity if lotId is provided
      if (body.lotId) {
        const lot = await tx.lot.findUnique({ where: { id: body.lotId } })
        if (lot) {
          let newQuantite = lot.quantite
          if (type === 'ENTREE' || type === 'RETOUR') {
            newQuantite += Number(quantite)
          } else if (type === 'SORTIE' || type === 'DESTRUCTION') {
            newQuantite = Math.max(0, newQuantite - Number(quantite))
          } else if (type === 'AJUSTEMENT') {
            newQuantite = Number(quantite)
          }
          await tx.lot.update({
            where: { id: body.lotId },
            data: { quantite: newQuantite },
          })
        }
      }

      return mouvement
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST mouvements stock:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du mouvement' }, { status: 500 })
  }
}
