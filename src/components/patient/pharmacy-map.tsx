'use client'

import { useEffect, useState } from 'react'
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
  }>
  userLatitude?: number
  userLongitude?: number
  onPharmacyClick?: (pharmacyId: string) => void
  selectedPharmacyId?: string
}

// Fix Leaflet default icon issue
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

const gardeIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z" fill="#EF9F27"/>
    <text x="16" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold">+</text>
  </svg>`,
  className: '',
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
})

const userIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="8" fill="#378ADD" stroke="white" stroke-width="3"/>
  </svg>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

export default function PharmacyMap({
  pharmacies,
  userLatitude,
  userLongitude,
  onPharmacyClick,
  selectedPharmacyId,
}: PharmacyMapProps) {
  const [map, setMap] = useState<L.Map | null>(null)

  useEffect(() => {
    // Default center: Cotonou, Bénin
    const lat = userLatitude || 6.3703
    const lng = userLongitude || 2.3912

    const mapInstance = L.map('pharmacy-map').setView([lat, lng], 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapInstance)

    setMap(mapInstance)

    return () => {
      mapInstance.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update markers when pharmacies change
  useEffect(() => {
    if (!map) return

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer)
      }
    })

    // Add user position
    if (userLatitude && userLongitude) {
      L.marker([userLatitude, userLongitude], { icon: userIcon })
        .addTo(map)
        .bindPopup('<strong>📍 Vous êtes ici</strong>')
    }

    // Add pharmacy markers
    pharmacies.forEach((pharmacy) => {
      if (pharmacy.latitude && pharmacy.longitude) {
        const icon = pharmacy.estGarde ? gardeIcon : pharmacyIcon
        const marker = L.marker([pharmacy.latitude, pharmacy.longitude], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:180px">
              <strong>${pharmacy.nom}</strong><br/>
              <span style="font-size:12px;color:#666">${pharmacy.adresse}</span><br/>
              <span style="font-size:12px">📞 ${pharmacy.telephone}</span>
              ${pharmacy.estGarde ? '<br/><span style="color:#EF9F27;font-weight:600">🛡️ Pharmacie de garde</span>' : ''}
              ${pharmacy.distance !== undefined ? `<br/><span style="font-size:12px">📏 ${pharmacy.distance.toFixed(1)} km</span>` : ''}
            </div>
          `)

        marker.on('click', () => {
          onPharmacyClick?.(pharmacy.id)
        })
      }
    })

    // Fit bounds if pharmacies exist
    if (pharmacies.length > 0) {
      const validPharmacies = pharmacies.filter(p => p.latitude && p.longitude)
      if (validPharmacies.length > 0) {
        const bounds = L.latLngBounds(
          validPharmacies.map(p => [p.latitude!, p.longitude!])
        )
        if (userLatitude && userLongitude) {
          bounds.extend([userLatitude, userLongitude])
        }
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }
  }, [map, pharmacies, userLatitude, userLongitude, onPharmacyClick, selectedPharmacyId])

  return (
    <div
      id="pharmacy-map"
      className="w-full h-[400px] rounded-xl overflow-hidden border border-teal-200"
      style={{ zIndex: 0 }}
    />
  )
}
