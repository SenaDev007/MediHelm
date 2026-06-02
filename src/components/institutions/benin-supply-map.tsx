'use client'

import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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

function MapBoundsUpdater({ data }: { data: SupplyMapProps['data'] }) {
  const map = useMap()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current || data.length === 0) return
    initialized.current = true

    const bounds = L.latLngBounds(
      data.map(d => {
        const centre = d.centre || DEPT_CENTERS[d.departement]
        return centre ? [centre.lat, centre.lng] as [number, number] : [6.3703, 2.3912] as [number, number]
      })
    )
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30] })
    }
  }, [data, map])

  return null
}

export function BeninSupplyMap({ data, height = '500px' }: SupplyMapProps) {
  const enrichedData = useMemo(() =>
    data.map(d => ({
      ...d,
      centre: d.centre || DEPT_CENTERS[d.departement] || { lat: 6.3703, lng: 2.3912 },
    })),
    [data]
  )

  return (
    <div className="w-full rounded-xl overflow-hidden border border-teal-200" style={{ height }}>
      <MapContainer
        center={[9.3, 2.3]}
        zoom={7}
        scrollWheelZoom={true}
        className="h-full w-full"
        style={{ height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {enrichedData.map((d) => (
          <div key={d.departement}>
            {/* Colored circle showing supply level */}
            <Circle
              center={[d.centre.lat, d.centre.lng]}
              radius={30000}
              pathOptions={{
                color: getSupplyColor(d.scoreApprovisionnement),
                fillColor: getSupplyColor(d.scoreApprovisionnement),
                fillOpacity: 0.35,
                weight: 2,
              }}
            >
              <Popup>
                <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 180 }}>
                  <strong style={{ fontSize: 14, color: '#085041' }}>{d.departement}</strong>
                  <div style={{ marginTop: 6 }}>
                    <div style={{
                      fontSize: 20, fontWeight: 700,
                      color: getSupplyColor(d.scoreApprovisionnement),
                    }}>
                      {d.scoreApprovisionnement}%
                    </div>
                    <div style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 4,
                      display: 'inline-block',
                      background: getSupplyColor(d.scoreApprovisionnement) + '20',
                      color: getSupplyColor(d.scoreApprovisionnement),
                    }}>
                      {getSupplyLabel(d.scoreApprovisionnement)}
                    </div>
                  </div>
                  {d.pharmaciesCount !== undefined && (
                    <div style={{ fontSize: 12, marginTop: 6, color: '#666' }}>
                      {d.pharmaciesCount} pharmacie(s)
                    </div>
                  )}
                  {d.dciEnTension && d.dciEnTension.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#E24B4A' }}>DCI en tension :</div>
                      {d.dciEnTension.slice(0, 5).map((dci, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#666' }}>- {dci}</div>
                      ))}
                    </div>
                  )}
                </div>
              </Popup>
            </Circle>

            {/* Department label marker */}
            <Marker
              position={[d.centre.lat, d.centre.lng]}
              icon={L.divIcon({
                html: `<div style="
                  background:white;
                  border:2px solid ${getSupplyColor(d.scoreApprovisionnement)};
                  border-radius:6px;
                  padding:2px 8px;
                  font-size:11px;
                  font-weight:600;
                  color:${getSupplyColor(d.scoreApprovisionnement)};
                  white-space:nowrap;
                  box-shadow:0 1px 4px rgba(0,0,0,0.15);
                ">${d.departement} — ${d.scoreApprovisionnement}%</div>`,
                className: '',
                iconSize: [120, 22],
                iconAnchor: [60, 11],
              })}
            />
          </div>
        ))}

        <MapBoundsUpdater data={enrichedData} />
      </MapContainer>
    </div>
  )
}
