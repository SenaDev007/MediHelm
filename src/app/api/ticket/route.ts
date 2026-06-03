import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { generateTicketCaisse, generateFacture } from '@/lib/pdf'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, 'M02_POS', 'read')
  if (authResult instanceof Response) return authResult

  const venteId = request.nextUrl.searchParams.get('venteId')
  const type = request.nextUrl.searchParams.get('type') || 'ticket'

  if (!venteId) {
    return NextResponse.json({ error: 'venteId requis' }, { status: 400 })
  }

  const vente = await db.vente.findUnique({
    where: { id: venteId },
    include: {
      lignes: { include: { medicament: true } },
      paiements: true,
      patient: true,
      pharmacie: true,
    },
  })

  if (!vente) {
    return NextResponse.json({ error: 'Vente non trouvée' }, { status: 404 })
  }

  let doc
  if (type === 'facture') {
    doc = generateFacture({
      pharmacie: vente.pharmacie as typeof vente.pharmacie & { email: string },
      patient: vente.patient as typeof vente.patient & { nom: string; prenom: string; telephone?: string },
      vente: vente as typeof vente & { montantRemise: number },
      lignes: vente.lignes.map(l => ({
        medicamentNom: l.medicament.nomCommercial,
        dci: l.medicament.dci,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        remise: l.remise,
        montant: l.montant,
      })),
      paiements: vente.paiements.map(p => ({
        mode: p.modePaiement,
        montant: p.montant,
        reference: p.reference || undefined,
      })),
    })
  } else {
    doc = generateTicketCaisse({
      pharmacie: vente.pharmacie as typeof vente.pharmacie,
      vente: vente as typeof vente,
      lignes: vente.lignes.map(l => ({
        medicamentNom: l.medicament.nomCommercial,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        montant: l.montant,
      })),
      paiements: vente.paiements.map(p => ({
        mode: p.modePaiement,
        montant: p.montant,
      })),
    })
  }

  const pdfBuffer = doc.output('arraybuffer')
  return new Response(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${type}-${venteId.slice(0, 8)}.pdf"`,
    },
  })
}
