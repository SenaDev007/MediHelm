// ============================================================
// MediHelm — Middleware Next.js pour la protection des routes
// Authentification requise pour /patient/*, /pro/*, /institutions/*, /grossistes/*, /admin/*
// Chaque espace possède son landing page public :
//   - /            → landing MediHelm Patient (compte gratuit)
//   - /espace-pro  → landing MediHelm Pro (payant)
//   - /espace-grossiste   → landing MediHelm Grossiste (payant)
//   - /espace-institution → landing MediHelm Institution (gratuit, partenariat)
// Redirections non-authentifiés vers le landing de l'espace visé.
// RBAC spécifique: /admin/* → PLATFORM_ADMIN uniquement
// RBAC spécifique: /institutions/dpmed/* → DPMED_ADMIN uniquement
// RBAC spécifique: /patient/* → PATIENT et PLATFORM_ADMIN
//
// Note: La vérification JWT complète est effectuée côté serveur
// dans les API routes via @backend/lib/api-auth. Le middleware effectue
// une vérification légère de la présence du cookie de session.
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { resolveAuthSecretEdge } from '@backend/lib/auth-secret-edge'

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
const PATIENT_ROLES = ['PATIENT', 'PLATFORM_ADMIN']

/** Accueil de l'espace correspondant au rôle (Edge — même table que use-space-login). */
const ROLE_HOME: Record<string, string> = {
  PLATFORM_ADMIN: '/admin',
  PATIENT: '/patient',
  GROSSISTE_PARTNER: '/grossistes',
  GROSSISTE_ADMIN: '/grossistes',
  GROSSISTE_COMMANDES: '/grossistes',
  GROSSISTE_PREPARATEUR: '/grossistes',
  GROSSISTE_LIVREUR: '/grossistes',
  GROSSISTE_COMMERCIAL: '/grossistes',
  GROSSISTE_COMPTABLE: '/grossistes',
  DPMED_ADMIN: '/institutions',
  SOBAPS_VIEWER: '/institutions',
  ABRP_VIEWER: '/institutions',
}

/** Toutes les pages d'authentification des 4 espaces + pages génériques. */
const AUTH_PAGES = [
  '/patient/connexion',
  '/patient/inscription',
  '/pro/connexion',
  '/grossistes/connexion',
  '/institutions/connexion',
  '/connexion',
  '/inscription',
]

function homeForRole(roleName: string | undefined): string {
  if (!roleName) return '/connexion'
  const mapped = roleName === 'OWNER' ? 'ADMIN' : roleName
  return ROLE_HOME[mapped] ?? '/pro' // rôles pharmacie par défaut
}

// Routes publiques ne nécessitant pas d'authentification
const PUBLIC_PATHS = [
  '/',
  '/connexion',
  '/inscription',
  '/mot-de-passe-oublie',
  '/api',
  '/api/pharmacies',
  '/espace-pro',
  '/espace-grossiste',
  '/espace-institution',
  // Pages d'authentification patient — accessibles sans session
  '/patient/connexion',
  '/patient/inscription',
  // Pages d'authentification dédiées aux autres espaces
  // (design propre à chaque espace, formulaire à gauche)
  '/pro/connexion',
  '/grossistes/connexion',
  '/institutions/connexion',
]
const PUBLIC_PREFIXES = ['/api/auth/', '/api/webhooks/', '/api/patient/', '/api/scan', '/_next/', '/favicon', '/logo']

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

