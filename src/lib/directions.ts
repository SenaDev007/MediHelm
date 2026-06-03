/**
 * Build a personalized Google Maps directions URL
 *
 * Features:
 * - Uses user's current position as origin (if available)
 * - Sets the pharmacy as destination with its name as a searchable label
 * - Defaults to driving mode
 * - Falls back to destination-only if user position is unavailable
 * - Uses destination name for Google Maps business listing lookup
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

  // Origin: user's current position for personalized routing
  if (originLat !== undefined && originLng !== undefined) {
    params.set('origin', `${originLat},${originLng}`)
  }

  // Destination: use pharmacy name for Google Maps search
  // Google Maps will match the name to a business listing if it exists,
  // and use coordinates as fallback for precise positioning
  if (destName) {
    // Include city and country for better search results in Benin
    const searchQuery = `${destName}, Bénin`
    params.set('destination', encodeURIComponent(searchQuery))
    // Also provide coordinates via the center parameter for precision
    params.set('destination_place_id', `${destLat},${destLng}`)
  } else {
    params.set('destination', `${destLat},${destLng}`)
  }

  // Travel mode
  params.set('travelmode', travelMode)

  // Auto-navigate action
  params.set('dir_action', 'navigate')

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/**
 * Build a personalized Google Maps link to show a place on the map
 * (without directions — just pin the location with a search query)
 *
 * This uses the search endpoint so Google Maps can find the actual
 * business listing with photos, reviews, hours, etc.
 */
export function buildMapUrl(lat: number, lng: number, name?: string): string {
  const params = new URLSearchParams()
  params.set('api', '1')

  if (name) {
    // Search for the pharmacy by name — Google Maps will show the
    // business listing if it exists (with reviews, hours, photos)
    params.set('query', encodeURIComponent(name))
    params.set('query_place_id', `${lat},${lng}`)
  } else {
    params.set('query', `${lat},${lng}`)
  }

  return `https://www.google.com/maps/search/?${params.toString()}`
}
