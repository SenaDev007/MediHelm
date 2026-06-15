'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Map, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl/mapbox'
import type { MapRef, LngLatBoundsLike } from 'react-map-gl/mapbox'
import SuperCluster from 'supercluster'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

interface CoverageMapProps {
  pharmacies: Array<{
    id: string
    nom: string
    ville: string
    latitude: number | null
    longitude: number | null
    statutAcquittement?: 'notified' | 'acknowledged' | 'action_taken' | 'none'
    alerteTitre?: string
    alerteType?: string
    dateNotification?: string
  }>
  height?: string
  title?: string
  mode?: 'dpmed' | 'sobaps'
}

const STATUT_CONFIG: Record<string, { color: string; label: string; bgColor: string }> = {
  action_taken: { color: '#1D9E75', label: 'Action prise', bgColor: '#dcfce7' },
  acknowledged: { color: '#378ADD', label: 'Acquittée', bgColor: '#dbeafe' },
  notified: { color: '#EF9F27', label: 'Notifiée', bgColor: '#fef3c7' },
  none: { color: '#9ca3af', label: 'Non notifiée', bgColor: '#f3f4f6' },
}

// Status marker SVG
function StatusMarker({ statut, onClick }: { statut: string; onClick: () => void }) {
  const config = STATUT_CONFIG[statut] || STATUT_CONFIG.none
  const size = 32

  return (
    <button
      onClick={onClick}
      className="border-0 bg-transparent cursor-pointer p-0"
      style={{ width: size, height: size + 8 }}
    >
      <svg width={size} height={size + 8} viewBox={`0 0 ${size} ${size + 8}`}>
        <path
          d={`M${size/2} 0C${size * 0.225} 0 0 ${size * 0.225} 0 ${size/2}c0 ${size * 0.375} ${size/2} ${size/2 + 8} ${size/2} ${size/2 + 8}s${size/2}-${size * 0.375 + 8} ${size/2}-${size/2 + 8}C${size} ${size * 0.225} ${size * 0.775} 0 ${size/2} 0z`}
          fill={config.color}
          stroke="white"
          strokeWidth="2"
        />
        <circle cx={size/2} cy={size/2 - 2} r="5" fill="white" opacity="0.9" />
      </svg>
    </button>
  )
}

