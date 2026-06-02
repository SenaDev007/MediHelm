import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const commandeId = searchParams.get('commandeId')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (commandeId) where.commandeId = commandeId

    const data = await db.reception.findMany({
      where,
      include: {
        commande: { include: { fournisseur: true } },
        lignes: { include: { medicament: { select: { id: true, nomCommercial: true, dci: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET receptions:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des réceptions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { commandeId, pharmacieId, dateReception, numeroBL, statut, ecarts, lignes } = body

    if (!commandeId || !pharmacieId) {
      return NextResponse.json({ error: 'commandeId et pharmacieId requis' }, { status: 400 })
    }

    // Create reception with lignes
    const data = await db.reception.create({
      data: {
        commandeId,
        pharmacieId,
        dateReception: dateReception ? new Date(dateReception) : new Date(),
        numeroBL: numeroBL || null,
        statut: statut || 'CONFORME',
        ecarts: ecarts || null,
        lignes: lignes
          ? {
              create: lignes.map((l: { medicamentId: string; numeroLot: string; dateExpiration: string; quantiteBL: number; quantiteRecue: number; prixAchat: number }) => ({
                medicamentId: l.medicamentId,
                numeroLot: l.numeroLot,
                dateExpiration: l.dateExpiration ? new Date(l.dateExpiration) : new Date(),
                quantiteBL: l.quantiteBL,
                quantiteRecue: l.quantiteRecue,
                prixAchat: l.prixAchat,
              })),
            }
          : undefined,
      },
      include: { lignes: { include: { medicament: true } } },
    })

    // Update commande line quantities and create lots
    if (lignes) {
      for (const l of lignes) {
        // Update LigneCommande quantiteLivree
        const cmdLigne = await db.ligneCommande.findFirst({
          where: { commandeId, medicamentId: l.medicamentId },
        })
        if (cmdLigne) {
          await db.ligneCommande.update({
            where: { id: cmdLigne.id },
            data: { quantiteLivree: cmdLigne.quantiteLivree + (l.quantiteRecue || 0) },
          })
        }

        // Create or update Lot
        const existingLot = await db.lot.findFirst({
          where: {
            medicamentId: l.medicamentId,
            pharmacieId,
            numeroLot: l.numeroLot,
          },
        })

        if (existingLot) {
          await db.lot.update({
            where: { id: existingLot.id },
            data: {
              quantite: existingLot.quantite + (l.quantiteRecue || 0),
              prixAchat: l.prixAchat || existingLot.prixAchat,
            },
          })
        } else {
          await db.lot.create({
            data: {
              medicamentId: l.medicamentId,
              pharmacieId,
              numeroLot: l.numeroLot,
              dateExpiration: l.dateExpiration ? new Date(l.dateExpiration) : new Date(),
              quantite: l.quantiteRecue || 0,
              prixAchat: l.prixAchat || 0,
              dateReception: new Date(),
            },
          })
        }
      }

      // Update commande statut based on delivery status
      const commande = await db.commandeFournisseur.findUnique({
        where: { id: commandeId },
        include: { lignes: true },
      })
      if (commande) {
        const allDelivered = commande.lignes.every(l => l.quantiteLivree >= l.quantiteCommandee)
        const someDelivered = commande.lignes.some(l => l.quantiteLivree > 0)

        let newStatut = commande.statut
        if (allDelivered) {
          newStatut = 'LIVREE'
        } else if (someDelivered) {
          newStatut = 'LIVREE_PARTIELLEMENT'
        }

        if (newStatut !== commande.statut) {
          await db.commandeFournisseur.update({
            where: { id: commandeId },
            data: { statut: newStatut, dateLivraisonReelle: new Date() },
          })
        }
      }
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST reception:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la réception' }, { status: 500 })
  }
}
