'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { PharmacyCard } from '@/components/patient/pharmacy-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MapPin, List, Crosshair, Filter, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'

const PharmacyMap = dynamic(
  () => import('@/components/patient/pharmacy-map'),
  { ssr: false, loading: () => (
    <div className="w-full h-[400px] rounded-xl border border-teal-200 bg-teal-50 flex items-center justify-center">
      <div className="text-center">
        <MapPin className="h-8 w-8 text-primary mx-auto mb-2 animate-pulse" />
        <p className="text-xs text-muted-foreground">Chargement de la carte...</p>
      </div>
    </div>
  )}
)

interface PharmacyResult {
  id: string
  nom: string
  adresse: string
  ville: string
  telephone: string
  latitude: number | null
  longitude: number | null
  distance: number
  estGarde: boolean
  medicamentDispo?: boolean
}

const radiusOptions = [1, 3, 5, 10, 20]

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

export default function PharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<PharmacyResult[]>([])
  const [filteredPharmacies, setFilteredPharmacies] = useState<PharmacyResult[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [userLat, setUserLat] = useState<number | undefined>()
  const [userLng, setUserLng] = useState<number | undefined>()
  const [selectedRadius, setSelectedRadius] = useState(10)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [medicamentFilter, setMedicamentFilter] = useState<string | null>(null)

  // Get URL params for medicament filter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const medId = params.get('medicament')
    if (medId) setMedicamentFilter(medId)
  }, [])

  // Get user geolocation
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
            setGeoError('Accès à la localisation refusé')
            break
          case error.POSITION_UNAVAILABLE:
            setGeoError('Localisation non disponible')
            break
          case error.TIMEOUT:
            setGeoError('Délai d\'attente dépassé')
            break
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    )
  }, [])

  // Fetch pharmacies
  const fetchPharmacies = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (userLat) params.set('lat', userLat.toString())
      if (userLng) params.set('lng', userLng.toString())
      if (medicamentFilter) params.set('medicamentId', medicamentFilter)

      const res = await fetch(`/api/patient/pharmacies-proches?${params}`)
      if (res.ok) {
        const data = await res.json()
        const pharmacyResults: PharmacyResult[] = data.map((p: {
          id: string; nom: string; adresse: string; ville: string; telephone: string;
          latitude: number | null; longitude: number | null; distance?: number; estGarde?: boolean;
          medicamentDispo?: boolean;
        }) => ({
          ...p,
          distance: userLat && userLng && p.latitude && p.longitude
            ? haversineDistance(userLat, userLng, p.latitude, p.longitude)
            : p.distance || 0,
          estGarde: p.estGarde || false,
        }))
        setPharmacies(pharmacyResults.sort((a: PharmacyResult, b: PharmacyResult) => a.distance - b.distance))
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [userLat, userLng, medicamentFilter])

  useEffect(() => {
    getUserLocation()
  }, [getUserLocation])

  useEffect(() => {
    fetchPharmacies()
  }, [fetchPharmacies])

  // Filter by radius
  useEffect(() => {
    const filtered = pharmacies.filter(p => p.distance <= selectedRadius)
    setFilteredPharmacies(filtered)
  }, [pharmacies, selectedRadius])

  const handleRefresh = () => {
    getUserLocation()
    fetchPharmacies()
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-teal-800">Pharmacies</h1>
          <p className="text-xs text-muted-foreground">
            {filteredPharmacies.length} pharmacie(s) trouvée(s)
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setViewMode('map')}
          >
            <MapPin className="h-3 w-3 mr-1" />
            Carte
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setViewMode('list')}
          >
            <List className="h-3 w-3 mr-1" />
            Liste
          </Button>
        </div>
      </div>

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
        <div className="bg-teal-50 rounded-lg p-2 text-xs text-primary flex items-center gap-2">
          <Crosshair className="h-3 w-3" />
          Position détectée • Tri par distance
        </div>
      )}

      {/* Radius filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-3 w-3 text-muted-foreground" />
        <div className="flex gap-1.5 flex-wrap">
          {radiusOptions.map((r) => (
            <Badge
              key={r}
              variant={selectedRadius === r ? 'default' : 'secondary'}
              className={`cursor-pointer text-[11px] ${
                selectedRadius === r
                  ? 'bg-primary text-white border-0'
                  : 'bg-teal-50 text-teal-800 border-0 hover:bg-teal-100'
              }`}
              onClick={() => setSelectedRadius(r)}
            >
              {r} km
            </Badge>
          ))}
        </div>
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {!loading ? (
            <PharmacyMap
              pharmacies={filteredPharmacies.map(p => ({
                id: p.id,
                nom: p.nom,
                adresse: p.adresse,
                telephone: p.telephone,
                latitude: p.latitude,
                longitude: p.longitude,
                estGarde: p.estGarde,
                distance: p.distance,
              }))}
              userLatitude={userLat}
              userLongitude={userLng}
            />
          ) : (
            <Skeleton className="w-full h-[400px] rounded-xl" />
          )}
        </motion.div>
      )}

      {/* Pharmacy List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPharmacies.map((pharmacy) => (
            <PharmacyCard
              key={pharmacy.id}
              id={pharmacy.id}
              nom={pharmacy.nom}
              adresse={pharmacy.adresse}
              ville={pharmacy.ville}
              telephone={pharmacy.telephone}
              latitude={pharmacy.latitude}
              longitude={pharmacy.longitude}
              distance={pharmacy.distance}
              estGarde={pharmacy.estGarde}
              medicamentDispo={pharmacy.medicamentDispo}
            />
          ))}
          {filteredPharmacies.length === 0 && (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900">Aucune pharmacie dans ce rayon</p>
              <p className="text-xs text-muted-foreground mt-1">Augmentez le rayon de recherche</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
