// ============================================================
// MediHelm — Middleware Next.js pour la protection des routes
// Authentification requise pour /pro/*, /institutions/*, /grossistes/*, /admin/*
// Routes publiques: /patient/*, /api/auth/*, /api/webhooks/*
// RBAC spécifique: /institutions/dpmed/* → DPMED_ADMIN uniquement
// RBAC spécifique: /admin/* → PLATFORM_ADMIN uniquement
//
// Note: La vérification JWT complète est effectuée côté serveur
// dans les API routes via @/lib/api-auth. Le middleware effectue
// une vérification légère de la présence du cookie de session.
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Constantes RBAC (dupliquées pour la compatibilité Edge Runtime)
const INSTITUTIONAL_ROLES = ['DPMED_ADMIN', 'SOBAPS_VIEWER', 'ABRP_VIEWER', 'PLATFORM_ADMIN']
const PHARMACIE_ROLES = ['ADMIN', 'DIRECTEUR', 'PHARMACIEN', 'CAISSIER', 'MAGASINIER', 'COMPTABLE', 'STAGIAIRE', 'PROMOTEUR']
const GROSSISTE_ROLES = [
  'GROSSISTE_PARTNER',
  'GROSSISTE_ADMIN',
  'GROSSISTE_COMMANDES',
  'GROSSISTE_PREPARATEUR',
  'GROSSISTE_LIVREUR',
  'GROSSISTE_COMMERCIAL',
  'GROSSISTE_COMPTABLE',
  'PLATFORM_ADMIN',
]
const DPMED_ROLES = ['DPMED_ADMIN', 'PLATFORM_ADMIN']

// Routes publiques ne nécessitant pas d'authentification
const PUBLIC_PATHS = ['/', '/patient', '/connexion', '/inscription', '/mot-de-passe-oublie', '/api', '/api/pharmacies', '/espace-pro']
const PUBLIC_PREFIXES = ['/api/auth/', '/api/webhooks/', '/api/patient/', '/api/scan', '/patient/', '/_next/', '/favicon', '/logo']

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

async function getVerifiedSession(request: NextRequest): Promise<{ authenticated: boolean; roleName?: string }> {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) return { authenticated: false }
    // Mapping OWNER (Prisma enum) → ADMIN (RBAC) pour cohérence
    let roleName = (token as unknown as Record<string, unknown>).roleName as string | undefined
    if (roleName === 'OWNER') roleName = 'ADMIN'
    return { authenticated: true, roleName }
  } catch {
    return { authenticated: false }
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Routes publiques — pas d'authentification
  if (isPublicPath(pathname) || (pathname.includes('.') && !pathname.startsWith('/api/'))) {
    return NextResponse.next()
  }

  // Vérification de l'authentification
  const { authenticated, roleName } = await getVerifiedSession(request)

  if (!authenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }
    const signInUrl = new URL('/connexion', request.url)
    signInUrl.searchParams.set('callbackUrl', request.url)
    return NextResponse.redirect(signInUrl)
  }

  // Routes API admin — vérification PLATFORM_ADMIN (double sécurité avec les handlers)
  if (pathname.startsWith('/api/admin')) {
    if (roleName !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ error: 'Accès refusé. Réservé aux administrateurs plateforme.' }, { status: 403 })
    }
    return NextResponse.next()
  }

  // Routes API authentifiées — autoriser (la vérification RBAC fine est faite dans les handlers)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // === RBAC spécifique par section ===

  // /admin/* — Réservé à PLATFORM_ADMIN uniquement
  if (pathname.startsWith('/admin')) {
    if (roleName !== 'PLATFORM_ADMIN') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

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
