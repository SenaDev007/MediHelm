import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Format FCFA currency
function formatFCFA(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' FCFA'
}

// Generate ticket de caisse
export function generateTicketCaisse(data: {
  pharmacie: { nom: string; adresse: string; telephone: string; numeroAgrement: string }
  vente: { id: string; createdAt: string; montantTotal: number; montantPaye: number; monnaieRendue: number }
  lignes: Array<{ medicamentNom: string; quantite: number; prixUnitaire: number; montant: number }>
  paiements: Array<{ mode: string; montant: number }>
}): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: [80, 200] }) // Receipt format

  let y = 10
  doc.setFontSize(12)
  doc.text(data.pharmacie.nom, 40, y, { align: 'center' })
  y += 5
  doc.setFontSize(8)
  doc.text(data.pharmacie.adresse, 40, y, { align: 'center' })
  y += 4
  doc.text(`Tél: ${data.pharmacie.telephone}`, 40, y, { align: 'center' })
  y += 4
  doc.text(`N° Agrément: ${data.pharmacie.numeroAgrement}`, 40, y, { align: 'center' })
  y += 6

  doc.setLineWidth(0.3)
  doc.line(5, y, 75, y)
  y += 5

  doc.setFontSize(9)
  doc.text(`Ticket N° ${data.vente.id.slice(0, 8)}`, 5, y)
  doc.text(new Date(data.vente.createdAt).toLocaleString('fr-FR'), 75, y, { align: 'right' })
  y += 6

  // Items
  data.lignes.forEach(ligne => {
    doc.setFontSize(8)
    doc.text(ligne.medicamentNom.slice(0, 30), 5, y)
    y += 3.5
    doc.text(`  ${ligne.quantite} x ${formatFCFA(ligne.prixUnitaire)}`, 5, y)
    doc.text(formatFCFA(ligne.montant), 75, y, { align: 'right' })
    y += 4.5
  })

  y += 2
  doc.line(5, y, 75, y)
  y += 5

  doc.setFontSize(10)
  doc.text('TOTAL:', 5, y)
  doc.text(formatFCFA(data.vente.montantTotal), 75, y, { align: 'right' })
  y += 5
  doc.setFontSize(8)
  doc.text('PAYÉ:', 5, y)
  doc.text(formatFCFA(data.vente.montantPaye), 75, y, { align: 'right' })
  y += 4
  doc.text('MONNAIE:', 5, y)
  doc.text(formatFCFA(data.vente.monnaieRendue), 75, y, { align: 'right' })
  y += 5

  // Payment methods
  data.paiements.forEach(p => {
    doc.text(`${p.mode}: ${formatFCFA(p.montant)}`, 5, y)
    y += 4
  })

  y += 5
  doc.setFontSize(7)
  doc.text('Merci pour votre confiance!', 40, y, { align: 'center' })
  doc.text('MediHelm — YEHI OR Tech', 40, y + 3.5, { align: 'center' })

  return doc
}

