"use client"

// ============================================================
// MediHelm Grossiste — Topbar session-aware.
// Le nom du grossiste provient de la SESSION (tenant de l'utilisateur
// connecté), jamais d'une valeur codée en dur : chaque grossiste voit
// SA propre enseigne. Avatar + menu (profil / paramètres / déconnexion).
// ============================================================

import { useSession } from "next-auth/react"
import { Bell, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SessionUserMenu } from "@/components/auth/session-user-menu"

export function GrossisteTopbar() {
  const { data: session, status } = useSession()
  const sessionUser = session?.user as Record<string, unknown> | undefined

  // Garde stricte : une session invalidée en base ne porte plus de user.id
  const isConnected = status === "authenticated" && !!sessionUser?.id

  // Tenant de l'utilisateur connecté — pas de valeur codée en dur
  const grossisteNom =
    (sessionUser?.grossisteNom as string | null | undefined) ||
    "Espace grossiste"

  return (
    <header className="flex items-center justify-between border-b border-sidebar-border bg-card px-4 lg:px-6 py-3 gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <h2 className="text-base font-semibold text-foreground hidden sm:block truncate">
          {grossisteNom}
        </h2>
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            className="pl-9 h-9 bg-muted/50 border-border/50"
            aria-label="Rechercher"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications — alertes réelles du grossiste (badge discret) */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
          disabled={!isConnected}
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {!isConnected ? null : (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-destructive text-white text-[10px]">
              0
            </Badge>
          )}
        </Button>

        {/* Menu utilisateur — avatar + profil / paramètres / déconnexion */}
        {isConnected && (
          <SessionUserMenu
            settingsHref="/grossistes/parametres"
            settingsLabel="Paramètres"
            logoutCallbackUrl="/espace-grossiste"
            showName
            size="sm"
          />
        )}
      </div>
    </header>
  )
}
