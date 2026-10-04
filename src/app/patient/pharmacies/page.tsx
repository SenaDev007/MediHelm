'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { PharmacyCard } from '@/components/patient/pharmacy-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MapPin, List, Crosshair, Filter, RefreshCw, ChevronUp, ChevronDown, X, ChevronRight } from 'lucide-react'
import { motion, useDragControls } from 'framer-motion'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const PharmacyMap = dynamic(
  () => import('@/components/patient/pharmacy-map'),
  { ssr: false, loading: () => (
    <div className="absolute inset-0 bg-teal-50 flex items-center justify-center">
      <div className="text-center">
        <MapPin className="h-10 w-10 text-primary mx-auto mb-3 animate-pulse" />
        <p className="text-sm text-muted-foreground">Chargement de la carte...</p>
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
  // ─── Registre officiel ABMed ───
  numeroAbmed?: string | null
  officielle?: boolean
  departement?: string | null
  zoneSanitaire?: string | null
  commune?: string | null
  arrondissement?: string | null
  localisation?: string | null
  pharmacienTitulaire?: string | null
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

type ViewMode = 'map' | 'list'
type SheetState = 'peek' | 'half' | 'full'

/** Hauteur du sheet mobile (en px, calculée depuis le conteneur réel) */
const PEEK_H = 92

export default function PharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<PharmacyResult[]>([])
  const [filteredPharmacies, setFilteredPharmacies] = useState<PharmacyResult[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [sheetState, setSheetState] = useState<SheetState>('peek')
  const [panelOpen, setPanelOpen] = useState(true)
  const [userLat, setUserLat] = useState<number | undefined>()
  const [userLng, setUserLng] = useState<number | undefined>()
  const [selectedRadius, setSelectedRadius] = useState(10)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [medicamentFilter, setMedicamentFilter] = useState<string | null>(null)
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | undefined>()

  const containerRef = useRef<HTMLDivElement>(null)
  const dragControls = useDragControls()
  const [containerH, setContainerH] = useState(600)

  // Mesure du conteneur (viewport réel sous le header) pour dimensionner le sheet
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setContainerH(el.clientHeight))
    ro.observe(el)
    setContainerH(el.clientHeight)
    return () => ro.disconnect()
  }, [])

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

  // Clic sur un marqueur de la carte : sélection + replier le sheet pour voir le popup
  const handlePharmacyClick = (id: string) => {
    setSelectedPharmacyId(id)
    if (viewMode === 'map') setSheetState('peek')
    const element = document.getElementById(`pharmacy-${id}`)
    if (element && (sheetState === 'half' || sheetState === 'full')) {
      setTimeout(() => element.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
    }
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

  const mapPharmacies = filteredPharmacies.map(p => ({
    id: p.id,
    nom: p.nom,
    adresse: p.adresse,
    telephone: p.telephone,
    latitude: p.latitude,
    longitude: p.longitude,
    estGarde: p.estGarde,
    distance: p.distance,
    ville: p.ville,
    medicamentDispo: p.medicamentDispo,
    // ─── Registre officiel ABMed (fiche complète au survol / clic) ───
    numeroAbmed: p.numeroAbmed,
    officielle: p.officielle ?? (p.numeroAbmed != null),
    departement: p.departement,
    zoneSanitaire: p.zoneSanitaire,
    commune: p.commune,
    arrondissement: p.arrondissement,
    localisation: p.localisation,
    pharmacienTitulaire: p.pharmacienTitulaire,
  }))

  const nearest = filteredPharmacies[0]

  const pharmacyList = (compact?: boolean) => (
    <div className={cn('overflow-y-auto', compact ? 'p-3 space-y-3' : 'p-4 space-y-3')}>
      {loading ? (
        [1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)
      ) : (
        <>
          {filteredPharmacies.map((pharmacy) => (
            <div id={`pharmacy-${pharmacy.id}`} key={pharmacy.id}>
              <PharmacyCard
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
                numeroAbmed={pharmacy.numeroAbmed}
                officielle={pharmacy.officielle ?? (pharmacy.numeroAbmed != null)}
                departement={pharmacy.departement}
                zoneSanitaire={pharmacy.zoneSanitaire}
                commune={pharmacy.commune}
                arrondissement={pharmacy.arrondissement}
                pharmacienTitulaire={pharmacy.pharmacienTitulaire}
                userLatitude={userLat}
                userLongitude={userLng}
                onSelect={() => setSelectedPharmacyId(
                  selectedPharmacyId === pharmacy.id ? undefined : pharmacy.id
                )}
              />
            </div>
          ))}
          {filteredPharmacies.length === 0 && (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900">Aucune pharmacie dans ce rayon</p>
              <p className="text-xs text-muted-foreground mt-1">Augmentez le rayon de recherche</p>
            </div>
          )}
        </>
      )}
    </div>
  )

  return (
    <div ref={containerRef} className="fixed inset-x-0 top-14 bottom-16 md:bottom-0 z-[5] overflow-hidden">
      {/* ═══ CARTE — occupe TOUTE la surface disponible ═══ */}
      {viewMode === 'map' && !loading && (
        <PharmacyMap
          pharmacies={mapPharmacies}
          userLatitude={userLat}
          userLongitude={userLng}
          selectedPharmacyId={selectedPharmacyId}
          onPharmacyClick={handlePharmacyClick}
          height="100%"
          className="absolute inset-0 rounded-none border-0"
        />
      )}
      {viewMode === 'map' && loading && (
        <Skeleton className="absolute inset-0 rounded-none" />
      )}
      {viewMode === 'list' && (
        <div className="absolute inset-0 bg-teal-50/40 md:hidden" />
      )}

      {/* ═══ Barre flottante haute : rayons + actions ═══ */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1 bg-white/95 backdrop-blur rounded-full shadow-lg pl-3 pr-2 py-1.5 overflow-x-auto custom-scrollbar-none max-w-[60%]">
          <Filter className="h-3 w-3 text-muted-foreground mr-0.5 shrink-0" />
          {radiusOptions.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRadius(r)}
              className={cn(
                'shrink-0 text-[11px] font-medium rounded-full px-2.5 py-1 transition-colors',
                selectedRadius === r
                  ? 'bg-primary text-white'
                  : 'text-teal-800 hover:bg-teal-50'
              )}
            >
              {r} km
            </button>
          ))}
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
              className="h-9 rounded-full shadow-lg bg-red-600 hover:bg-red-700 text-white px-3 text-xs font-semibold"
            >
              Urgence
            </Button>
          </Link>
        </div>
      </div>

      {/* ═══ Statuts flottants (erreur géoloc / filtre médicament) ═══ */}
      <div className="absolute top-[60px] left-3 z-20 flex flex-col gap-2 max-w-[70%]">
        {geoError && (
          <div className="bg-amber-50/95 backdrop-blur rounded-full pl-3 pr-2 py-1.5 text-xs text-amber-800 flex items-center gap-2 shadow-md">
            <Crosshair className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{geoError}</span>
            <button
              className="shrink-0 font-semibold text-[11px] text-amber-900 hover:underline"
              onClick={getUserLocation}
            >
              Réessayer
            </button>
          </div>
        )}
        {medicamentFilter && (
          <div className="bg-white/95 backdrop-blur rounded-full pl-3 pr-2 py-1.5 text-xs text-teal-800 flex items-center gap-2 shadow-md w-fit">
            <Badge className="text-[9px] bg-primary/10 text-primary border-0 px-1.5 py-0">DCI</Badge>
            <span className="truncate max-w-[140px]">Filtre médicament actif</span>
            <button
              className="shrink-0 hover:text-red-600"
              onClick={() => setMedicamentFilter(null)}
              aria-label="Retirer le filtre"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ═══ Boutons flottants bas : recentrer + basculer Carte/Liste ═══ */}
      <div className={cn(
        'absolute right-3 z-40 flex flex-col gap-2 transition-all',
        viewMode === 'map' ? 'bottom-[104px] md:bottom-4' : 'bottom-3',
        'md:left-3 md:right-auto'
      )}>
        {viewMode === 'map' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 bg-white/95 backdrop-blur rounded-full shadow-lg border-0 hover:bg-white"
            onClick={getUserLocation}
            aria-label="Recentrer sur ma position"
          >
            <Crosshair className="h-4 w-4 text-teal-800" />
          </Button>
        )}
        <Button
          size="sm"
          onClick={toggleViewMode}
          className="h-10 rounded-full shadow-lg bg-teal-800 hover:bg-teal-900 text-white px-4 text-xs font-semibold gap-1.5"
        >
          {viewMode === 'map' ? (
            <><List className="h-4 w-4" /> Liste</>
          ) : (
            <><MapPin className="h-4 w-4" /> Carte</>
          )}
        </Button>
      </div>

      {/* ═══ PANNEAU LISTE — desktop / tablette (panneau latéral droit) ═══ */}
      <aside
        className={cn(
          'hidden md:flex absolute top-0 right-0 bottom-0 z-30 bg-white/95 backdrop-blur-md shadow-[-8px_0_24px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out',
          viewMode === 'list'
            ? 'w-[min(560px,100%)]'
            : panelOpen ? 'w-[380px]' : 'w-0'
        )}
      >
        {(panelOpen || viewMode === 'list') && (
          <div className="flex flex-col h-full w-full">
            <div className="p-4 pb-3 border-b border-teal-100 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-teal-800">Pharmacies à proximité</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {loading ? 'Recherche…' : `${filteredPharmacies.length} pharmacie(s) dans un rayon de ${selectedRadius} km`}
                    {userLat && userLng && !geoError && ' • Position détectée'}
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
            </div>
            <div className="flex-1 min-h-0">{pharmacyList(true)}</div>
          </div>
        )}
      </aside>

      {/* Poignée d'ouverture du panneau desktop (quand fermé, mode carte) */}
      {viewMode === 'map' && !panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="hidden md:flex absolute top-1/2 -translate-y-1/2 right-0 z-30 bg-white/95 backdrop-blur rounded-l-xl shadow-lg px-1.5 py-6 items-center text-teal-800 hover:bg-white transition-colors"
          aria-label="Afficher la liste des pharmacies"
        >
          <ChevronLeftIcon />
        </button>
      )}

      {/* ═══ SHEET LISTE — mobile (bottom sheet repliable) ═══ */}
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
        animate={{ height: viewMode === 'list' ? Math.round(containerH * 0.9) : sheetHeights[sheetState] }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="md:hidden absolute bottom-0 inset-x-0 z-30 bg-white rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden"
        style={{ touchAction: 'pan-y' }}
      >
        {/* Poignée + header cliquable (cycle peek → half → full) */}
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
                {loading ? 'Recherche…' : `${filteredPharmacies.length} pharmacie(s)`}
                <span className="text-xs font-normal text-muted-foreground"> • {selectedRadius} km</span>
              </p>
              {sheetState === 'peek' && nearest && !loading && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  <MapPin className="h-3 w-3 inline mr-0.5 text-primary" />
                  {nearest.nom} — {nearest.distance.toFixed(1)} km{nearest.estGarde ? ' • De garde' : ''}
                </p>
              )}
            </div>
            {sheetState !== 'full' ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
          </div>
        </div>

        {/* Contenu : visible dès half (peek = header seul) */}
        {sheetState !== 'peek' && (
          <div className="flex-1 min-h-0 border-t border-teal-100">{pharmacyList(true)}</div>
        )}
      </motion.div>
    </div>
  )
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3L5 8l5 5" />
    </svg>
  )
}
