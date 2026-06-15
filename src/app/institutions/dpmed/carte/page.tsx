'use client'

import { useEffect, useState } from 'react'
import { Map as MapIcon, Loader2, Filter, Shield } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CoverageMap } from '@/components/institutions/coverage-map'

interface PharmacyGeo {
  id: string
  nom: string
  ville: string
  latitude: number | null
  longitude: number | null
  numeroAgrement: string
  statutAcquittement: 'notified' | 'acknowledged' | 'action_taken' | 'none'
  alerteTitre?: string
  alerteType?: string
  dateNotification?: string
}

interface CarteData {
  pharmacies: PharmacyGeo[]
  summary: {
    totalPharmacies: number
    pharmaciesGeoLocalisees: number
    sansGeo: number
  }
}

const STATUT_CONFIG: Record<string, { color: string; label: string }> = {
  action_taken: { color: 'bg-green-100 text-green-800', label: 'Action prise' },
  acknowledged: { color: 'bg-blue-100 text-blue-800', label: 'Acquittée' },
  notified: { color: 'bg-amber-100 text-amber-800', label: 'Notifiée' },
  none: { color: 'bg-gray-100 text-gray-800', label: 'Non notifiée' },
}

export default function CarteCouverturePage() {
  const [data, setData] = useState<CarteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [alerteId, setAlerteId] = useState<string>('')
  const [alertes, setAlertes] = useState<Array<{ id: string; titre: string; referenceOfficielle: string }>>([])

  useEffect(() => {
    const fetchAlertes = async () => {
      try {
        const res = await fetch('/api/institutions/dpmed/alertes?limit=50')
        if (res.ok) {
          const d = await res.json()
          setAlertes(d.alertes || [])
        }
      } catch (error) {
        console.error('Erreur:', error)
      }
    }
    fetchAlertes()
  }, [])

  useEffect(() => {
    const fetchCarte = async () => {
      setLoading(true)
      try {
        const url = alerteId
          ? `/api/institutions/dpmed/carte-couverture?alerteId=${alerteId}`
          : '/api/institutions/dpmed/carte-couverture'
        const res = await fetch(url)
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
  }, [alerteId])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
            <MapIcon className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-teal-800">Carte de couverture</h1>
            <p className="text-sm text-muted-foreground">Localisation des pharmacies et statut d&apos;acquittement</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={alerteId} onValueChange={setAlerteId}>
            <SelectTrigger className="w-64 border-teal-200">
              <SelectValue placeholder="Filtrer par alerte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les alertes</SelectItem>
              {alertes.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.referenceOfficielle} — {a.titre.substring(0, 30)}...
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="border-teal-200">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-teal-800">{data.summary.totalPharmacies}</div>
              <p className="text-xs text-muted-foreground">Total pharmacies actives</p>
            </CardContent>
          </Card>
          <Card className="border-teal-200">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-700">{data.summary.pharmaciesGeoLocalisees}</div>
              <p className="text-xs text-muted-foreground">Géolocalisées</p>
            </CardContent>
          </Card>
          <Card className="border-teal-200">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-amber-600">{data.summary.sansGeo}</div>
              <p className="text-xs text-muted-foreground">Sans coordonnées</p>
            </CardContent>
          </Card>
          <Card className="border-teal-200">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-1">
                {Object.entries(STATUT_CONFIG).map(([key, conf]) => (
                  <Badge key={key} variant="outline" className={`text-xs ${conf.color}`}>
                    {conf.label}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Légende statuts</p>
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
      ) : data && data.pharmacies.length > 0 ? (
        <CoverageMap
          pharmacies={data.pharmacies}
          height="600px"
          title="Carte de couverture DPMED"
          mode="dpmed"
        />
      ) : (
        <Card className="border-teal-200">
          <CardContent className="flex flex-col items-center justify-center py-24">
            <MapIcon className="h-12 w-12 text-teal-300 mb-4" />
            <p className="text-muted-foreground">Aucune pharmacie géolocalisée disponible</p>
            <p className="text-xs text-muted-foreground mt-1">Les coordonnées GPS doivent être ajoutées aux pharmacies</p>
          </CardContent>
        </Card>
      )}

      {/* Pharmacy List (below map) */}
      {data && data.pharmacies.length > 0 && (
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-teal-800">Liste des pharmacies géolocalisées</CardTitle>
            <CardDescription>{data.pharmacies.length} pharmacie(s) avec coordonnées</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.pharmacies.map((p) => {
                  const statutConf = STATUT_CONFIG[p.statutAcquittement] || STATUT_CONFIG.none
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-teal-100 hover:bg-teal-50/50 transition-colors">
                      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{
                        backgroundColor: p.statutAcquittement === 'action_taken' ? '#1D9E75'
                          : p.statutAcquittement === 'acknowledged' ? '#378ADD'
                          : p.statutAcquittement === 'notified' ? '#EF9F27'
                          : '#9ca3af'
                      }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-teal-800 truncate">{p.nom}</p>
                        <p className="text-xs text-muted-foreground">{p.ville}</p>
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
