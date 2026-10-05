// ============================================================
// MediHelm — Diagnostic TEMPORAIRE (Node) : valeur dérivée côté
// routes API Node (celle qui signe réellement les JWT).
// ============================================================

import { NextResponse } from 'next/server'
import { resolveAuthSecret } from '@/lib/auth-secret'

export const dynamic = 'force-dynamic'

export async function GET() {
  const secret = resolveAuthSecret()
  return NextResponse.json({
    runtime: 'node',
    hasNextauthSecret: Boolean(process.env.NEXTAUTH_SECRET),
    hasAuthSecret: Boolean(process.env.AUTH_SECRET),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    source: secret
      ? (process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ? 'env-explicite' : 'derive-db')
      : 'AUCUN',
    preview: secret?.slice(0, 8) ?? null,
  })
}
