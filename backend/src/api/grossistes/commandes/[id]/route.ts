import { NextResponse } from 'next/server'
import { db } from '@backend/lib/db'
import { requireAuth, GROSSISTE_TENANT_ROLES } from '@backend/lib/api-auth'

// Valid status values for grossiste orders
const VALID_STATUTS = [
  'BROUILLON',
  'ENVOYEE',
  'CONFIRMEE',
  'EN_PREPARATION',
  'EN_LIVRAISON',
  'LIVREE',
  'ANNULEE',
  'REFUSEE',
  'LITIGE',
] as const

// Allowed status transitions from each current status
const STATUS_TRANSITIONS: Record<string, string[]> = {
  BROUILLON: ['ENVOYEE', 'ANNULEE'],
  ENVOYEE: ['CONFIRMEE', 'REFUSEE', 'ANNULEE'],
  CONFIRMEE: ['EN_PREPARATION', 'ANNULEE'],
  EN_PREPARATION: ['EN_LIVRAISON', 'ANNULEE', 'LITIGE'],
  EN_LIVRAISON: ['LIVREE', 'LITIGE'],
  LIVREE: [],
  ANNULEE: [],
  REFUSEE: [],
  LITIGE: ['EN_PREPARATION', 'ANNULEE'],
}

type PharmacieInfo = {
  id: string
  nom: string
  ville: string
  adresse: string
  telephone: string
}

async function getPharmacie(
  pharmacieId: string | null
): Promise<PharmacieInfo | null> {
  if (!pharmacieId) return null
  return db.pharmacie.findUnique({
    where: { id: pharmacieId },
    select: { id: true, nom: true, ville: true, adresse: true, telephone: true },
  })
}

