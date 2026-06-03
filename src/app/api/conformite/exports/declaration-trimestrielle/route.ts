import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const annee = searchParams.get('annee')
    const trimestre = searchParams.get('trimestre')

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    const targetYear = annee ? parseInt(annee) : new Date().getFullYear()
    const targetTrimestre = trimestre ? parseInt(trimestre) : Math.ceil((new Date().getMonth() + 1) / 3)

    const dateDebut = new Date(targetYear, (targetTrimestre - 1) * 3, 1)
    const dateFin = new Date(targetYear, targetTrimestre * 3, 0, 23, 59, 59)

    const stupes = await db.destructionMedicament.findMany({
      where: {
        pharmacieId,
        medicament: { estStupefiant: true },
        dateDestruction: { gte: dateDebut, lte: dateFin },
      },
      include: {
        medicament: { select: { nomCommercial: true, dci: true, dosage: true } },
        lot: { select: { numeroLot: true, dateExpiration: true } },
        pharmacien: { select: { nom: true, prenom: true } },
        temoin: { select: { nom: true, prenom: true } },
      },
      orderBy: { dateDestruction: 'desc' },
    })

    const pharmacie = await db.pharmacie.findUnique({
      where: { id: pharmacieId },
      select: { nom: true, adresse: true, numeroAgrement: true },
    })

    return NextResponse.json({
      format: 'DPMED_DECLARATION_TRIMESTRIELLE',
      pharmacie,
      periode: {
        annee: targetYear,
        trimestre: targetTrimestre,
        dateDebut: dateDebut.toISOString(),
        dateFin: dateFin.toISOString(),
      },
      stupifiants: stupes.map((s) => ({
        date: s.dateDestruction,
        medicament: s.medicament.nomCommercial,
        dci: s.medicament.dci,
        lot: s.lot.numeroLot,
        quantite: s.quantite,
        motif: s.motif,
        pharmacien: `${s.pharmacien.prenom} ${s.pharmacien.nom}`,
        temoin: s.temoin ? `${s.temoin.prenom} ${s.temoin.nom}` : null,
        statut: s.statut,
      })),
      total: stupes.length,
      genereLe: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Erreur GET déclaration trimestrielle:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération' }, { status: 500 })
  }
}
