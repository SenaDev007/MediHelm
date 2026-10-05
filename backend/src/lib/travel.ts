/**
 * Estimation d'itinéraire — kilométrage et durées par mode de transport.
 *
 * Deux niveaux de précision :
 *  1. OSRM (serveur public de démonstration, profil voiture, zéro token) :
 *     distance routière RÉELLE + durée voiture réelle + polyligne complète.
 *  2. Repli hors ligne : distance à vol d'oiseau × facteur routier moyen du
 *     Bénin (~1,35) — suffisant pour un ordre de grandeur.
 *
 * Les durées marche / moto (zem) sont déduites de la distance routière avec
 * des vitesses moyennes représentatives du terrain béninois :
 *   - marche   : ~4,5 km/h
 *   - moto/zem : ~22 km/h (trafic urbain Cotonou/Calavi)
 *   - voiture  : durée OSRM réelle (ou ~35 km/h en repli)
 */

export interface LatLng {
  lat: number
  lng: number
}

export type TravelMode = 'marche' | 'moto' | 'voiture'

export interface RouteInfo {
  /** Distance routière en km (OSRM) ou estimée (repli) */
  distanceKm: number
  /** Durée voiture en minutes (OSRM) ou estimée */
  durationMin: number
  /** Polyligne [lng, lat] pour le tracé sur la carte */
  coords: Array<[number, number]>
  /** true = itinéraire routier réel (OSRM), false = estimation vol d'oiseau */
  exact: boolean
}

export interface ModeEstimate {
  km: number
  min: number
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

/**
 * Récupère l'itinéraire routier entre deux points.
 * À appeler au moment où l'utilisateur choisit une destination (appel réseau —
 * pas de boucle serrée).
 */
export async function fetchRoute(origin: LatLng, dest: LatLng): Promise<RouteInfo> {
  const url = `${OSRM_BASE}/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(9000) })
    if (!res.ok) throw new Error(`OSRM ${res.status}`)
    const data = await res.json()
    const route = data?.routes?.[0]
    if (!route || !Array.isArray(route.geometry?.coordinates) || route.geometry.coordinates.length < 2) {
      throw new Error('OSRM: itinéraire vide')
    }
    return {
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
      coords: route.geometry.coordinates as Array<[number, number]>,
      exact: true,
    }
  } catch {
    // Repli : estimation à vol d'oiseau corrigée
    const km = haversineKm(origin, dest) * 1.35
    return {
      distanceKm: km,
      durationMin: (km / 35) * 60,
      coords: [[origin.lng, origin.lat], [dest.lng, dest.lat]],
      exact: false,
    }
  }
}

/** Vitesses moyennes (km/h) utilisées pour les modes sans profil OSRM dédié */
const MODE_SPEED: Record<Exclude<TravelMode, 'voiture'>, number> = {
  marche: 4.5,
  moto: 22,
}

/** Durée voiture de repli (km/h) quand OSRM est indisponible */
const VOITURE_FALLBACK_SPEED = 35

/**
 * Durées estimées par mode de transport à partir de la distance routière.
 * `drivingDurationMin` (OSRM) prime pour la voiture lorsqu'il est fourni.
 */
export function travelModesFor(distanceKm: number, drivingDurationMin?: number): Record<TravelMode, ModeEstimate> {
  return {
    marche: { km: distanceKm, min: (distanceKm / MODE_SPEED.marche) * 60 },
    moto: { km: distanceKm, min: (distanceKm / MODE_SPEED.moto) * 60 },
    voiture: {
      km: distanceKm,
      min: drivingDurationMin ?? (distanceKm / VOITURE_FALLBACK_SPEED) * 60,
    },
  }
}

/** Formate une durée : « 8 min », « 45 min », « 1 h 05 », « 2 h 30 » */
export function formatTravelDuration(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return '—'
  if (min < 60) return `${Math.max(1, Math.round(min))} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (m === 0) return `${h} h`
  if (m === 60) return `${h + 1} h`
  return `${h} h ${String(m).padStart(2, '0')}`
}

/** Formate une distance : « 850 m », « 3,2 km », « 128 km » */
export function formatKm(km: number): string {
  if (!Number.isFinite(km)) return '—'
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`
  return `${Math.round(km)} km`
}

/** Heure d'arrivée estimée (HH:MM) dans le fuseau local */
export function etaLabel(durationMin: number): string {
  const arrival = new Date(Date.now() + durationMin * 60_000)
  return arrival.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
