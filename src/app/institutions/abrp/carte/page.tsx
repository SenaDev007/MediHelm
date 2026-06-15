'use client'

import { useEffect, useState } from 'react'
import { Map as MapIcon, Loader2, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BeninSupplyMap } from '@/components/institutions/benin-supply-map'

interface DepartementData {
  departement: string
  scoreApprovisionnement: number
  centre: { lat: number; lng: number }
  pharmaciesCount: number
  dciEnTension: string[]
}

interface CarteData {
  departements: DepartementData[]
  summary: {
    totalDepartements: number
    bienApprovisionnes: number
    tensionModeree: number
    sousApprovisionnes: number
  }
}

export default function CarteApprovisionnementPage() {
  const [data, setData] = useState<CarteData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/institutions/abrp/carte-approvisionnement')
        if (res.ok) {
          const d = await res.json()
          setData(d)
        }
      } catch (error) {
        console.error('Erreur:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
          <MapIcon className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-teal-800">Carte d&apos;approvisionnement</h1>
          <p className="text-sm text-muted-foreground">Tensions d&apos;approvisionnement par département (données anonymisées)</p>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="border-teal-200">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-teal-800">{data.summary.totalDepartements}</div>
              <p className="text-xs text-muted-foreground">Départements</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/30">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-700">{data.summary.bienApprovisionnes}</div>
              <p className="text-xs text-muted-foreground">Bien approvisionnés (≥70%)</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/30">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-amber-600">{data.summary.tensionModeree}</div>
              <p className="text-xs text-muted-foreground">Tension modérée (50-69%)</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/30">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{data.summary.sousApprovisionnes}</div>
              <p className="text-xs text-muted-foreground">Sous-approvisionnés (&lt;50%)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Map */}
      {loading ? (
        <Card className="border-teal-200">
          <CardContent className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <span className="ml-3 text-muted-foreground">Chargement de la carte...</span>
          </CardContent>
        </Card>
      ) : data && data.departements.length > 0 ? (
        <BeninSupplyMap
          data={data.departements}
          height="600px"
        />
      ) : (
        <Card className="border-teal-200">
          <CardContent className="flex flex-col items-center justify-center py-24">
            <BarChart3 className="h-12 w-12 text-teal-300 mb-4" />
            <p className="text-muted-foreground">Aucune donnée d&apos;approvisionnement disponible</p>
          </CardContent>
        </Card>
      )}

      {/* Department Details */}
      {data && data.departements.length > 0 && (
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-teal-800">Détail par département</CardTitle>
            <CardDescription>Score d&apos;approvisionnement et pharmacies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.departements
                  .sort((a, b) => a.scoreApprovisionnement - b.scoreApprovisionnement)
                  .map((d) => {
                    const color = d.scoreApprovisionnement >= 70 ? 'bg-green-500'
                      : d.scoreApprovisionnement >= 50 ? 'bg-amber-500'
                      : 'bg-red-500'
                    const label = d.scoreApprovisionnement >= 70 ? 'Bien approvisionné'
                      : d.scoreApprovisionnement >= 50 ? 'Tension modérée'
                      : 'Sous-approvisionné'
                    return (
                      <div key={d.departement} className="p-4 rounded-lg border border-teal-100 hover:bg-teal-50/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-teal-800">{d.departement}</h3>
                          <Badge className={`${color} text-white`}>{label}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl font-bold" style={{
                            color: d.scoreApprovisionnement >= 70 ? '#1D9E75'
                              : d.scoreApprovisionnement >= 50 ? '#EF9F27'
                              : '#E24B4A'
                          }}>
                            {d.scoreApprovisionnement}%
                          </span>
                          <span className="text-xs text-muted-foreground">score</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{d.pharmaciesCount} pharmacie(s)</span>
                          {d.dciEnTension.length > 0 && (
                            <span className="text-red-600">{d.dciEnTension.length} DCI en tension</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
