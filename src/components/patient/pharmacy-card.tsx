'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Phone, Navigation, ShieldCheck, ExternalLink } from 'lucide-react'
import { buildDirectionsUrl, buildMapUrl } from '@/lib/directions'

interface PharmacyCardProps {
  id: string
  nom: string
  adresse: string
  ville: string
  telephone: string
  latitude?: number | null
  longitude?: number | null
  distance?: number
  estGarde?: boolean
  medicamentDispo?: boolean
  userLatitude?: number
  userLongitude?: number
  onSelect?: () => void
}

export function PharmacyCard({
  id,
  nom,
  adresse,
  ville,
  telephone,
  latitude,
  longitude,
  distance,
  estGarde = false,
  medicamentDispo,
  userLatitude,
  userLongitude,
  onSelect,
}: PharmacyCardProps) {
  const directionsUrl = latitude && longitude
    ? buildDirectionsUrl({
        destLat: latitude,
        destLng: longitude,
        destName: nom,
        originLat: userLatitude,
        originLng: userLongitude,
      })
    : '#'

  const mapUrl = latitude && longitude
    ? buildMapUrl(latitude, longitude, `${nom} ${ville} Bénin`)
    : '#'

  return (
    <Card
      className="hover:shadow-md transition-shadow border-teal-200 cursor-pointer"
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Pharmacy icon + name */}
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg width={10} height={10} viewBox="0 0 10 10" fill="#1D9E75">
                    <rect x={3.5} y={1} width={3} height={8} rx={0.5} />
                    <rect x={1} y={3.5} width={8} height={3} rx={0.5} />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm truncate">{nom}</h3>
              </div>
              {estGarde && (
                <Badge className="text-[10px] bg-amber-500 text-white border-0">
                  <ShieldCheck className="h-3 w-3 mr-0.5" /> Garde
                </Badge>
              )}
              {medicamentDispo === true && (
                <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700 border-0">
                  Disponible
                </Badge>
              )}
              {medicamentDispo === false && (
                <Badge variant="secondary" className="text-[10px] bg-red-50 text-red-700 border-0">
                  Indisponible
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{adresse}, {ville}</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <a
                href={`tel:${telephone}`}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="h-3 w-3" />
                {telephone}
              </a>
            </div>
          </div>
          {distance !== undefined && (
            <div className="flex-shrink-0 text-right">
              <p className="text-lg font-bold text-primary">{distance.toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground">km</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs border-primary text-primary hover:bg-teal-50"
            onClick={(e) => {
              e.stopPropagation()
              if (directionsUrl !== '#') window.open(directionsUrl, '_blank')
            }}
          >
            <Navigation className="h-3 w-3 mr-1" />
            Itinéraire
          </Button>
          {mapUrl !== '#' && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground hover:text-primary"
              onClick={(e) => {
                e.stopPropagation()
                window.open(mapUrl, '_blank')
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Google Maps
            </Button>
          )}
          <a href={`tel:${telephone}`} onClick={(e) => e.stopPropagation()}>
            <Button size="sm" className="h-8 text-xs bg-primary hover:bg-teal-700">
              <Phone className="h-3 w-3 mr-1" />
              Appeler
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
