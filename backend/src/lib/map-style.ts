/**
 * Style de carte MediHelm — tuiles vectorielles LIBRES (sans clé API).
 *
 * Le style par défaut est le style CARTO Voyager ENTÈREMENT RETHÉMATISÉ aux
 * couleurs de la marque MediHelm (teal #1D9E75 / #0F6E56, ambre #EF9F27) :
 * eau teal médical, terre ivoire, autoroutes ambre, libellés teal profond.
 * Il est régénéré par `node scripts/build-medihelm-map-style.mjs` et servi
 * depuis /public/map/ (auto-hébergé, aucune dépendance à un token).
 *
 * Géographie : fond OpenStreetMap via CARTO — mêmes coordonnées que Google
 * Maps (WGS84). Le lien « Voir sur Google Maps » reste proposé sur chaque
 * officine (voir lib/directions.ts).
 *
 * Override possible via NEXT_PUBLIC_MAP_STYLE_URL (style self-hébergé, etc.)
 * MAP_STYLE_FALLBACK_URL sert de repli CDN si le fichier local est absent.
 */

/** Style de marque MediHelm (auto-hébergé, rethématisé Voyager) */
export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || '/map/medihelm-voyager-style.json'

/** Repli : style CARTO Voyager CDN si le style local est indisponible */
export const MAP_STYLE_FALLBACK_URL =
  'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'

/** Style clair minimal (positron) — utile pour fonds de carte discrets */
export const MAP_STYLE_LIGHT_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_LIGHT_URL ||
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
