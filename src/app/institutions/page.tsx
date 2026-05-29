'use client'

import { useRouter } from 'next/navigation'
import { Shield, Heart, Activity, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RoleSelector } from '@/components/institutions/role-selector'
import { type InstitutionRole } from '@/components/institutions/sidebar'

export default function InstitutionsLanding() {
  const router = useRouter()

  const handleRoleSelect = (role: InstitutionRole) => {
    const paths: Record<InstitutionRole, string> = {
      DPMED_ADMIN: '/institutions/dpmed',
      SOBAPS_VIEWER: '/institutions/sobaps',
      ABRP_VIEWER: '/institutions/abrp',
      GROSSISTE_PARTNER: '/institutions',
    }
    router.push(paths[role])
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-teal-50 via-white to-teal-50">
      {/* Header */}
      <header className="border-b border-teal-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-teal-800">MédiHelm</h1>
                <p className="text-xs text-teal-600">Portail Institutionnel</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-teal-300 text-teal-700">
                République du Bénin
              </Badge>
              <Badge className="bg-teal-100 text-teal-800">
                Partenariat GRATUIT
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4 bg-teal-100 text-teal-800">
            Espace Institutionnel
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-teal-800 mb-4">
            Portail des Partenaires Institutionnels
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Accédez aux outils dédiés aux institutions de santé du Bénin.
            Gestion des alertes sanitaires, suivi logistique, et analytics de marché —
            en partenariat GRATUIT avec l&apos;écosystème MédiHelm.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-teal-600" />
              <span>Données sécurisées</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-teal-600" />
              <span>Santé publique</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-600" />
              <span>Temps réel</span>
            </div>
          </div>
        </div>
      </section>

      {/* Role Selection */}
      <section className="px-4 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold text-teal-800 mb-2">
              Sélectionnez votre institution
            </h3>
            <p className="text-sm text-muted-foreground">
              Choisissez votre espace pour accéder aux fonctionnalités dédiées
            </p>
          </div>
          <RoleSelector onRoleSelect={handleRoleSelect} />
        </div>
      </section>

      {/* Stats Overview */}
      <section className="py-12 bg-teal-800 text-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold mb-2">Écosystème MédiHelm en chiffres</h3>
            <p className="text-sm text-teal-200">Un réseau pharmaceutique connecté pour la santé publique</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '500+', label: 'Pharmacies connectées' },
              { value: '1 200+', label: 'Alertes diffusées' },
              { value: '98%', label: 'Taux d\'acquittement' },
              { value: '24/7', label: 'Disponibilité' },
            ].map((stat, i) => (
              <Card key={i} className="bg-teal-700 border-teal-600 text-center">
                <CardContent className="pt-4 pb-4">
                  <div className="text-2xl md:text-3xl font-bold text-teal-100">{stat.value}</div>
                  <p className="text-xs text-teal-300 mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-xl font-semibold text-teal-800 mb-6">Nos partenaires institutionnels</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                name: 'DPMED',
                full: 'Direction de la Pharmacie et du Médicament',
                desc: 'Autorité réglementaire pour la sécurité pharmaceutique',
              },
              {
                name: 'SoBAPS',
                full: 'Société Béninoise d\'Approvisionnement Pharmaceutique',
                desc: 'Approvisionnement et logistique pharmaceutique nationale',
              },
              {
                name: 'ABRP',
                full: 'Association Béninoise des Pharmaciens',
                desc: 'Représentation professionnelle des pharmaciens',
              },
            ].map((partner) => (
              <Card key={partner.name} className="border-teal-200">
                <CardContent className="pt-4">
                  <Badge className="bg-teal-100 text-teal-800 mb-2">{partner.name}</Badge>
                  <h4 className="text-sm font-semibold text-teal-800">{partner.full}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{partner.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-teal-200 bg-teal-800 text-teal-100 py-6 px-4 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="text-sm">MédiHelm — Portail Institutionnel</span>
          </div>
          <p className="text-xs text-teal-300">
            © {new Date().getFullYear()} MédiHelm Health Ecosystem — République du Bénin
          </p>
        </div>
      </footer>
    </div>
  )
}
