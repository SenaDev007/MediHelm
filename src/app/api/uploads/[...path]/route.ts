import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'

// GET /api/uploads/[...path] — Serve uploaded files
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathParts } = await params
    const filePath = path.join(process.cwd(), 'uploads', ...pathParts)

    // Security: ensure the path is within uploads directory
    const resolvedPath = path.resolve(filePath)
    const uploadsDir = path.resolve(path.join(process.cwd(), 'uploads'))
    if (!resolvedPath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const fileStat = await stat(resolvedPath).catch(() => null)
    if (!fileStat || !fileStat.isFile()) {
      return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 })
    }

    const buffer = await readFile(resolvedPath)
    
    // Determine content type from extension
    const ext = path.extname(resolvedPath).toLowerCase()
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.heic': 'image/heic',
      '.gif': 'image/gif',
    }
    const contentType = contentTypes[ext] || 'application/octet-stream'

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('Erreur serve file:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
