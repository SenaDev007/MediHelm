'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Map, { Marker, Popup, NavigationControl, Layer, Source } from 'react-map-gl/mapbox'
import type { MapRef, LngLatBoundsLike } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

interface SupplyMapProps {
  data: Array<{
    departement: string
    scoreApprovisionnement: number
    centre?: { lat: number; lng: number }
    pharmaciesCount?: number
    dciEnTension?: string[]
  }>
  height?: string
}

// Department centers for Benin
const DEPT_CENTERS: Record<string, { lat: number; lng: number }> = {
  'Littoral': { lat: 6.3703, lng: 2.3912 },
  'Atlantique': { lat: 6.4919, lng: 2.0239 },
  'Ouémé': { lat: 6.5333, lng: 2.6167 },
  'Plateau': { lat: 7.3000, lng: 2.5500 },
  'Zou': { lat: 7.3833, lng: 2.0667 },
  'Collines': { lat: 7.8500, lng: 2.2500 },
  'Borgou': { lat: 9.3000, lng: 2.6167 },
  'Alibori': { lat: 10.8000, lng: 2.9500 },
  'Atacora': { lat: 10.3167, lng: 1.3833 },
  'Donga': { lat: 9.7000, lng: 1.6667 },
  'Mono': { lat: 6.3333, lng: 1.7833 },
  'Couffo': { lat: 7.1667, lng: 1.9500 },
}

function getSupplyColor(score: number): string {
  if (score >= 70) return '#1D9E75'
  if (score >= 50) return '#EF9F27'
  return '#E24B4A'
}

function getSupplyLabel(score: number): string {
  if (score >= 70) return 'Bien approvisionné'
  if (score >= 50) return 'Tension modérée'
  return 'Sous-approvisionné'
}

export function BeninSupplyMap({ data, height = '500px' }: SupplyMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [viewState, setViewState] = useState({
    longitude: 2.3,
    latitude: 9.3,
    zoom: 6,
  })
  const [popupInfo, setPopupInfo] = useState<SupplyMapProps['data'][0] | null>(null)

  const enrichedData = useMemo(() =>
    data.map(d => ({
      ...d,
      centre: d.centre || DEPT_CENTERS[d.departement] || { lat: 6.3703, lng: 2.3912 },
    })),
    [data]
  )

  // Build GeoJSON circle features for each department
  const circleFeatures = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: enrichedData.map(d => ({
      type: 'Feature' as const,
      properties: {
        departement: d.departement,
        score: d.scoreApprovisionnement,
        color: getSupplyColor(d.scoreApprovisionnement),
        pharmaciesCount: d.pharmaciesCount || 0,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [d.centre.lng, d.centre.lat] as [number, number],
      },
    })),
  }), [enrichedData])

  // Auto-fit bounds
  useEffect(() => {
    if (enrichedData.length === 0 || !mapRef.current) return
    const bounds: [number, number, number, number] = [
      Math.min(...enrichedData.map(d => d.centre!.lng)) - 1,
      Math.min(...enrichedData.map(d => d.centre!.lat)) - 1,
      Math.max(...enrichedData.map(d => d.centre!.lng)) + 1,
      Math.max(...enrichedData.map(d => d.centre!.lat)) + 1,
    ]
    mapRef.current.fitBounds(bounds as LngLatBoundsLike, { padding: 30 })
  }, [enrichedData])

  const handleMove = useCallback((evt: { viewState: typeof viewState }) => {
    setViewState(evt.viewState)
  }, [])

  return (
    <div className="w-full rounded-xl overflow-hidden border border-teal-200" style={{ height }}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={handleMove}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        scrollZoom
        attributionControl={false}
      >
        <NavigationControl position="top-right" />

        {/* Department supply circles */}
        <Source id="supply-circles" type="geojson" data={circleFeatures}>
          <Layer
            id="supply-circle"
            type="circle"
            paint={{
              'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                5, 20,
                8, 40,
                12, 60,
              ],
              'circle-color': ['get', 'color'],
              'circle-opacity': 0.35,
              'circle-stroke-color': ['get', 'color'],
              'circle-stroke-width': 2,
              'circle-stroke-opacity': 0.8,
            }}
          />
        </Source>

        {/* Department label markers */}
        {enrichedData.map((d) => {
          const color = getSupplyColor(d.scoreApprovisionnement)
          return (
            <Marker
              key={d.departement}
              longitude={d.centre!.lng}
              latitude={d.centre!.lat}
              anchor="center"
            >
              <button
                onClick={() => setPopupInfo(d)}
                className="border-0 bg-transparent cursor-pointer p-0"
              >
                <div
                  style={{
                    background: 'white',
                    border: `2px solid ${color}`,
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: color,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                  }}
                >
                  {d.departement} — {d.scoreApprovisionnement}%
                </div>
              </button>
            </Marker>
          )
        })}

        {/* Popup */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.centre!.lng}
            latitude={popupInfo.centre!.lat}
            anchor="bottom"
            offset={[0, -10] as [number, number]}
            closeOnClick={false}
            onClose={() => setPopupInfo(null)}
          >
            <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 180, padding: 4 }}>
              <strong style={{ fontSize: 14, color: '#085041' }}>{popupInfo.departement}</strong>
              <div style={{ marginTop: 6 }}>
                <div style={{
                  fontSize: 20, fontWeight: 700,
                  color: getSupplyColor(popupInfo.scoreApprovisionnement),
                }}>
                  {popupInfo.scoreApprovisionnement}%
                </div>
                <div style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 4,
                  display: 'inline-block',
                  background: getSupplyColor(popupInfo.scoreApprovisionnement) + '20',
                  color: getSupplyColor(popupInfo.scoreApprovisionnement),
                }}>
                  {getSupplyLabel(popupInfo.scoreApprovisionnement)}
                </div>
              </div>
              {popupInfo.pharmaciesCount !== undefined && (
                <div style={{ fontSize: 12, marginTop: 6, color: '#666' }}>
                  {popupInfo.pharmaciesCount} pharmacie(s)
                </div>
              )}
              {popupInfo.dciEnTension && popupInfo.dciEnTension.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#E24B4A' }}>DCI en tension :</div>
                  {popupInfo.dciEnTension.slice(0, 5).map((dci, i) => (
                    <div key={i} style={{ fontSize: 11, color: '#666' }}>- {dci}</div>
                  ))}
                </div>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}
