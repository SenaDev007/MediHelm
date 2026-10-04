'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Phone, Navigation, ShieldCheck, ExternalLink, Clock, Check } from 'lucide-react'
import { buildDirectionsUrl, buildMapUrl } from '@/lib/directions'
import { formatPhoneBenin } from '@/lib/phone'

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
  inscriteMediHelm?: boolean
  medicamentDispo?: boolean
  userLatitude?: number
  userLongitude?: number
  onSelect?: () => void
  // ─── Registre officiel ABMed ───
  numeroAbmed?: string | null
  officielle?: boolean
  departement?: string | null
  zoneSanitaire?: string | null
  commune?: string | null
  arrondissement?: string | null
  // ─── Garde du jour ───
  gardeHeureDebut?: string | null
  gardeHeureFin?: string | null
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
  inscriteMediHelm,
  medicamentDispo,
  userLatitude,
  userLongitude,
  onSelect,
  numeroAbmed,
  officielle,
  departement,
  zoneSanitaire,
  commune,
  arrondissement,
  gardeHeureDebut,
  gardeHeureFin,
}: PharmacyCardProps) {
  const phone = formatPhoneBenin(telephone)

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
      className={`hover:shadow-md transition-shadow cursor-pointer ${estGarde ? 'border-amber-300 bg-gradient-to-br from-amber-50/70 to-white' : 'border-teal-200'}`}
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
              {/* Inscrite sur MediHelm (services complets) vs registre ABMed seul */}
              {inscriteMediHelm ? (
                <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border border-primary/30">
                  <Check className="h-3 w-3 mr-0.5" /> Sur MediHelm
                </Badge>
              ) : numeroAbmed ? (
                <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-600 border border-gray-200">
                  ABMed · {numeroAbmed}
                </Badge>
              ) : null}
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
            {/* Département · Zone sanitaire · Commune · Arrondissement (registre ABMed) */}
            {(departement || zoneSanitaire || commune || arrondissement) && (
              <div className="flex items-center flex-wrap gap-1 mt-1.5">
                {departement && (
                  <span className="text-[10px] font-semibold text-teal-800 bg-teal-100/70 px-1.5 py-0.5 rounded">
                    {departement}
                  </span>
                )}
                {commune && commune !== ville && (
                  <span className="text-[10px] font-medium text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded">
                    {commune}
                  </span>
                )}
                {zoneSanitaire && (
                  <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                    ZS {zoneSanitaire}
                  </span>
                )}
                {arrondissement && (
                  <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    {arrondissement}
                  </span>
                )}
              </div>
            )}
            {/* Statut de garde du jour + horaires */}
            {estGarde && (
              <div className="flex items-center gap-1.5 mt-2 w-fit rounded-md border border-amber-300/60 bg-amber-50 px-2 py-1">
                <Clock className="h-3 w-3 text-amber-600 flex-shrink-0" />
                <span className="text-[11px] font-semibold text-amber-700">
                  De garde aujourd&apos;hui{(gardeHeureDebut && gardeHeureFin) ? ` · ${gardeHeureDebut} — ${gardeHeureFin}` : ''}
                </span>
              </div>
            )}
            {/* Téléphone de l'officine — format béninois 01 … */}
            <div className="flex items-center gap-3 mt-1.5">
              {phone ? (
                <a
                  href={`tel:${phone.tel}`}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="h-3 w-3" />
                  {phone.display}
                </a>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  Non publié
                </span>
              )}
            </div>
          </div>
          {distance !== undefined && (
            <div className="flex-shrink-0 text-right">
              <p className={`text-lg font-bold ${estGarde ? 'text-amber-600' : 'text-primary'}`}>{distance.toFixed(1)}</p>
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
          {phone && (
            <a href={`tel:${phone.tel}`} onClick={(e) => e.stopPropagation()}>
              <Button size="sm" className="h-8 text-xs bg-primary hover:bg-teal-700">
                <Phone className="h-3 w-3 mr-1" />
                Appeler
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
