import { NextRequest, NextResponse } from 'next/server'

// Stub — Conge model does not exist in SQLite dev schema
export async function GET() {
  return NextResponse.json([])
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ error: 'Module non disponible en mode développement' }, { status: 501 })
}

export async function PATCH(request: NextRequest) {
  return NextResponse.json({ error: 'Module non disponible en mode développement' }, { status: 501 })
}
