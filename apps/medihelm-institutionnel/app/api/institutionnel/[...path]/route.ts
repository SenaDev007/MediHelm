import { NextRequest, NextResponse } from 'next/server'
import { authenticateInstitutionToken, SESSION_COOKIE } from '../../../../lib/session'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ path: string[] }> }
const ROLE_BY_PREFIX: Record<string, string> = { dpmed: 'DPMED_ADMIN', sobaps: 'SOBAPS_VIEWER' }

async function proxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  if (!path.length || path.length > 8 || path.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) {
    return NextResponse.json({ error: 'Chemin invalide' }, { status: 400 })
  }
  const requiredRole = ROLE_BY_PREFIX[path[0].toLowerCase()]
  if (!requiredRole) return NextResponse.json({ error: 'Ressource inconnue' }, { status: 404 })

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const claims = await authenticateInstitutionToken(token)
  if (!claims) return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  if (claims.role !== requiredRole) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

  if (!['GET', 'HEAD'].includes(request.method)) {
    const origin = request.headers.get('origin')
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
    if (origin && host) {
      try {
        if (new URL(origin).host !== host) return NextResponse.json({ error: 'Origine non autorisée' }, { status: 403 })
      } catch {
        return NextResponse.json({ error: 'Origine invalide' }, { status: 403 })
      }
    }
  }

  const apiBase = process.env.MEDIHELM_API_URL?.replace(/\/$/, '')
  if (!apiBase) return NextResponse.json({ error: 'API indisponible' }, { status: 503 })
  const target = `${apiBase}/v1/institutionnel/${path.join('/')}${request.nextUrl.search}`
  const headers = new Headers({ authorization: `Bearer ${token}` })
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  let body: ArrayBuffer | undefined
  if (!['GET', 'HEAD'].includes(request.method)) body = await request.arrayBuffer()
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    })
    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
    })
  } catch {
    return NextResponse.json({ error: 'API indisponible' }, { status: 503 })
  }
}

export const GET = proxy
export const POST = proxy
export const PATCH = proxy
export const DELETE = proxy
