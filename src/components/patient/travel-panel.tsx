'use client'

import { Footprints, Bike, Car, Navigation, X, Flag, Phone, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { buildDirectionsUrl } from '@/lib/directions'
import { formatPhoneBenin } from '@/lib/phone'
import {
  formatKm,
  formatTravelDuration,
  etaLabel,
  haversineKm,
  travelModesFor,
  type RouteInfo,
  type TravelMode,
} from '@/lib/travel'

/**
 * Panneau d'itinéraire — kilométrage réel et durées par mode de transport
 * (marche / moto-zem / voiture), comme sur Google Maps.
 *
 * Deux états :
 *  - ITINÉRAIRE : distance routière réelle (OSRM) + estimation par mode +
 *    bouton externe Google Maps + bouton « Y aller ».
 *  - EN ROUTE : suivi de la position — kilométrage restant en direct,
 *    heure d'arrivée estimée, pastille « en déplacement » pulsée.
 */

const MODES: Array<{ id: TravelMode; label: string; icon: typeof Footprints }> = [
  { id: 'marche', label: 'Marche', icon: Footprints },
  { id: 'moto', label: 'Moto', icon: Bike },
  { id: 'voiture', label: 'Voiture', icon: Car },
]

export interface TravelPanelDestination {
  nom: string
  latitude: number | null
  longitude: number | null
  telephone?: string
}

export function TravelPanel({
  destination,
  routeInfo,
  userLat,
  userLng,
  travelMode,
  onModeChange,
  navigation,
  onToggleNavigation,
  onClose,
  className,
}: {
  destination: TravelPanelDestination
  routeInfo: RouteInfo | null
  userLat?: number
  userLng?: number
  travelMode: TravelMode
  onModeChange: (mode: TravelMode) => void
  navigation: boolean
  onToggleNavigation: () => void
  onClose: () => void
  className?: string
}) {
  const phone = formatPhoneBenin(destination.telephone)
  const hasCoords = destination.latitude != null && destination.longitude != null

  // Kilométrage restant (mode « en route ») — recalculé à chaque position
  const remainingKm = navigation && userLat != null && userLng != null && hasCoords
    ? haversineKm({ lat: userLat, lng: userLng }, { lat: destination.latitude!, lng: destination.longitude! }) * 1.35
    : null
  const arrived = remainingKm !== null && remainingKm < 0.15

  const routeKm = routeInfo?.distanceKm ?? null
  const modes = routeKm !== null ? travelModesFor(routeKm, routeInfo?.durationMin) : null
  const active = modes ? modes[travelMode] : null

  // En mode « en route » : durée restante proportionnelle au trajet restant
  const remainingRatio = routeKm && remainingKm !== null ? Math.min(1, remainingKm / routeKm) : 1
  const remainingMin = active ? active.min * remainingRatio : null

  return (
    <div
      className={cn(
        'z-40 rounded-2xl bg-white/97 backdrop-blur-md shadow-[0_10px_36px_rgba(0,0,0,0.22)] border border-teal-100',
        className
      )}
    >
      {/* ─── En-tête : destination + distance ─── */}
      <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-2">
        <div className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
          navigation ? 'bg-blue-50 text-[#378ADD]' : 'bg-primary/10 text-primary'
        )}>
          {navigation ? (
            <Navigation className="h-4.5 w-4.5 animate-pulse" strokeWidth={2.4} />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-teal-900 leading-tight truncate">{destination.nom}</p>
          {navigation ? (
            <p className="text-[11px] text-[#378ADD] font-semibold mt-0.5 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#378ADD] animate-pulse" />
              {arrived
                ? 'Vous êtes arrivé — destination à proximité'
                : remainingKm !== null
                  ? `${formatKm(remainingKm)} restants · arrivée ~${etaLabel(remainingMin ?? 0)}`
                  : 'En déplacement vers la pharmacie'}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {routeInfo
                ? routeInfo.exact
                  ? `Itinéraire routier · ${formatKm(routeInfo.distanceKm)}`
                  : `Distance estimée · ${formatKm(routeInfo.distanceKm)}`
                : 'Sélectionnez votre position pour l\'itinéraire'}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-gray-100"
          aria-label="Fermer l'itinéraire"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ─── Modes de transport : marche / moto / voiture ─── */}
      {modes && (
        <div className="flex gap-1.5 px-3 pb-2.5">
          {MODES.map(({ id, label, icon: Icon }) => {
            const est = modes[id]
            const selected = travelMode === id
            return (
              <button
                key={id}
                onClick={() => onModeChange(id)}
                className={cn(
                  'flex-1 rounded-xl px-2 py-2 text-center transition-colors border',
                  selected
                    ? 'bg-primary/10 border-primary/50'
                    : 'bg-white border-gray-200 hover:border-teal-200'
                )}
                aria-pressed={selected}
              >
                <Icon className={cn('h-4 w-4 mx-auto', selected ? 'text-primary' : 'text-gray-500')} />
                <div className={cn('text-[10px] font-semibold mt-1', selected ? 'text-teal-800' : 'text-gray-700')}>
                  {formatTravelDuration(navigation && selected ? (remainingMin ?? est.min) : est.min)}
                </div>
                <div className="text-[9px] text-muted-foreground">{formatKm(est.km)}</div>
                <div className="text-[9px] text-muted-foreground mt-0.5">{label}</div>
              </button>
            )
          })}
        </div>
      )}

      {/* ─── Actions ─── */}
      <div className="flex gap-2 px-3.5 pb-3 pt-0.5">
        {navigation ? (
          <>
            {phone && (
              <a href={`tel:${phone.tel}`} className="flex-1">
                <Button size="sm" className="w-full h-9 text-xs bg-primary hover:bg-teal-700">
                  <Phone className="h-3.5 w-3.5 mr-1" />
                  Appeler
                </Button>
              </a>
            )}
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-9 text-xs border-[#378ADD] text-[#378ADD] hover:bg-blue-50"
              onClick={onToggleNavigation}
            >
              <Flag className="h-3.5 w-3.5 mr-1" />
              Terminer
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              className="flex-1 h-9 text-xs bg-[#378ADD] hover:bg-[#2A6FBF] text-white"
              disabled={!hasCoords || userLat == null || userLng == null || !routeInfo}
              onClick={onToggleNavigation}
              title={userLat == null ? 'Activez votre localisation' : 'Suivre mon trajet vers la pharmacie'}
            >
              {routeInfo ? <Navigation className="h-3.5 w-3.5 mr-1" /> : <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Y aller
            </Button>
            <a
              href={hasCoords
                ? buildDirectionsUrl({
                    destLat: destination.latitude!,
                    destLng: destination.longitude!,
                    destName: destination.nom,
                    originLat: userLat,
                    originLng: userLng,
                  })
                : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
              onClick={(e) => { if (!hasCoords) e.preventDefault() }}
            >
              <Button size="sm" variant="outline" className="w-full h-9 text-xs border-primary text-primary hover:bg-teal-50">
                Google Maps
              </Button>
            </a>
          </>
        )}
      </div>
    </div>
  )
}
