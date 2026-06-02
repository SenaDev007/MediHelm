'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/app/pro/auth-context'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardList,
  AlertTriangle,
  Shield,
  Users,
  BarChart3,
  UserCog,
  FileText,
  Banknote,
  Moon,
  FolderOpen,
  HeartPulse,
  ChevronLeft,
  ChevronRight,
  Pill,
  Bell,
  Truck,
  RotateCcw,
  MessageSquare,
  Lock,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const sidebarItems = [
  {
    category: 'Principal',
    items: [
      { href: '/pro', label: 'Tableau de bord', icon: LayoutDashboard },
      { href: '/pro/stock', label: 'Stock', icon: Package },
      { href: '/pro/ventes', label: 'Ventes', icon: ShoppingCart },
      { href: '/pro/commandes', label: 'Commandes', icon: ClipboardList },
    ],
  },
  {
    category: 'Alertes & Conformité',
    items: [
      { href: '/pro/alertes', label: 'Alertes DPMED', icon: AlertTriangle },
      { href: '/pro/conformite', label: 'Conformité', icon: Shield },
      { href: '/pro/qualite', label: 'Pharmacovigilance', icon: HeartPulse },
      { href: '/pro/stupefiants', label: 'Stupéfiants', icon: Lock },
    ],
  },
  {
    category: 'Gestion',
    items: [
      { href: '/pro/patients', label: 'Patients', icon: Users },
      { href: '/pro/ordonnances', label: 'Ordonnances', icon: FileText },
      { href: '/pro/personnel', label: 'Personnel', icon: UserCog },
      { href: '/pro/fournisseurs', label: 'Fournisseurs', icon: Truck },
    ],
  },
  {
    category: 'Finance & Analytics',
    items: [
      { href: '/pro/finance', label: 'Finance', icon: Banknote },
      { href: '/pro/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    category: 'Remboursement & Retours',
    items: [
      { href: '/pro/remboursables', label: 'Remboursables', icon: Shield },
      { href: '/pro/retours', label: 'Retours & Destructions', icon: RotateCcw },
    ],
  },
  {
    category: 'Autres',
    items: [
      { href: '/pro/garde', label: 'Garde', icon: Moon },
      { href: '/pro/documents', label: 'Documents', icon: FolderOpen },
      { href: '/pro/communication', label: 'Communication', icon: MessageSquare },
    ],
  },
]

export function ProSidebar() {
  const pathname = usePathname()
  const { pharmacie } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 h-full',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Brand */}
        <div className={cn('flex items-center gap-2 px-4 py-4 border-b border-sidebar-border', collapsed && 'justify-center px-2')}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            <Pill className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sm text-sidebar-foreground">MédiHelm Pro</span>
              <span className="text-[10px] text-sidebar-foreground/60 truncate max-w-40">
                {pharmacie?.nom || 'Pharmacie'}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 custom-scrollbar">
          <nav className="flex flex-col gap-1 p-2">
            {sidebarItems.map((category) => (
              <div key={category.category} className="mb-2">
                {!collapsed && (
                  <span className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                    {category.category}
                  </span>
                )}
                {category.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/pro' && pathname.startsWith(item.href))
                  const Icon = item.icon
                  const linkContent = (
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
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
                        <TooltipContent side="right">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return <div key={item.href}>{linkContent}</div>
                })}
                <Separator className="my-1 opacity-50" />
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Collapse toggle */}
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && <span className="ml-2 text-xs">Réduire</span>}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
