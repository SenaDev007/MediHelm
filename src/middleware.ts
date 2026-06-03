// ============================================================
// MédiHelm — Middleware Next.js pour la protection des routes
// Authentification requise pour /pro/*, /institutions/*, /grossistes/*
// Routes publiques: /patient/*, /api/auth/*, /api/webhooks/*
// RBAC spécifique: /institutions/dpmed/* → DPMED_ADMIN uniquement
//
// Note: La vérification JWT complète est effectuée côté serveur
// dans les API routes via @/lib/api-auth. Le middleware effectue
// une vérification légère de la présence du cookie de session.
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Constantes RBAC (dupliquées pour la compatibilité Edge Runtime)
const INSTITUTIONAL_ROLES = ['DPMED_ADMIN', 'SOBAPS_VIEWER', 'ABRP_VIEWER', 'PLATFORM_ADMIN']
const PHARMACIE_ROLES = ['ADMIN', 'DIRECTEUR', 'PHARMACIEN', 'CAISSIER', 'MAGASINIER', 'PROMOTEUR']
const GROSSISTE_ROLES = ['GROSSISTE_PARTNER', 'PLATFORM_ADMIN']
const DPMED_ROLES = ['DPMED_ADMIN', 'PLATFORM_ADMIN']

// Routes publiques ne nécessitant pas d'authentification
const PUBLIC_PATHS = ['/', '/patient', '/connexion']
const PUBLIC_PREFIXES = ['/api/auth/', '/api/webhooks/', '/api/patient/', '/patient/', '/_next/', '/favicon', '/logo']

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

function hasSessionCookie(request: NextRequest): { authenticated: boolean; roleName?: string } {
  const sessionCookie =
    request.cookies.get('__Secure-next-auth.session-token') ??
    request.cookies.get('next-auth.session-token')

  if (!sessionCookie?.value) {
    return { authenticated: false }
  }

  try {
    const parts = sessionCookie.value.split('.')
    if (parts.length !== 3) return { authenticated: false }
    const payload = JSON.parse(atob(parts[1]))
    return { authenticated: true, roleName: payload.roleName as string | undefined }
  } catch {
    return { authenticated: false }
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Routes publiques — pas d'authentification
  if (isPublicPath(pathname) || (pathname.includes('.') && !pathname.startsWith('/api/'))) {
    return NextResponse.next()
  }

  // Vérification de l'authentification
  const { authenticated, roleName } = hasSessionCookie(request)

  if (!authenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }
    const signInUrl = new URL('/connexion', request.url)
    signInUrl.searchParams.set('callbackUrl', request.url)
    return NextResponse.redirect(signInUrl)
  }

  // Routes API authentifiées — autoriser (la vérification RBAC fine est faite dans les handlers)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // === RBAC spécifique par section ===

  // /pro/* — Accessible uniquement aux rôles pharmacie + PLATFORM_ADMIN
  if (pathname.startsWith('/pro')) {
    if (!PHARMACIE_ROLES.includes(roleName ?? '') && roleName !== 'PLATFORM_ADMIN') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // /institutions/dpmed/* — Réservé à DPMED_ADMIN + PLATFORM_ADMIN
  if (pathname.startsWith('/institutions/dpmed')) {
    if (!DPMED_ROLES.includes(roleName ?? '')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // /institutions/* — Accessible aux rôles institutionnels
  if (pathname.startsWith('/institutions')) {
    if (!INSTITUTIONAL_ROLES.includes(roleName ?? '')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // /grossistes/* — Accessible aux rôles grossiste + rôles pharmacie
  if (pathname.startsWith('/grossistes')) {
    if (!GROSSISTE_ROLES.includes(roleName ?? '') && !PHARMACIE_ROLES.includes(roleName ?? '')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
