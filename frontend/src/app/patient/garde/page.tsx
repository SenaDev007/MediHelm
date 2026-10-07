'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ShieldCheck, Phone, MapPin, Calendar, Clock, Crosshair, RefreshCw,
  ChevronUp, ChevronDown, ChevronRight, Bell, Navigation, Siren, LocateFixed, Check,
} from 'lucide-react'
import { motion, useDragControls } from 'framer-motion'
import Link from 'next/link'
import { toast } from 'sonner'
import { buildDirectionsUrl } from '@backend/lib/directions'
import { formatPhoneBenin } from '@backend/lib/phone'
import { formatKm, type RouteInfo, type TravelMode } from '@backend/lib/travel'
import { useUserPosition } from '@/hooks/use-user-position'
import { TravelPanel } from '@/components/patient/travel-panel'
import { MapErrorBoundary } from '@/components/patient/map-error-boundary'
import { cn } from '@backend/lib/utils'

const PharmacyMap = dynamic(
  () => import('@/components/patient/pharmacy-map'),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-teal-50 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-10 w-10 text-primary mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-muted-foreground">Chargement de la carte...</p>
        </div>
      </div>
    ),
  }
)

interface PharmacyResult {
  id: string
  nom: string
  adresse: string
  ville: string
  telephone: string
  latitude: number | null
  longitude: number | null
  distance?: number
  estGarde: boolean
  inscriteMediHelm?: boolean
  numeroAbmed?: string | null
  officielle?: boolean
  departement?: string | null
  zoneSanitaire?: string | null
  commune?: string | null
  arrondissement?: string | null
  gardeHeureDebut?: string | null
  gardeHeureFin?: string | null
}

interface WeekGardeItem {
  id: string
  nom: string
  telephone: string
  heureDebut: string
  heureFin: string
  type: string
}

type ViewMode = 'map' | 'list'
type SheetState = 'peek' | 'half' | 'full'

