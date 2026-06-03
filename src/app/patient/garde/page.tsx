'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShieldCheck, Phone, MapPin, Calendar, Clock, Crosshair, RefreshCw, Eye, List } from 'lucide-react'
import { SosButton } from '@/components/patient/sos-button'
import { motion } from 'framer-motion'
import Link from 'next/link'
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

interface GardePharmacy {
  id: string
  nom: string
  adresse: string
  ville: string
  telephone: string
  latitude: number | null
  longitude: number | null
  planningDate: string
  heureDebut: string
  heureFin: string
  type: string
  distance?: number
}

export default function GardePage() {
  const [todayGarde, setTodayGarde] = useState<GardePharmacy[]>([])
  const [weekGarde, setWeekGarde] = useState<Array<{ date: string; pharmacies: GardePharmacy[] }>>([])
  const [loading, setLoading] = useState(true)
  const [showMap, setShowMap] = useState(true)
  const [userLat, setUserLat] = useState<number | undefined>()
  const [userLng, setUserLng] = useState<number | undefined>()
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | undefined>()

  // Get user geolocation
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLat(position.coords.latitude)
        setUserLng(position.coords.longitude)
      },
      () => { /* ignore */ },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    )
  }, [])

  useEffect(() => {
    getUserLocation()
  }, [getUserLocation])

  useEffect(() => {
    async function fetchGarde() {
      try {
        const res = await fetch('/api/pharmacies?garde=semaine')
        if (res.ok) {
          const data = await res.json()
          const today = new Date().toISOString().split('T')[0]
          const gardeList: GardePharmacy[] = []

          if (Array.isArray(data)) {
            data.forEach((pharmacie: {
              id: string; nom: string; adresse: string; ville: string; telephone: string;
              latitude: number | null; longitude: number | null;
              planningsGarde?: Array<{ date: string; heureDebut: string; heureFin: string; type: string }>;
            }) => {
              if (pharmacie.planningsGarde) {
                pharmacie.planningsGarde.forEach((planning) => {
                  gardeList.push({
                    id: pharmacie.id,
                    nom: pharmacie.nom,
                    adresse: pharmacie.adresse,
                    ville: pharmacie.ville,
                    telephone: pharmacie.telephone,
                    latitude: pharmacie.latitude,
                    longitude: pharmacie.longitude,
                    planningDate: planning.date,
                    heureDebut: new Date(planning.heureDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    heureFin: new Date(planning.heureFin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    type: planning.type,
                  })
                })
              }
            })
          }

          const todayGar = gardeList.filter(g => g.planningDate.startsWith(today))
          setTodayGarde(todayGar)

          const weekMap = new Map<string, GardePharmacy[]>()
          gardeList.forEach(g => {
            const existing = weekMap.get(g.planningDate) || []
            existing.push(g)
            weekMap.set(g.planningDate, existing)
          })
          const weekArray = Array.from(weekMap.entries())
            .map(([date, pharmacies]) => ({ date, pharmacies }))
            .sort((a, b) => a.date.localeCompare(b.date))
          setWeekGarde(weekArray)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchGarde()
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  // Map data for today's garde pharmacies
  const mapPharmacies = todayGarde.map(g => ({
    id: g.id,
    nom: g.nom,
    adresse: g.adresse,
    telephone: g.telephone,
    latitude: g.latitude,
    longitude: g.longitude,
    estGarde: true,
    ville: g.ville,
  }))

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Pharmacie de garde
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Pharmacies ouvertes en dehors des heures normales
          </p>
        </div>
        <Link href="/patient/urgence">
          <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700">
            Urgence
          </Button>
        </Link>
      </div>

      {/* SOS Button */}
      {todayGarde.length > 0 && (
        <SosButton
          phoneNumber={todayGarde[0].telephone}
          pharmacieNom={todayGarde[0].nom}
        />
      )}

      {/* Interactive Map */}
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
            height="300px"
          />
        )}
      </div>

      {/* Today's Garde */}
      <div>
        <h2 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Aujourd&apos;hui
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Card key={i} className="border-teal-200 animate-pulse">
                <CardContent className="p-4 space-y-2">
                  <div className="h-5 bg-teal-50 rounded w-3/4" />
                  <div className="h-3 bg-teal-50 rounded w-1/2" />
                  <div className="h-3 bg-teal-50 rounded w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : todayGarde.length > 0 ? (
          <div className="space-y-3">
            {todayGarde.map((g) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={`border-primary/30 ${selectedPharmacyId === g.id ? 'ring-1 ring-primary' : 'bg-gradient-to-br from-teal-50 to-white'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{g.nom}</h3>
                          <Badge className="text-[10px] bg-primary text-white border-0">Garde</Badge>
                        </div>
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {g.adresse}, {g.ville}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-primary">
                          <Clock className="h-3 w-3" />
                          {g.heureDebut} — {g.heureFin}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <a href={`tel:${g.telephone}`} className="flex-1">
                        <Button size="sm" className="w-full h-8 text-xs bg-primary hover:bg-teal-700">
                          <Phone className="h-3 w-3 mr-1" />
                          Appeler
                        </Button>
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs border-primary text-primary"
                        onClick={() => {
                          setSelectedPharmacyId(g.id)
                          if (g.latitude && g.longitude) {
                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${g.latitude},${g.longitude}`, '_blank')
                          }
                        }}
                      >
                        <MapPin className="h-3 w-3 mr-1" />
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
            <CardContent className="p-4 text-center">
              <ShieldCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Aucune pharmacie de garde aujourd&apos;hui</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Weekly Schedule */}
      <div>
        <h2 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Planning de la semaine
        </h2>
        <div className="space-y-3">
          {weekGarde.map(({ date, pharmacies }) => {
            const today = new Date().toISOString().split('T')[0]
            const isToday = date.startsWith(today)
            return (
              <Card key={date} className={`border-teal-200 ${isToday ? 'ring-1 ring-primary' : ''}`}>
                <CardContent className="p-3">
                  <p className={`text-xs font-semibold mb-2 ${isToday ? 'text-primary' : 'text-gray-900'}`}>
                    {formatDate(date)} {isToday && '(Aujourd\'hui)'}
                  </p>
                  {pharmacies.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-teal-50 last:border-0">
                      <div>
                        <p className="text-xs font-medium text-gray-900">{p.nom}</p>
                        <p className="text-[10px] text-muted-foreground">{p.heureDebut} — {p.heureFin}</p>
                      </div>
                      <a href={`tel:${p.telephone}`}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary">
                          <Phone className="h-3 w-3" />
                        </Button>
                      </a>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
          {weekGarde.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Aucun planning de garde disponible
            </p>
          )}
        </div>
      </div>

      {/* Notification subscription */}
      <Card className="border-teal-200">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-2">
            Recevez une notification pour les plannings de garde
          </p>
          <Button size="sm" className="h-8 text-xs bg-primary hover:bg-teal-700" onClick={() => toast('Notifications de garde activées')}>
            Activer les notifications garde
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
