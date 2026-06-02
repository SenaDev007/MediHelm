'use client'

import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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

function createPharmacyIcon(statut: string): L.DivIcon {
  const config = STATUT_CONFIG[statut] || STATUT_CONFIG.none
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.3 0 0 6.3 0 14c0 10 14 22 14 22s14-12 14-22C28 6.3 21.7 0 14 0z" fill="${config.color}"/>
      <circle cx="14" cy="13" r="5" fill="white" opacity="0.9"/>
    </svg>`,
    className: '',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  })
}

const clusterIcon = (cluster: L.MarkerCluster) => {
  const count = cluster.getChildCount()
  const size = count < 10 ? 38 : count < 50 ? 48 : 56
  return L.divIcon({
    html: `<div style="
      background:rgba(8,80,65,0.9);
      color:white;
      border-radius:50%;
      width:${size}px;
      height:${size}px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight:700;
      font-size:${size < 48 ? 13 : 16}px;
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
    ">${count}</div>`,
    className: '',
    iconSize: L.point(size, size, true),
  })
}

function MapBoundsUpdater({ pharmacies }: { pharmacies: CoverageMapProps['pharmacies'] }) {
  const map = useMap()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    const valid = pharmacies.filter(p => p.latitude && p.longitude)
    if (valid.length === 0) return
    initialized.current = true

    const bounds = L.latLngBounds(
      valid.map(p => [p.latitude!, p.longitude!])
    )
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 })
  }, [pharmacies, map])

  return null
}

export function CoverageMap({
  pharmacies,
  height = '500px',
  title = 'Carte de couverture',
  mode = 'dpmed',
}: CoverageMapProps) {
  const validPharmacies = useMemo(
    () => pharmacies.filter(p => p.latitude && p.longitude),
    [pharmacies]
  )

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

          <MarkerClusterGroup
            chunkedLoading
            iconCreateFunction={clusterIcon}
            maxClusterRadius={60}
            spiderfyOnMaxZoom
            showCoverageOnHover={false}
          >
            {validPharmacies.map((p) => (
              <Marker
                key={p.id}
                position={[p.latitude!, p.longitude!]}
                icon={createPharmacyIcon(p.statutAcquittement || 'none')}
              >
                <Popup>
                  <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 180 }}>
                    <strong style={{ fontSize: 14, color: '#085041' }}>{p.nom}</strong>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{p.ville}</div>
                    <div style={{ marginTop: 6 }}>
                      <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: (STATUT_CONFIG[p.statutAcquittement || 'none'] || STATUT_CONFIG.none).bgColor,
                        color: (STATUT_CONFIG[p.statutAcquittement || 'none'] || STATUT_CONFIG.none).color,
                        fontWeight: 600,
                      }}>
                        {(STATUT_CONFIG[p.statutAcquittement || 'none'] || STATUT_CONFIG.none).label}
                      </span>
                    </div>
                    {p.alerteTitre && (
                      <div style={{ fontSize: 11, marginTop: 6, color: '#666' }}>
                        Alerte : {p.alerteTitre}
                      </div>
                    )}
                    {p.dateNotification && (
                      <div style={{ fontSize: 10, marginTop: 4, color: '#999' }}>
                        Notifiée le {new Date(p.dateNotification).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                    {mode === 'sobaps' && (
                      <div style={{ fontSize: 10, marginTop: 4, color: '#666' }}>
                        Dernière livraison confirmée
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>

          <MapBoundsUpdater pharmacies={pharmacies} />
        </MapContainer>
      </div>
    </div>
  )
}
