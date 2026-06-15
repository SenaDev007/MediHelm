'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Map, { Marker, Popup, Source, Layer, NavigationControl, GeolocateControl, useMap } from 'react-map-gl/mapbox'
import type { MapRef, MapLayerMouseEvent, LngLatBoundsLike } from 'react-map-gl/mapbox'
import SuperCluster from 'supercluster'
import 'mapbox-gl/dist/mapbox-gl.css'
import { buildDirectionsUrl, buildMapUrl } from '@/lib/directions'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

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
  }>
  userLatitude?: number
  userLongitude?: number
  onPharmacyClick?: (pharmacyId: string) => void
  selectedPharmacyId?: string
  onBoundsChange?: (bounds: LngLatBoundsLike) => void
  height?: string
  showClusters?: boolean
}

// ─── Pharmacy Marker with cross icon ────────────────────────────────────────
function PharmacyMarker({ estGarde, isSelected, onClick }: {
  estGarde?: boolean
  isSelected?: boolean
  onClick: () => void
}) {
  const size = isSelected ? 48 : 38
  const pinH = size + 12
  const color = isSelected ? '#085041' : estGarde ? '#EF9F27' : '#1D9E75'

  // Cross dimensions (pharmacy ✚)
  const arm = size * 0.22
  const thick = size * 0.09

  return (
    <button
      onClick={onClick}
      className="border-0 bg-transparent cursor-pointer p-0"
      style={{ width: size, height: pinH }}
    >
      <svg width={size} height={pinH} viewBox={`0 0 ${size} ${pinH}`}>
        {/* Shadow */}
        <ellipse cx={size / 2} cy={pinH - 1} rx={size * 0.22} ry={2.5} fill="rgba(0,0,0,0.12)" />

        {/* Pin shape */}
        <path
          d={`M${size / 2} 2C${size * 0.24} 2 2 ${size * 0.24} 2 ${size / 2}c0 ${size * 0.36} ${size / 2 - 2} ${size / 2 + 9} ${size / 2 - 2} ${size / 2 + 9}s${size / 2 - 2}-${size * 0.36 + 9} ${size / 2 - 2}-${size / 2 + 9}C${size - 2} ${size * 0.24} ${size * 0.76} 2 ${size / 2} 2z`}
          fill={color}
          stroke="white"
          strokeWidth="2.5"
        />

        {/* Inner white circle background */}
        <circle cx={size / 2} cy={size / 2 - 1} r={size * 0.24} fill="white" opacity="0.2" />

        {/* Pharmacy cross ✚ */}
        <g transform={`translate(${size / 2}, ${size / 2 - 1})`}>
          <rect x={-thick / 2} y={-arm} width={thick} height={arm * 2} rx={1.5} fill="white" />
          <rect x={-arm} y={-thick / 2} width={arm * 2} height={thick} rx={1.5} fill="white" />
        </g>

        {/* Garde badge */}
        {estGarde && (
          <>
            <circle cx={size - 5} cy={7} r={6} fill="#EF9F27" stroke="white" strokeWidth="1.5" />
            <text
              x={size - 5}
              y={10.5}
              textAnchor="middle"
              fill="white"
              fontSize={8}
              fontWeight="bold"
              fontFamily="system-ui, sans-serif"
            >
              G
            </text>
          </>
        )}

        {/* Selected pulse ring */}
        {isSelected && (
          <circle
            cx={size / 2}
            cy={size / 2 - 1}
            r={size * 0.42}
            fill="none"
            stroke={color}
            strokeWidth="2"
            opacity="0.4"
          >
            <animate attributeName="r" from={size * 0.35} to={size * 0.5} dur="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.4" to="0" dur="1s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>
    </button>
  )
}

// ─── Cluster marker component ───────────────────────────────────────────────
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
        onClick={onClick}
        className="border-0 bg-transparent cursor-pointer p-0"
        style={{ width: size, height: size }}
      >
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: size < 50 ? 14 : 18,
            border: '3px solid white',
            boxShadow: '0 2px 12px rgba(29,158,117,0.4)',
          }}
        >
          {count}
        </div>
      </button>
    </Marker>
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
  showClusters = true,
}: PharmacyMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [viewState, setViewState] = useState({
    longitude: userLongitude || 2.3912,
    latitude: userLatitude || 6.3703,
    zoom: userLatitude ? 14 : 7,
  })
  const [popupInfo, setPopupInfo] = useState<PharmacyMapProps['pharmacies'][0] | null>(null)
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
    const zoom = Math.floor(map.getZoom())

    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ]

    const newClusters = superclusterRef.current.getClusters(bbox, zoom)
    setClusters(newClusters as Array<{
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

  const handleMove = useCallback((evt: { viewState: typeof viewState }) => {
    setViewState(evt.viewState)
    updateClusters()
    if (onBoundsChange && mapRef.current) {
      const map = mapRef.current.getMap()
      const b = map.getBounds()
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
      className="w-full rounded-xl overflow-hidden border border-teal-200"
      style={{ height }}
    >
      <Map
        ref={mapRef}
        {...viewState}
        onMove={handleMove}
        onLoad={handleMapLoad}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        scrollZoom
        attributionControl={false}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl
          position="top-left"
          trackUserLocation
          showAccuracyCircle
        />

        {/* User position marker */}
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

        {/* Markers & Clusters */}
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
                estGarde={p.estGarde}
                isSelected={selectedPharmacyId === p.id}
                onClick={() => {
                  onPharmacyClick?.(p.id)
                  setPopupInfo(p)
                }}
              />
            </Marker>
          )
        })}

        {/* Popup — Personalized MédiHelm design */}
        {popupInfo && popupInfo.latitude && popupInfo.longitude && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            offset={[0, -10] as [number, number]}
            closeOnClick={false}
            onClose={() => setPopupInfo(null)}
            className="medihelm-popup"
          >
            <div style={{
              minWidth: 220,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              padding: 0,
              borderRadius: 12,
              overflow: 'hidden',
            }}>
              {/* Header bar */}
              <div style={{
                background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {/* Pharmacy cross icon */}
                  <svg width={16} height={16} viewBox="0 0 16 16" fill="white">
                    <rect x={6} y={2} width={4} height={12} rx={1} />
                    <rect x={2} y={6} width={12} height={4} rx={1} />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {popupInfo.nom}
                  </div>
                  {popupInfo.estGarde && (
                    <div style={{ fontSize: 10, color: '#FFD700', fontWeight: 600, marginTop: 1 }}>
                      ⭐ Pharmacie de garde
                    </div>
                  )}
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '8px 12px 10px' }}>
                {/* Address */}
                <div style={{ fontSize: 12, color: '#555', display: 'flex', alignItems: 'flex-start', gap: 4, lineHeight: 1.3 }}>
                  <span style={{ flexShrink: 0, marginTop: 1 }}>📍</span>
                  <span>{popupInfo.adresse}{popupInfo.ville ? `, ${popupInfo.ville}` : ''}</span>
                </div>

                {/* Phone */}
                <a
                  href={`tel:${popupInfo.telephone}`}
                  style={{ fontSize: 12, color: '#1D9E75', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontWeight: 500 }}
                >
                  📞 {popupInfo.telephone}
                </a>

                {/* Distance */}
                {popupInfo.distance !== undefined && (
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#1D9E75',
                      background: '#E1F5EE',
                      padding: '2px 8px',
                      borderRadius: 10,
                    }}>
                      {popupInfo.distance.toFixed(1)} km
                    </span>
                  </div>
                )}

                {/* Medication availability */}
                {popupInfo.medicamentDispo !== undefined && (
                  <div style={{
                    fontSize: 11, marginTop: 4, padding: '2px 8px', borderRadius: 10,
                    display: 'inline-block',
                    background: popupInfo.medicamentDispo ? '#dcfce7' : '#fef2f2',
                    color: popupInfo.medicamentDispo ? '#166534' : '#991b1b',
                    fontWeight: 600,
                  }}>
                    {popupInfo.medicamentDispo ? '✓ Médicament disponible' : '✗ Indisponible'}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                  <a
                    href={`tel:${popupInfo.telephone}`}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      background: '#1D9E75',
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
                      destLat: popupInfo.latitude!,
                      destLng: popupInfo.longitude!,
                      destName: popupInfo.nom,
                      originLat: userLatitude,
                      originLng: userLongitude,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      background: 'white',
                      color: '#1D9E75',
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

                {/* See on Google Maps */}
                <a
                  href={buildMapUrl(popupInfo.latitude!, popupInfo.longitude!, `${popupInfo.nom} ${popupInfo.ville || ''} Bénin`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    marginTop: 6,
                    fontSize: 10,
                    color: '#888',
                    textDecoration: 'none',
                    textAlign: 'center',
                  }}
                >
                  Voir sur Google Maps →
                </a>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}
