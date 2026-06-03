'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Map, { Marker, Popup, Source, Layer, NavigationControl, GeolocateControl, useMap } from 'react-map-gl/mapbox'
import type { MapRef, MapLayerMouseEvent, LngLatBoundsLike } from 'react-map-gl/mapbox'
import SuperCluster from 'supercluster'
import 'mapbox-gl/dist/mapbox-gl.css'

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

// Pharmacy marker SVG component
function PharmacyMarker({ estGarde, isSelected, onClick }: {
  estGarde?: boolean
  isSelected?: boolean
  onClick: () => void
}) {
  const size = isSelected ? 44 : 36
  const color = isSelected ? '#085041' : estGarde ? '#EF9F27' : '#1D9E75'
  const label = estGarde ? 'G' : '+'

  return (
    <button
      onClick={onClick}
      className="border-0 bg-transparent cursor-pointer p-0"
      style={{ width: size, height: size + 8 }}
    >
      <svg width={size} height={size + 8} viewBox={`0 0 ${size} ${size + 8}`}>
        <path
          d={`M${size/2} 0C${size * 0.225} 0 0 ${size * 0.225} 0 ${size/2}c0 ${size * 0.375} ${size/2} ${size/2 + 8} ${size/2} ${size/2 + 8}s${size/2}-${size * 0.375 + 8} ${size/2}-${size/2 + 8}C${size} ${size * 0.225} ${size * 0.775} 0 ${size/2} 0z`}
          fill={color}
          stroke="white"
          strokeWidth="2"
        />
        <text
          x={size/2}
          y={size/2 + 2}
          textAnchor="middle"
          fill="white"
          fontSize={isSelected ? 16 : 13}
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          {label}
        </text>
      </svg>
    </button>
  )
}

// Cluster marker component
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
            background: 'rgba(29,158,117,0.9)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: size < 50 ? 14 : 18,
            border: '3px solid white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
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
              <div className="w-6 h-6 rounded-full bg-[#378ADD] border-[3px] border-white shadow-lg" />
              <div className="absolute -top-1.5 -left-1.5 w-9 h-9 rounded-full border-2 border-[#378ADD] opacity-40 animate-ping" />
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

        {/* Popup */}
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
            <div style={{ minWidth: 200, fontFamily: 'system-ui, sans-serif', padding: 4 }}>
              <strong style={{ fontSize: 14, color: '#085041' }}>{popupInfo.nom}</strong>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {popupInfo.adresse}{popupInfo.ville ? `, ${popupInfo.ville}` : ''}
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{popupInfo.telephone}</div>
              {popupInfo.estGarde && (
                <div style={{ color: '#EF9F27', fontWeight: 600, fontSize: 12, marginTop: 4 }}>
                  Pharmacie de garde
                </div>
              )}
              {popupInfo.distance !== undefined && (
                <div style={{ fontSize: 12, marginTop: 4, color: '#1D9E75', fontWeight: 600 }}>
                  {popupInfo.distance.toFixed(1)} km
                </div>
              )}
              {popupInfo.medicamentDispo !== undefined && (
                <div style={{
                  fontSize: 11, marginTop: 4, padding: '2px 6px', borderRadius: 4,
                  display: 'inline-block',
                  background: popupInfo.medicamentDispo ? '#dcfce7' : '#fef2f2',
                  color: popupInfo.medicamentDispo ? '#166534' : '#991b1b',
                }}>
                  {popupInfo.medicamentDispo ? 'Médicament disponible' : 'Indisponible'}
                </div>
              )}
              <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                <a
                  href={`tel:${popupInfo.telephone}`}
                  style={{ padding: '4px 10px', background: '#1D9E75', color: 'white', borderRadius: 6, textDecoration: 'none', fontSize: 11 }}
                >
                  Appeler
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${popupInfo.latitude},${popupInfo.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ padding: '4px 10px', background: 'white', color: '#1D9E75', borderRadius: 6, textDecoration: 'none', fontSize: 11, border: '1px solid #1D9E75' }}
                >
                  Itinéraire
                </a>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}
