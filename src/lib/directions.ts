/**
 * Build a personalized Google Maps directions URL
 *
 * Features:
 * - Uses user's current position as origin (if available)
 * - Sets the pharmacy as destination with its name as a place label
 * - Defaults to driving mode
 * - Falls back to destination-only if user position is unavailable
 *
 * @see https://developers.google.com/maps/documentation/urls/get-started#directions-feature
 */

interface DirectionsParams {
  /** Destination latitude */
  destLat: number
  /** Destination longitude */
  destLng: number
  /** Destination name (pharmacy name) — used as place label */
  destName?: string
  /** User's current latitude (optional) */
  originLat?: number
  /** User's current longitude (optional) */
  originLng?: number
  /** Travel mode: driving (default), walking, bicycling, transit */
  travelMode?: 'driving' | 'walking' | 'bicycling' | 'transit'
}

export function buildDirectionsUrl({
  destLat,
  destLng,
  destName,
  originLat,
  originLng,
  travelMode = 'driving',
}: DirectionsParams): string {
  const params = new URLSearchParams()
  params.set('api', '1')

  // Origin: user's current position
  if (originLat !== undefined && originLng !== undefined) {
    params.set('origin', `${originLat},${originLng}`)
  }

  // Destination: pharmacy coordinates + name as place ID
  // Using destination=place_id format doesn't work with coordinates,
  // so we use the coordinates and set the destination name via the URL fragment
  const encodedName = destName ? encodeURIComponent(destName) : ''
  params.set('destination', encodedName ? `${encodedName}@${destLat},${destLng}` : `${destLat},${destLng}`)

  // Travel mode
  params.set('travelmode', travelMode)

  // Directionsb waypoints action
  params.set('dir_action', 'navigate')

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/**
 * Build a simple Google Maps link to show a place on the map
 * (without directions — just pin the location)
 */
export function buildMapUrl(lat: number, lng: number, name?: string): string {
  const encodedName = name ? encodeURIComponent(name) : ''
  if (encodedName) {
    return `https://www.google.com/maps/search/?api=1&query=${encodedName}&center=${lat},${lng}`
  }
  return `https://www.google.com/maps/@?api=1&map_action=map&center=${lat},${lng}&zoom=16`
}
