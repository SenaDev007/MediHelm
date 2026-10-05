'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { PharmacyCard } from '@/components/patient/pharmacy-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MapPin, List, Crosshair, Filter, RefreshCw, ChevronUp, ChevronDown, X, ChevronRight, LocateFixed } from 'lucide-react'
import { motion, useDragControls } from 'framer-motion'
import Link from 'next/link'
import { cn } from '@backend/lib/utils'
import { useUserPosition } from '@/hooks/use-user-position'
import { TravelPanel } from '@/components/patient/travel-panel'
import { haversineKm, type RouteInfo, type TravelMode } from '@backend/lib/travel'

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
  inscriteMediHelm?: boolean
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
  // ─── Garde du jour ───
  gardeHeureDebut?: string | null
  gardeHeureFin?: string | null
}

/** Rayon de la LISTE (km) — null = tout le Bénin. La carte montre toujours tout. */
const radiusOptions: Array<number | null> = [1, 3, 5, 10, 20, null]

type ViewMode = 'map' | 'list'
type SheetState = 'peek' | 'half' | 'full'

/** Hauteur du sheet mobile (en px, calculée depuis le conteneur réel) */
const PEEK_H = 92

export default function PharmaciesPage() {
  const { userLat, userLng, geoError, watching, request: getUserLocation, startWatching, stopWatching } = useUserPosition()

  const [pharmacies, setPharmacies] = useState<PharmacyResult[]>([])
  const [filteredPharmacies, setFilteredPharmacies] = useState<PharmacyResult[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [sheetState, setSheetState] = useState<SheetState>('peek')
  const [panelOpen, setPanelOpen] = useState(true)
  const [selectedRadius, setSelectedRadius] = useState<number | null>(10)
  const [medicamentFilter, setMedicamentFilter] = useState<string | null>(null)
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | undefined>()

  // ─── Itinéraire actif ───
  const [routeTarget, setRouteTarget] = useState<{ destLat: number; destLng: number; destNom: string } | null>(null)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [navMode, setNavMode] = useState(false)
  const [travelMode, setTravelMode] = useState<TravelMode>('voiture')

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

  // ─── Chargement : TOUTES les officines du Bénin (rayon national) ──────────
  const fetchPharmacies = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('radius', '5000') // tout le territoire — la carte affiche les 12 départements
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
            ? haversineKm({ lat: userLat, lng: userLng }, { lat: p.latitude, lng: p.longitude })
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

  // Filter by radius — LA LISTE uniquement (la carte montre tout le Bénin)
  useEffect(() => {
    const filtered = selectedRadius === null
      ? pharmacies
      : pharmacies.filter(p => p.distance <= selectedRadius)
    setFilteredPharmacies(filtered)
  }, [pharmacies, selectedRadius])

  const handleRefresh = () => {
    getUserLocation()
    fetchPharmacies()
  }

  // ─── Sélection + itinéraire ───────────────────────────────────────────────
  const selectPharmacy = useCallback((p: { id: string; nom: string; latitude: number | null; longitude: number | null }) => {
    setSelectedPharmacyId(p.id)
    if (p.latitude != null && p.longitude != null) {
      setRouteTarget({ destLat: p.latitude, destLng: p.longitude, destNom: p.nom })
    }
  }, [])

  // Clic sur un marqueur de la carte : sélection + itinéraire + replier le sheet
  const handlePharmacyClick = useCallback((id: string) => {
    const p = pharmacies.find(x => x.id === id)
    if (p) {
      selectPharmacy(p)
      if (viewMode === 'map') setSheetState('peek')
      const element = document.getElementById(`pharmacy-${id}`)
      if (element && (sheetState === 'half' || sheetState === 'full')) {
        setTimeout(() => element.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
      }
    }
  }, [pharmacies, selectPharmacy, viewMode, sheetState])

  /** Officine la plus proche de l'utilisateur */
  const goToNearest = useCallback(() => {
    if (pharmacies.length === 0) return
    if (userLat == null || userLng == null) {
      return
    }
    const nearest = pharmacies.find(p => p.latitude != null && p.longitude != null)
    if (nearest) selectPharmacy(nearest)
  }, [pharmacies, userLat, userLng, selectPharmacy])

  const toggleNavigation = useCallback(() => {
    if (navMode) {
      stopWatching()
      setNavMode(false)
    } else {
      setNavMode(true)
      startWatching()
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

  const selected = pharmacies.find(p => p.id === selectedPharmacyId)

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

  // ─── La CARTE affiche TOUTES les officines du Bénin (pas de filtre rayon) ──
  const mapPharmacies = useMemo(() => pharmacies.map(p => ({
    id: p.id,
    nom: p.nom,
    adresse: p.adresse,
    telephone: p.telephone,
    latitude: p.latitude,
    longitude: p.longitude,
    estGarde: p.estGarde,
    inscriteMediHelm: p.inscriteMediHelm,
    distance: p.distance,
    ville: p.ville,
    medicamentDispo: p.medicamentDispo,
    numeroAbmed: p.numeroAbmed,
    officielle: p.officielle ?? (p.numeroAbmed != null),
    departement: p.departement,
    zoneSanitaire: p.zoneSanitaire,
    commune: p.commune,
    arrondissement: p.arrondissement,
    localisation: p.localisation,
    gardeHeureDebut: p.gardeHeureDebut,
    gardeHeureFin: p.gardeHeureFin,
  })), [pharmacies])

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
                inscriteMediHelm={pharmacy.inscriteMediHelm}
                medicamentDispo={pharmacy.medicamentDispo}
                numeroAbmed={pharmacy.numeroAbmed}
                officielle={pharmacy.officielle ?? (pharmacy.numeroAbmed != null)}
                departement={pharmacy.departement}
                zoneSanitaire={pharmacy.zoneSanitaire}
                commune={pharmacy.commune}
                arrondissement={pharmacy.arrondissement}
                gardeHeureDebut={pharmacy.gardeHeureDebut}
                gardeHeureFin={pharmacy.gardeHeureFin}
                userLatitude={userLat}
                userLongitude={userLng}
                onSelect={() => selectPharmacy(pharmacy)}
              />
            </div>
          ))}
          {filteredPharmacies.length === 0 && (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900">Aucune pharmacie dans ce rayon</p>
              <p className="text-xs text-muted-foreground mt-1">Élargissez le rayon ou affichez tout le Bénin</p>
            </div>
          )}
        </>
      )}
    </div>
  )

  return (
    <div ref={containerRef} className="fixed inset-x-0 top-14 bottom-16 md:bottom-0 z-[5] overflow-hidden">
      {/* ═══ CARTE — occupe TOUTE la surface — TOUTES les officines du Bénin ═══ */}
      {viewMode === 'map' && (pharmacies.length > 0 || !loading) && (
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
      )}
      {viewMode === 'map' && loading && (
        <Skeleton className="absolute inset-0 rounded-none" />
      )}
      {viewMode === 'list' && (
        <div className="absolute inset-0 bg-teal-50/40 md:hidden" />
      )}

      {/* ═══ Barre flottante haute : rayons (liste) + actions ═══ */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1 bg-white/95 backdrop-blur rounded-full shadow-lg pl-3 pr-2 py-1.5 overflow-x-auto custom-scrollbar-none max-w-[62%]">
          <Filter className="h-3 w-3 text-muted-foreground mr-0.5 shrink-0" />
          {radiusOptions.map((r, idx) => (
            <button
              key={r === null ? `all-${idx}` : r}
              onClick={() => setSelectedRadius(r)}
              className={cn(
                'shrink-0 text-[11px] font-medium rounded-full px-2.5 py-1 transition-colors',
                selectedRadius === r
                  ? 'bg-primary text-white'
                  : 'text-teal-800 hover:bg-teal-50'
              )}
            >
              {r === null ? 'Tout le Bénin' : `${r} km`}
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
              onClick={() => getUserLocation()}
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

      {/* ═══ Boutons flottants bas : plus proche + recentrer + bascule ═══ */}
      <div className={cn(
        'absolute right-3 z-40 flex flex-col gap-2 transition-all',
        viewMode === 'map' ? 'bottom-[104px] md:bottom-4' : 'bottom-3',
        'md:left-3 md:right-auto'
      )}>
        {viewMode === 'map' && (
          <>
            <Button
              size="sm"
              className="h-10 rounded-full shadow-lg bg-primary hover:bg-teal-700 text-white px-3.5 text-xs font-semibold gap-1.5"
              onClick={goToNearest}
              disabled={userLat == null}
              title={userLat == null ? 'Activez votre localisation' : 'Pharmacie la plus proche'}
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
          {viewMode === 'map' ? (
            <><List className="h-4 w-4" /> Liste</>
          ) : (
            <><MapPin className="h-4 w-4" /> Carte</>
          )}
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
            'absolute md:right-[396px]',
            'left-3 right-3 md:left-auto md:w-[380px]',
            'bottom-[104px] md:bottom-4'
          )}
        />
      )}

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
                    {loading ? 'Recherche…' : selectedRadius === null
                      ? `${filteredPharmacies.length} officines — tout le Bénin`
                      : `${filteredPharmacies.length} pharmacie(s) dans un rayon de ${selectedRadius} km`}
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
                <span className="text-xs font-normal text-muted-foreground">
                  {' • '}{selectedRadius === null ? 'tout le Bénin' : `${selectedRadius} km`}
                </span>
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
