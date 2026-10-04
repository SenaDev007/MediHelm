'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl/maplibre'
import type { MapRef, LngLatBoundsLike } from 'react-map-gl/maplibre'
import SuperCluster from 'supercluster'
import 'maplibre-gl/dist/maplibre-gl.css'
import { buildDirectionsUrl, buildMapUrl } from '@/lib/directions'
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
 * - SURVOL (PC) : la fiche complète de l'officine s'affiche au passage du
 *   curseur ; CLIC (PC & mobile) : la fiche reste ouverte avec les actions.
 */

const MAP_STYLE = MAP_STYLE_URL // Style de marque MediHelm — auto-hébergé

interface PharmacyMapProps {
  pharmacies: Array<{
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
  }>
  userLatitude?: number
  userLongitude?: number
  onPharmacyClick?: (pharmacyId: string) => void
  selectedPharmacyId?: string
  onBoundsChange?: (bounds: LngLatBoundsLike) => void
  height?: string
  className?: string
  showClusters?: boolean
}

// ─── Pin officine MediHelm — écusson personnalisé ────────────────────────────
function PharmacyMarker({
  nom,
  estGarde,
  isSelected,
  isDimmed,
  onHover,
  onLeave,
  onClick,
}: {
  nom: string
  estGarde?: boolean
  isSelected?: boolean
  isDimmed?: boolean
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
      <svg width={size} height={pinH} viewBox={`0 0 ${size} ${pinH}`}>
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

        {/* Croix pharmacie ✚ (brand MediHelm) */}
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
            <path d={`M1.4 ${size * 0.5} l5.2 -5.2 M1.4 ${size * 0.5} l5.2 5.2`} transform={`translate(0 ${-size * 0.5 + size * 0.5})`} stroke="white" strokeWidth="1.8" strokeLinecap="round" />
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
    </button>
  )
}

// ─── Cluster — pastille marque avec croix ────────────────────────────────────
function ClusterMarker({ count, longitude, latitude, onClick }: {
  count: number
  longitude: number
  latitude: number
  onClick: () => void
}) {
  const size = count < 10 ? 44 : count < 50 ? 56 : 68

  return (
    <Marker longitude={longitude} latitude={latitude} anchor="center">
      <button
        type="button"
        onClick={onClick}
        aria-label={`${count} pharmacies — zoomer`}
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
    </Marker>
  )
}

