/**
 * Build a personalized Google Maps directions URL
 *
 * Features:
 * - Uses user's current position as origin (if available)
 * - Sets the pharmacy as destination using coordinates (most reliable)
 * - Pharmacy name shown via Google Maps reverse geocoding
 * - Defaults to driving mode
 * - Falls back to destination-only if user position is unavailable
 *
 * IMPORTANT: URLSearchParams.set() already URL-encodes values.
 * Do NOT use encodeURIComponent() on top — it causes double-encoding
 * (e.g. "%2520" instead of "%20") which breaks Google Maps display.
 *
 * @see https://developers.google.com/maps/documentation/urls/get-started#directions-feature
 */

interface DirectionsParams {
  /** Destination latitude */
  destLat: number
  /** Destination longitude */
  destLng: number
  /** Destination name (pharmacy name) — appended as URL fragment label */
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

  // Destination: use coordinates for reliability — Google Maps will
  // reverse-geocode them and show the place name automatically.
  // Using raw coordinates avoids search ambiguity and ensures
  // the route is always computed correctly.
  params.set('destination', `${destLat},${destLng}`)

  // Travel mode
  params.set('travelmode', travelMode)

  // Auto-navigate action
  params.set('dir_action', 'navigate')

  // Append pharmacy name as URL fragment so Google Maps can display
  // a readable label in the destination field
  const baseUrl = `https://www.google.com/maps/dir/?${params.toString()}`
  if (destName) {
    // Use fragment (#) to add a human-readable label without affecting the API
    return `${baseUrl}#${destName}`
  }

  return baseUrl
}

/**
 * Build a personalized Google Maps link to show a place on the map
 * (without directions — just pin the location with a search query)
 *
 * This uses the search endpoint so Google Maps can find the actual
 * business listing with photos, reviews, hours, etc.
 *
 * IMPORTANT: URLSearchParams.set() already URL-encodes values.
 * Do NOT double-encode with encodeURIComponent().
 *
 * @see https://developers.google.com/maps/documentation/urls/get-started#search-feature
 */
export function buildMapUrl(lat: number, lng: number, name?: string): string {
  const params = new URLSearchParams()
  params.set('api', '1')

  if (name) {
    // Search for the pharmacy by name + location context
    // Google Maps will match to a business listing if one exists
    params.set('query', `${name}`)
  } else {
    params.set('query', `${lat},${lng}`)
  }

  return `https://www.google.com/maps/search/?${params.toString()}`
}
