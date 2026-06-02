import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const commandeId = searchParams.get('commandeId')
    const statut = searchParams.get('statut')
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (commandeId) where.commandeId = commandeId
    if (statut) where.statut = statut
    if (dateDebut || dateFin) {
      const dateFilter: Record<string, Date> = {}
      if (dateDebut) dateFilter.gte = new Date(dateDebut)
      if (dateFin) dateFilter.lte = new Date(dateFin)
      where.dateReception = dateFilter
    }

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
    const { commandeId, pharmacieId, dateReception, numeroBL, statut, ecarts, lignes, utilisateurId } = body

    if (!commandeId || !pharmacieId) {
      return NextResponse.json({ error: 'commandeId et pharmacieId requis' }, { status: 400 })
    }

    // Validate the commande exists and has an appropriate status
    const commande = await db.commandeFournisseur.findUnique({
      where: { id: commandeId },
      include: { lignes: true },
    })

    if (!commande) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })
    }

    if (!['CONFIRMEE', 'EN_PREPARATION', 'LIVREE_PARTIELLEMENT'].includes(commande.statut)) {
      return NextResponse.json(
        { error: `La commande doit être CONFIRMEE, EN_PREPARATION ou LIVREE_PARTIELLEMENT. Statut actuel: ${commande.statut}` },
        { status: 400 }
      )
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
              create: lignes.map((l: {
                medicamentId: string
                numeroLot: string
                dateExpiration: string
                quantiteBL: number
                quantiteRecue: number
                prixAchat: number
              }) => ({
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

    // Update commande line quantities, create lots, and create stock movements
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

        let lotId: string
        if (existingLot) {
          await db.lot.update({
            where: { id: existingLot.id },
            data: {
              quantite: existingLot.quantite + (l.quantiteRecue || 0),
              prixAchat: l.prixAchat || existingLot.prixAchat,
            },
          })
          lotId = existingLot.id
        } else {
          const newLot = await db.lot.create({
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
          lotId = newLot.id
        }

        // Create MouvementStock (ENTREE) for each received item
        if (l.quantiteRecue > 0) {
          const currentLot = await db.lot.findUnique({ where: { id: lotId } })
          const quantiteAvant = currentLot ? currentLot.quantite - l.quantiteRecue : 0
          const quantiteApres = currentLot ? currentLot.quantite : l.quantiteRecue

          await db.mouvementStock.create({
            data: {
              lotId,
              pharmacieId,
              type: 'ENTREE',
              quantite: l.quantiteRecue,
              quantiteAvant: Math.max(0, quantiteAvant),
              quantiteApres,
              motif: `Réception commande ${commande.reference}`,
              utilisateurId: utilisateurId || 'system',
              referenceId: data.id,
              referenceType: 'Reception',
            },
          })
        }
      }

      // Update commande statut based on delivery status
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
