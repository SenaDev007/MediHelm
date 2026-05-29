'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Shield,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Truck,
  BarChart3,
  Map,
  Building2,
  ChevronLeft,
  FileText,
  Heart,
  ClipboardCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

export type InstitutionRole = 'DPMED_ADMIN' | 'SOBAPS_VIEWER' | 'ABRP_VIEWER' | 'GROSSISTE_PARTNER'

interface InstitutionSidebarProps {
  role: InstitutionRole
  onRoleChange?: (role: InstitutionRole) => void
}

const roleLabels: Record<InstitutionRole, string> = {
  DPMED_ADMIN: 'Direction de la Pharmacie et du Médicament',
  SOBAPS_VIEWER: 'Société Béninoise d\'Approvisionnement Pharmaceutique',
  ABRP_VIEWER: 'Association Béninoise des Pharmaciens',
  GROSSISTE_PARTNER: 'Partenaire Grossiste',
}

const roleShortLabels: Record<InstitutionRole, string> = {
  DPMED_ADMIN: 'DPMED',
  SOBAPS_VIEWER: 'SoBAPS',
  ABRP_VIEWER: 'ABRP',
  GROSSISTE_PARTNER: 'Grossiste',
}

const roleColors: Record<InstitutionRole, string> = {
  DPMED_ADMIN: 'bg-red-100 text-red-800 border-red-300',
  SOBAPS_VIEWER: 'bg-blue-100 text-blue-800 border-blue-300',
  ABRP_VIEWER: 'bg-amber-100 text-amber-800 border-amber-300',
  GROSSISTE_PARTNER: 'bg-purple-100 text-purple-800 border-purple-300',
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const navigationByRole: Record<InstitutionRole, NavItem[]> = {
  DPMED_ADMIN: [
    { href: '/institutions/dpmed', label: 'Tableau de bord', icon: <Activity className="h-4 w-4" /> },
    { href: '/institutions/dpmed/alertes', label: 'Alertes DPMED', icon: <AlertTriangle className="h-4 w-4" /> },
    { href: '/institutions/dpmed/alertes/nouvelle', label: 'Nouvelle alerte', icon: <FileText className="h-4 w-4" /> },
    { href: '/institutions/dpmed/pharmacovigilance', label: 'Pharmacovigilance', icon: <Heart className="h-4 w-4" /> },
    { href: '/institutions/dpmed/conformite', label: 'Conformité', icon: <ClipboardCheck className="h-4 w-4" /> },
  ],
  SOBAPS_VIEWER: [
    { href: '/institutions/sobaps', label: 'Tableau de bord', icon: <Activity className="h-4 w-4" /> },
  ],
  ABRP_VIEWER: [
    { href: '/institutions/abrp', label: 'Tableau de bord', icon: <Activity className="h-4 w-4" /> },
  ],
  GROSSISTE_PARTNER: [
    { href: '/institutions', label: 'Portail Grossiste', icon: <Building2 className="h-4 w-4" /> },
  ],
}

export function InstitutionSidebar({ role, onRoleChange }: InstitutionSidebarProps) {
  const pathname = usePathname()
  const navItems = navigationByRole[role] || []

  return (
    <div className="flex h-full flex-col bg-teal-800 text-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-teal-600">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-400">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold truncate">MédiHelm</h2>
          <p className="text-xs text-teal-200 truncate">Portail Institutionnel</p>
        </div>
      </div>

      {/* Role Badge */}
      <div className="px-4 py-3">
        <div className={cn(
          'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold',
          roleColors[role]
        )}>
          <Building2 className="h-3 w-3" />
          {roleShortLabels[role]}
        </div>
        <p className="mt-1 text-xs text-teal-300 leading-tight">{roleLabels[role]}</p>
      </div>

      <Separator className="bg-teal-600" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-2">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/institutions' && item.href !== `/institutions/${roleShortLabels[role].toLowerCase()}` && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-teal-400 text-white'
                    : 'text-teal-100 hover:bg-teal-700 hover:text-white'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-teal-600" />

      {/* Role Switcher */}
      <div className="p-4 space-y-2">
        <p className="text-xs font-semibold text-teal-300 uppercase tracking-wider">Changer de rôle</p>
        <div className="space-y-1">
          {(['DPMED_ADMIN', 'SOBAPS_VIEWER', 'ABRP_VIEWER'] as InstitutionRole[]).map((r) => (
            <button
              key={r}
              onClick={() => onRoleChange?.(r)}
              className={cn(
                'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors text-left',
                role === r
                  ? 'bg-teal-400 text-white'
                  : 'text-teal-200 hover:bg-teal-700 hover:text-white'
              )}
            >
              {r === 'DPMED_ADMIN' && <AlertTriangle className="h-3.5 w-3.5" />}
              {r === 'SOBAPS_VIEWER' && <Truck className="h-3.5 w-3.5" />}
              {r === 'ABRP_VIEWER' && <BarChart3 className="h-3.5 w-3.5" />}
              {roleShortLabels[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Back to Home */}
      <div className="p-4 border-t border-teal-600">
        <Link href="/institutions">
          <Button variant="ghost" size="sm" className="w-full justify-start text-teal-200 hover:text-white hover:bg-teal-700">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Portail d'accueil
          </Button>
        </Link>
      </div>
    </div>
  )
}
