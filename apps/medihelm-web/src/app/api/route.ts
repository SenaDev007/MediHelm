// ============================================================
// MediHelm — Health Check / API Info
// GET /api
// Point d'entrée de l'API — statut et version
// ============================================================

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    service: 'MediHelm API',
    environment: process.env.NODE_ENV || 'development',
  })
}
