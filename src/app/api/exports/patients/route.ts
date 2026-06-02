import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { exportToExcel } from '@/lib/excel'

// GET /api/exports/patients — Export patients to Excel
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, 'M05_PATIENTS', 'read')
  if (authResult instanceof Response) return authResult

  try {
    const pharmacieId = request.nextUrl.searchParams.get('pharmacieId')
    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    const patients = await db.patient.findMany({
      where: { pharmacieId },
      orderBy: { nom: 'asc' },
      take: 1000,
    })

    const data = patients.map(p => ({
      'Nom': p.nom,
      'Prénom': p.prenom,
      'Téléphone': p.telephone || '',
      'Email': p.email || '',
      'Date Naissance': p.dateNaissance ? new Date(p.dateNaissance).toLocaleDateString('fr-FR') : '',
      'CNSS': p.numeroCNSS || '',
      'Fidèle': p.estFidele ? 'Oui' : 'Non',
      'Points Fidélité': p.pointsFidelite,
    }))

    const buffer = exportToExcel(data, 'Patients')

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="patients-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Erreur export patients:', error)
    return NextResponse.json({ error: "Erreur lors de l'export" }, { status: 500 })
  }
}