async function getVerifiedSession(request: NextRequest): Promise<{ authenticated: boolean; roleName?: string }> {
  try {
    // Même résilience que src/lib/auth.ts : sans secret partagé, le JWT
    // émis par les routes API serait indécodable ici (session rejetée).
    const secret = await resolveAuthSecretEdge()
    const token = await getToken({ req: request, secret })
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

  // ─── Pages d'authentification de TOUS les espaces ────────────────────────
  // Un utilisateur DÉJÀ authentifié n'a plus rien à faire sur un formulaire
  // de connexion ou d'inscription : redirection directe vers l'accueil de
  // SON espace (selon son rôle), quel que soit le formulaire visité.
  if (AUTH_PAGES.includes(pathname)) {
    const { authenticated, roleName } = await getVerifiedSession(request)
    if (authenticated) {
      return NextResponse.redirect(new URL(homeForRole(roleName), request.url))
    }
    return NextResponse.next()
  }

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

    // Chaque espace renvoie vers SON landing page public
    const landingBySpace: Array<{ prefix: string; landing: string }> = [
      { prefix: '/patient', landing: '/' },
      { prefix: '/pro', landing: '/espace-pro' },
      { prefix: '/grossistes', landing: '/espace-grossiste' },
      { prefix: '/institutions', landing: '/espace-institution' },
      { prefix: '/admin', landing: '/connexion' },
      { prefix: '/espace-', landing: '/connexion' },
    ]
    const match = landingBySpace.find(({ prefix }) => pathname === prefix || pathname.startsWith(prefix + '/'))
    const target = match?.landing ?? '/connexion'
    const redirectUrl = new URL(target, request.url)
    if (target === '/connexion') {
      redirectUrl.searchParams.set('callbackUrl', request.url)
    }
    return NextResponse.redirect(redirectUrl)
  }

  // Routes API authentifiées — autoriser (la vérification RBAC fine est faite dans les handlers)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // === RBAC spécifique par section ===
  // Un utilisateur authentifié mais avec le MAUVAIS rôle pour la section
  // visitée est redirigé vers l'accueil de SON propre espace (jamais vers
  // l'espace d'un autre, jamais vers le landing d'un autre).

  // /patient/* — Réservé aux PATIENT et PLATFORM_ADMIN.
  // L'interface patient ne s'affiche qu'une fois le patient connecté
  // à son compte personnel.
  if (pathname === '/patient' || pathname.startsWith('/patient/')) {
    if (!PATIENT_ROLES.includes(roleName ?? '')) {
      return NextResponse.redirect(new URL(homeForRole(roleName), request.url))
    }
    return NextResponse.next()
  }

  // /pro/* — Accessible uniquement aux rôles pharmacie + PLATFORM_ADMIN
  if (pathname.startsWith('/pro')) {
    if (!PHARMACIE_ROLES.includes(roleName ?? '') && roleName !== 'PLATFORM_ADMIN') {
      return NextResponse.redirect(new URL(homeForRole(roleName), request.url))
    }
  }

  // /institutions/dpmed/* — Réservé à DPMED_ADMIN + PLATFORM_ADMIN
  if (pathname.startsWith('/institutions/dpmed')) {
    if (!DPMED_ROLES.includes(roleName ?? '')) {
      return NextResponse.redirect(new URL(homeForRole(roleName), request.url))
    }
    return NextResponse.next()
  }

  // /institutions/* — Accessible aux rôles institutionnels
  if (pathname.startsWith('/institutions')) {
    if (!INSTITUTIONAL_ROLES.includes(roleName ?? '')) {
      return NextResponse.redirect(new URL(homeForRole(roleName), request.url))
    }
  }

  // /grossistes/* — Accessible aux rôles grossiste + rôles pharmacie
  if (pathname.startsWith('/grossistes')) {
    if (!GROSSISTE_ROLES.includes(roleName ?? '') && !PHARMACIE_ROLES.includes(roleName ?? '')) {
      return NextResponse.redirect(new URL(homeForRole(roleName), request.url))
    }
  }

  // Routes API admin — vérification PLATFORM_ADMIN (double sécurité avec les handlers)
  if (pathname.startsWith('/api/admin')) {
    if (roleName !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ error: 'Accès refusé. Réservé aux administrateurs plateforme.' }, { status: 403 })
    }
    return NextResponse.next()
  }

  // /admin/* — Réservé à PLATFORM_ADMIN uniquement
  if (pathname.startsWith('/admin')) {
    if (roleName !== 'PLATFORM_ADMIN') {
      return NextResponse.redirect(new URL(homeForRole(roleName), request.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
