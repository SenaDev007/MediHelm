import { db } from '@backend/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@backend/lib/api-auth'
import { validate, receptionSchema } from '@backend/lib/validations'
import { rateLimit, RATE_LIMITS } from '@backend/lib/rate-limit'

export async function GET(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_GENERAL)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M03_COMMANDES', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // Récupérer les commandes livrées + les réceptions grossiste
    const commandesWhere: Record<string, unknown> = {
      pharmacieId,
      statut: { in: ['LIVREE', 'LIVREE_PARTIELLEMENT'] },
    }

    if (search) {
      commandesWhere.OR = [
        { nomFournisseur: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (dateDebut || dateFin) {
      commandesWhere.dateLivraisonReelle = {
        ...(dateDebut ? { gte: new Date(dateDebut) } : {}),
        ...(dateFin ? { lte: new Date(dateFin + 'T23:59:59.999Z') } : {}),
      }
    }

    const receptionsWhere: Record<string, unknown> = { pharmacieId }

    if (dateDebut || dateFin) {
      receptionsWhere.dateReception = {
        ...(dateDebut ? { gte: new Date(dateDebut) } : {}),
        ...(dateFin ? { lte: new Date(dateFin + 'T23:59:59.999Z') } : {}),
      }
    }

    const skip = (page - 1) * limit

    // Récupérer les réceptions grossiste
    const [receptionsGrossiste, totalReceptionsGrossiste] = await Promise.all([
      db.receptionGrossiste.findMany({
        where: receptionsWhere,
        include: {
          ordonnanceGrossiste: {
            select: {
              id: true,
              reference: true,
              statut: true,
              montantTotal: true,
              lignes: true,
            },
          },
        },
        orderBy: { dateReception: 'desc' },
        skip,
        take: limit,
      }),
      db.receptionGrossiste.count({ where: receptionsWhere }),
    ])

    // Récupérer les commandes fournisseur livrées
    const commandesLimit = Math.max(limit - receptionsGrossiste.length, 0)
    const [commandesLivrees, totalCommandesLivrees] = await Promise.all([
      db.commandeFournisseur.findMany({
        where: commandesWhere,
        include: {
          fournisseur: { select: { id: true, nom: true } },
          lignes: true,
        },
        orderBy: { dateLivraisonReelle: 'desc' },
        take: commandesLimit > 0 ? commandesLimit : undefined,
      }),
      db.commandeFournisseur.count({ where: commandesWhere }),
    ])

    const total = totalReceptionsGrossiste + totalCommandesLivrees

    return NextResponse.json({
      data: {
        receptionsGrossiste,
        commandesLivrees,
      },
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erreur GET receptions:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des réceptions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_MUTATION)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M03_COMMANDES', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const body = await request.json()
    const validation = validate(receptionSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    // Vérifier que le fournisseur existe dans la pharmacie
    const fournisseur = await db.fournisseur.findFirst({
      where: { id: data.fournisseurId, pharmacieId },
    })
    if (!fournisseur) {
      return NextResponse.json(
        { error: 'Fournisseur introuvable dans cette pharmacie' },
        { status: 404 }
      )
    }

    // Vérifier la commande si fournie
    let commande: { id: string; ref: string } | null = null
    if (data.commandeId) {
      const c = await db.commandeFournisseur.findFirst({
        where: { id: data.commandeId, pharmacieId },
        select: { id: true },
      })
      if (!c) {
        return NextResponse.json(
          { error: 'Commande introuvable dans cette pharmacie' },
          { status: 404 }
        )
      }
      commande = { id: c.id, ref: `CMD-${c.id.slice(-6).toUpperCase()}` }
    }

    // Validation de la date d'expiration
    for (const ligne of data.lignes) {
      const expiration = new Date(ligne.dateExpiration)
      if (isNaN(expiration.getTime())) {
        return NextResponse.json({ error: 'Date d\'expiration invalide' }, { status: 400 })
      }
    }

    // Transaction: document de réception + lots + mouvements + CMUP + commande
    // Timeout étendu (DB distante Neon)
    const now = new Date()
    const reception = await db.$transaction(
      async (tx) => {
      const receptionCreee = await tx.receptionFournisseur.create({
        data: {
          pharmacieId,
          commandeId: data.commandeId ?? null,
          fournisseurId: data.fournisseurId,
          numeroBL: data.numeroBL ?? null,
          statut: 'COMPLETE',
          notes: data.notes ?? null,
          utilisateurId: user.id,
        },
      })

      for (const ligne of data.lignes) {
        // Médicament — isolation par pharmacie
        const medicament = await tx.medicament.findFirst({
          where: { id: ligne.medicamentId, pharmacieId, actif: true },
          select: { id: true, cmup: true },
        })
        if (!medicament) {
          throw new ReceptionError(`Médicament ${ligne.medicamentId} introuvable dans votre pharmacie`, 404)
        }

        // Stock avant réception (pour le CMUP) — stock vendable (lots non expirés)
        const stockAvant = await tx.lot.aggregate({
          where: { medicamentId: medicament.id, pharmacieId, dateExpiration: { gt: now } },
          _sum: { quantite: true },
        })
        const quantiteAvant = stockAvant._sum.quantite ?? 0

        // Lot existant (même medicament + numeroLot) → incrément, sinon création
        const lot = await tx.lot.findFirst({
          where: { medicamentId: medicament.id, pharmacieId, numeroLot: ligne.numeroLot },
        })
        let lotId: string
        if (lot) {
          const lotMaj = await tx.lot.update({
            where: { id: lot.id },
            data: {
              quantite: { increment: ligne.quantite },
              prixAchat: ligne.prixAchat,
              dateExpiration: new Date(ligne.dateExpiration),
            },
          })
          lotId = lotMaj.id
        } else {
          const lotCree = await tx.lot.create({
            data: {
              pharmacieId,
              medicamentId: medicament.id,
              numeroLot: ligne.numeroLot,
              quantite: ligne.quantite,
              quantiteInitiale: ligne.quantite,
              prixAchat: ligne.prixAchat,
              dateExpiration: new Date(ligne.dateExpiration),
            },
          })
          lotId = lotCree.id
        }

        // Ligne de réception persistée (document)
        await tx.ligneReception.create({
          data: {
            receptionId: receptionCreee.id,
            medicamentId: medicament.id,
            lotId,
            quantite: ligne.quantite,
            prixAchat: ligne.prixAchat,
            numeroLot: ligne.numeroLot,
            dateExpiration: new Date(ligne.dateExpiration),
          },
        })

        // Mouvement de stock tracé (ENTREE)
        await tx.mouvementStock.create({
          data: {
            pharmacieId,
            medicamentId: medicament.id,
            lotId,
            type: 'ENTREE',
            quantite: ligne.quantite,
            prixUnitaire: ligne.prixAchat,
            motif: 'RECEPTION',
            reference: commande?.ref ?? receptionCreee.id.slice(0, 8).toUpperCase(),
            utilisateurId: user.id,
          },
        })

        // CMUP = (ancienStock × ancienCMUP + qtéReçue × prixAchat) / (ancienStock + qtéReçue)
        const cmupAvant = medicament.cmup
        const nouveauCmup =
          quantiteAvant + ligne.quantite > 0
            ? (quantiteAvant * cmupAvant + ligne.quantite * ligne.prixAchat) / (quantiteAvant + ligne.quantite)
            : ligne.prixAchat
        await tx.medicament.update({
          where: { id: medicament.id },
          data: { cmup: Number(nouveauCmup.toFixed(4)) },
        })
      }

      // Mise à jour des quantités livrées + statut de la commande
      if (commande) {
        for (const ligne of data.lignes) {
          // Appariement par medicamentId, sinon par DCI (lignes créées sans référence médicament)
          const med = await tx.medicament.findUnique({
            where: { id: ligne.medicamentId },
            select: { dci: true },
          })
          const ligneCmd = await tx.ligneCommande.findFirst({
            where: {
              commandeId: commande.id,
              OR: [
                { medicamentId: ligne.medicamentId },
                ...(med ? [{ medicamentId: null, dci: med.dci }] : []),
              ],
            },
            select: { id: true },
          })
          if (ligneCmd) {
            await tx.ligneCommande.update({
              where: { id: ligneCmd.id },
              data: { quantiteLivre: { increment: ligne.quantite } },
            })
          }
        }

        const lignesCmd = await tx.ligneCommande.findMany({
          where: { commandeId: commande.id },
          select: { quantite: true, quantiteLivre: true },
        })
        const complete = lignesCmd.length > 0 && lignesCmd.every(l => l.quantiteLivre >= l.quantite)
        await tx.commandeFournisseur.update({
          where: { id: commande.id },
          data: complete
            ? { statut: 'LIVREE', dateLivraisonReelle: new Date() }
            : { statut: 'LIVREE_PARTIELLEMENT' },
        })
        await tx.receptionFournisseur.update({
          where: { id: receptionCreee.id },
          data: { statut: complete ? 'COMPLETE' : 'PARTIELLE' },
        })
      }

      // Journal d'audit
      await tx.auditLog.create({
        data: {
          userId: user.id,
          pharmacieId,
          action: 'RECEPTION',
          entity: 'ReceptionFournisseur',
          entityId: receptionCreee.id,
          details: `${data.lignes.length} ligne(s) reçue(s) de ${fournisseur.nom}${commande ? ` — commande ${commande.ref}` : ''}`,
        },
      })

      return tx.receptionFournisseur.findUnique({
        where: { id: receptionCreee.id },
        include: {
          lignes: {
            include: {
              medicament: { select: { id: true, dci: true, nomCommercial: true, cmup: true } },
              lot: { select: { id: true, numeroLot: true, quantite: true, dateExpiration: true } },
            },
          },
          fournisseur: { select: { id: true, nom: true } },
        },
      })
      },
      { timeout: 30_000, maxWait: 15_000 }
    )

    return NextResponse.json(reception, { status: 201 })
  } catch (error) {
    if (error instanceof ReceptionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Erreur POST receptions:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la réception' },
      { status: 500 }
    )
  }
}

class ReceptionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}
