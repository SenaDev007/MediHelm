'use client'

import { useEffect, useState } from 'react'
import { Map as MapIcon, Loader2, Truck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CoverageMap } from '@/components/institutions/coverage-map'

interface OfficineGeo {
  id: string
  nom: string
  ville: string
  latitude: number | null
  longitude: number | null
  telephone: string
  statutAcquittement: 'notified' | 'acknowledged' | 'action_taken' | 'none'
  dateNotification?: string
}

interface CarteData {
  officines: OfficineGeo[]
  summary: {
    total: number
    livrees: number
    confirmees: number
    enAttente: number
    sansCommande: number
  }
}

const STATUT_CONFIG: Record<string, { color: string; label: string }> = {
  action_taken: { color: 'bg-green-100 text-green-800', label: 'Livrée' },
  acknowledged: { color: 'bg-blue-100 text-blue-800', label: 'Confirmée' },
  notified: { color: 'bg-amber-100 text-amber-800', label: 'Envoyée' },
  none: { color: 'bg-gray-100 text-gray-800', label: 'Sans commande' },
}

export default function CarteOfficinesPage() {
  const [data, setData] = useState<CarteData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCarte = async () => {
      try {
        const res = await fetch('/api/institutions/sobaps/carte-officines')
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
    fetchCarte()
  }, [])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
          <MapIcon className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-teal-800">Carte des officines</h1>
          <p className="text-sm text-muted-foreground">Localisation et statut de livraison des pharmacies partenaires</p>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <Card className="border-teal-200">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-teal-800">{data.summary.total}</div>
              <p className="text-xs text-muted-foreground">Officines géolocalisées</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/30">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-700">{data.summary.livrees}</div>
              <p className="text-xs text-muted-foreground">Livrées</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/30">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-700">{data.summary.confirmees}</div>
              <p className="text-xs text-muted-foreground">Confirmées</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/30">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-amber-600">{data.summary.enAttente}</div>
              <p className="text-xs text-muted-foreground">En attente</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-gray-600">{data.summary.sansCommande}</div>
              <p className="text-xs text-muted-foreground">Sans commande</p>
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
      ) : data && data.officines.length > 0 ? (
        <CoverageMap
          pharmacies={data.officines}
          height="600px"
          title="Carte des officines SoBAPS"
          mode="sobaps"
        />
      ) : (
        <Card className="border-teal-200">
          <CardContent className="flex flex-col items-center justify-center py-24">
            <Truck className="h-12 w-12 text-teal-300 mb-4" />
            <p className="text-muted-foreground">Aucune officine géolocalisée disponible</p>
          </CardContent>
        </Card>
      )}

      {/* Officine List */}
      {data && data.officines.length > 0 && (
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-teal-800">Liste des officines</CardTitle>
            <CardDescription>{data.officines.length} officine(s) partenaires</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.officines.map((o) => {
                  const statutConf = STATUT_CONFIG[o.statutAcquittement] || STATUT_CONFIG.none
                  return (
                    <div key={o.id} className="flex items-center gap-3 p-3 rounded-lg border border-teal-100 hover:bg-teal-50/50 transition-colors">
                      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{
                        backgroundColor: o.statutAcquittement === 'action_taken' ? '#1D9E75'
                          : o.statutAcquittement === 'acknowledged' ? '#378ADD'
                          : o.statutAcquittement === 'notified' ? '#EF9F27'
                          : '#9ca3af'
                      }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-teal-800 truncate">{o.nom}</p>
                        <p className="text-xs text-muted-foreground">{o.ville}</p>
                      </div>
                      <Badge variant="outline" className={`text-xs flex-shrink-0 ${statutConf.color}`}>
                        {statutConf.label}
                      </Badge>
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