// ─── Fiche officine (contenu popup) ──────────────────────────────────────────
function PharmacyCard({
  p,
  userLatitude,
  userLongitude,
  interactive,
}: {
  p: NonNullable<PharmacyMapProps['pharmacies'][0]>
  userLatitude?: number
  userLongitude?: number
  interactive: boolean
}) {
  return (
    <div style={{
      minWidth: 240,
      maxWidth: 282,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: 0,
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Bandeau marque */}
      <div style={{
        background: 'linear-gradient(135deg, #27B086 0%, #0F6E56 100%)',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
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
            <div style={{ fontSize: 10, color: '#FFD98A', fontWeight: 600, marginTop: 1 }}>
              ⭐ Pharmacie de garde
            </div>
          ) : p.officielle ? (
            <div style={{ fontSize: 10, color: '#CFF5E8', fontWeight: 600, marginTop: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
              <svg width={9} height={9} viewBox="0 0 12 12" fill="#7BE3C0">
                <path d="M4.5 8.6 1.4 5.5l1.1-1.1 2 2 4-4L9.6 3.5z" />
              </svg>
              Officine agréée ABMed{p.numeroAbmed ? ` · ${p.numeroAbmed}` : ''}
            </div>
          ) : null}
        </div>
      </div>

      {/* Corps — informations complètes de l'officine (registre ABMed) */}
      <div style={{ padding: '8px 12px 10px' }}>
        {/* Localisation / adresse */}
        <div style={{ fontSize: 12, color: '#4B5563', display: 'flex', alignItems: 'flex-start', gap: 4, lineHeight: 1.3 }}>
          <span style={{ flexShrink: 0, marginTop: 1 }}>📍</span>
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

        {/* Pharmacien titulaire (registre officiel) */}
        {p.pharmacienTitulaire && (
          <div style={{ marginTop: 5, fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4, lineHeight: 1.3 }}>
            <span style={{ flexShrink: 0 }}>🧑‍⚕️</span>
            <span>Titulaire : <strong style={{ color: '#374151', fontWeight: 600 }}>{p.pharmacienTitulaire}</strong></span>
          </div>
        )}

        <a
          href={`tel:${p.telephone}`}
          style={{ fontSize: 12, color: '#0F6E56', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginTop: 5, fontWeight: 500 }}
        >
          📞 {p.telephone}
        </a>

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
            display: 'inline-block',
            background: p.medicamentDispo ? '#dcfce7' : '#fef2f2',
            color: p.medicamentDispo ? '#166534' : '#991b1b',
            fontWeight: 600,
          }}>
            {p.medicamentDispo ? '✓ Médicament disponible' : '✗ Indisponible'}
          </div>
        )}

        {interactive && (
          <>
            {/* Actions */}
            <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
              <a
                href={`tel:${p.telephone}`}
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
                  display: 'block',
                }}
              >
                📞 Appeler
              </a>
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
                  display: 'block',
                }}
              >
                🧭 Itinéraire
              </a>
            </div>

            {/* Mêmes coordonnées que Google Maps */}
            <a
              href={buildMapUrl(p.latitude!, p.longitude!, `${p.nom} ${p.ville || ''} Bénin`)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                marginTop: 6,
                fontSize: 10,
                color: '#6B7280',
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              Voir sur Google Maps →
            </a>
          </>
        )}
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
}: PharmacyMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [viewState, setViewState] = useState({
    longitude: userLongitude || 2.3912,
    latitude: userLatitude || 6.3703,
    zoom: userLatitude ? 14 : 7,
  })
  // Fiche persistante (clic / tap — mobile & PC)
  const [popupInfo, setPopupInfo] = useState<PharmacyMapProps['pharmacies'][0] | null>(null)
  // Fiche éphémère (survol PC — affiche TOUTES les infos au passage du curseur)
  const [hoverInfo, setHoverInfo] = useState<PharmacyMapProps['pharmacies'][0] | null>(null)
  const [styleFailed, setStyleFailed] = useState(false)
  const [clusters, setClusters] = useState<Array<{
    properties: { cluster?: boolean; pharmacyId?: string; point_count?: number }
    geometry: { coordinates: [number, number] }
  }>>([])

  const superclusterRef = useRef<SuperCluster | null>(null)
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
      properties: { cluster?: boolean; pharmacyId?: string; point_count?: number }
      geometry: { coordinates: [number, number] }
    }>)
  }, [showClusters])

  // Auto-fit bounds on pharmacies change
  useEffect(() => {
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
  }, [pharmacies, userLatitude, userLongitude])

  // Recentre la carte sur la pharmacie sélectionnée (depuis la liste)
  useEffect(() => {
    if (!selectedPharmacyId || !mapRef.current) return
    const target = pharmacies.find(p => p.id === selectedPharmacyId)
    if (target?.latitude && target?.longitude) {
      mapRef.current.flyTo({ center: [target.longitude, target.latitude], zoom: 15, duration: 800 })
      setPopupInfo(target)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPharmacyId])

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

  const handleClusterClick = useCallback((clusterId: number, lng: number, lat: number) => {
    if (!superclusterRef.current) return
    const zoom = superclusterRef.current.getClusterExpansionZoom(clusterId)
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 500 })
  }, [])

  const handleMapLoad = useCallback(() => {
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
    return clusters.map(c => {
      if (c.properties.cluster) {
        return { type: 'cluster' as const, count: c.properties.point_count || 0, lng: c.geometry.coordinates[0], lat: c.geometry.coordinates[1], id: 0 }
      }
      const pharmacy = pharmacies.find(p => p.id === c.properties.pharmacyId)
      return pharmacy ? { type: 'pharmacy' as const, pharmacy } : null
    }).filter(Boolean) as Array<{ type: 'pharmacy'; pharmacy: PharmacyMapProps['pharmacies'][0] } | { type: 'cluster'; count: number; lng: number; lat: number; id: number }>
  }, [clusters, pharmacies, showClusters])

  return (
    <div
      className={cn('relative w-full overflow-hidden', className ?? 'rounded-xl border border-teal-200')}
      style={{ height }}
    >
      <Map
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

        {/* Position utilisateur — pastille bleu MediHelm pulsée */}
        {userLatitude && userLongitude && (
          <Marker longitude={userLongitude} latitude={userLatitude} anchor="center">
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-[#378ADD] border-[3px] border-white shadow-lg flex items-center justify-center">
                <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                  <circle cx={6} cy={6} r={3} fill="white" opacity="0.8" />
                </svg>
              </div>
              <div className="absolute -top-2 -left-2 w-11 h-11 rounded-full border-2 border-[#378ADD] opacity-40 animate-ping" />
            </div>
          </Marker>
        )}

        {/* Marqueurs & clusters */}
        {displayItems.map((item, idx) => {
          if (item.type === 'cluster') {
            return (
              <ClusterMarker
                key={`cluster-${idx}`}
                count={item.count}
                longitude={item.lng}
                latitude={item.lat}
                onClick={() => handleClusterClick(idx, item.lng, item.lat)}
              />
            )
          }

          const p = item.pharmacy
          if (!p.latitude || !p.longitude) return null

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
                isSelected={selectedPharmacyId === p.id}
                isDimmed={p.medicamentDispo === false}
                onHover={() => setHoverInfo(p)}
                onLeave={() => setHoverInfo(null)}
                onClick={() => {
                  onPharmacyClick?.(p.id)
                  setHoverInfo(null)
                  setPopupInfo(p)
                }}
              />
            </Marker>
          )
        })}

        {/* Fiche officine — survol (PC) OU clic (mobile & PC) */}
        {activeInfo && activeInfo.latitude && activeInfo.longitude && (
          <Popup
            longitude={activeInfo.longitude}
            latitude={activeInfo.latitude}
            anchor="bottom"
            offset={[0, -12] as [number, number]}
            closeOnClick={false}
            closeButton={!isFromHover}
            onClose={() => setPopupInfo(null)}
            className="medihelm-popup"
          >
            <PharmacyCard
              p={activeInfo}
              userLatitude={userLatitude}
              userLongitude={userLongitude}
              interactive={!isFromHover}
            />
          </Popup>
        )}
      </Map>

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
