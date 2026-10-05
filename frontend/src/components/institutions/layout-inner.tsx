'use client'

// ============================================================
// MediHelm Institutions — Layout de l'espace authentifié.
//
// Flux strict : l'agent institutionnel voit SON identité (avatar,
// nom, email de la session) et SON portail (rôle de la session) —
// plus de rôle déduit de l'URL ni de données de démonstration.
// Le sélecteur de portails n'est proposé qu'à PLATFORM_ADMIN.
// Garde de session : sans session valide → page de connexion.
// ============================================================

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { InstitutionSidebar, type InstitutionRole } from '@/components/institutions/sidebar'
import { SessionUserMenu } from '@/components/auth/session-user-menu'
import { Bell, Menu, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Pages d'authentification de l'espace — rendues HORS chrome dashboard
const INSTITUTION_AUTH_PAGES = ['/institutions/connexion']

const roleShortLabels: Record<string, string> = {
  DPMED_ADMIN: 'DPMED',
  SOBAPS_VIEWER: 'SoBAPS',
  ABRP_VIEWER: 'ABRP',
  GROSSISTE_PARTNER: 'Grossiste',
  PLATFORM_ADMIN: 'Administration',
}

const roleBadgeColors: Record<string, string> = {
  DPMED_ADMIN: 'bg-red-100 text-red-800',
  SOBAPS_VIEWER: 'bg-blue-100 text-blue-800',
  ABRP_VIEWER: 'bg-amber-100 text-amber-800',
  GROSSISTE_PARTNER: 'bg-purple-100 text-purple-800',
  PLATFORM_ADMIN: 'bg-teal-100 text-teal-800',
}

/** Rôle institutionnel de la SESSION (mapping vers le sidebar). */
function sessionRoleToInstitution(roleName: string | undefined): InstitutionRole | null {
  switch (roleName) {
    case 'DPMED_ADMIN':
      return 'DPMED_ADMIN'
    case 'SOBAPS_VIEWER':
      return 'SOBAPS_VIEWER'
    case 'ABRP_VIEWER':
      return 'ABRP_VIEWER'
    case 'PLATFORM_ADMIN':
      return 'DPMED_ADMIN' // l'admin plateforme voit le portail DPMED par défaut
    default:
      return null
  }
}

export function InstitutionsLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const sessionUser = session?.user as Record<string, unknown> | undefined
  // Garde stricte : une session invalidée en base ne porte plus de user.id
  const isAuthenticated = status === 'authenticated' && !!sessionUser?.id
  const roleName = sessionUser?.roleName as string | undefined
  const institutionRole = sessionRoleToInstitution(roleName)
  const isPlatformAdmin = roleName === 'PLATFORM_ADMIN'

  // Garde de session : les portails institutionnels ne sont JAMAIS visibles
  // sans session valide — redirection vers la connexion de l'espace.
  // Les pages d'auth sont exclues (sinon boucle de redirection).
  const isAuthPage = INSTITUTION_AUTH_PAGES.includes(pathname)
  useEffect(() => {
    if (!isAuthPage && status !== 'loading' && !isAuthenticated) {
      router.replace('/institutions/connexion')
    }
  }, [isAuthPage, status, isAuthenticated, router])

  // Page d'auth : rendu direct plein écran (pas de coquille dashboard)
  if (isAuthPage) {
    return <>{children}</>
  }

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  const role = institutionRole ?? 'DPMED_ADMIN'
  const roleLabel = roleShortLabels[roleName ?? ''] ?? roleShortLabels[role]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — portail du rôle de la session */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Le sélecteur de portails n'existe que pour l'admin plateforme */}
        <InstitutionSidebar role={role} />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar — identité de session + portail */}
        <header className="flex h-14 items-center gap-4 border-b border-teal-200 bg-white px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Menu"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-teal-800 truncate">
              Portail {roleLabel}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Badge className={roleBadgeColors[roleName ?? ''] ?? roleBadgeColors[role]}>
              {roleLabel}
            </Badge>

            {/* Notifications — icône neutre (contenu réel par portail) */}
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="h-4 w-4 text-teal-600" />
            </Button>

            {/* Menu utilisateur — avatar + profil / paramètres / déconnexion */}
            <SessionUserMenu
              settingsHref="/institutions/parametres"
              logoutCallbackUrl="/espace-institution"
              size="sm"
            />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  )
}
