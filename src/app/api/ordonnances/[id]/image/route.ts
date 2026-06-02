import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const formData = await request.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Image requise' }, { status: 400 })
    }

    // Dans un cas réel, on uploaderait le fichier vers un stockage (S3, etc.)
    // Ici on simule avec une URL fictive
    const imageUrl = `/uploads/ordonnances/${id}/${file.name}`

    const data = await db.ordonnance.update({
      where: { id },
      data: { imageOrdonnanceUrl: imageUrl },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur POST image ordonnance:', error)
    return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 })
  }
}
