"use client"

// ============================================================
// MediHelm Grossiste — Layout de l'espace authentifié.
// Garde de session : les modules du dashboard grossiste ne sont
// visibles QU'avec une session valide (persistée et vérifiée en
// base). Une session absente/révoquée renvoie vers la page de
// connexion dédiée à l'espace grossiste.
// ============================================================

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { GrossisteSidebar } from "@/components/grossistes/sidebar"
import { GrossisteTopbar } from "@/components/grossistes/topbar"

// Pages d'authentification de l'espace — rendues HORS chrome dashboard
const GROSSISTE_AUTH_PAGES = ["/grossistes/connexion"]

export default function GrossistesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isAuthPage = GROSSISTE_AUTH_PAGES.includes(pathname)

  const sessionUser = session?.user as Record<string, unknown> | undefined
  // Garde stricte : une session invalidée en base ne porte plus de user.id
  const isAuthenticated = status === "authenticated" && !!sessionUser?.id

  useEffect(() => {
    // Les pages d'auth sont exclues (sinon boucle de redirection)
    if (!isAuthPage && status !== "loading" && !isAuthenticated) {
      router.replace("/grossistes/connexion")
    }
  }, [isAuthPage, status, isAuthenticated, router])

  // Page d'auth : rendu direct plein écran (pas de coquille dashboard)
  if (isAuthPage) {
    return <>{children}</>
  }

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-9 w-9 animate-spin text-teal-600" />
          <span className="text-sm text-muted-foreground">
            Chargement de votre espace grossiste…
          </span>
        </div>
      </div>
    )
  }

  // Non authentifié : la redirection est en cours — aucun menu n'est rendu
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <GrossisteSidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar — tenant de la session */}
        <GrossisteTopbar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  )
}
