'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import MapGL, { Marker, Popup, NavigationControl, GeolocateControl, Source, Layer } from 'react-map-gl/maplibre'
import type { MapRef, LngLatBoundsLike } from 'react-map-gl/maplibre'
import SuperCluster from 'supercluster'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapPin, Phone, Navigation, ShieldCheck, Check, X, Clock, ExternalLink } from 'lucide-react'
import { buildDirectionsUrl, buildMapUrl } from '@/lib/directions'
import { formatPhoneBenin } from '@/lib/phone'
import { fetchRoute, type RouteInfo } from '@/lib/travel'
import { MAP_STYLE_URL, MAP_STYLE_FALLBACK_URL } from '@/lib/map-style'
import { cn } from '@/lib/utils'

/**
 * Carte géolocalisation PERSONNALISÉE MediHelm.
 *
 * - Fond de carte rethématisé aux couleurs de la marque (voir lib/map-style.ts,
 *   généré par scripts/build-medihelm-map-style.mjs) — même géographie OSM que
 *   Google Maps, zéro token.
 * - Pins officine dessinés sur mesure : écusson teal à croix de pharmacie,
 *   variante ambre pour la garde, état sélectionné pulsé.
 * - BADGE NOM : chaque pin est accompagné du nom de l'officine, visible en
 *   permanence (sans survol) — comme les labels Google Maps.
 * - SURVOL (PC) : la fiche complète s'affiche au passage du curseur et reste
 *   stable (délai de grâce 320 ms, survol de la fiche prolonge l'affichage) ;
 *   CLIC (PC & mobile) : la fiche reste ouverte avec les actions.
 * - La fiche s'affiche TOUJOURS AU-DESSUS du pin et la carte se décale pour
 *   qu'elle ne soit jamais masquée par la barre de navigation.
 * - CLUSTERS : le survol (PC) ou le tap (mobile) identifie le département —
 *   « Littoral (62) · Atlantique (19) ».
 * - ITINÉRAIRE : tracé routier réel OSRM (zéro token) vers la pharmacie
 *   choisie + suivi de l'utilisateur (mode « en route »).
 */

const MAP_STYLE = MAP_STYLE_URL // Style de marque MediHelm — auto-hébergé

/** Zoom au-delà duquel les badges nominatifs s'affichent sur tous les pins */
const LABEL_ZOOM = 8
/** Délai de grâce avant fermeture de la fiche de survol (ms) */
const HOVER_GRACE_MS = 320

export interface PharmacyMapPoint {
  id: string
  nom: string
  adresse: string
  telephone: string
  latitude: number | null
  longitude: number | null
  estGarde?: boolean
  distance?: number
  ville?: string
  medicamentDispo?: boolean
  // ─── Registre officiel ABMed (fiche complète de l'officine) ───
  numeroAbmed?: string | null
  officielle?: boolean
  departement?: string | null
  zoneSanitaire?: string | null
  commune?: string | null
  arrondissement?: string | null
  localisation?: string | null
  pharmacienTitulaire?: string | null
  // ─── Garde du jour (heures de la vacation) ───
  gardeHeureDebut?: string | null
  gardeHeureFin?: string | null
}

interface PharmacyMapProps {
  pharmacies: PharmacyMapPoint[]
  userLatitude?: number
  userLongitude?: number
  onPharmacyClick?: (pharmacyId: string) => void
  selectedPharmacyId?: string
  onBoundsChange?: (bounds: LngLatBoundsLike) => void
  height?: string
  className?: string
  showClusters?: boolean
  /** Destination d'itinéraire active — trace la route depuis l'utilisateur */
  route?: { destLat: number; destLng: number; destNom: string } | null
  /** Remonte l'itinéraire calculé (distance réelle, durée, tracé) */
  onRouteInfo?: (info: RouteInfo | null) => void
  /** Mode « en route » : la carte suit l'utilisateur et le marqueur pulse */
  navigation?: boolean
}

