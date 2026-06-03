'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Siren, Phone, Navigation, Crosshair, Clock, RefreshCw, MapPin, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'

const PharmacyMap = dynamic(
  () => import('@/components/patient/pharmacy-map'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[350px] rounded-xl border border-red-200 bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <Siren className="h-8 w-8 text-red-500 mx-auto mb-2 animate-pulse" />
          <p className="text-xs text-red-600">Localisation en cours...</p>
        </div>
      </div>
    ),
  }
)

interface EmergencyPharmacy {
  id: string
  nom: string
  adresse: string
  ville: string
  telephone: string
  latitude: number | null
  longitude: number | null
  distance: number
  estGarde: boolean
  heureDebut?: string
  heureFin?: string
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function UrgencePage() {
  const [pharmacies, setPharmacies] = useState<EmergencyPharmacy[]>([])
  const [loading, setLoading] = useState(true)
  const [userLat, setUserLat] = useState<number | undefined>()
  const [userLng, setUserLng] = useState<number | undefined>()
  const [geoError, setGeoError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | undefined>()

  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('La géolocalisation n\'est pas supportée par votre navigateur')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLat(position.coords.latitude)
        setUserLng(position.coords.longitude)
        setGeoError(null)
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('Accès à la localisation refusé. Activez la géolocalisation.')
            break
          case error.POSITION_UNAVAILABLE:
            setGeoError('Localisation non disponible')
            break
          case error.TIMEOUT:
            setGeoError('Délai d\'attente dépassé')
            break
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  const fetchGardePharmacies = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (userLat) params.set('lat', userLat.toString())
      if (userLng) params.set('lng', userLng.toString())
      params.set('radius', '30')

      // Fetch garde pharmacies
      const res = await fetch(`/api/patient/pharmacies-proches?${params}`)
      if (res.ok) {
        const data = await res.json()
        // Filter to garde pharmacies first, then closest
        const garde = data
          .filter((p: { estGarde?: boolean; latitude: number | null; longitude: number | null }) => p.estGarde)
          .map((p: {
            id: string; nom: string; adresse: string; ville: string; telephone: string;
            latitude: number | null; longitude: number | null; distance?: number; estGarde?: boolean;
          }) => ({
            ...p,
            distance: userLat && userLng && p.latitude && p.longitude
              ? haversineDistance(userLat, userLng, p.latitude, p.longitude)
              : p.distance || 999,
            estGarde: true,
          }))

        // Also include non-garde pharmacies that are very close (< 2km)
        const proches = data
          .filter((p: { estGarde?: boolean; latitude: number | null; longitude: number | null }) => !p.estGarde)
          .map((p: {
            id: string; nom: string; adresse: string; ville: string; telephone: string;
            latitude: number | null; longitude: number | null; distance?: number; estGarde?: boolean;
          }) => ({
            ...p,
            distance: userLat && userLng && p.latitude && p.longitude
              ? haversineDistance(userLat, userLng, p.latitude, p.longitude)
              : p.distance || 999,
            estGarde: false,
          }))
          .filter((p: EmergencyPharmacy) => p.distance <= 2)

        const allPharmacies = [...garde, ...proches].sort((a: EmergencyPharmacy, b: EmergencyPharmacy) => a.distance - b.distance)
        setPharmacies(allPharmacies)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [userLat, userLng])

  useEffect(() => {
    getUserLocation()
  }, [getUserLocation])

  useEffect(() => {
    if (userLat && userLng) {
      fetchGardePharmacies()
    }
  }, [userLat, userLng, fetchGardePharmacies])

  const handleRefresh = () => {
    getUserLocation()
    fetchGardePharmacies()
  }

  const nearestGarde = pharmacies.find(p => p.estGarde)

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      {/* Emergency Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-red-600 to-red-500 rounded-xl p-4 text-white"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Siren className="h-7 w-7 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Carte Urgence</h1>
            <p className="text-xs text-red-100">
              Trouvez la pharmacie de garde la plus proche immédiatement
            </p>
          </div>
        </div>
      </motion.div>

      {/* Geolocation status */}
      {geoError && (
        <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-800 flex items-center gap-2">
          <Crosshair className="h-4 w-4 flex-shrink-0" />
          {geoError}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 text-[10px]"
            onClick={getUserLocation}
          >
            Réessayer
          </Button>
        </div>
      )}

      {userLat && userLng && (
        <div className="bg-green-50 rounded-lg p-2 text-xs text-green-700 flex items-center gap-2">
          <Crosshair className="h-3 w-3" />
          Position détectée
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 text-[10px]"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Actualiser
          </Button>
        </div>
      )}

      {/* Nearest Garde Pharmacy - Quick Action */}
      {!loading && nearestGarde && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-red-300 bg-gradient-to-br from-red-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Siren className="h-4 w-4 text-red-600" />
                <span className="text-xs font-semibold text-red-700">Pharmacie de garde la plus proche</span>
              </div>
              <h3 className="font-bold text-gray-900 text-base">{nearestGarde.nom}</h3>
              <p className="text-xs text-muted-foreground mt-1">{nearestGarde.adresse}, {nearestGarde.ville}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="text-[10px] bg-red-600 text-white border-0">
                  {nearestGarde.distance.toFixed(1)} km
                </Badge>
                {nearestGarde.heureDebut && (
                  <Badge variant="outline" className="text-[10px] border-red-300 text-red-700">
                    <Clock className="h-3 w-3 mr-1" />
                    {nearestGarde.heureDebut} — {nearestGarde.heureFin}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <a href={`tel:${nearestGarde.telephone}`} className="flex-1">
                  <Button size="sm" className="w-full h-9 text-xs bg-red-600 hover:bg-red-700">
                    <Phone className="h-3 w-3 mr-1" />
                    Appeler d&apos;urgence
                  </Button>
                </a>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-9 text-xs border-red-300 text-red-700"
                  onClick={() => {
                    if (nearestGarde.latitude && nearestGarde.longitude) {
                      window.open(`https://www.openstreetmap.org/directions?from=&to=${nearestGarde.latitude},${nearestGarde.longitude}`, '_blank')
                    }
                  }}
                >
                  <Navigation className="h-3 w-3 mr-1" />
                  Itinéraire
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Emergency Map */}
      <PharmacyMap
        pharmacies={pharmacies.map(p => ({
          id: p.id,
          nom: p.nom,
          adresse: p.adresse,
          telephone: p.telephone,
          latitude: p.latitude,
          longitude: p.longitude,
          estGarde: p.estGarde,
          distance: p.distance,
          ville: p.ville,
        }))}
        userLatitude={userLat}
        userLongitude={userLng}
        selectedPharmacyId={selectedId}
        onPharmacyClick={setSelectedId}
        height="350px"
      />

      {/* All Garde Pharmacies List */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Siren className="h-4 w-4 text-red-600" />
          Pharmacies de garde à proximité
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : pharmacies.length > 0 ? (
          <div className="space-y-2">
            {pharmacies.map((p, index) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={`cursor-pointer transition-all ${
                    selectedId === p.id
                      ? 'border-red-400 ring-1 ring-red-200'
                      : 'border-teal-200 hover:border-red-300'
                  }`}
                  onClick={() => setSelectedId(p.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900">{p.nom}</h3>
                          {p.estGarde && (
                            <Badge className="text-[10px] bg-red-600 text-white border-0">Garde</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.adresse}, {p.ville}</p>
                        <a
                          href={`tel:${p.telephone}`}
                          className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="h-3 w-3" />
                          {p.telephone}
                        </a>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">{p.distance.toFixed(1)}</div>
                        <div className="text-[10px] text-muted-foreground">km</div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <a
                        href={`tel:${p.telephone}`}
                        className="flex-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button size="sm" className="w-full h-7 text-[11px] bg-red-600 hover:bg-red-700">
                          <Phone className="h-3 w-3 mr-1" />
                          Appeler
                        </Button>
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-[11px] border-red-300 text-red-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (p.latitude && p.longitude) {
                            window.open(`https://www.openstreetmap.org/directions?from=&to=${p.latitude},${p.longitude}`, '_blank')
                          }
                        }}
                      >
                        <Navigation className="h-3 w-3 mr-1" />
                        Itinéraire
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border-teal-200">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">Aucune pharmacie de garde trouvée</p>
              <p className="text-xs text-muted-foreground mt-1">
                Vérifiez que la géolocalisation est activée ou élargissez la zone de recherche
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Safety Tips */}
      <Card className="border-amber-200 bg-amber-50/30">
        <CardContent className="p-4">
          <h3 className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="h-3 w-3" />
            En cas d&apos;urgence médicale
          </h3>
          <ul className="text-xs text-amber-700 space-y-1">
            <li>Appelez le SAMU au <strong>119</strong> ou les urgences au <strong>112</strong></li>
            <li>Présentez votre ordonnance au pharmacien de garde</li>
            <li>Conservez vos médicaments d&apos;urgence accessibles</li>
            <li>En cas de réaction allergique, rendez-vous aux urgences les plus proches</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
