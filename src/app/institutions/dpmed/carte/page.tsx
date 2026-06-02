'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Shield, MapPin, Loader2 } from 'lucide-react'

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

interface PharmacyCoverage {
  id: string
  nom: string
  ville: string
  departement: string
  latitude: number | null
  longitude: number | null
  statutAcquittement: 'action_taken' | 'acknowledged' | 'notified' | 'none'
  alerteTitre: string | null
  alerteType: string | null
  dateNotification: string | null
}

const STATUT_LABELS: Record<string, string> = {
  action_taken: 'Action prise',
  acknowledged: 'Acquittée',
  notified: 'Notifiée',
  none: 'Non notifiée',
}

export default function DPMEDCartePage() {
  const [pharmacies, setPharmacies] = useState<PharmacyCoverage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCarte() {
      try {
        const res = await fetch('/api/institutions/dpmed/carte-couverture')
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
    action_taken: pharmacies.filter(p => p.statutAcquittement === 'action_taken').length,
    acknowledged: pharmacies.filter(p => p.statutAcquittement === 'acknowledged').length,
    notified: pharmacies.filter(p => p.statutAcquittement === 'notified').length,
    none: pharmacies.filter(p => p.statutAcquittement === 'none').length,
  }
  const total = pharmacies.length
  const notified = stats.action_taken + stats.acknowledged + stats.notified
  const tauxAcquittement = notified > 0
    ? Math.round(((stats.action_taken + stats.acknowledged) / notified) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-teal-800 flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Carte de couverture nationale
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualisation en temps réel de la diffusion des alertes DPMED aux officines du Bénin
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Officines total</div>
            <div className="text-2xl font-bold text-teal-800">{total}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="pt-4">
            <div className="text-sm text-green-600">Ont pris action</div>
            <div className="text-2xl font-bold text-green-700">{stats.action_taken}</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="pt-4">
            <div className="text-sm text-amber-600">Notifiées (en attente)</div>
            <div className="text-2xl font-bold text-amber-700">{stats.notified}</div>
          </CardContent>
        </Card>
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Taux acquittement</div>
            <div className="text-2xl font-bold text-teal-800">{tauxAcquittement}%</div>
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
          title="Couverture alertes DPMED"
          mode="dpmed"
        />
      )}

      {/* Summary by department */}
      <Card className="border-teal-200">
        <CardContent className="pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Répartition par département</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from(new Set(pharmacies.map(p => p.departement))).sort().map(dept => {
              const deptPharmacies = pharmacies.filter(p => p.departement === dept)
              const deptNotified = deptPharmacies.filter(p => p.statutAcquittement !== 'none').length
              const deptAcknowledged = deptPharmacies.filter(p =>
                p.statutAcquittement === 'action_taken' || p.statutAcquittement === 'acknowledged'
              ).length
              const deptTaux = deptNotified > 0
                ? Math.round((deptAcknowledged / deptNotified) * 100)
                : 0

              return (
                <div
                  key={dept}
                  className="p-3 rounded-lg border border-teal-200 bg-teal-50/30 text-center"
                >
                  <div className="text-xs font-medium text-gray-900">{dept}</div>
                  <div className="text-lg font-bold text-teal-800">{deptPharmacies.length}</div>
                  <Badge
                    variant="outline"
                    className="text-[10px] mt-1"
                    style={{
                      borderColor: deptTaux >= 70 ? '#1D9E75' : deptTaux >= 40 ? '#EF9F27' : '#E24B4A',
                      color: deptTaux >= 70 ? '#1D9E75' : deptTaux >= 40 ? '#EF9F27' : '#E24B4A',
                    }}
                  >
                    {deptTaux}% acquitté
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
