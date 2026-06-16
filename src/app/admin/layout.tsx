'use client'

import { AdminAuthProvider, useAdminAuth } from './auth-context'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  Truck,
  Users,
  CreditCard,
  Brain,
  ScrollText,
  AlertTriangle,
  Server,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const sidebarItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/officines', label: 'Officines', icon: Building2 },
  { href: '/admin/grossistes', label: 'Grossistes', icon: Truck },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
  { href: '/admin/plans', label: 'Plans', icon: CreditCard },
  { href: '/admin/orion', label: 'ORION', icon: Brain },
  { href: '/admin/logs', label: 'Logs', icon: ScrollText },
  { href: '/admin/alertes-dpmed', label: 'Alertes DPMED', icon: AlertTriangle },
  { href: '/admin/infrastructure', label: 'Infrastructure', icon: Server },
]

function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col h-full bg-slate-900 text-white transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Brand */}
        <div className={cn('flex items-center gap-2 px-4 py-4 border-b border-slate-700/50', collapsed && 'justify-center px-2')}>
          <Image src="/logo-MediHelm-01.png" alt="MediHelm" width={32} height={32} className="shrink-0" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sm text-white">MediHelm</span>
              <span className="text-[10px] text-slate-400 truncate max-w-40 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Administration
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 custom-scrollbar">
          <nav className="flex flex-col gap-1 p-2">
            {sidebarItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href)
              const Icon = item.icon

              const linkContent = (
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-teal-600 text-white font-medium'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              )

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return <div key={item.href}>{linkContent}</div>
            })}
          </nav>
        </ScrollArea>

        {/* Separator */}
        <Separator className="bg-slate-700/50" />

        {/* Collapse toggle */}
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && <span className="ml-2 text-xs">Réduire</span>}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}

function AdminTopbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { user, logout } = useAdminAuth()

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b bg-background">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="lg:hidden" onClick={onToggleSidebar}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
        <h2 className="text-sm font-semibold text-foreground">Portail Administration</h2>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {user?.prenom} {user?.nom}
        </span>
        <Badge>{user?.role}</Badge>
        <Button variant="ghost" size="sm" onClick={logout} className="text-xs text-muted-foreground">
          Déconnexion
        </Button>
      </div>
    </header>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-teal-600/10 text-teal-600">
      {children}
    </span>
  )
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAdminAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center animate-pulse">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-sm text-slate-400">Chargement de MediHelm Admin...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-xl bg-red-600/20 flex items-center justify-center">
            <Shield className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Accès refusé</h2>
          <p className="text-sm text-slate-400 max-w-sm">
            Vous n&apos;avez pas les permissions nécessaires pour accéder au portail d&apos;administration.
            Seuls les administrateurs plateforme sont autorisés.
          </p>
          <Link href="/connexion">
            <Button variant="outline" size="sm">Se connecter</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <AdminSidebar />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-slate-900 border-0">
          <AdminSidebar onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminTopbar onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminAuthProvider>
  )
}
