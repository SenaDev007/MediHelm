// ============================================================
// MediHelm — Diagnostic TEMPORAIRE (Edge) : visible depuis le
// runtime Edge de Vercel (même famille que le middleware) ?
// ============================================================

import { NextResponse } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  const explicit = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
  const info: Record<string, unknown> = {
    runtime: 'edge',
    hasNextauthSecret: Boolean(process.env.NEXTAUTH_SECRET),
    hasAuthSecret: Boolean(process.env.AUTH_SECRET),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasVercelEnv: Boolean(process.env.VERCEL),
    hasCryptoSubtle: Boolean(globalThis.crypto?.subtle),
  }

  if (explicit) {
    info.source = 'env-explicite'
    info.preview = explicit.slice(0, 8)
  } else if (process.env.DATABASE_URL && globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`medihelm-auth:v1:${process.env.DATABASE_URL}`),
    )
    info.source = 'derive-db'
    info.preview = Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 8)
  } else {
    info.source = 'AUCUN'
  }
  return NextResponse.json(info)
}
