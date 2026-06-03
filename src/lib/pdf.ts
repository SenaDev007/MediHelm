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
  doc.text('MédiHelm — YEHI OR Tech', 40, y + 3.5, { align: 'center' })

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