/**
 * GET /api/grossistes/commandes/[id]
 * Get a single CommandeGrossiste with lines and pharmacie info.
 * Requires: M17_GROSSISTES read
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'read')
  if (auth instanceof Response) return auth

  try {
    const { id } = await params
    const commande = await db.commandeGrossiste.findUnique({
      where: { id },
      include: {
        grossiste: {
          select: { id: true, nom: true, slug: true },
        },
        lignes: true,
      },
    })

    if (!commande) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      )
    }

    // Isolation tenant: un partenaire grossiste n'accède qu'aux commandes de SON grossiste
    if (GROSSISTE_TENANT_ROLES.includes(auth.roleName as (typeof GROSSISTE_TENANT_ROLES)[number]) && commande.grossisteId !== auth.grossisteId) {
      return NextResponse.json({ error: 'Accès refusé à cette commande.' }, { status: 403 })
    }

    const pharmacie = await getPharmacie(commande.pharmacieId)

    return NextResponse.json({
      ...commande,
      pharmacie,
    })
  } catch (error) {
    console.error('Erreur commande:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement de la commande' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/grossistes/commandes/[id]
 * Update status of a CommandeGrossiste with transition validation.
 *
 * Extension G03 (ERP) :
 *   - Confirmation PARTIELLE : lignes[].quantiteConfirmee < quantite commandée
 *   - Reliquat automatique : commande résiduelle créée pour les produits non livrés
 *   - Source de la commande (MEDIHELM_PRO · SAISIE_MANUELLE · APP_COMMERCIAL · EMAIL_EDI)
 *   - Encaissement : montantPaye suivi pour le recouvrement (G09)
 * Requires: M17_GROSSISTES write
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'write')
  if (auth instanceof Response) return auth

  try {
    const { id } = await params
    const body = await request.json()
    const { statut, reference, lignes, source, montantPaye, creerReliquat } = body

    const existing = await db.commandeGrossiste.findUnique({
      where: { id },
      include: { lignes: true },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      )
    }

    // Isolation tenant: un partenaire grossiste ne modifie que les commandes de SON grossiste
    if (GROSSISTE_TENANT_ROLES.includes(auth.roleName as (typeof GROSSISTE_TENANT_ROLES)[number]) && existing.grossisteId !== auth.grossisteId) {
      return NextResponse.json({ error: 'Accès refusé à cette commande.' }, { status: 403 })
    }

    // Validate status if provided
    if (statut !== undefined) {
      if (!VALID_STATUTS.includes(statut as (typeof VALID_STATUTS)[number])) {
        return NextResponse.json(
          {
            error: `Statut invalide. Statuts valids : ${VALID_STATUTS.join(', ')}`,
          },
          { status: 400 }
        )
      }

      // Check allowed transitions
      const allowedTransitions = STATUS_TRANSITIONS[existing.statut] || []
      if (!allowedTransitions.includes(statut)) {
        return NextResponse.json(
          {
            error: `Transition non autorisée : ${existing.statut} → ${statut}. Transitions autorisées depuis ${existing.statut} : ${allowedTransitions.join(', ') || 'aucune'}`,
          },
          { status: 400 }
        )
      }
    }

    // ── G03 : confirmation partielle ligne par ligne ──
    let lignesIncompletes = 0
    if (Array.isArray(lignes)) {
      for (const l of lignes) {
        const ligneExistante = existing.lignes.find((el) => el.id === l.ligneId)
        if (!ligneExistante) continue
        const qc = Number(l.quantiteConfirmee)
        if (Number.isInteger(qc) && qc >= 0 && qc <= ligneExistante.quantite) {
          await db.ligneCommandeGrossiste.update({
            where: { id: l.ligneId },
            data: { quantiteConfirmee: qc },
          })
          if (qc < ligneExistante.quantite) lignesIncompletes += 1
        }
      }
    }

    // ── G03 : reliquat automatique ──
    type CommandeAvecLignes = Awaited<ReturnType<typeof db.commandeGrossiste.findFirst<{ include: { lignes: true } }>>>
    let reliquat: NonNullable<CommandeAvecLignes> | null = null
    if (
      creerReliquat &&
      statut === 'CONFIRMEE' &&
      existing.statut === 'ENVOYEE' &&
      Array.isArray(lignes) &&
      lignesIncompletes > 0
    ) {
      const lignesFraiches = await db.ligneCommandeGrossiste.findMany({ where: { commandeId: id } })
      const residuelles = lignesFraiches.filter(
        (l) => (l.quantiteConfirmee ?? l.quantite) < l.quantite
      )
      if (residuelles.length > 0) {
        const montantReliquat = residuelles.reduce(
          (s, l) => s + (l.quantite - (l.quantiteConfirmee ?? l.quantite)) * l.prixUnitaire,
          0
        )
        const suffix = String(Date.now()).slice(-6)
        reliquat = await db.commandeGrossiste.create({
          data: {
            grossisteId: existing.grossisteId,
            pharmacieId: existing.pharmacieId,
            reference: `REL-${existing.reference}-${suffix}`,
            statut: 'BROUILLON',
            source: 'SAISIE_MANUELLE',
            montantTotal: montantReliquat,
            notes: `Reliquat automatique de ${existing.reference}`,
            lignes: {
              create: residuelles.map((l) => ({
                produitId: l.produitId,
                dci: l.dci,
                nomCommercial: l.nomCommercial,
                quantite: l.quantite - (l.quantiteConfirmee ?? l.quantite),
                prixUnitaire: l.prixUnitaire,
                montant: (l.quantite - (l.quantiteConfirmee ?? l.quantite)) * l.prixUnitaire,
              })),
            },
          },
          include: { lignes: true },
        })
      }
    }

    // Recalcul du montant confirmé (lignes confirmées uniquement)
    let data: Record<string, unknown> = {
      ...(statut !== undefined && { statut }),
      ...(reference !== undefined && { reference }),
    }
    if (Array.isArray(lignes)) {
      const lignesFraiches = await db.ligneCommandeGrossiste.findMany({ where: { commandeId: id } })
      const montantConfirme = lignesFraiches.reduce(
        (s, l) => s + (l.quantiteConfirmee ?? l.quantite) * l.prixUnitaire,
        0
      )
      data.montantTotal = montantConfirme
    }
    if (source !== undefined && ['MEDIHELM_PRO', 'SAISIE_MANUELLE', 'APP_COMMERCIAL', 'EMAIL_EDI'].includes(source)) {
      data.source = source
    }
    if (montantPaye !== undefined && Number(montantPaye) >= 0) {
      data.montantPaye = Number(montantPaye)
    }

    const commande = await db.commandeGrossiste.update({
      where: { id },
      data,
      include: {
        grossiste: true,
        lignes: true,
      },
    })

    const pharmacie = await getPharmacie(commande.pharmacieId)

    return NextResponse.json({
      ...commande,
      pharmacie,
      ...(reliquat ? { reliquat } : {}),
      confirmationPartielle: lignesIncompletes > 0 ? { lignesIncompletes } : undefined,
    })
  } catch (error) {
    console.error('Erreur mise à jour commande:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la commande' },
      { status: 500 }
    )
  }
}
