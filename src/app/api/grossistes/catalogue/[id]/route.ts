import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updateData: Record<string, unknown> = {}
    if (body.prixAchat !== undefined) updateData.prixAchat = body.prixAchat
    if (body.disponible !== undefined) updateData.disponible = body.disponible
    if (body.dci !== undefined) updateData.dci = body.dci
    if (body.nomCommercial !== undefined) updateData.nomCommercial = body.nomCommercial
    if (body.forme !== undefined) updateData.forme = body.forme
    if (body.dosage !== undefined) updateData.dosage = body.dosage
    if (body.referenceGros !== undefined) updateData.referenceGros = body.referenceGros

    const updated = await db.cataloguePrix.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur PATCH catalogue:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.cataloguePrix.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE catalogue:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
