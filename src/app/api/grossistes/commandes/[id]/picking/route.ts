import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, checkGrossisteAccess, requireGrossisteModule } from '@/lib/api-auth'

/**
 * POST /api/grossistes/commandes/[id]/picking — Module G04
 * Génère le bon de picking d'une commande CONFIRMÉE :
 *   - Règle FEFO : lot à la date d'expiration la plus proche d'abord
 *   - Lots en quarantaine EXCLUS (le préparateur ne peut pas les prélever)
 *   - Écarts de stock tracés ligne par ligne (quantité prélevable vs commandée)
 * Body : { preparateurId? } — passe la commande en EN_PREPARATION
 * Rôles : GROSSISTE_ADMIN · GROSSISTE_PREPARATEUR
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'write')
  if (auth instanceof Response) return auth

  const moduleGuard = requireGrossisteModule(auth, ['GROSSISTE_ADMIN', 'GROSSISTE_PREPARATEUR'])
  if (moduleGuard) return moduleGuard

  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { preparateurId } = body ?? {}

    const commande = await db.commandeGrossiste.findUnique({
      where: { id },
      include: { lignes: true },
    })
    const guard = checkGrossisteAccess(auth, commande?.grossisteId ?? null)
    if (guard) return guard
    if (!commande) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }

    // Le picking démarre sur une commande confirmée (confirmation partielle possible)
    if (!['CONFIRMEE', 'EN_PREPARATION'].includes(commande.statut)) {
      return NextResponse.json(
        { error: `Le picking exige une commande CONFIRMEE (statut actuel : ${commande.statut})` },
        { status: 409 }
      )
    }

    // Un seul bon de picking actif par commande
    const existant = await db.bonPicking.findFirst({
      where: { commandeId: id, statut: { in: ['EN_ATTENTE', 'PRET'] } },
    })
    if (existant) {
      return NextResponse.json(
        { error: 'Un bon de picking est déjà ouvert pour cette commande', bon: existant },
        { status: 409 }
      )
    }

    // ── Sélection FEFO par ligne ────────────────────────────────────────
    interface LignePicking {
      ligneId: string
      dci: string
      nomCommercial: string | null
      aPrelever: number
      prelevements: Array<{ lotId: string; numeroLot: string; quantite: number; dateExpiration: string; emplacement: string | null }>
      manquant: number
      alerteQuarantaine: boolean
    }

    const lignesPicking: LignePicking[] = []
    let alertesQuarantaine = 0

    for (const ligne of commande.lignes) {
      const cible = ligne.quantiteConfirmee ?? ligne.quantite

      // Lots DISPONIBLES uniquement, FEFO : expiration la plus proche d'abord
      const lots = await db.lotGrossiste.findMany({
        where: { produitId: ligne.produitId ?? undefined, statut: 'DISPONIBLE', quantite: { gt: 0 } },
        orderBy: { dateExpiration: 'asc' },
      })
      // Quarantaine visible (pour alerter le préparateur)
      const enQuarantaine = await db.lotGrossiste.findMany({
        where: { produitId: ligne.produitId ?? undefined, statut: 'QUARANTAINE', quantite: { gt: 0 } },
      })
      if (enQuarantaine.length > 0) alertesQuarantaine += 1

      const prelevements: LignePicking['prelevements'] = []
      let reste = cible
      for (const lot of lots) {
        if (reste <= 0) break
        const pris = Math.min(reste, lot.quantite)
        prelevements.push({
          lotId: lot.id,
          numeroLot: lot.numeroLot,
          quantite: pris,
          dateExpiration: lot.dateExpiration.toISOString(),
          emplacement: lot.emplacement,
        })
        reste -= pris
      }

      lignesPicking.push({
        ligneId: ligne.id,
        dci: ligne.dci,
        nomCommercial: ligne.nomCommercial,
        aPrelever: cible,
        prelevements,
        manquant: reste,
        alerteQuarantaine: enQuarantaine.length > 0,
      })
    }

    // ── Création du bon ────────────────────────────────────────────────
    const bon = await db.bonPicking.create({
      data: {
        commandeId: id,
        preparateurId: preparateurId ?? auth.id,
        lignes: JSON.stringify(lignesPicking),
        statut: 'EN_ATTENTE',
      },
    })

    await db.commandeGrossiste.update({
      where: { id },
      data: { statut: 'EN_PREPARATION' },
    })

    return NextResponse.json(
      {
        ...bon,
        lignes: lignesPicking,
        alertes: {
          quarantaine: alertesQuarantaine,
          ruptures: lignesPicking.filter((l) => l.manquant > 0).length,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erreur POST picking:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération du bon de picking' }, { status: 500 })
  }
}
