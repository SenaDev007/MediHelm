import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dci = searchParams.get('dci')

    if (!dci) {
      return NextResponse.json({ error: 'Paramètre dci requis' }, { status: 400 })
    }

    const catalogues = await db.cataloguePrix.findMany({
      where: { dci: { contains: dci, mode: 'insensitive' }, disponible: true },
      include: { grossiste: { select: { id: true, nom: true, codeGrossiste: true } } },
      orderBy: { prixAchat: 'asc' },
    })

    return NextResponse.json({
      dci,
      comparaison: catalogues.map((c) => ({
        grossiste: c.grossiste.nom,
        referenceGros: c.referenceGros,
        nomCommercial: c.nomCommercial,
        forme: c.forme,
        dosage: c.dosage,
        prixAchat: c.prixAchat,
        disponible: c.disponible,
      })),
      meilleurPrix: catalogues.length > 0 ? catalogues[0] : null,
    })
  } catch (error) {
    console.error('Erreur GET compare:', error)
    return NextResponse.json({ error: 'Erreur lors de la comparaison des prix' }, { status: 500 })
  }
}
