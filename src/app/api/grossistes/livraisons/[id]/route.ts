import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, checkGrossisteAccess, requireGrossisteModule } from '@/lib/api-auth'

/**
 * PATCH /api/grossistes/livraisons/[id] — Suivi livraison (G05)
 * Workflow : PLANIFIEE → EN_ROUTE → LIVREE | LITIGE | ECHEC
 * - LIVREE : signature électronique du responsable d'officine obligatoire,
 *   passe la commande en LIVREE (ou LIVREE_PARTIELLEMENT si écarts)
 * - LITIGE / ECHEC : motifs + produits refusés (quantités) tracés
 * Body : { statut, signatureElectronique?, motif?, ecarts?: [{ligneId, refuse}] }
 * Rôles : GROSSISTE_ADMIN · GROSSISTE_LIVREUR · GROSSISTE_COMMANDES
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'write')
  if (auth instanceof Response) return auth

  const moduleGuard = requireGrossisteModule(auth, [
    'GROSSISTE_ADMIN',
    'GROSSISTE_LIVREUR',
    'GROSSISTE_COMMANDES',
  ])
  if (moduleGuard) return moduleGuard

  try {
    const { id } = await params
    const body = await request.json()
    const { statut, signatureElectronique, motif, ecarts } = body ?? {}

    const TRANSITIONS: Record<string, string[]> = {
      PLANIFIEE: ['EN_ROUTE', 'ECHEC'],
      EN_ROUTE: ['LIVREE', 'LITIGE', 'ECHEC'],
      LITIGE: ['LIVREE'],
    }

    const livraison = await db.livraisonGrossiste.findUnique({
      where: { id },
      include: { commande: { include: { lignes: true } } },
    })
    const guard = checkGrossisteAccess(auth, livraison?.commande?.grossisteId ?? null)
    if (guard) return guard
    if (!livraison) {
      return NextResponse.json({ error: 'Livraison introuvable' }, { status: 404 })
    }

    const autorises = TRANSITIONS[livraison.statut] ?? []
    if (!statut || !autorises.includes(statut)) {
      return NextResponse.json(
        {
          error: `Transition invalide : ${livraison.statut} → ${statut ?? '?'}`,
          transitionsAutorisees: autorises,
        },
        { status: 409 }
      )
    }

    // Signature obligatoire pour clôturer en LIVREE (CDC G05 §7.2)
    if (statut === 'LIVREE' && !signatureElectronique) {
      return NextResponse.json(
        { error: 'Signature électronique du responsable d’officine requise pour valider la livraison' },
        { status: 400 }
      )
    }
    if ((statut === 'LITIGE' || statut === 'ECHEC') && !motif) {
      return NextResponse.json({ error: 'Motif obligatoire pour un litige ou un échec' }, { status: 400 })
    }

    // Écarts : produits refusés à la livraison → quantités livrées corrigées
    if (statut === 'LIVREE' && Array.isArray(ecarts) && ecarts.length > 0) {
      for (const e of ecarts) {
        const ligne = livraison.commande.lignes.find((l) => l.id === e.ligneId)
        if (!ligne) continue
        const refuse = Math.max(0, Math.min(Number(e.refuse) || 0, ligne.quantiteLivre))
        if (refuse > 0) {
          await db.ligneCommandeGrossiste.update({
            where: { id: ligne.id },
            data: { quantiteLivre: { decrement: refuse } },
          })
        }
      }
    }

    const updated = await db.livraisonGrossiste.update({
      where: { id },
      data: {
        statut,
        signatureElectronique: signatureElectronique ?? livraison.signatureElectronique,
      },
    })

    // Statut commande aligné
    if (statut === 'LIVREE') {
      const lignes = await db.ligneCommandeGrossiste.findMany({ where: { commandeId: livraison.commandeId } })
      const complete = lignes.every((l) => l.quantiteLivre >= (l.quantiteConfirmee ?? l.quantite))
      await db.commandeGrossiste.update({
        where: { id: livraison.commandeId },
        data: { statut: complete ? 'LIVREE' : 'LIVREE_PARTIELLEMENT' },
      })
    } else if (statut === 'LITIGE') {
      await db.commandeGrossiste.update({
        where: { id: livraison.commandeId },
        data: { statut: 'LITIGE' },
      })
    }

    return NextResponse.json({
      ...updated,
      ...(motif && statut !== 'LIVREE' ? { motif } : {}),
    })
  } catch (error) {
    console.error('Erreur PATCH livraison:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour de la livraison' }, { status: 500 })
  }
}
