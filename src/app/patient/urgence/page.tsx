'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SosButton } from '@/components/patient/sos-button'
import {
  Shield, MapPin, Phone, Hospital, Crosshair, RefreshCw,
  AlertTriangle, Navigation, Clock, Heart, Ambulance,
  Building2, List, Eye, Info
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

const PharmacyMap = dynamic(
  () => import('@/components/patient/pharmacy-map'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[300px] rounded-xl border border-teal-200 bg-teal-50 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-8 w-8 text-primary mx-auto mb-2 animate-pulse" />
          <p className="text-xs text-muted-foreground">Chargement de la carte...</p>
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
}

interface EmergencyContact {
  nom: string
  telephone: string
  description: string
  categorie: string
}

interface EmergencyHospital {
  nom: string
  adresse: string
  telephone: string
  distance?: number
}

const contactIconMap: Record<string, React.ReactNode> = {
  URGENCE_MEDICALE: <Ambulance className="h-4 w-4 text-red-500" />,
  SECOURS: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  SECURITE: <Shield className="h-4 w-4 text-blue-500" />,
  ANTI_POISON: <Heart className="h-4 w-4 text-purple-500" />,
}

export default function UrgencePage() {
  const [pharmacies, setPharmacies] = useState<EmergencyPharmacy[]>([])
  const [loading, setLoading] = useState(true)
  const [showMap, setShowMap] = useState(true)
  const [userLat, setUserLat] = useState<number | undefined>()
  const [userLng, setUserLng] = useState<number | undefined>()
  const [geoError, setGeoError] = useState<string | null>(null)
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | undefined>()
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([])
  const [hospitals, setHospitals] = useState<EmergencyHospital[]>([])
  const [loadingUrgence, setLoadingUrgence] = useState(true)

  // Get user geolocation
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('La géolocalisation n\'est pas supportée')
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

  // Fetch garde pharmacies
  const fetchEmergencyPharmacies = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (userLat) params.set('lat', userLat.toString())
      if (userLng) params.set('lng', userLng.toString())
      params.set('garde', 'true')

      const res = await fetch(`/api/patient/pharmacies-proches?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPharmacies(data.map((p: {
          id: string; nom: string; adresse: string; ville: string; telephone: string;
          latitude: number | null; longitude: number | null; distance?: number; estGarde?: boolean;
        }) => ({
          id: p.id,
          nom: p.nom,
          adresse: p.adresse,
          ville: p.ville,
          telephone: p.telephone,
          latitude: p.latitude,
          longitude: p.longitude,
          distance: p.distance || 0,
          estGarde: p.estGarde || false,
        })))
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
    fetchEmergencyPharmacies()
  }, [fetchEmergencyPharmacies])

  // Fetch emergency contacts & hospitals from API
  useEffect(() => {
    async function fetchUrgenceInfos() {
      setLoadingUrgence(true)
      try {
        const params = new URLSearchParams()
        if (userLat) params.set('lat', userLat.toString())
        if (userLng) params.set('lng', userLng.toString())

        const res = await fetch(`/api/patient/urgence-infos?${params}`)
        if (res.ok) {
          const data = await res.json()
          setEmergencyContacts(data.emergencyContacts || [])
          setHospitals(data.hospitals || [])
        }
      } catch {
        // Fallback to empty — UI will show appropriate states
      } finally {
        setLoadingUrgence(false)
      }
    }
    fetchUrgenceInfos()
  }, [userLat, userLng])

  const mapPharmacies = pharmacies.map(p => ({
    id: p.id,
    nom: p.nom,
    adresse: p.adresse,
    telephone: p.telephone,
    latitude: p.latitude,
    longitude: p.longitude,
    estGarde: p.estGarde,
    distance: p.distance,
    ville: p.ville,
  }))

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-red-700 flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            Urgence médicale
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pharmacies de garde et numéros d&apos;urgence
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => { getUserLocation(); fetchEmergencyPharmacies() }}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* SOS Button */}
      {pharmacies.length > 0 && (
        <SosButton
          phoneNumber={pharmacies[0].telephone}
          pharmacieNom={pharmacies[0].nom}
        />
      )}

      {pharmacies.length === 0 && (
        <a href="tel:119">
          <motion.button
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-destructive text-white font-bold text-lg shadow-lg"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(226, 75, 74, 0.4)',
                '0 0 0 12px rgba(226, 75, 74, 0)',
                '0 0 0 0 rgba(226, 75, 74, 0)',
              ],
            }}
            transition={{ boxShadow: { duration: 2, repeat: Infinity } }}
          >
            <Phone className="h-6 w-6" />
            SOS — Appeler le SAMU (119)
          </motion.button>
        </a>
      )}

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
        </div>
      )}

      {/* Emergency Map */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Carte des pharmacies de garde
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowMap(!showMap)}
          >
            {showMap ? <List className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
            {showMap ? 'Liste' : 'Carte'}
          </Button>
        </div>
        {showMap && (
          <PharmacyMap
            pharmacies={mapPharmacies}
            userLatitude={userLat}
            userLongitude={userLng}
            selectedPharmacyId={selectedPharmacyId}
            onPharmacyClick={setSelectedPharmacyId}
            height="280px"
          />
        )}
      </div>

      {/* Nearest pharmacies */}
      <div>
        <h2 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
          <Hospital className="h-4 w-4 text-primary" />
          Pharmacies les plus proches
        </h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <Card key={i} className="border-teal-200 animate-pulse">
                <CardContent className="p-3 space-y-2">
                  <div className="h-4 bg-teal-50 rounded w-3/4" />
                  <div className="h-3 bg-teal-50 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : pharmacies.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pharmacies.slice(0, 5).map((pharmacy) => (
              <Card
                key={pharmacy.id}
                className={`border-teal-200 ${selectedPharmacyId === pharmacy.id ? 'ring-1 ring-primary' : ''}`}
                onClick={() => setSelectedPharmacyId(pharmacy.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold text-gray-900">{pharmacy.nom}</h3>
                        {pharmacy.estGarde && (
                          <Badge className="text-[9px] bg-amber-500 text-white border-0">Garde</Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {pharmacy.adresse}, {pharmacy.ville}
                      </p>
                      {pharmacy.distance > 0 && (
                        <p className="text-[10px] text-primary mt-0.5">
                          {pharmacy.distance.toFixed(1)} km
                        </p>
                      )}
                    </div>
                    <a href={`tel:${pharmacy.telephone}`} onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" className="h-8 text-[10px] bg-primary hover:bg-teal-700">
                        <Phone className="h-3 w-3 mr-1" />
                        Appeler
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-teal-200">
            <CardContent className="p-4 text-center">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Aucune pharmacie de garde trouvée</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Emergency numbers */}
      <div>
        <h2 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
          <Phone className="h-4 w-4 text-red-500" />
          Numéros d&apos;urgence
        </h2>
        {loadingUrgence ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Card key={i} className="border-red-100 animate-pulse">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-red-50 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-red-50 rounded w-1/3" />
                    <div className="h-2 bg-red-50 rounded w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {emergencyContacts.map((contact) => (
              <motion.a
                key={contact.telephone}
                href={`tel:${contact.telephone}`}
                className="block"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Card className="border-red-100 hover:border-red-200 transition-colors">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                      {contactIconMap[contact.categorie] || <Phone className="h-4 w-4 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-semibold text-gray-900">{contact.nom}</h3>
                      <p className="text-[10px] text-muted-foreground">{contact.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-red-600">{contact.telephone}</span>
                      <Phone className="h-4 w-4 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
              </motion.a>
            ))}
          </div>
        )}
      </div>

      {/* Hospitals */}
      <div>
        <h2 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Hôpitaux et centres d&apos;urgence
        </h2>
        {loadingUrgence ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <Card key={i} className="border-teal-200 animate-pulse">
                <CardContent className="p-3 space-y-2">
                  <div className="h-4 bg-teal-50 rounded w-3/4" />
                  <div className="h-3 bg-teal-50 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {hospitals.map((hospital, idx) => (
              <a key={`${hospital.telephone}-${idx}`} href={`tel:${hospital.telephone}`}>
                <Card className="border-teal-200 hover:border-primary/30 transition-colors">
                  <CardContent className="p-3 flex items-center gap-3">
                    <Hospital className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-medium text-gray-900">{hospital.nom}</h3>
                      <p className="text-[10px] text-muted-foreground">{hospital.adresse}</p>
                    </div>
                    {hospital.distance !== undefined && (
                      <span className="text-[10px] text-primary">{hospital.distance.toFixed(1)} km</span>
                    )}
                    <Phone className="h-4 w-4 text-primary" />
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Info banner */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-800">En cas d&apos;urgence vitale</p>
            <p className="text-[10px] text-red-700 mt-0.5">
              Appelez immédiatement le SAMU (119) ou rendez-vous au service d&apos;accueil des urgences
              de l&apos;hôpital le plus proche.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
