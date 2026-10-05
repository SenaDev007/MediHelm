'use client'

import { Shield, Truck, BarChart3, Building2, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type InstitutionRole } from './sidebar'

interface RoleSelectorProps {
  onRoleSelect: (role: InstitutionRole) => void
}

const roles: {
  role: InstitutionRole
  title: string
  shortTitle: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
  features: string[]
  badgeColor: string
}[] = [
  {
    role: 'DPMED_ADMIN',
    title: 'Direction de la Pharmacie et du Médicament',
    shortTitle: 'DPMED',
    description: 'Gestion des alertes sanitaires, pharmacovigilance et conformité réglementaire',
    icon: <Shield className="h-8 w-8" />,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    features: [
      'Création et diffusion d\'alertes DPMED',
      'Suivi de pharmacovigilance',
      'Contrôle de conformité des officines',
      'Certification DPMED',
    ],
    badgeColor: 'bg-red-100 text-red-800',
  },
  {
    role: 'SOBAPS_VIEWER',
    title: 'Société Béninoise d\'Approvisionnement Pharmaceutique',
    shortTitle: 'SoBAPS',
    description: 'Suivi des livraisons, confirmations de réception et visibilité logistique',
    icon: <Truck className="h-8 w-8" />,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    features: [
      'Confirmation de réception de livraisons',
      'Rapports de réception des pharmacies',
      'Visibilité chaîne d\'approvisionnement',
      'Analytics de distribution',
    ],
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  {
    role: 'ABRP_VIEWER',
    title: 'Association Béninoise des Pharmaciens',
    shortTitle: 'ABRP',
    description: 'Tableau de bord anonymisé des tensions d\'approvisionnement et analytics marché',
    icon: <BarChart3 className="h-8 w-8" />,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    features: [
      'Tensions d\'approvisionnement (données anonymisées)',
      'Analytics marché en lecture seule',
      'Carte de distribution des pharmacies',
      'Aucune donnée individuelle accessible',
    ],
    badgeColor: 'bg-amber-100 text-amber-800',
  },
]

export function RoleSelector({ onRoleSelect }: RoleSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {roles.map((r) => (
        <Card
          key={r.role}
          className={`relative overflow-hidden border-2 ${r.borderColor} hover:shadow-lg transition-all duration-300 cursor-pointer group`}
          onClick={() => onRoleSelect(r.role)}
        >
          <CardHeader className={`${r.bgColor}`}>
            <div className="flex items-start justify-between">
              <div className={`${r.color}`}>
                {r.icon}
              </div>
              <Badge className={r.badgeColor}>{r.shortTitle}</Badge>
            </div>
            <CardTitle className={`text-lg ${r.color}`}>{r.title}</CardTitle>
            <CardDescription>{r.description}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="space-y-2">
              {r.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className={`mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0 ${r.bgColor}`} />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              className={`w-full mt-4 ${r.bgColor} ${r.color} hover:opacity-90 border ${r.borderColor}`}
              variant="outline"
            >
              Accéder au portail
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Partenariat GRATUIT
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
