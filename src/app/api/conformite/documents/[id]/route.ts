import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const doc = await db.documentReglementaire.findUnique({ where: { id } })

    if (!doc) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    await db.documentReglementaire.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Document supprimé' })
  } catch (error) {
    console.error('Erreur DELETE document réglementaire:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