// ─── Pin officine MediHelm — écusson personnalisé + badge nominatif ─────────
function PharmacyMarker({
  nom,
  estGarde,
  isSelected,
  isDimmed,
  showLabel,
  onHover,
  onLeave,
  onClick,
}: {
  nom: string
  estGarde?: boolean
  isSelected?: boolean
  isDimmed?: boolean
  showLabel: boolean
  onHover: () => void
  onLeave: () => void
  onClick: () => void
}) {
  const size = isSelected ? 46 : 36
  const pinH = size + 14

  return (
    <button
      type="button"
      aria-label={nom}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      className="medihelm-pin group border-0 bg-transparent cursor-pointer p-0 block"
      style={{ width: size, height: pinH }}
    >
      <svg width={size} height={pinH} viewBox={`0 0 ${size} ${pinH}`} style={{ display: 'block' }}>
        <defs>
          {/* Dégradé de marque MediHelm */}
          <linearGradient id={`mh-grad-${size}-${estGarde ? 'garde' : 'std'}`} x1="0" y1="0" x2="1" y2="1">
            {estGarde ? (
              <>
                <stop offset="0%" stopColor="#F5B24B" />
                <stop offset="100%" stopColor="#D97E12" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#27B086" />
                <stop offset="100%" stopColor="#0F6E56" />
              </>
            )}
          </linearGradient>
        </defs>

        {/* Ombre portée au sol */}
        <ellipse cx={size / 2} cy={pinH - 2} rx={size * 0.24} ry={2.6} fill="rgba(15,110,86,0.25)" />

        {/* Tête de pin — goutte inversée arrondie */}
        <path
          d={`M${size / 2} ${pinH - 3}
              C ${size / 2 - 2.4} ${pinH - 3 - size * 0.42} ${size * 0.14} ${size * 0.86} ${size * 0.14} ${size * 0.5}
              C ${size * 0.14} ${size * 0.2} ${size * 0.34} 2 ${size / 2} 2
              C ${size * 0.66} 2 ${size * 0.86} ${size * 0.2} ${size * 0.86} ${size * 0.5}
              C ${size * 0.86} ${size * 0.86} ${size / 2 + 2.4} ${pinH - 3 - size * 0.42} ${size / 2} ${pinH - 3} Z`}
          fill={`url(#mh-grad-${size}-${estGarde ? 'garde' : 'std'})`}
          stroke="white"
          strokeWidth="2.4"
        />

        {/* Écusson intérieur */}
        <rect
          x={size / 2 - size * 0.21}
          y={size * 0.5 - size * 0.27}
          width={size * 0.42}
          height={size * 0.42}
          rx={size * 0.1}
          fill="rgba(255,255,255,0.92)"
        />

        {/* Croix pharmacie (brand MediHelm) */}
        <g transform={`translate(${size / 2}, ${size * 0.5 - size * 0.06})`} fill={estGarde ? '#D97E12' : '#0F6E56'}>
          <rect x={-size * 0.045} y={-size * 0.145} width={size * 0.09} height={size * 0.29} rx={size * 0.02} />
          <rect x={-size * 0.145} y={-size * 0.045} width={size * 0.29} height={size * 0.09} rx={size * 0.02} />
        </g>

        {/* Pastille « garde » — point ambre + halo */}
        {estGarde && (
          <>
            <circle cx={size - 4} cy={8} r={7} fill="#EF9F27" stroke="white" strokeWidth="2" />
            <circle cx={size - 4} cy={8} r={3.2} fill="white" />
          </>
        )}

        {/* Indisponible (recherche médicament) — pin estompé + pastille grise */}
        {isDimmed && (
          <>
            <circle cx={4} cy={size * 0.5} r={6.5} fill="#6B7280" stroke="white" strokeWidth="2" />
            <path d={`M1.4 ${size * 0.5} l5.2 -5.2 M1.4 ${size * 0.5} l5.2 5.2`} stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </>
        )}

        {/* Halo sélection — pulsation */}
        {isSelected && (
          <circle cx={size / 2} cy={size * 0.5 - size * 0.06} r={size * 0.44} fill="none" stroke="#1D9E75" strokeWidth="2.4" opacity="0.45">
            <animate attributeName="r" from={size * 0.36} to={size * 0.55} dur="1.1s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.5" to="0" dur="1.1s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>

      {/* Badge nominatif — toujours visible (sans survol), comme Google Maps */}
      {showLabel && (
        <span
          aria-hidden
          className="pointer-events-none absolute whitespace-nowrap max-w-[128px] truncate text-[10px] font-semibold leading-none px-1.5 py-[3px] rounded-md shadow-sm"
          style={{
            left: 'calc(100% + 3px)',
            top: 8,
            background: estGarde ? 'rgba(255,251,235,0.95)' : 'rgba(255,255,255,0.95)',
            color: estGarde ? '#92610A' : '#0B5B47',
            border: `1px solid ${estGarde ? 'rgba(217,126,18,0.55)' : 'rgba(15,110,86,0.35)'}`,
            backdropFilter: 'blur(2px)',
  }}
        >
          {nom}
        </span>
      )}
    </button>
  )
}

// ─── Cluster — pastille marque + identification du département ──────────────
function ClusterMarker({
  count,
  longitude,
  latitude,
  deptLabel,
  onClick,
  onHover,
  onLeave,
}: {
  count: number
  longitude: number
  latitude: number
  deptLabel: string | null
  onClick: () => void
  onHover: () => void
  onLeave: () => void
}) {
  const size = count < 10 ? 44 : count < 50 ? 56 : 68
  const [hovered, setHovered] = useState(false)

  return (
    <Marker longitude={longitude} latitude={latitude} anchor="center">
      <div className="relative">
        <button
          type="button"
          onClick={onClick}
          onMouseEnter={() => { setHovered(true); onHover() }}
          onMouseLeave={() => { setHovered(false); onLeave() }}
          onFocus={() => { setHovered(true); onHover() }}
          onBlur={() => { setHovered(false); onLeave() }}
          aria-label={`${count} pharmacies — ${deptLabel ?? ''} — zoomer`}
          className="border-0 bg-transparent cursor-pointer p-0"
          style={{ width: size, height: size }}
        >
          <div
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #27B086 0%, #0F6E56 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: size < 50 ? 14 : 18,
              border: '3px solid white',
              boxShadow: '0 3px 14px rgba(15,110,86,0.45)',
            }}
          >
            {count}
          </div>
        </button>

        {/* Étiquette département — survol PC */}
        {deptLabel && (
          <div
            className={cn(
              'pointer-events-none absolute left-1/2 -translate-x-1/2 z-10 whitespace-nowrap transition-all duration-150',
              hovered ? 'opacity-100 -translate-y-1' : 'opacity-0 translate-y-0'
            )}
            style={{ bottom: 'calc(100% + 8px)' }}
          >
            <div
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-teal-900 shadow-lg"
              style={{ background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(15,110,86,0.35)' }}
            >
              {deptLabel}
              <div className="text-[9px] font-medium text-teal-600">{count} officines</div>
            </div>
          </div>
        )}
      </div>
    </Marker>
  )
}

// ─── Fiche officine « holographique » (contenu popup — Lucide, zéro emoji) ──
function PharmacyCard({
  p,
  userLatitude,
  userLongitude,
  interactive,
  onEnter,
  onLeave,
}: {
  p: PharmacyMapPoint
  userLatitude?: number
  userLongitude?: number
  interactive: boolean
  onEnter?: () => void
  onLeave?: () => void
}) {
  const phone = formatPhoneBenin(p.telephone)

  return (
    <div
      style={{
        minWidth: 236,
        maxWidth: 286,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: 0,
        borderRadius: 12,
        overflow: 'hidden',
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* Bandeau marque */}
      <div
        style={{
          background: p.estGarde
            ? 'linear-gradient(135deg, #F5B24B 0%, #D97E12 100%)'
            : 'linear-gradient(135deg, #27B086 0%, #0F6E56 100%)',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width={16} height={16} viewBox="0 0 16 16" fill="white">
            <rect x={6} y={2} width={4} height={12} rx={1} />
            <rect x={2} y={6} width={12} height={4} rx={1} />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.nom}
          </div>
          {p.estGarde ? (
            <div style={{ fontSize: 10, color: '#FFF3D6', fontWeight: 700, marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
              <ShieldCheck size={11} strokeWidth={2.4} />
              Pharmacie de garde
            </div>
          ) : p.officielle ? (
            <div style={{ fontSize: 10, color: '#CFF5E8', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
              <svg width={9} height={9} viewBox="0 0 12 12" fill="#7BE3C0">
                <path d="M4.5 8.6 1.4 5.5l1.1-1.1 2 2 4-4L9.6 3.5z" />
              </svg>
              Officine agréée ABMed{p.numeroAbmed ? ` · ${p.numeroAbmed}` : ''}
            </div>
          ) : null}
        </div>
      </div>

      {/* Corps — informations de l'officine */}
      <div style={{ padding: '8px 12px 10px' }}>
        {/* Localisation / adresse */}
        <div style={{ fontSize: 12, color: '#4B5563', display: 'flex', alignItems: 'flex-start', gap: 5, lineHeight: 1.3 }}>
          <MapPin size={13} style={{ flexShrink: 0, marginTop: 1, color: '#0F6E56' }} />
          <span>{p.adresse}{p.ville ? `, ${p.ville}` : ''}</span>
        </div>

        {/* Département · Zone sanitaire · Commune · Arrondissement */}
        {(p.departement || p.zoneSanitaire || p.commune || p.arrondissement) && (
          <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {p.departement && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#0F6E56', background: '#E1F5EE', padding: '2px 7px', borderRadius: 8 }}>
                {p.departement}
              </span>
            )}
            {p.commune && (
              <span style={{ fontSize: 10, fontWeight: 600, color: '#1D9E75', background: '#F0FAF6', padding: '2px 7px', borderRadius: 8, border: '1px solid #CBEADD' }}>
                {p.commune}
              </span>
            )}
            {p.zoneSanitaire && (
              <span style={{ fontSize: 10, fontWeight: 600, color: '#5B4A12', background: '#FDF3E0', padding: '2px 7px', borderRadius: 8 }}>
                ZS {p.zoneSanitaire}
              </span>
            )}
            {p.arrondissement && (
              <span style={{ fontSize: 10, fontWeight: 500, color: '#6B7280', background: '#F3F4F6', padding: '2px 7px', borderRadius: 8 }}>
                {p.arrondissement}
              </span>
            )}
          </div>
        )}

        {/* Statut de garde du jour + horaires de la vacation */}
        {p.estGarde && (
          <div style={{
            marginTop: 6, display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 8px', borderRadius: 8, alignSelf: 'flex-start', width: 'fit-content',
            background: '#FDF3E0', border: '1px solid rgba(217,126,18,0.4)',
            color: '#92610A', fontSize: 11, fontWeight: 700,
          }}>
            <Clock size={12} style={{ flexShrink: 0 }} />
            De garde aujourd&apos;hui{(p.gardeHeureDebut && p.gardeHeureFin) ? ` · ${p.gardeHeureDebut} — ${p.gardeHeureFin}` : ''}
          </div>
        )}

        {/* Téléphone de l'officine — format béninois 01 … */}
        {phone ? (
          <a
            href={`tel:${phone.tel}`}
            style={{ fontSize: 12, color: '#0F6E56', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontWeight: 500 }}
          >
            <Phone size={13} style={{ flexShrink: 0 }} />
            {phone.display}
          </a>
        ) : (
          <div style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
            <Phone size={13} style={{ flexShrink: 0 }} />
            Non publié
          </div>
        )}

        {p.distance !== undefined && (
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#0F6E56',
              background: '#E1F5EE',
              padding: '2px 8px',
              borderRadius: 10,
            }}>
              {p.distance.toFixed(1)} km
            </span>
          </div>
        )}

        {p.medicamentDispo !== undefined && (
          <div style={{
            fontSize: 11, marginTop: 4, padding: '2px 8px', borderRadius: 10,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: p.medicamentDispo ? '#dcfce7' : '#fef2f2',
            color: p.medicamentDispo ? '#166534' : '#991b1b',
            fontWeight: 600,
          }}>
            {p.medicamentDispo ? <Check size={11} /> : <X size={11} />}
            {p.medicamentDispo ? 'Médicament disponible' : 'Indisponible'}
          </div>
        )}

        {interactive && (
          <>
            {/* Actions */}
            <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
              {phone ? (
                <a
                  href={`tel:${phone.tel}`}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    background: 'linear-gradient(135deg, #27B086 0%, #0F6E56 100%)',
                    color: 'white',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontSize: 11,
                    fontWeight: 600,
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  <Phone size={12} />
                  Appeler
                </a>
              ) : <div style={{ flex: 1 }} />}
              <a
                href={buildDirectionsUrl({
                  destLat: p.latitude!,
                  destLng: p.longitude!,
                  destName: p.nom,
                  originLat: userLatitude,
                  originLng: userLongitude,
                })}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  padding: '6px 0',
                  background: 'white',
                  color: '#0F6E56',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  textAlign: 'center',
                  border: '1.5px solid #1D9E75',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <Navigation size={12} />
                Itinéraire
              </a>
            </div>

            {/* Mêmes coordonnées que Google Maps */}
            <a
              href={buildMapUrl(p.latitude!, p.longitude!, `${p.nom} ${p.ville || ''} Bénin`)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                marginTop: 6,
                fontSize: 10,
                color: '#6B7280',
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={10} />
              Voir sur Google Maps
            </a>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Bandeau d'identification de zone (tap cluster mobile) ─────────────────
function ZoneBanner({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-30 max-w-[92%]">
      <div
        className="rounded-full pl-3 pr-3.5 py-1.5 text-[11px] font-semibold text-teal-900 shadow-lg flex items-center gap-1.5"
        style={{ background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(15,110,86,0.35)' }}
      >
        <MapPin size={12} className="text-primary shrink-0" />
        <span className="truncate">{label}</span>
      </div>
    </div>
  )
}

export default function PharmacyMap({
  pharmacies,
  userLatitude,
  userLongitude,
  onPharmacyClick,
  selectedPharmacyId,
  onBoundsChange,
  height = '400px',
  className,
  showClusters = true,
  route,
  onRouteInfo,
  navigation = false,
}: PharmacyMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [viewState, setViewState] = useState({
    longitude: userLongitude || 2.3912,
    latitude: userLatitude || 6.3703,
    zoom: userLatitude ? 14 : 7,
  })
  // Fiche persistante (clic / tap — mobile & PC)
  const [popupInfo, setPopupInfo] = useState<PharmacyMapPoint | null>(null)
  // Fiche éphémère (survol PC — stable grâce au délai de grâce)
  const [hoverInfo, setHoverInfo] = useState<PharmacyMapPoint | null>(null)
  const [styleFailed, setStyleFailed] = useState(false)
  const [routeData, setRouteData] = useState<RouteInfo | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [zoneBanner, setZoneBanner] = useState<string | null>(null)
  const [clusters, setClusters] = useState<Array<{
    id?: number
    properties: { cluster?: boolean; pharmacyId?: string; point_count?: number }
    geometry: { coordinates: [number, number] }
  }>>([])

  const superclusterRef = useRef<SuperCluster | null>(null)
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const zoneBannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  const points = useMemo(() =>
    pharmacies
      .filter(p => p.latitude && p.longitude)
      .map(p => ({
        type: 'Feature' as const,
        properties: {
          cluster: false,
          pharmacyId: p.id,
          nom: p.nom,
          adresse: p.adresse,
          telephone: p.telephone,
          estGarde: p.estGarde || false,
          distance: p.distance,
          ville: p.ville,
          medicamentDispo: p.medicamentDispo,
          departement: p.departement ?? null,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [p.longitude!, p.latitude!] as [number, number],
        },
      })),
    [pharmacies]
  )

  // Initialize supercluster
  useEffect(() => {
    if (!showClusters) return
    const sc = new SuperCluster({
      radius: 50,
      maxZoom: 16,
      map: (props) => ({ count: 1 }),
      reduce: (acc, props) => { acc.count += props.count },
    })
    sc.load(points)
    superclusterRef.current = sc
  }, [points, showClusters])

  /** Départements couverts par un cluster (libellé d'identification de zone) */
  const clusterDeptLabel = useCallback((clusterId: number, count: number): string | null => {
    const sc = superclusterRef.current
    if (!sc) return null
    try {
      const leaves = sc.getLeaves(clusterId, Math.max(count, 200)) as Array<{ properties: { departement?: string | null } }>
      if (!Array.isArray(leaves) || leaves.length === 0) return null
      const counts = new Map<string, number>()
      leaves.forEach(leaf => {
        const d = leaf?.properties?.departement
        if (d) counts.set(d, (counts.get(d) || 0) + 1)
      })
      if (counts.size === 0) return null
      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([d, c]) => `${d} (${c})`)
        .join(' · ')
    } catch {
      return null
    }
  }, [])

  // Update clusters when view changes
  const updateClusters = useCallback(() => {
    if (!showClusters || !superclusterRef.current || !mapRef.current) return
    const map = mapRef.current.getMap()
    const bounds = map.getBounds()
    if (!bounds) return
    const zoom = Math.floor(map.getZoom())

    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ]

    const newClusters = superclusterRef.current.getClusters(bbox, zoom)
    setClusters(newClusters as unknown as Array<{
      id?: number
      properties: { cluster?: boolean; pharmacyId?: string; point_count?: number }
      geometry: { coordinates: [number, number] }
    }>)
  }, [showClusters])

  // ─── Cadrage automatique : TOUT le Bénin + position utilisateur ───────────
  // Le fitBounds ne peut s'exécuter que sur une carte CHARGÉE (sinon il est
  // perdu au démarrage et la vue reste bloquée sur le zoom initial 14).
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (!mapReady) return
    const validPharmacies = pharmacies.filter(p => p.latitude && p.longitude)
    if (validPharmacies.length === 0 || !mapRef.current) return

    const bounds: [number, number, number, number] = [
      Math.min(...validPharmacies.map(p => p.longitude!)),
      Math.min(...validPharmacies.map(p => p.latitude!)),
      Math.max(...validPharmacies.map(p => p.longitude!)),
      Math.max(...validPharmacies.map(p => p.latitude!)),
    ]

    if (userLatitude && userLongitude) {
      bounds[0] = Math.min(bounds[0], userLongitude)
      bounds[1] = Math.min(bounds[1], userLatitude)
      bounds[2] = Math.max(bounds[2], userLongitude)
      bounds[3] = Math.max(bounds[3], userLatitude)
    }

    mapRef.current.fitBounds(bounds as LngLatBoundsLike, { padding: 60, maxZoom: 15 })
  }, [mapReady, pharmacies, userLatitude, userLongitude])

  /**
   * Ouvre la fiche d'une officine et décale la carte vers le bas pour que la
   * fiche holographique (affichée AU-DESSUS du pin) reste entièrement visible
   * — jamais masquée par la barre de navigation ni le sheet mobile.
   */
  const openPharmacyCard = useCallback((p: PharmacyMapPoint, opts?: { fly?: boolean }) => {
    setPopupInfo(p)
    if (p.latitude && p.longitude && mapRef.current) {
      const containerH = mapContainerRef.current?.clientHeight ?? 600
      mapRef.current.easeTo({
        center: [p.longitude, p.latitude],
        offset: [0, -Math.round(containerH * 0.13)],
        duration: opts?.fly ? 800 : 420,
      })
    }
  }, [])

  // Recentre la carte sur la pharmacie sélectionnée (depuis la liste)
  useEffect(() => {
    if (!selectedPharmacyId || !mapRef.current) return
    const target = pharmacies.find(p => p.id === selectedPharmacyId)
    if (target?.latitude && target?.longitude) {
      openPharmacyCard(target, { fly: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPharmacyId])

  // ─── Itinéraire actif : tracé OSRM depuis la position utilisateur ─────────
  const userPosRef = useRef<{ lat: number; lng: number } | null>(null)
  userPosRef.current = userLatitude !== undefined && userLongitude !== undefined
    ? { lat: userLatitude, lng: userLongitude }
    : userPosRef.current

  const routeKey = route ? `${route.destLat.toFixed(6)},${route.destLng.toFixed(6)}` : null

  useEffect(() => {
    if (!route) {
      setRouteData(null)
      onRouteInfo?.(null)
      return
    }
    const origin = userPosRef.current
    if (!origin) {
      setRouteData(null)
      onRouteInfo?.(null)
      return
    }

    let cancelled = false
    setRouteLoading(true)
    fetchRoute(origin, { lat: route.destLat, lng: route.destLng }).then((info) => {
      if (cancelled) return
      setRouteData(info)
      setRouteLoading(false)
      onRouteInfo?.(info)
      // Cadrer l'itinéraire entier
      if (mapRef.current && info.coords.length >= 2) {
        const lngs = info.coords.map(c => c[0])
        const lats = info.coords.map(c => c[1])
        mapRef.current.fitBounds(
          [
            Math.min(...lngs), Math.min(...lats),
            Math.max(...lngs), Math.max(...lats),
          ] as LngLatBoundsLike,
          { padding: 70, maxZoom: 14, duration: 900 }
        )
      }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey])

  // ─── Mode « en route » : la carte suit l'utilisateur ──────────────────────
  useEffect(() => {
    if (!navigation || !userLatitude || !userLongitude || !mapRef.current) return
    const map = mapRef.current.getMap()
    mapRef.current.easeTo({
      center: [userLongitude, userLatitude],
      zoom: Math.max(map.getZoom(), 14.5),
      duration: 900,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, userLatitude, userLongitude])

  // Nettoyage des minuteurs
  useEffect(() => () => {
    if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current)
    if (zoneBannerTimer.current) clearTimeout(zoneBannerTimer.current)
  }, [])

  // ─── Fiche de survol : délai de grâce + maintien au survol de la fiche ────
  const cancelHoverClose = useCallback(() => {
    if (hoverCloseTimer.current) {
      clearTimeout(hoverCloseTimer.current)
      hoverCloseTimer.current = null
    }
  }, [])

  const scheduleHoverClose = useCallback(() => {
    cancelHoverClose()
    hoverCloseTimer.current = setTimeout(() => setHoverInfo(null), HOVER_GRACE_MS)
  }, [cancelHoverClose])

  const handleMove = useCallback((evt: { viewState: typeof viewState }) => {
    setViewState(evt.viewState)
    updateClusters()
    if (onBoundsChange && mapRef.current) {
      const map = mapRef.current.getMap()
      const b = map.getBounds()
      if (!b) return
      onBoundsChange([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()])
    }
  }, [updateClusters, onBoundsChange])

  const handleClusterClick = useCallback((clusterId: number | undefined, idx: number, lng: number, lat: number) => {
    // Identification de la zone (mobile : tap = « où suis-je ? »)
    const count = clusters[idx]?.properties?.point_count
    const label = clusterId !== undefined && count
      ? clusterDeptLabel(clusterId, count)
      : null
    if (label) {
      setZoneBanner(label)
      if (zoneBannerTimer.current) clearTimeout(zoneBannerTimer.current)
      zoneBannerTimer.current = setTimeout(() => setZoneBanner(null), 2600)
    }
    // Expansion du cluster
    if (clusterId !== undefined && superclusterRef.current) {
      const zoom = superclusterRef.current.getClusterExpansionZoom(clusterId)
      mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 500 })
    } else {
      mapRef.current?.flyTo({ center: [lng, lat], zoom: viewState.zoom + 2, duration: 500 })
    }
  }, [clusters, clusterDeptLabel, viewState.zoom])

  const handleMapLoad = useCallback(() => {
    setMapReady(true)
    updateClusters()
  }, [updateClusters])

  // Le style de marque local n'a pas pu charger → repli CDN Voyager
  const handleMapError = useCallback(() => {
    setStyleFailed((prev) => (prev ? prev : true))
  }, [])

  // Fiche affichée : priorité au survol (PC), sinon la fiche cliquée
  const activeInfo = hoverInfo ?? popupInfo
  const isFromHover = hoverInfo !== null

  // Separate individual pharmacies from clusters
  const displayItems = useMemo(() => {
    if (!showClusters) {
      return pharmacies.filter(p => p.latitude && p.longitude).map(p => ({ type: 'pharmacy' as const, pharmacy: p }))
    }
    return clusters.map((c, idx) => {
      if (c.properties.cluster) {
        return { type: 'cluster' as const, count: c.properties.point_count || 0, lng: c.geometry.coordinates[0], lat: c.geometry.coordinates[1], idx, clusterId: c.id }
      }
      const pharmacy = pharmacies.find(p => p.id === c.properties.pharmacyId)
      return pharmacy ? { type: 'pharmacy' as const, pharmacy } : null
    }).filter(Boolean) as Array<
      { type: 'pharmacy'; pharmacy: PharmacyMapPoint }
      | { type: 'cluster'; count: number; lng: number; lat: number; idx: number; clusterId: number | undefined }
    >
  }, [clusters, pharmacies, showClusters])

  const currentZoom = viewState.zoom

  return (
    <div
      ref={mapContainerRef}
      className={cn('relative w-full overflow-hidden', className ?? 'rounded-xl border border-teal-200')}
      style={{ height }}
    >
      <MapGL
        ref={mapRef}
        {...viewState}
        onMove={handleMove}
        onLoad={handleMapLoad}
        onError={handleMapError}
        mapStyle={styleFailed ? MAP_STYLE_FALLBACK_URL : MAP_STYLE}
        scrollZoom
        attributionControl={{ compact: true }}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl
          position="top-left"
          trackUserLocation
          showAccuracyCircle
        />

        {/* Itinéraire actif — tracé routier réel (OSRM) */}
        {routeData && routeData.coords.length >= 2 && (
          <Source
            id="mh-route"
            type="geojson"
            data={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: routeData.coords },
            }}
          >
            <Layer
              id="mh-route-casing"
              type="line"
              paint={{
                'line-color': routeData.exact ? '#0F6E56' : '#6B7280',
                'line-width': 9,
                'line-opacity': 0.22,
              }}
            />
            <Layer
              id="mh-route-line"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{
                'line-color': routeData.exact ? '#1D9E75' : '#6B7280',
                'line-width': 4,
                ...(routeData.exact ? {} : { 'line-dasharray': [2, 2] }),
              }}
            />
          </Source>
        )}

        {/* Position utilisateur — pastille bleu MediHelm pulsée */}
        {userLatitude && userLongitude && (
          <Marker longitude={userLongitude} latitude={userLatitude} anchor="center">
            <div className="relative">
              <div className={cn(
                'rounded-full border-[3px] border-white shadow-lg flex items-center justify-center',
                navigation ? 'w-8 h-8 bg-[#378ADD]' : 'w-7 h-7 bg-[#378ADD]'
              )}>
                {navigation ? (
                  <Navigation size={14} className="text-white" strokeWidth={2.4} />
                ) : (
                  <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                    <circle cx={6} cy={6} r={3} fill="white" opacity="0.8" />
                  </svg>
                )}
              </div>
              <div className={cn(
                'absolute rounded-full border-2 border-[#378ADD] opacity-40 animate-ping',
                navigation ? '-top-2.5 -left-2.5 w-12 h-12' : '-top-2 -left-2 w-11 h-11'
              )} />
            </div>
          </Marker>
        )}

        {/* Marqueurs & clusters */}
        {displayItems.map((item) => {
          if (item.type === 'cluster') {
            return (
              <ClusterMarker
                key={`cluster-${item.idx}`}
                count={item.count}
                longitude={item.lng}
                latitude={item.lat}
                deptLabel={item.clusterId !== undefined ? clusterDeptLabel(item.clusterId, item.count) : null}
                onClick={() => handleClusterClick(item.clusterId, item.idx, item.lng, item.lat)}
                onHover={() => {}}
                onLeave={() => {}}
              />
            )
          }

          const p = item.pharmacy
          if (!p.latitude || !p.longitude) return null

          const isHovered = hoverInfo?.id === p.id
          const isSelected = selectedPharmacyId === p.id
          // Badge nominatif : toujours visible pour la garde / sélection /
          // survol ; pour les autres dès que le zoom sépare les officines.
          const showLabel = p.estGarde || isSelected || isHovered || currentZoom >= LABEL_ZOOM

          return (
            <Marker
              key={p.id}
              longitude={p.longitude}
              latitude={p.latitude}
              anchor="bottom"
            >
              <PharmacyMarker
                nom={p.nom}
                estGarde={p.estGarde}
                isSelected={isSelected}
                isDimmed={p.medicamentDispo === false}
                showLabel={showLabel}
                onHover={() => {
                  cancelHoverClose()
                  setHoverInfo(p)
                }}
                onLeave={scheduleHoverClose}
                onClick={() => {
                  onPharmacyClick?.(p.id)
                  setHoverInfo(null)
                  openPharmacyCard(p)
                }}
              />
            </Marker>
          )
        })}

        {/* Fiche officine — survol (PC) OU clic (mobile & PC) — TOUJOURS AU-DESSUS du pin */}
        {activeInfo && activeInfo.latitude && activeInfo.longitude && (
          <Popup
            longitude={activeInfo.longitude}
            latitude={activeInfo.latitude}
            anchor="bottom"
            offset={[0, -50] as [number, number]}
            closeOnClick={false}
            closeButton={!isFromHover}
            onClose={() => setPopupInfo(null)}
            className="medihelm-popup"
            style={{ zIndex: 30 }}
          >
            <PharmacyCard
              p={activeInfo}
              userLatitude={userLatitude}
              userLongitude={userLongitude}
              interactive={!isFromHover}
              onEnter={isFromHover ? cancelHoverClose : undefined}
              onLeave={isFromHover ? scheduleHoverClose : undefined}
            />
          </Popup>
        )}
      </MapGL>

      {/* Bandeau d'identification de zone (tap sur un cluster — mobile) */}
      {zoneBanner && <ZoneBanner label={zoneBanner} />}

      {/* Chargement de l'itinéraire */}
      {routeLoading && (
        <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-30">
          <div className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-teal-900 shadow-lg flex items-center gap-1.5"
            style={{ background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(15,110,86,0.35)' }}>
            <Navigation size={12} className="text-primary animate-pulse" />
            Calcul de l&apos;itinéraire…
          </div>
        </div>
      )}

      {/* Signature de marque — badge discret en bas à gauche */}
      <div className="pointer-events-none absolute bottom-2 left-2 z-10">
        <div
          className="flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 shadow-sm backdrop-blur-sm"
          style={{ border: '1px solid rgba(15,110,86,0.18)' }}
        >
          <svg width={12} height={12} viewBox="0 0 12 12" fill="#0F6E56">
            <rect x={4.5} y={1} width={3} height={10} rx={0.8} />
            <rect x={1} y={4.5} width={10} height={3} rx={0.8} />
          </svg>
          <span className="text-[10px] font-semibold tracking-wide text-[#0F6E56]">
            Carte MediHelm
          </span>
        </div>
      </div>
    </div>
  )
}
