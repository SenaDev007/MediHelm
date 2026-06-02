import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

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

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 MB)' }, { status: 400 })
    }

    // Save file to uploads directory
    const uploadDir = path.join(process.cwd(), 'uploads', 'ordonnances', id)
    await mkdir(uploadDir, { recursive: true })

    const ext = path.extname(file.name) || '.jpg'
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
    const filepath = path.join(uploadDir, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    const imageUrl = `/api/uploads/ordonnances/${id}/${filename}`

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
