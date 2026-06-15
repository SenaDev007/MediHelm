"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const navItems = [
  {
    label: "Tableau de bord",
    href: "/grossistes",
    icon: LayoutDashboard,
  },
  {
    label: "Commandes",
    href: "/grossistes/commandes",
    icon: ShoppingCart,
  },
  {
    label: "Catalogue",
    href: "/grossistes/catalogue",
    icon: Package,
  },
  {
    label: "Statistiques",
    href: "/grossistes/statistiques",
    icon: BarChart3,
  },
  {
    label: "Paramètres",
    href: "/grossistes/parametres",
    icon: Settings,
  },
]

export function GrossisteSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 h-full",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Brand */}
        <div className={cn(
          "flex items-center gap-3 px-4 py-5 border-b border-sidebar-border",
          collapsed && "justify-center px-2"
        )}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shrink-0">
            <Shield className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sm text-sidebar-foreground leading-tight">MédiHelm</span>
              <span className="text-xs text-sidebar-accent-foreground font-medium">Grossistes</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/grossistes" && pathname.startsWith(item.href))

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return linkContent
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed && <span className="ml-2 text-xs">Réduire</span>}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