// Generate facture
export function generateFacture(data: {
  pharmacie: { nom: string; adresse: string; telephone: string; email: string; numeroAgrement: string }
  patient: { nom: string; prenom: string; telephone?: string }
  vente: { id: string; createdAt: string; montantTotal: number; montantRemise: number; montantPaye: number }
  lignes: Array<{ medicamentNom: string; dci: string; quantite: number; prixUnitaire: number; remise: number; montant: number }>
  paiements: Array<{ mode: string; montant: number; reference?: string }>
  organisme?: { nom: string; tauxPriseEnCharge: number }
}): jsPDF {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(18)
  doc.setTextColor(8, 80, 65) // #085041
  doc.text('FACTURE', 105, 20, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text(data.pharmacie.nom, 14, 35)
  doc.setFontSize(8)
  doc.text(data.pharmacie.adresse, 14, 40)
  doc.text(`Tél: ${data.pharmacie.telephone}`, 14, 45)
  doc.text(`Email: ${data.pharmacie.email || ''}`, 14, 50)
  doc.text(`N° Agrément: ${data.pharmacie.numeroAgrement}`, 14, 55)

  // Patient info
  doc.setFontSize(9)
  doc.text(`Client: ${data.patient.prenom} ${data.patient.nom}`, 14, 65)
  if (data.patient.telephone) doc.text(`Tél: ${data.patient.telephone}`, 14, 70)

  // Invoice details
  doc.text(`Facture N°: FAC-${data.vente.id.slice(0, 8).toUpperCase()}`, 140, 65)
  doc.text(`Date: ${new Date(data.vente.createdAt).toLocaleDateString('fr-FR')}`, 140, 70)

  // Table
  autoTable(doc, {
    startY: 80,
    head: [['Médicament', 'DCI', 'Qté', 'P.U.', 'Remise', 'Montant']],
    body: data.lignes.map(l => [
      l.medicamentNom,
      l.dci,
      l.quantite.toString(),
      formatFCFA(l.prixUnitaire),
      l.remise > 0 ? `${l.remise}%` : '-',
      formatFCFA(l.montant),
    ]),
    foot: [
      ['Total', '', '', '', '', formatFCFA(data.vente.montantTotal)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [29, 158, 117] }, // #1D9E75
  })

  return doc
}

// Generate bordereau de livraison grossiste (G05 §7 — CDC Grossiste)
export function generateBordereauLivraison(data: {
  grossiste: { nom: string; telephone: string | null; email: string | null }
  livraison: { id: string; planning: string | null; statut: string; signatureElectronique: string | null }
  commande: { reference: string; montantTotal: number; source: string }
  pharmacie: { nom: string; ville: string | null; adresse: string | null; telephone: string } | null
  lignes: Array<{ dci: string; nomCommercial: string | null; quantite: number; quantiteLivre: number; prixUnitaire: number; montant: number }>
}): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // En-tête — bandeau de marque MediHelm
  doc.setFillColor(29, 158, 117) // #1D9E75
  doc.rect(0, 0, 210, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15)
  doc.text('BORDEREAU DE LIVRAISON', 105, 10, { align: 'center' })
  doc.setFontSize(9)
  doc.text(`MediHelm Grossiste — ${data.grossiste.nom}`, 105, 16, { align: 'center' })

  let y = 32
  doc.setTextColor(0, 0, 0)

  // Bloc expéditeur / destinataire
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('EXPÉDITEUR', 14, y)
  doc.text('DESTINATAIRE', 120, y)
  doc.setFont('helvetica', 'normal')
  y += 6
  doc.text(data.grossiste.nom, 14, y)
  doc.text(data.pharmacie?.nom ?? 'Officine', 120, y)
  y += 5
  doc.text(`Tél : ${data.grossiste.telephone ?? '—'}`, 14, y)
  doc.text(data.pharmacie?.adresse ?? '—', 120, y)
  y += 5
  doc.text(data.grossiste.email ?? '—', 14, y)
  doc.text(`${data.pharmacie?.ville ?? '—'} — Tél : ${data.pharmacie?.telephone ?? '—'}`, 120, y)

  // Bloc livraison
  y += 12
  doc.setFont('helvetica', 'bold')
  doc.text(`Commande : ${data.commande.reference}`, 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text(`Livraison N° : ${data.livraison.id.slice(0, 8).toUpperCase()}`, 120, y)
  y += 6
  doc.text(
    `Planifiée le : ${data.livraison.planning ? new Date(data.livraison.planning).toLocaleString('fr-FR') : '—'}`,
    14,
    y
  )
  doc.text(`Source : ${data.commande.source}`, 120, y)

  // Table des lignes
  autoTable(doc, {
    startY: y + 8,
    head: [['DCI', 'Produit', 'Qté cmd.', 'Qté livrée', 'P.U. (FCFA)', 'Montant (FCFA)']],
    body: data.lignes.map((l) => [
      l.dci,
      l.nomCommercial ?? '—',
      l.quantite.toString(),
      l.quantiteLivre.toString(),
      l.prixUnitaire.toLocaleString('fr-FR'),
      l.montant.toLocaleString('fr-FR'),
    ]),
    foot: [['', '', '', '', 'Total', data.commande.montantTotal.toLocaleString('fr-FR') + ' FCFA']],
    theme: 'grid',
    headStyles: { fillColor: [29, 158, 117] },
    footStyles: { fillColor: [15, 110, 86], textColor: 255 },
  })

  // Zone signature
  const yEnd = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15
  doc.setDrawColor(120)
  doc.rect(14, yEnd, 85, 22)
  doc.rect(110, yEnd, 85, 22)
  doc.setFontSize(8)
  doc.setTextColor(90)
  doc.text('Signature livreur', 18, yEnd + 20)
  doc.text('Cachet / Signature responsable officine', 114, yEnd + 20)

  if (data.livraison.signatureElectronique) {
    doc.setTextColor(29, 158, 117)
    doc.setFontSize(9)
    doc.text(`✓ Signature électronique : ${data.livraison.signatureElectronique}`, 110, yEnd + 12)
  }

  return doc
}
