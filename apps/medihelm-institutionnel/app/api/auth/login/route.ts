import { NextRequest, NextResponse } from 'next/server'
import { parseInstitutionUser, SESSION_COOKIE } from '../../../../lib/session'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }
  if (
    !body ||
    typeof body !== 'object' ||
    !('email' in body) ||
    !('password' in body) ||
    typeof body.email !== 'string' ||
    typeof body.password !== 'string' ||
    body.email.length > 254 ||
    body.password.length > 128
  ) {
    return NextResponse.json({ error: 'Adresse e-mail ou mot de passe invalide' }, { status: 400 })
  }

  const apiBase = process.env.MEDIHELM_API_URL?.replace(/\/$/, '')
  if (!apiBase) return NextResponse.json({ error: 'Service d’authentification indisponible' }, { status: 503 })
  let upstream: Response
  try {
    upstream = await fetch(`${apiBase}/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: body.email, password: body.password, tenantType: 'INSTITUTIONNEL' }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return NextResponse.json({ error: 'Service d’authentification indisponible' }, { status: 503 })
  }
  if (!upstream.ok) {
    const status = upstream.status === 401 ? 401 : 503
    return NextResponse.json({ error: status === 401 ? 'Identifiants incorrects' : 'Service d’authentification indisponible' }, { status })
  }

  let payload: { data?: { token?: string; expiresIn?: number; user?: Record<string, unknown> } }
  try {
    payload = await upstream.json() as typeof payload
  } catch {
    return NextResponse.json({ error: 'Réponse d’authentification invalide' }, { status: 502 })
  }
  const token = payload.data?.token
  const user = parseInstitutionUser(payload.data?.user)
  if (!token || token.length > 8192 || !user) return NextResponse.json({ error: 'Session institutionnelle invalide' }, { status: 502 })
  if (user.role === 'ABRP_VIEWER') {
    return NextResponse.json({ error: 'Le portail ABRP n’est pas encore disponible dans cette application' }, { status: 403 })
  }

  const response = NextResponse.json({ user })
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: Math.max(0, Math.min(900, (payload.data?.expiresIn ?? 900))),
    ...(process.env.AUTH_COOKIE_DOMAIN ? { domain: process.env.AUTH_COOKIE_DOMAIN } : {}),
  }
  response.cookies.set(SESSION_COOKIE, token, cookieOptions)
  return response
}
