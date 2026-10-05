// ============================================================
// MediHelm — Export SYSCOHADA révisé du GROSSISTE (module G09)
// GET /api/grossistes/exports/syscohada
// Facturation des officines clientes — D 411 / C 701 (+4431 TVA),
// encaissements D 5211 / C 411. CSV Saari/Sage/Excel.
// Rôles : GROSSISTE_ADMIN · GROSSISTE_COMPTABLE
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, checkGrossisteAccess, requireGrossisteModule } from '@backend/lib/api-auth'
import {
  genererExportSyscohadaGrossiste,
  journalCSVSimple,
  journalCSVDouble,
  balanceCSV,
} from '@backend/lib/syscohada'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'read')
  if (auth instanceof Response) return auth

  const moduleGuard = requireGrossisteModule(auth, ['GROSSISTE_ADMIN', 'GROSSISTE_COMPTABLE'])
  if (moduleGuard) return moduleGuard

  try {
    const grossisteId = auth.grossisteId
    const guard = checkGrossisteAccess(auth, grossisteId)
    if (guard) return guard
    if (!grossisteId) {
      return NextResponse.json({ error: 'Compte non rattaché à un grossiste' }, { status: 403 })
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
    const export_ = await genererExportSyscohadaGrossiste({ grossisteId, debut, fin, tvaTaux })
    const slug = `syscohada-grossiste-${grossisteId.slice(0, 8)}-${dateDebut}-${dateFin}`

    switch (format) {
      case 'csv-simple':
        return new NextResponse(journalCSVSimple(export_), {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${slug}-journal.csv"`,
          },
        })
      case 'csv-double':
        return new NextResponse(journalCSVDouble(export_), {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${slug}-journal-detaille.csv"`,
          },
        })
      case 'csv-balance':
        return new NextResponse(balanceCSV(export_), {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${slug}-balance.csv"`,
          },
        })
      case 'excel': {
        const XLSX = await import('xlsx')
        const journalRows = export_.journal.map((l) => ({
          Date: new Date(l.date).toLocaleDateString('fr-FR'),
          Journal: l.journal,
          Libellé: l.libelle,
          'Compte débiteur': l.compteDebit,
          'Compte créditeur': l.compteCredit,
          Montant: l.montant,
          Référence: l.reference,
        }))
        const balanceRows = export_.balance.map((b) => ({
          Compte: b.compte,
          Intitulé: b.intitule,
          'Total débit': b.totalDebit,
          'Total crédit': b.totalCredit,
          Solde: b.solde,
        }))
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(journalRows.length ? journalRows : [{ Info: 'Aucune écriture' }]), 'Journal')
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(balanceRows.length ? balanceRows : [{ Info: 'Aucune écriture' }]), 'Balance')
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
        return new NextResponse(new Uint8Array(buf), {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${slug}.xlsx"`,
          },
        })
      }
      default:
        return NextResponse.json(export_)
    }
  } catch (error) {
    console.error('Erreur export SYSCOHADA grossiste:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération de l’export SYSCOHADA' }, { status: 500 })
  }
}