// Cluster marker for coverage map
function CoverageClusterMarker({ count, longitude, latitude, onClick }: {
  count: number
  longitude: number
  latitude: number
  onClick: () => void
}) {
  const size = count < 10 ? 42 : count < 50 ? 54 : 64

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
            background: 'rgba(8,80,65,0.9)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: size < 50 ? 13 : 16,
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

export function CoverageMap({
  pharmacies,
  height = '500px',
  title = 'Carte de couverture',
  mode = 'dpmed',
}: CoverageMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [viewState, setViewState] = useState({
    longitude: 2.3,
    latitude: 9.3,
    zoom: 6,
  })
  const [popupInfo, setPopupInfo] = useState<CoverageMapProps['pharmacies'][0] | null>(null)
  const [clusters, setClusters] = useState<Array<{
    properties: { cluster?: boolean; pharmacyId?: string; statut?: string; point_count?: number }
    geometry: { coordinates: [number, number] }
  }>>([])

  const superclusterRef = useRef<SuperCluster | null>(null)

  const validPharmacies = useMemo(
    () => pharmacies.filter(p => p.latitude && p.longitude),
    [pharmacies]
  )

  const points = useMemo(() =>
    validPharmacies.map(p => ({
      type: 'Feature' as const,
      properties: {
        cluster: false,
        pharmacyId: p.id,
        statut: p.statutAcquittement || 'none',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [p.longitude!, p.latitude!] as [number, number],
      },
    })),
    [validPharmacies]
  )

  // Initialize supercluster
  useEffect(() => {
    const sc = new SuperCluster({
      radius: 60,
      maxZoom: 16,
      map: (props) => ({ count: 1 }),
      reduce: (acc, props) => { acc.count += props.count },
    })
    sc.load(points)
    superclusterRef.current = sc
  }, [points])

  const updateClusters = useCallback(() => {
    if (!superclusterRef.current || !mapRef.current) return
    const map = mapRef.current.getMap()
    const bounds = map.getBounds()
    const zoom = Math.floor(map.getZoom())

    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ]

    setClusters(superclusterRef.current.getClusters(bbox, zoom) as typeof clusters)
  }, [])

  // Auto-fit bounds
  useEffect(() => {
    if (validPharmacies.length === 0 || !mapRef.current) return
    const bounds: [number, number, number, number] = [
      Math.min(...validPharmacies.map(p => p.longitude!)),
      Math.min(...validPharmacies.map(p => p.latitude!)),
      Math.max(...validPharmacies.map(p => p.longitude!)),
      Math.max(...validPharmacies.map(p => p.latitude!)),
    ]
    mapRef.current.fitBounds(bounds as LngLatBoundsLike, { padding: 40, maxZoom: 12 })
  }, [validPharmacies])

  const handleMove = useCallback((evt: { viewState: typeof viewState }) => {
    setViewState(evt.viewState)
    updateClusters()
  }, [updateClusters])

  const handleMapLoad = useCallback(() => {
    updateClusters()
  }, [updateClusters])

  const handleClusterClick = useCallback((clusterId: number, lng: number, lat: number) => {
    if (!superclusterRef.current) return
    const zoom = superclusterRef.current.getClusterExpansionZoom(clusterId)
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 500 })
  }, [])

  // Stats
  const stats = useMemo(() => {
    const s = { action_taken: 0, acknowledged: 0, notified: 0, none: 0 }
    pharmacies.forEach(p => {
      const st = p.statutAcquittement || 'none'
      if (st in s) s[st as keyof typeof s]++
      else s.none++
    })
    return s
  }, [pharmacies])

  // Display items
  const displayItems = useMemo(() => {
    return clusters.map(c => {
      if (c.properties.cluster) {
        return { type: 'cluster' as const, count: c.properties.point_count || 0, lng: c.geometry.coordinates[0], lat: c.geometry.coordinates[1] }
      }
      const pharmacy = validPharmacies.find(p => p.id === c.properties.pharmacyId)
      return pharmacy ? { type: 'pharmacy' as const, pharmacy } : null
    }).filter(Boolean) as Array<{ type: 'pharmacy'; pharmacy: CoverageMapProps['pharmacies'][0] } | { type: 'cluster'; count: number; lng: number; lat: number }>
  }, [clusters, validPharmacies])

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="font-semibold text-gray-700">{title}</span>
        {Object.entries(STATUT_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            <span className="text-muted-foreground">
              {config.label} ({stats[key as keyof typeof stats] || 0})
            </span>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="w-full rounded-xl overflow-hidden border border-teal-200" style={{ height }}>
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

          {displayItems.map((item, idx) => {
            if (item.type === 'cluster') {
              return (
                <CoverageClusterMarker
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
                <StatusMarker
                  statut={p.statutAcquittement || 'none'}
                  onClick={() => setPopupInfo(p)}
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
            >
              <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 180, padding: 4 }}>
                <strong style={{ fontSize: 14, color: '#085041' }}>{popupInfo.nom}</strong>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{popupInfo.ville}</div>
                <div style={{ marginTop: 6 }}>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 4,
                    background: (STATUT_CONFIG[popupInfo.statutAcquittement || 'none'] || STATUT_CONFIG.none).bgColor,
                    color: (STATUT_CONFIG[popupInfo.statutAcquittement || 'none'] || STATUT_CONFIG.none).color,
                    fontWeight: 600,
                  }}>
                    {(STATUT_CONFIG[popupInfo.statutAcquittement || 'none'] || STATUT_CONFIG.none).label}
                  </span>
                </div>
                {popupInfo.alerteTitre && (
                  <div style={{ fontSize: 11, marginTop: 6, color: '#666' }}>
                    Alerte : {popupInfo.alerteTitre}
                  </div>
                )}
                {popupInfo.dateNotification && (
                  <div style={{ fontSize: 10, marginTop: 4, color: '#999' }}>
                    Notifiée le {new Date(popupInfo.dateNotification).toLocaleDateString('fr-FR')}
                  </div>
                )}
                {mode === 'sobaps' && (
                  <div style={{ fontSize: 10, marginTop: 4, color: '#666' }}>
                    Dernière livraison confirmée
                  </div>
                )}
              </div>
            </Popup>
          )}
        </Map>
      </div>
    </div>
  )
}