const PEEK_H = 92

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function GardePage() {
  const { userLat, userLng, geoError, watching, request: getUserLocation, startWatching, stopWatching } = useUserPosition()

  const [allPharmacies, setAllPharmacies] = useState<PharmacyResult[]>([])
  const [weekGarde, setWeekGarde] = useState<Array<{ date: string; pharmacies: WeekGardeItem[] }>>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [sheetState, setSheetState] = useState<SheetState>('peek')
  const [panelOpen, setPanelOpen] = useState(true)
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | undefined>()
  const [routeTarget, setRouteTarget] = useState<{ destLat: number; destLng: number; destNom: string } | null>(null)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [navMode, setNavMode] = useState(false)
  const [travelMode, setTravelMode] = useState<TravelMode>('voiture')

  const containerRef = useRef<HTMLDivElement>(null)
  const dragControls = useDragControls()
  const [containerH, setContainerH] = useState(600)

  // Mesure du conteneur (viewport réel sous le header)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setContainerH(el.clientHeight))
    ro.observe(el)
    setContainerH(el.clientHeight)
    return () => ro.disconnect()
  }, [])

  // ─── Chargement : TOUTES les officines du Bénin + statut garde du jour ────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('radius', '5000') // tout le Bénin — la carte montre les 12 départements
      if (userLat) params.set('lat', userLat.toString())
      if (userLng) params.set('lng', userLng.toString())

      const [resPharmacies, resGarde] = await Promise.all([
        fetch(`/api/patient/pharmacies-proches?${params}`),
        fetch('/api/pharmacies?garde=semaine'),
      ])

      if (resPharmacies.ok) {
        const data = await resPharmacies.json()
        const list: PharmacyResult[] = (data as Array<Record<string, unknown>>).map(p => ({
          id: p.id as string,
          nom: p.nom as string,
          adresse: p.adresse as string,
          ville: p.ville as string,
          telephone: p.telephone as string,
          latitude: p.latitude as number | null,
          longitude: p.longitude as number | null,
          distance: p.distance as number | undefined,
          estGarde: Boolean(p.estGarde),
          inscriteMediHelm: Boolean(p.inscriteMediHelm),
          numeroAbmed: p.numeroAbmed as string | undefined,
          officielle: p.officielle as boolean | undefined,
          departement: p.departement as string | undefined,
          zoneSanitaire: p.zoneSanitaire as string | undefined,
          commune: p.commune as string | undefined,
          arrondissement: p.arrondissement as string | undefined,
          gardeHeureDebut: p.gardeHeureDebut as string | undefined,
          gardeHeureFin: p.gardeHeureFin as string | undefined,
        }))
        setAllPharmacies(list)
      }

      if (resGarde.ok) {
        const data = await resGarde.json()
        const today = new Date().toISOString().split('T')[0]
        const weekMap = new Map<string, WeekGardeItem[]>()
        if (Array.isArray(data)) {
          data.forEach((pharmacie: {
            id: string; nom: string; telephone: string;
            planningsGarde?: Array<{ date: string; heureDebut: string; heureFin: string; type: string }>;
          }) => {
            ;(pharmacie.planningsGarde || []).forEach((planning) => {
              if (planning.date < today) return // les journées passées ne servent plus
              const key = planning.date.split('T')[0]
              const existing = weekMap.get(key) || []
              existing.push({
                id: pharmacie.id,
                nom: pharmacie.nom,
                telephone: pharmacie.telephone,
                heureDebut: new Date(planning.heureDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                heureFin: new Date(planning.heureFin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                type: planning.type,
              })
              weekMap.set(key, existing)
            })
          })
        }
        setWeekGarde(
          Array.from(weekMap.entries())
            .map(([date, pharmacies]) => ({ date, pharmacies }))
            .sort((a, b) => a.date.localeCompare(b.date))
        )
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
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAll])

  // ─── Sélection & itinéraire ───────────────────────────────────────────────
  const todayGarde = useMemo(() => allPharmacies.filter(p => p.estGarde), [allPharmacies])

  const withDistance = useCallback(<T extends { latitude: number | null; longitude: number | null }>(p: T): number | null => {
    if (userLat == null || userLng == null || p.latitude == null || p.longitude == null) return null
    return haversineDistance(userLat, userLng, p.latitude, p.longitude)
  }, [userLat, userLng])

  const selectPharmacy = useCallback((p: { id: string; nom: string; latitude: number | null; longitude: number | null }) => {
    setSelectedPharmacyId(p.id)
    if (p.latitude != null && p.longitude != null) {
      setRouteTarget({ destLat: p.latitude, destLng: p.longitude, destNom: p.nom })
    }
  }, [])

  const handlePharmacyClick = useCallback((id: string) => {
    const p = allPharmacies.find(x => x.id === id)
    if (p) {
      selectPharmacy(p)
      if (viewMode === 'map') setSheetState('peek')
      const element = document.getElementById(`pharmacy-${id}`)
      if (element && (sheetState === 'half' || sheetState === 'full')) {
        setTimeout(() => element.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
      }
    }
  }, [allPharmacies, selectPharmacy, viewMode, sheetState])

  /** Pharmacie de garde la plus proche — sinon l'officine la plus proche */
  const goToNearest = useCallback(() => {
    if (allPharmacies.length === 0) return
    if (userLat == null || userLng == null) {
      toast.info('Activez votre localisation pour trouver la pharmacie la plus proche')
      getUserLocation()
      return
    }
    const pool = todayGarde.length > 0 ? todayGarde : allPharmacies
    const nearest = pool
      .filter(p => p.latitude != null && p.longitude != null)
      .map(p => ({ p, d: haversineDistance(userLat, userLng, p.latitude!, p.longitude!) }))
      .sort((a, b) => a.d - b.d)[0]
    if (nearest) {
      selectPharmacy(nearest.p)
      if (viewMode === 'map') setSheetState('peek')
    }
  }, [allPharmacies, todayGarde, userLat, userLng, selectPharmacy, viewMode, getUserLocation])

  const toggleNavigation = useCallback(() => {
    if (navMode) {
      stopWatching()
      setNavMode(false)
      toast.success('Suivi de trajet terminé')
    } else {
      setNavMode(true)
      startWatching()
      toast.success('En route — votre position est suivie sur la carte')
    }
  }, [navMode, startWatching, stopWatching])

  const closeTravel = useCallback(() => {
    setRouteTarget(null)
    setRouteInfo(null)
    if (navMode) {
      stopWatching()
      setNavMode(false)
    }
  }, [navMode, stopWatching])

  const selected = allPharmacies.find(p => p.id === selectedPharmacyId)

  const handleRefresh = () => {
    getUserLocation()
    fetchAll()
  }

  const toggleViewMode = () => {
    if (viewMode === 'map') {
      setViewMode('list')
      setSheetState('full')
    } else {
      setViewMode('map')
      setSheetState('peek')
    }
  }

  const cycleSheet = () => {
    setSheetState(prev => prev === 'peek' ? 'half' : prev === 'half' ? 'full' : 'peek')
  }

  const sheetHeights: Record<SheetState, number> = {
    peek: PEEK_H,
    half: Math.round(containerH * 0.5),
    full: Math.round(containerH * 0.9),
  }

  const mapPharmacies = allPharmacies

  /** SOS : appel direct de la pharmacie de garde la plus proche */
  const sosTarget = useMemo(() => {
    if (todayGarde.length === 0) return null
    if (userLat == null || userLng == null) return todayGarde[0]
    return todayGarde
      .filter(p => p.latitude != null && p.longitude != null)
      .map(p => ({ p, d: haversineDistance(userLat, userLng, p.latitude!, p.longitude!) }))
      .sort((a, b) => a.d - b.d)[0]?.p ?? todayGarde[0]
  }, [todayGarde, userLat, userLng])

  const sosPhone = formatPhoneBenin(sosTarget?.telephone)

  // ─── Carte « pharmacie de garde » (fiche du jour) ─────────────────────────
  const gardeCard = (p: PharmacyResult) => {
    const phone = formatPhoneBenin(p.telephone)
    const dist = withDistance(p)
    return (
      <Card
        key={p.id}
        id={`pharmacy-${p.id}`}
        className={cn(
          'border-amber-200 bg-gradient-to-br from-amber-50 to-white cursor-pointer transition-shadow hover:shadow-md',
          selectedPharmacyId === p.id && 'ring-2 ring-amber-400'
        )}
        onClick={() => selectPharmacy(p)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 text-sm truncate">{p.nom}</h3>
                <Badge className="text-[10px] bg-amber-500 text-white border-0">
                  <ShieldCheck className="h-3 w-3 mr-0.5" />
                  De garde
                </Badge>
                {p.inscriteMediHelm ? (
                  <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border border-primary/30">
                    <Check className="h-3 w-3 mr-0.5" />
                    Sur MediHelm
                  </Badge>
                ) : p.numeroAbmed ? (
                  <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-600 border border-gray-200">
                    ABMed · {p.numeroAbmed}
                  </Badge>
                ) : null}
              </div>
              <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{p.adresse}{p.ville ? `, ${p.ville}` : ''}</span>
              </div>
              {(p.departement || p.commune) && (
                <div className="flex items-center flex-wrap gap-1 mt-1.5">
                  {p.departement && (
                    <span className="text-[10px] font-semibold text-teal-800 bg-teal-100/70 px-1.5 py-0.5 rounded">
                      {p.departement}
                    </span>
                  )}
                  {p.commune && (
                    <span className="text-[10px] font-medium text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded">
                      {p.commune}
                    </span>
                  )}
                </div>
              )}
              {(p.gardeHeureDebut && p.gardeHeureFin) ? (
                <div className="flex items-center gap-1 mt-1.5 text-xs font-semibold text-amber-700">
                  <Clock className="h-3 w-3" />
                  {p.gardeHeureDebut} — {p.gardeHeureFin}
                </div>
              ) : null}
            </div>
            {dist != null && (
              <div className="flex-shrink-0 text-right">
                <p className="text-lg font-bold text-amber-600">{dist.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">km</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-3">
            {phone ? (
              <a href={`tel:${phone.tel}`} className="flex-1" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" className="w-full h-8 text-xs bg-primary hover:bg-teal-700">
                  <Phone className="h-3 w-3 mr-1" />
                  Appeler
                </Button>
              </a>
            ) : (
              <div className="flex-1 text-[10px] text-muted-foreground flex items-center justify-center">
                Téléphone non publié
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs border-amber-500 text-amber-700 hover:bg-amber-50"
              onClick={(e) => {
                e.stopPropagation()
                selectPharmacy(p)
                if (viewMode === 'map') setSheetState('peek')
              }}
            >
              <Navigation className="h-3 w-3 mr-1" />
              Itinéraire
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ─── Contenu du sheet mobile / panneau desktop ────────────────────────────
  const panelContent = (compact?: boolean) => (
    <div className={cn('overflow-y-auto', compact ? 'p-3 space-y-4' : 'p-4 space-y-4')}>
      {/* Garde du jour */}
      <section>
        <h2 className="font-semibold text-gray-900 text-sm mb-2.5 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-amber-500" />
          Aujourd&apos;hui
          <span className="text-[10px] font-medium text-muted-foreground">
            {loading ? '…' : `${todayGarde.length} officine(s) de garde`}
          </span>
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
          </div>
        ) : todayGarde.length > 0 ? (
          <div className="space-y-3">
            {todayGarde.map(gardeCard)}
          </div>
        ) : (
          <Card className="border-teal-200">
            <CardContent className="p-4 text-center">
              <ShieldCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                Aucune pharmacie de garde programmée aujourd&apos;hui — consultez le planning de la semaine
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Planning de la semaine */}
      <section>
        <h2 className="font-semibold text-gray-900 text-sm mb-2.5 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Planning de la semaine
        </h2>
        <div className="space-y-2.5">
          {weekGarde.map(({ date, pharmacies }) => {
            const today = new Date().toISOString().split('T')[0]
            const isToday = date === today
            return (
              <Card key={date} className={cn('border-teal-200', isToday && 'ring-1 ring-primary')}>
                <CardContent className="p-3">
                  <p className={cn('text-xs font-semibold mb-2 capitalize', isToday ? 'text-primary' : 'text-gray-900')}>
                    {formatDate(date)} {isToday && '(aujourd\'hui)'}
                  </p>
                  {pharmacies.map((p) => {
                    const phone = formatPhoneBenin(p.telephone)
                    return (
                      <div key={`${p.id}-${p.heureDebut}`} className="flex items-center justify-between py-1.5 border-b border-teal-50 last:border-0">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">{p.nom}</p>
                          <p className="text-[10px] text-muted-foreground">{p.heureDebut} — {p.heureFin}</p>
                        </div>
                        {phone && (
                          <a href={`tel:${phone.tel}`}>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary shrink-0">
                              <Phone className="h-3 w-3" />
                            </Button>
                          </a>
                        )}
                      </div>
                    )
                  })}
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
      </section>

      {/* Notifications de garde */}
      <Card className="border-teal-200">
        <CardContent className="p-4 text-center">
          <Bell className="h-5 w-5 text-primary mx-auto mb-1.5" />
          <p className="text-xs text-muted-foreground mb-2">
            Recevez une notification dès qu&apos;une pharmacie de garde est programmée près de chez vous
          </p>
          <Button size="sm" className="h-8 text-xs bg-primary hover:bg-teal-700" onClick={() => toast('Notifications de garde activées')}>
            Activer les notifications garde
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div ref={containerRef} className="fixed inset-x-0 top-14 bottom-16 md:bottom-0 z-[5] overflow-hidden">
      {/* ═══ CARTE PLEIN ÉCRAN — identique à la page géolocalisation ═══ */}
      {viewMode === 'map' && (allPharmacies.length > 0 || !loading) && (
        <MapErrorBoundary subject="La carte des pharmacies de garde">
          <PharmacyMap
            pharmacies={mapPharmacies}
            userLatitude={userLat}
            userLongitude={userLng}
            selectedPharmacyId={selectedPharmacyId}
            onPharmacyClick={handlePharmacyClick}
            route={routeTarget}
            onRouteInfo={setRouteInfo}
            navigation={navMode && watching}
            height="100%"
            className="absolute inset-0 rounded-none border-0"
          />
        </MapErrorBoundary>
      )}
      {viewMode === 'map' && loading && (
        <Skeleton className="absolute inset-0 rounded-none" />
      )}
      {viewMode === 'list' && (
        <div className="absolute inset-0 bg-teal-50/40 md:hidden" />
      )}

      {/* ═══ Barre flottante haute : garde du jour + actions ═══ */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur rounded-full shadow-lg pl-3 pr-3 py-1.5 max-w-[62%]">
          <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-teal-900 leading-tight truncate">
              Pharmacies de garde
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight truncate">
              {loading ? 'Chargement…' : `${todayGarde.length} en garde aujourd'hui · ${allPharmacies.length} officines au Bénin`}
            </p>
          </div>
        </div>
        <div className="pointer-events-auto ml-auto flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 bg-white/95 backdrop-blur rounded-full shadow-lg border-0 hover:bg-white"
            onClick={handleRefresh}
            aria-label="Rafraîchir"
          >
            <RefreshCw className="h-4 w-4 text-teal-800" />
          </Button>
          <Link href="/patient/urgence">
            <Button
              size="sm"
              className="h-9 rounded-full shadow-lg bg-red-600 hover:bg-red-700 text-white px-3 text-xs font-semibold gap-1"
            >
              <Siren className="h-3.5 w-3.5" />
              Urgence
            </Button>
          </Link>
        </div>
      </div>

      {/* ═══ Erreur géolocalisation ═══ */}
      {geoError && (
        <div className="absolute top-[60px] left-3 z-20 max-w-[70%]">
          <div className="bg-amber-50/95 backdrop-blur rounded-full pl-3 pr-2 py-1.5 text-xs text-amber-800 flex items-center gap-2 shadow-md">
            <Crosshair className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{geoError}</span>
            <button
              className="shrink-0 font-semibold text-[11px] text-amber-900 hover:underline"
              onClick={() => getUserLocation()}
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      {/* ═══ Boutons flottants bas : plus proche + recentrer + liste ═══ */}
      <div className={cn(
        'absolute right-3 z-40 flex flex-col gap-2 transition-all',
        viewMode === 'map' ? 'bottom-[104px] md:bottom-4' : 'bottom-3',
      )}>
        {viewMode === 'map' && (
          <>
            <Button
              size="sm"
              className="h-10 rounded-full shadow-lg bg-amber-500 hover:bg-amber-600 text-white px-3.5 text-xs font-semibold gap-1.5"
              onClick={goToNearest}
            >
              <LocateFixed className="h-4 w-4" />
              Plus proche
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 bg-white/95 backdrop-blur rounded-full shadow-lg border-0 hover:bg-white"
              onClick={() => getUserLocation()}
              aria-label="Recentrer sur ma position"
            >
              <Crosshair className="h-4 w-4 text-teal-800" />
            </Button>
          </>
        )}
        <Button
          size="sm"
          onClick={toggleViewMode}
          className="h-10 rounded-full shadow-lg bg-teal-800 hover:bg-teal-900 text-white px-4 text-xs font-semibold gap-1.5"
        >
          {viewMode === 'map' ? 'Planning' : 'Carte'}
        </Button>
      </div>

      {/* ═══ PANNEAU ITINÉRAIRE — kilométrage marche / moto / voiture ═══ */}
      {selected && viewMode === 'map' && routeTarget && (
        <TravelPanel
          destination={{
            nom: selected.nom,
            latitude: selected.latitude,
            longitude: selected.longitude,
            telephone: selected.telephone,
          }}
          routeInfo={routeInfo}
          userLat={userLat}
          userLng={userLng}
          travelMode={travelMode}
          onModeChange={setTravelMode}
          navigation={navMode}
          onToggleNavigation={toggleNavigation}
          onClose={closeTravel}
          className={cn(
            'absolute left-3 right-3 md:right-auto md:w-[380px]',
            'bottom-[104px] md:bottom-4'
          )}
        />
      )}

      {/* ═══ PANNEAU LISTE — desktop / tablette (latéral droit) ═══ */}
      <aside
        className={cn(
          'hidden md:flex absolute top-0 right-0 bottom-0 z-30 bg-white/95 backdrop-blur-md shadow-[-8px_0_24px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out flex-col',
          viewMode === 'list'
            ? 'w-[min(560px,100%)]'
            : panelOpen ? 'w-[380px]' : 'w-0'
        )}
      >
        {(panelOpen || viewMode === 'list') && (
          <div className="flex flex-col h-full w-full">
            <div className="p-4 pb-3 border-b border-teal-100 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-teal-800 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-amber-500" />
                    Garde du jour
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {loading ? 'Recherche…' : `${todayGarde.length} officine(s) de garde · planning sur 7 jours`}
                  </p>
                </div>
                {viewMode === 'map' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground"
                    onClick={() => setPanelOpen(false)}
                    aria-label="Masquer la liste"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                )}
              </div>
              {/* SOS — appel direct de la pharmacie de garde la plus proche */}
              {sosTarget && sosPhone && (
                <a href={`tel:${sosPhone.tel}`} className="block mt-2.5">
                  <Button size="sm" className="w-full h-9 text-xs bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5">
                    <Siren className="h-4 w-4" />
                    SOS — Appeler {sosTarget.nom}
                  </Button>
                </a>
              )}
            </div>
            <div className="flex-1 min-h-0">{panelContent(true)}</div>
          </div>
        )}
      </aside>

      {/* Poignée d'ouverture du panneau desktop */}
      {viewMode === 'map' && !panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="hidden md:flex absolute top-1/2 -translate-y-1/2 right-0 z-30 bg-white/95 backdrop-blur rounded-l-xl shadow-lg px-1.5 py-6 items-center text-teal-800 hover:bg-white transition-colors"
          aria-label="Afficher le planning de garde"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
      )}

      {/* ═══ SHEET MOBILE — planning de garde ═══ */}
      <motion.div
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.08, bottom: 0.2 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 60 || info.velocity.y > 500) {
            setSheetState(prev => prev === 'full' ? 'half' : 'peek')
          } else if (info.offset.y < -60 || info.velocity.y < -500) {
            setSheetState(prev => prev === 'peek' ? 'half' : 'full')
          }
        }}
        animate={{ height: viewMode === 'list' ? Math.round(containerH * 0.94) : sheetHeights[sheetState] }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="md:hidden absolute bottom-0 inset-x-0 z-30 bg-white rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden"
        style={{ touchAction: 'pan-y' }}
      >
        <div
          className="shrink-0 cursor-grab active:cursor-grabbing select-none"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => dragControls.start(e)}
          onClick={cycleSheet}
        >
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="w-10 h-1.5 rounded-full bg-gray-300" />
          </div>
          <div className="px-4 pb-2.5 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-teal-800 leading-tight">
                {loading ? 'Recherche…' : `${todayGarde.length} pharmacie(s) de garde`}
                <span className="text-xs font-normal text-muted-foreground"> · aujourd&apos;hui</span>
              </p>
              {sheetState === 'peek' && todayGarde[0] && !loading && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  <MapPin className="h-3 w-3 inline mr-0.5 text-amber-500" />
                  {todayGarde[0].nom}
                  {todayGarde[0].gardeHeureDebut && todayGarde[0].gardeHeureFin
                    ? ` · ${todayGarde[0].gardeHeureDebut} — ${todayGarde[0].gardeHeureFin}`
                    : ''}
                </p>
              )}
            </div>
            {sosTarget && sosPhone && sheetState === 'peek' && (
              <a href={`tel:${sosPhone.tel}`} className="shrink-0">
                <Button size="sm" className="h-9 rounded-full bg-red-600 hover:bg-red-700 text-white px-3 text-[11px] font-bold gap-1 shadow-lg">
                  <Siren className="h-3.5 w-3.5" />
                  SOS
                </Button>
              </a>
            )}
            {sheetState !== 'full' ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
          </div>
        </div>

        {sheetState !== 'peek' && (
          <div className="flex-1 min-h-0 border-t border-teal-100">{panelContent(true)}</div>
        )}
      </motion.div>
    </div>
  )
}
