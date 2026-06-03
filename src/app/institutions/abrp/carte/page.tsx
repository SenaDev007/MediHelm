'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MapPin, AlertTriangle, TrendingDown, Loader2 } from 'lucide-react'

const BeninSupplyMap = dynamic(
  () => import('@/components/institutions/benin-supply-map').then(mod => ({ default: mod.BeninSupplyMap })),
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

interface SupplyData {
  departement: string
  scoreApprovisionnement: number
  pharmaciesCount: number
  dciEnTension: string[]
}

function getSupplyColor(score: number): string {
  if (score >= 70) return '#1D9E75'
  if (score >= 50) return '#EF9F27'
  return '#E24B4A'
}

function getSupplyLabel(score: number): string {
  if (score >= 70) return 'Bien approvisionné'
  if (score >= 50) return 'Tension modérée'
  return 'Sous-approvisionné'
}

export default function ABRPCartePage() {
  const [data, setData] = useState<SupplyData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCarte() {
      try {
        const res = await fetch('/api/institutions/abrp/carte-approvisionnement')
        if (res.ok) {
          const d = await res.json()
          setData(d)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchCarte()
  }, [])

  const criticalDepts = data.filter(d => d.scoreApprovisionnement < 50)
  const moderateDepts = data.filter(d => d.scoreApprovisionnement >= 50 && d.scoreApprovisionnement < 70)
  const goodDepts = data.filter(d => d.scoreApprovisionnement >= 70)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-teal-800 flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          Carte des zones sous-approvisionnées
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualisation géographique des tensions d&apos;approvisionnement par département au Bénin
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <TrendingDown className="h-4 w-4" />
              Sous-approvisionné
            </div>
            <div className="text-2xl font-bold text-red-700 mt-1">{criticalDepts.length}</div>
            <p className="text-xs text-red-500 mt-1">département(s) critique(s)</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Tension modérée
            </div>
            <div className="text-2xl font-bold text-amber-700 mt-1">{moderateDepts.length}</div>
            <p className="text-xs text-amber-500 mt-1">département(s) en tension</p>
          </CardContent>
        </Card>
        <Card className="border-teal-200 bg-green-50/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-teal-600">
              <MapPin className="h-4 w-4" />
              Bien approvisionné
            </div>
            <div className="text-2xl font-bold text-teal-700 mt-1">{goodDepts.length}</div>
            <p className="text-xs text-teal-500 mt-1">département(s) stable(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      {loading ? (
        <Skeleton className="w-full h-[500px] rounded-xl" />
      ) : (
        <BeninSupplyMap data={data} height="500px" />
      )}

      {/* Department Detail Table */}
      <Card className="border-teal-200">
        <CardHeader>
          <CardTitle className="text-base">Détail par département</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.sort((a, b) => a.scoreApprovisionnement - b.scoreApprovisionnement).map((d) => (
              <div
                key={d.departement}
                className="flex items-center justify-between p-3 rounded-lg border border-teal-100 hover:border-teal-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getSupplyColor(d.scoreApprovisionnement) }}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.departement}</p>
                    <p className="text-xs text-muted-foreground">{d.pharmaciesCount} pharmacie(s)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {d.dciEnTension.length > 0 && (
                    <Badge variant="outline" className="text-[10px] border-red-300 text-red-700">
                      {d.dciEnTension.length} DCI en tension
                    </Badge>
                  )}
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: getSupplyColor(d.scoreApprovisionnement) }}>
                      {d.scoreApprovisionnement}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">{getSupplyLabel(d.scoreApprovisionnement)}</div>
                  </div>
                </div>
              </div>
            ))}
            {data.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
