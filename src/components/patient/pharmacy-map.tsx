'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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
  onBoundsChange?: (bounds: L.LatLngBounds) => void
  height?: string
  showClusters?: boolean
}

// Pharmacy icon (teal green)
const pharmacyIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z" fill="#1D9E75"/>
    <text x="16" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold">+</text>
  </svg>`,
  className: '',
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
})

// Garde pharmacy icon (amber/orange)
const gardeIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z" fill="#EF9F27"/>
    <text x="16" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold">G</text>
  </svg>`,
  className: '',
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
})

// Selected pharmacy icon (dark teal, larger)
const selectedIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="48" viewBox="0 0 38 48">
    <path d="M19 0C8.5 0 0 8.5 0 19c0 14 19 29 19 29s19-15 19-29C38 8.5 29.5 0 19 0z" fill="#085041"/>
    <text x="19" y="24" text-anchor="middle" fill="white" font-size="16" font-weight="bold">+</text>
  </svg>`,
  className: '',
  iconSize: [38, 48],
  iconAnchor: [19, 48],
  popupAnchor: [0, -48],
})

// User position icon (blue pulsing)
const userIcon = L.divIcon({
  html: `<div style="position:relative">
    <div style="width:24px;height:24px;border-radius:50%;background:#378ADD;border:3px solid white;box-shadow:0 0 0 3px rgba(55,138,221,0.3)"></div>
    <div style="position:absolute;top:-6px;left:-6px;width:36px;height:36px;border-radius:50%;border:2px solid #378ADD;opacity:0.4;animation:ping 2s infinite"></div>
  </div>
  <style>@keyframes ping{0%{transform:scale(1);opacity:0.4}75%,100%{transform:scale(2);opacity:0}}</style>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

// Map bounds updater component
function MapBoundsUpdater({ pharmacies, userLatitude, userLongitude }: {
  pharmacies: PharmacyMapProps['pharmacies']
  userLatitude?: number
  userLongitude?: number
}) {
  const map = useMap()
  const prevLengthRef = useRef(0)

  useEffect(() => {
    const validPharmacies = pharmacies.filter(p => p.latitude && p.longitude)
    if (validPharmacies.length === 0 && prevLengthRef.current === 0) return
    prevLengthRef.current = validPharmacies.length

    if (validPharmacies.length === 0) return

    const bounds = L.latLngBounds(
      validPharmacies.map(p => [p.latitude!, p.longitude!])
    )
    if (userLatitude && userLongitude) {
      bounds.extend([userLatitude, userLongitude])
    }
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
  }, [pharmacies, userLatitude, userLongitude, map])

  return null
}

// Map events handler
function MapEventHandler({ onBoundsChange }: { onBoundsChange?: (bounds: L.LatLngBounds) => void }) {
  const map = useMap()
  useEffect(() => {
    if (!onBoundsChange) return
    const handleMove = () => onBoundsChange(map.getBounds())
    map.on('moveend', handleMove)
    return () => { map.off('moveend', handleMove) }
  }, [map, onBoundsChange])
  return null
}

