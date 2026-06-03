'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Truck, MapPin } from 'lucide-react'

const CoverageMap = dynamic(
  () => import('@/components/institutions/coverage-map').then(mod => ({ default: mod.CoverageMap })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] rounded-xl border border-teal-200 bg-teal-50 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-8 w-8 text-primary mx-auto mb-2 animate-pulse" />
          <p className="text-xs text-muted-foreground">Chargement de la carte...</p>
        </div>
      </div>
    ),
  }
)

interface PharmacySoBAPS {
  id: string
  nom: string
  ville: string
  departement: string
  latitude: number | null
  longitude: number | null
  statutAcquittement: 'action_taken' | 'acknowledged' | 'notified' | 'none'
  dateNotification: string | null
}

export default function SoBAPSCartePage() {
  const [pharmacies, setPharmacies] = useState<PharmacySoBAPS[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCarte() {
      try {
        const res = await fetch('/api/institutions/sobaps/carte-officines')
        if (res.ok) {
          const d = await res.json()
          setPharmacies(d)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchCarte()
  }, [])

  const stats = {
    confirmed: pharmacies.filter(p => p.statutAcquittement === 'action_taken').length,
    withIssues: pharmacies.filter(p => p.statutAcquittement === 'acknowledged').length,
    pending: pharmacies.filter(p => p.statutAcquittement === 'notified').length,
    none: pharmacies.filter(p => p.statutAcquittement === 'none').length,
  }
  const withDeliveries = stats.confirmed + stats.withIssues + stats.pending
  const tauxConformite = withDeliveries > 0
    ? Math.round((stats.confirmed / withDeliveries) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-teal-800 flex items-center gap-2">
          <Truck className="h-6 w-6" />
          Carte des officines abonnées
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Carte des pharmacies ayant confirmé une livraison SoBAPS
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Officines total</div>
            <div className="text-2xl font-bold text-teal-800">{pharmacies.length}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="pt-4">
            <div className="text-sm text-green-600">Livraisons confirmées</div>
            <div className="text-2xl font-bold text-green-700">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="pt-4">
            <div className="text-sm text-amber-600">Avec écart</div>
            <div className="text-2xl font-bold text-amber-700">{stats.withIssues}</div>
          </CardContent>
        </Card>
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Taux conformité</div>
            <div className="text-2xl font-bold text-teal-800">{tauxConformite}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      {loading ? (
        <Skeleton className="w-full h-[500px] rounded-xl" />
      ) : (
        <CoverageMap
          pharmacies={pharmacies}
          height="500px"
          title="Couverture livraisons SoBAPS"
          mode="sobaps"
        />
      )}
    </div>
  )
}
