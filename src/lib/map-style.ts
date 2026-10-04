/**
 * Style de carte partage — tuiles vectorielles LIBRES (sans cle API).
 *
 * Par defaut : CARTO Voyager GL (fond OpenStreetMap, gratuit avec attribution).
 * Override possible via NEXT_PUBLIC_MAP_STYLE_URL (ex: style self-hoste, MapTiler, etc.)
 *
 * Aligne le code sur la documentation MediHelm (Leaflet + OpenStreetMap)
 * tout en conservant react-map-gl : ici via le provider MapLibre GL open-source,
 * ce qui supprime la dependance au token Mapbox (absent de la configuration).
 */

export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'

/** Style clair minimal (positron) — utile pour fonds de carte discrets */
export const MAP_STYLE_LIGHT_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_LIGHT_URL ||
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
