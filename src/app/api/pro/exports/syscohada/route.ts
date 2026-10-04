// ============================================================
// MediHelm — Export comptable SYSCOHADA révisé (M08)
// GET /api/pro/exports/syscohada
//
// Query params :
//   dateDebut, dateFin (YYYY-MM-DD, requis)
//   format : json | csv-simple | csv-double | csv-balance | excel (défaut json)
//   tva    : taux TVA décimal (0 par défaut — médicaments souvent exonérés)
//
// CSV compatibles Saari Comptabilité, Sage 100 et Excel.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import {
  genererExportSyscohada,
  journalCSVSimple,
  journalCSVDouble,
  balanceCSV,
} from '@/lib/syscohada'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M08_FINANCE', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    if (!pharmacieId) {
      return NextResponse.json({ error: 'Pharmacie non trouvée' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')
    const format = searchParams.get('format') || 'json'
    const tva = searchParams.get('tva')

    if (!dateDebut || !dateFin) {
      return NextResponse.json(
        { error: 'Paramètres dateDebut et dateFin requis (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    const debut = new Date(dateDebut + 'T00:00:00')
    const fin = new Date(dateFin + 'T23:59:59.999')
    if (isNaN(debut.getTime()) || isNaN(fin.getTime()) || debut > fin) {
      return NextResponse.json({ error: 'Période invalide' }, { status: 400 })
    }

    const tvaTaux = tva !== null && !isNaN(Number(tva)) ? Math.max(0, Number(tva)) : 0

    const export_ = await genererExportSyscohada({ pharmacieId, debut, fin, tvaTaux })

    const slug = `syscohada-${pharmacieId.slice(0, 8)}-${dateDebut}-${dateFin}`

    switch (format) {
      case 'csv-simple': {
        return new NextResponse(journalCSVSimple(export_), {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${slug}-journal.csv"`,
          },
        })
      }
      case 'csv-double': {
        return new NextResponse(journalCSVDouble(export_), {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${slug}-journal-detaille.csv"`,
          },
        })
      }
      case 'csv-balance': {
        return new NextResponse(balanceCSV(export_), {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${slug}-balance.csv"`,
          },
        })
      }
      case 'excel': {
        // Journal + Balance dans un classeur unique (2 feuilles)
        const XLSX = await import('xlsx')
        const journalRows = export_.journal.map((l) => ({
          Date: new Date(l.date).toLocaleDateString('fr-FR'),
          Journal: l.journal,
          Libellé: l.libelle,
          'Compte débiteur': l.compteDebit,
          'Compte créditeur': l.compteCredit,
          Montant: l.montant,
          Référence: l.reference,
          Source: l.source,
        }))
        const balanceRows = export_.balance.map((b) => ({
          Compte: b.compte,
          Intitulé: b.intitule,
          'Total débit': b.totalDebit,
          'Total crédit': b.totalCredit,
          'Solde débiteur': b.solde > 0 ? b.solde : 0,
          'Solde créditeur': b.solde < 0 ? Math.abs(b.solde) : 0,
        }))
        const wb = XLSX.utils.book_new()
        const wsJ = XLSX.utils.json_to_sheet(
          journalRows.length ? journalRows : [{ Info: 'Aucune écriture sur la période' }]
        )
        const wsB = XLSX.utils.json_to_sheet(
          balanceRows.length ? balanceRows : [{ Info: 'Aucune écriture sur la période' }]
        )
        XLSX.utils.book_append_sheet(wb, wsJ, 'Journal')
        XLSX.utils.book_append_sheet(wb, wsB, 'Balance')
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
        return new NextResponse(new Uint8Array(buf), {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${slug}.xlsx"`,
          },
        })
      }
      default: {
        // JSON — aperçu pour l'interface finance
        return NextResponse.json(export_)
      }
    }
  } catch (error) {
    console.error('Erreur export SYSCOHADA:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération de l’export SYSCOHADA' }, { status: 500 })
  }
}
