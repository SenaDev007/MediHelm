import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/exports/ventes — Export des données de ventes pour la pharmacie
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M02_POS', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json' // json ou csv
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')
    const statut = searchParams.get('statut')
    const modePaiement = searchParams.get('modePaiement')

    const where: Record<string, unknown> = { pharmacieId }

    if (dateDebut || dateFin) {
      where.createdAt = {
        ...(dateDebut ? { gte: new Date(dateDebut) } : {}),
        ...(dateFin ? { lte: new Date(dateFin + 'T23:59:59.999Z') } : {}),
      }
    }

    if (statut) {
      where.statut = statut
    }

    if (modePaiement) {
      where.modePaiement = modePaiement
    }

    const ventes = await db.vente.findMany({
      where,
      include: {
        patient: { select: { id: true, nom: true, prenom: true, telephone: true } },
        lignes: {
          include: {
            medicament: { select: { id: true, nomCommercial: true, dci: true } },
          },
        },
        paiements: true,
        utilisateur: { select: { id: true, nom: true, prenom: true } },
        ordonnance: { select: { id: true, reference: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Préparer les données d'export
    const exportData = ventes.map((vente) => ({
      id: vente.id,
      reference: vente.reference,
      date: vente.createdAt,
      statut: vente.statut,
      modePaiement: vente.modePaiement,
      montantTotal: vente.montantTotal,
      montantPaye: vente.montantPaye,
      montantAssur: vente.montantAssur,
      remise: vente.remise,
      patient: vente.patient
        ? {
            id: vente.patient.id,
            nom: vente.patient.nom,
            prenom: vente.patient.prenom,
            telephone: vente.patient.telephone,
          }
        : null,
      vendeur: vente.utilisateur
        ? `${vente.utilisateur.prenom} ${vente.utilisateur.nom}`
        : null,
      ordonnance: vente.ordonnance
        ? { id: vente.ordonnance.id, reference: vente.ordonnance.reference }
        : null,
      lignes: vente.lignes.map((ligne) => ({
        medicament: ligne.medicament.nomCommercial,
        dci: ligne.medicament.dci,
        quantite: ligne.quantite,
        prixUnitaire: ligne.prixUnitaire,
        prixTotal: ligne.prixTotal,
        remise: ligne.remise,
      })),
      paiements: vente.paiements.map((p) => ({
        id: p.id,
        montant: p.montant,
        mode: p.mode,
        reference: p.reference,
        statut: p.statut,
        date: p.createdAt,
      })),
      nbLignes: vente.lignes.length,
      nbPaiements: vente.paiements.length,
    }))

    if (format === 'csv') {
      const headers = [
        'Référence',
        'Date',
        'Statut',
        'Mode Paiement',
        'Montant Total',
        'Montant Payé',
        'Montant Assurance',
        'Remise',
        'Patient',
        'Téléphone Patient',
        'Vendeur',
        'Nb Lignes',
        'Nb Paiements',
      ]

      const rows = exportData.map((v) => [
        v.reference,
        new Date(v.date).toISOString().split('T')[0],
        v.statut,
        v.modePaiement,
        v.montantTotal.toFixed(2),
        v.montantPaye.toFixed(2),
        v.montantAssur.toFixed(2),
        v.remise.toFixed(2),
        v.patient ? `"${v.patient.prenom} ${v.patient.nom}"` : '',
        v.patient?.telephone || '',
        v.vendeur ? `"${v.vendeur}"` : '',
        v.nbLignes.toString(),
        v.nbPaiements.toString(),
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="ventes_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // Résumé statistique
    const resume = {
      totalVentes: exportData.length,
      montantTotal: exportData.reduce((sum, v) => sum + v.montantTotal, 0),
      montantPaye: exportData.reduce((sum, v) => sum + v.montantPaye, 0),
      montantAssurance: exportData.reduce((sum, v) => sum + v.montantAssur, 0),
      totalRemises: exportData.reduce((sum, v) => sum + v.remise, 0),
      panierMoyen: exportData.length > 0
        ? exportData.reduce((sum, v) => sum + v.montantTotal, 0) / exportData.length
        : 0,
      parStatut: groupBy(exportData, 'statut'),
      parModePaiement: groupBy(exportData, 'modePaiement'),
    }

    return NextResponse.json({
      data: exportData,
      resume,
      exportedAt: new Date().toISOString(),
      pharmacieId,
      filtres: {
        dateDebut: dateDebut || null,
        dateFin: dateFin || null,
        statut: statut || null,
        modePaiement: modePaiement || null,
      },
    })
  } catch (error) {
    console.error('Erreur GET exports/ventes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'export des données de ventes' },
      { status: 500 }
    )
  }
}

function groupBy(arr: Array<Record<string, unknown>>, key: string): Record<string, number> {
  const result: Record<string, number> = {}
  for (const item of arr) {
    const k = String(item[key] || 'NON_DEFINI')
    result[k] = (result[k] || 0) + 1
  }
  return result
}
