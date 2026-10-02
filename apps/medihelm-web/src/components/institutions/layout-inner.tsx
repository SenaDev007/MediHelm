'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { InstitutionSidebar, type InstitutionRole } from '@/components/institutions/sidebar'
import { Bell, User, LogOut, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const roleShortLabels: Record<InstitutionRole, string> = {
  DPMED_ADMIN: 'DPMED',
  SOBAPS_VIEWER: 'SoBAPS',
  ABRP_VIEWER: 'ABRP',
  GROSSISTE_PARTNER: 'Grossiste',
}

const roleBadgeColors: Record<InstitutionRole, string> = {
  DPMED_ADMIN: 'bg-red-100 text-red-800',
  SOBAPS_VIEWER: 'bg-blue-100 text-blue-800',
  ABRP_VIEWER: 'bg-amber-100 text-amber-800',
  GROSSISTE_PARTNER: 'bg-purple-100 text-purple-800',
}

function getRoleFromPath(pathname: string): InstitutionRole {
  if (pathname.includes('/dpmed')) return 'DPMED_ADMIN'
  if (pathname.includes('/sobaps')) return 'SOBAPS_VIEWER'
  if (pathname.includes('/abrp')) return 'ABRP_VIEWER'
  return 'DPMED_ADMIN'
}

export function InstitutionsLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<InstitutionRole>(getRoleFromPath(pathname))
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications] = useState(3) // demo

  useEffect(() => {
    setRole(getRoleFromPath(pathname))
  }, [pathname])

  const handleRoleChange = (newRole: InstitutionRole) => {
    setRole(newRole)
    const paths: Record<InstitutionRole, string> = {
      DPMED_ADMIN: '/institutions/dpmed',
      SOBAPS_VIEWER: '/institutions/sobaps',
      ABRP_VIEWER: '/institutions/abrp',
      GROSSISTE_PARTNER: '/institutions',
    }
    router.push(paths[newRole])
  }

  // Landing page doesn't need sidebar
  const isLanding = pathname === '/institutions'

  if (isLanding) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <InstitutionSidebar role={role} onRoleChange={handleRoleChange} />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 items-center gap-4 border-b border-teal-200 bg-white px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="flex-1">
            <h1 className="text-sm font-semibold text-teal-800">
              Portail {roleShortLabels[role]}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Badge className={roleBadgeColors[role]}>
              {roleShortLabels[role]}
            </Badge>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4 text-teal-600" />
                  {notifications > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                      {notifications}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuItem className="flex flex-col items-start gap-1">
                  <span className="text-sm font-medium">Nouvelle alerte DPMED reçue</span>
                  <span className="text-xs text-muted-foreground">Il y a 5 minutes</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1">
                  <span className="text-sm font-medium">Signalement EI grave signalé</span>
                  <span className="text-xs text-muted-foreground">Il y a 30 minutes</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1">
                  <span className="text-sm font-medium">Rapport de conformité disponible</span>
                  <span className="text-xs text-muted-foreground">Il y a 2 heures</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-teal-100 text-teal-800 text-xs font-bold">
                      {roleShortLabels[role].substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profil institutionnel
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push('/institutions')}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Retour au portail
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
