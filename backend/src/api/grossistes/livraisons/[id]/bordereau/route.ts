import { NextResponse } from 'next/server'
import { db } from '@backend/lib/db'
import { requireAuth, checkGrossisteAccess, requireGrossisteModule } from '@backend/lib/api-auth'
import { generateBordereauLivraison } from '@backend/lib/pdf'

/**
 * GET /api/grossistes/livraisons/[id]/bordereau — Bordereau PDF (G05)
 * Génération PDF par livraison (CDC Grossiste §8 — Module G09/G05).
 * Rôles : GROSSISTE_ADMIN · GROSSISTE_LIVREUR · GROSSISTE_COMMANDES
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'read')
  if (auth instanceof Response) return auth

  const moduleGuard = requireGrossisteModule(auth, [
    'GROSSISTE_ADMIN',
    'GROSSISTE_LIVREUR',
    'GROSSISTE_COMMANDES',
  ])
  if (moduleGuard) return moduleGuard

  try {
    const { id } = await params

    const livraison = await db.livraisonGrossiste.findUnique({
      where: { id },
      include: {
        commande: { include: { lignes: true } },
      },
    })
    const guard = checkGrossisteAccess(auth, livraison?.commande?.grossisteId ?? null)
    if (guard) return guard
    if (!livraison) {
      return NextResponse.json({ error: 'Livraison introuvable' }, { status: 404 })
    }

    const commande = livraison.commande
    const grossiste = await db.grossiste.findUnique({ where: { id: commande.grossisteId } })
    const pharmacie = commande.pharmacieId
      ? await db.pharmacie.findUnique({ where: { id: commande.pharmacieId } })
      : null

    const doc = generateBordereauLivraison({
      grossiste: {
        nom: grossiste?.nom ?? 'Grossiste',
        telephone: grossiste?.telephone ?? null,
        email: grossiste?.email ?? null,
      },
      livraison: {
        id: livraison.id,
        planning: livraison.planning?.toISOString() ?? null,
        statut: livraison.statut,
        signatureElectronique: livraison.signatureElectronique,
      },
      commande: {
        reference: commande.reference,
        montantTotal: commande.montantTotal,
        source: commande.source,
      },
      pharmacie: pharmacie
        ? {
            nom: pharmacie.nom,
            ville: pharmacie.ville,
            adresse: pharmacie.adresse,
            telephone: pharmacie.telephone,
          }
        : null,
      lignes: commande.lignes.map((l) => ({
        dci: l.dci,
        nomCommercial: l.nomCommercial,
        quantite: l.quantite,
        quantiteLivre: l.quantiteLivre,
        prixUnitaire: l.prixUnitaire,
        montant: l.montant,
      })),
    })

    const buffer = Buffer.from(doc.output('arraybuffer'))
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="bordereau-${commande.reference}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Erreur bordereau PDF:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération du bordereau' }, { status: 500 })
  }
}
