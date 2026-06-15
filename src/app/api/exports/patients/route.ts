import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/exports/patients — Export des données patients pour la pharmacie
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M05_PATIENTS', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json' // json ou csv
    const search = searchParams.get('search')

    const where: Record<string, unknown> = { pharmacieId }

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search } },
      ]
    }

    const patients = await db.patient.findMany({
      where,
      include: {
        ordonnances: {
          select: { id: true, dateOrdonnance: true, statut: true },
          take: 5,
          orderBy: { dateOrdonnance: 'desc' },
        },
        _count: {
          select: { ordonnances: true },
        },
      },
      orderBy: { nom: 'asc' },
    })

    if (format === 'csv') {
      // Générer le CSV
      const headers = [
        'ID',
        'Nom',
        'Prénom',
        'Téléphone',
        'Email',
        'Date de naissance',
        'Sexe',
        'Adresse',
        'Nombre ordonnances',
        'Date création',
      ]

      const rows = patients.map((p) => [
        p.id,
        `"${p.nom}"`,
        `"${p.prenom}"`,
        p.telephone || '',
        p.email || '',
        p.dateNaissance ? new Date(p.dateNaissance).toISOString().split('T')[0] : '',
        p.sexe || '',
        `"${p.adresse || ''}"`,
        p._count.ordonnances.toString(),
        new Date(p.createdAt).toISOString().split('T')[0],
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="patients_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // Format JSON par défaut
    const exportData = patients.map((p) => ({
      id: p.id,
      nom: p.nom,
      prenom: p.prenom,
      telephone: p.telephone,
      email: p.email,
      dateNaissance: p.dateNaissance,
      sexe: p.sexe,
      adresse: p.adresse,
      nbOrdonnances: p._count.ordonnances,
      dernieresOrdonnances: p.ordonnances,
      createdAt: p.createdAt,
    }))

    return NextResponse.json({
      data: exportData,
      total: exportData.length,
      exportedAt: new Date().toISOString(),
      pharmacieId,
    })
  } catch (error) {
    console.error('Erreur GET exports/patients:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'export des données patients' },
      { status: 500 }
    )
  }
}