// Cluster icon creator
const clusterIcon = (cluster: L.MarkerCluster) => {
  const count = cluster.getChildCount()
  const size = count < 10 ? 40 : count < 50 ? 50 : 60
  return L.divIcon({
    html: `<div style="
      background:rgba(29,158,117,0.9);
      color:white;
      border-radius:50%;
      width:${size}px;
      height:${size}px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight:700;
      font-size:${size < 50 ? 14 : 18}px;
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
    ">${count}</div>`,
    className: '',
    iconSize: L.point(size, size, true),
  })
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
  const defaultCenter: [number, number] = [
    userLatitude || 6.3703,
    userLongitude || 2.3912,
  ]
  const defaultZoom = userLatitude ? 14 : 7

  const validPharmacies = pharmacies.filter(p => p.latitude && p.longitude)

  return (
    <div
      className="w-full rounded-xl overflow-hidden border border-teal-200"
      style={{ height }}
    >
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        className="h-full w-full"
        style={{ height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User position marker */}
        {userLatitude && userLongitude && (
          <Marker position={[userLatitude, userLongitude]} icon={userIcon}>
            <Popup>
              <strong>Vous êtes ici</strong>
            </Popup>
          </Marker>
        )}

        {/* Pharmacy markers with clustering */}
        {showClusters ? (
          <MarkerClusterGroup
            chunkedLoading
            iconCreateFunction={clusterIcon}
            maxClusterRadius={50}
            spiderfyOnMaxZoom
            showCoverageOnHover={false}
          >
            {validPharmacies.map((pharmacy) => (
              <Marker
                key={pharmacy.id}
                position={[pharmacy.latitude!, pharmacy.longitude!]}
                icon={
                  selectedPharmacyId === pharmacy.id
                    ? selectedIcon
                    : pharmacy.estGarde
                      ? gardeIcon
                      : pharmacyIcon
                }
                eventHandlers={{
                  click: () => onPharmacyClick?.(pharmacy.id),
                }}
              >
                <Popup>
                  <div style={{ minWidth: 200, fontFamily: 'system-ui, sans-serif' }}>
                    <strong style={{ fontSize: 14, color: '#085041' }}>{pharmacy.nom}</strong>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                      {pharmacy.adresse}{pharmacy.ville ? `, ${pharmacy.ville}` : ''}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      {pharmacy.telephone}
                    </div>
                    {pharmacy.estGarde && (
                      <div style={{ color: '#EF9F27', fontWeight: 600, fontSize: 12, marginTop: 4 }}>
                        Pharmacie de garde
                      </div>
                    )}
                    {pharmacy.distance !== undefined && (
                      <div style={{ fontSize: 12, marginTop: 4, color: '#1D9E75', fontWeight: 600 }}>
                        {pharmacy.distance.toFixed(1)} km
                      </div>
                    )}
                    {pharmacy.medicamentDispo !== undefined && (
                      <div style={{
                        fontSize: 11,
                        marginTop: 4,
                        padding: '2px 6px',
                        borderRadius: 4,
                        display: 'inline-block',
                        background: pharmacy.medicamentDispo ? '#dcfce7' : '#fef2f2',
                        color: pharmacy.medicamentDispo ? '#166534' : '#991b1b',
                      }}>
                        {pharmacy.medicamentDispo ? 'Médicament disponible' : 'Indisponible'}
                      </div>
                    )}
                    <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                      <a
                        href={`tel:${pharmacy.telephone}`}
                        style={{
                          padding: '4px 10px',
                          background: '#1D9E75',
                          color: 'white',
                          borderRadius: 6,
                          textDecoration: 'none',
                          fontSize: 11,
                        }}
                      >
                        Appeler
                      </a>
                      <a
                        href={`https://www.openstreetmap.org/directions?from=&to=${pharmacy.latitude},${pharmacy.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '4px 10px',
                          background: 'white',
                          color: '#1D9E75',
                          borderRadius: 6,
                          textDecoration: 'none',
                          fontSize: 11,
                          border: '1px solid #1D9E75',
                        }}
                      >
                        Itinéraire
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        ) : (
          // Without clustering
          validPharmacies.map((pharmacy) => (
            <Marker
              key={pharmacy.id}
              position={[pharmacy.latitude!, pharmacy.longitude!]}
              icon={
                selectedPharmacyId === pharmacy.id
                  ? selectedIcon
                  : pharmacy.estGarde
                    ? gardeIcon
                    : pharmacyIcon
              }
              eventHandlers={{
                click: () => onPharmacyClick?.(pharmacy.id),
              }}
            >
              <Popup>
                <div style={{ minWidth: 200, fontFamily: 'system-ui, sans-serif' }}>
                  <strong style={{ fontSize: 14, color: '#085041' }}>{pharmacy.nom}</strong>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    {pharmacy.adresse}{pharmacy.ville ? `, ${pharmacy.ville}` : ''}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    {pharmacy.telephone}
                  </div>
                  {pharmacy.estGarde && (
                    <div style={{ color: '#EF9F27', fontWeight: 600, fontSize: 12, marginTop: 4 }}>
                      Pharmacie de garde
                    </div>
                  )}
                  {pharmacy.distance !== undefined && (
                    <div style={{ fontSize: 12, marginTop: 4, color: '#1D9E75', fontWeight: 600 }}>
                      {pharmacy.distance.toFixed(1)} km
                    </div>
                  )}
                  {pharmacy.medicamentDispo !== undefined && (
                    <div style={{
                      fontSize: 11,
                      marginTop: 4,
                      padding: '2px 6px',
                      borderRadius: 4,
                      display: 'inline-block',
                      background: pharmacy.medicamentDispo ? '#dcfce7' : '#fef2f2',
                      color: pharmacy.medicamentDispo ? '#166534' : '#991b1b',
                    }}>
                      {pharmacy.medicamentDispo ? 'Médicament disponible' : 'Indisponible'}
                    </div>
                  )}
                  <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                    <a
                      href={`tel:${pharmacy.telephone}`}
                      style={{
                        padding: '4px 10px',
                        background: '#1D9E75',
                        color: 'white',
                        borderRadius: 6,
                        textDecoration: 'none',
                        fontSize: 11,
                      }}
                    >
                      Appeler
                    </a>
                    <a
                      href={`https://www.openstreetmap.org/directions?from=&to=${pharmacy.latitude},${pharmacy.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '4px 10px',
                        background: 'white',
                        color: '#1D9E75',
                        borderRadius: 6,
                        textDecoration: 'none',
                        fontSize: 11,
                        border: '1px solid #1D9E75',
                      }}
                    >
                      Itinéraire
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))
        )}

        {/* Auto-fit bounds */}
        <MapBoundsUpdater
          pharmacies={pharmacies}
          userLatitude={userLatitude}
          userLongitude={userLongitude}
        />
        <MapEventHandler onBoundsChange={onBoundsChange} />
      </MapContainer>
    </div>
  )
}
