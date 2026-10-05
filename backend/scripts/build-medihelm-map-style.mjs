/**
 * build-medihelm-map-style.mjs
 * Construit un style de carte VECTORIEL entièrement rethématisé aux couleurs MediHelm.
 *
 * Principe : on part du style CARTO Voyager (fond OpenStreetMap, tuiles vectorielles
 * libres — mêmes coordonnées géographiques que Google Maps) et on applique une table
 * de recoloration complète (fond de carte, eau, routes, parcs, bâtiments, libellés).
 * Résultat : une « styled map » à la MediHelm, hébergée dans public/map/, sans token.
 *
 * Usage : node scripts/build-medihelm-map-style.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'

const VOYAGER_URL = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
const CACHE = '/tmp/voyager-style.json'
const OUT = 'public/map/medihelm-voyager-style.json'

// ─── Palette MediHelm (guide de marque : teal #1D9E75/#0F6E56 + ambre #EF9F27) ──
// Mapping exact couleur Voyager → couleur MediHelm. Les structures (stops,
// opacités) sont conservées : seule la teinte change.
const MEDIHELM_COLORS = {
  // Fond de carte / terre
  '#fbf8f3': '#F7F6F0', // background — ivoire chaud
  '#f0eee7': '#EFEEE6',
  '#f3efed': '#F0EFE9',
  '#f3eadc': '#F1ECE0',
  '#f2f5f8': '#F4F6F3',

  // Eau — teal médical MediHelm
  '#b0d0d6': '#C0E0D8',
  '#cce7ea': '#B4DDD3',
  '#e2eef0': '#DDEFEB',
  '#98c2ca': '#8FC9BE',
  'rgba(203, 225, 228, 1)': 'rgba(173, 216, 208, 1)',
  '#51909c': '#2E8A76', // libellés hydro

  // Parcs / espaces verts — vert sauge teal
  'rgba(197, 225, 178, 0.2)': 'rgba(158, 206, 184, 0.2)',
  'rgba(197, 225, 178, 0.25)': 'rgba(158, 206, 184, 0.25)',
  'rgba(197, 225, 178, 0.35)': 'rgba(158, 206, 184, 0.35)',
  'rgba(197, 225, 178, 0.4)': 'rgba(158, 206, 184, 0.4)',
  '#e0ecd3': '#DCEEE4',
  '#e9d8be': '#E3DFC9',

  // Zones résidentielles / occupation du sol
  'rgba(243, 234, 220, 0.5)': 'rgba(240, 238, 225, 0.5)',
  'rgba(243, 234, 220, 0.45)': 'rgba(240, 238, 225, 0.45)',
  'rgba(243, 234, 220, 0.4)': 'rgba(240, 238, 225, 0.4)',
  'rgba(243, 234, 220, 0.35)': 'rgba(240, 238, 225, 0.35)',
  'rgba(243, 234, 220, 0.3)': 'rgba(240, 238, 225, 0.3)',
  'rgba(243, 234, 220, 0.25)': 'rgba(240, 238, 225, 0.25)',
  'rgba(243, 234, 220, 0.15)': 'rgba(240, 238, 225, 0.15)',

  // Bâtiments — sable chaud
  '#e4dcd0': '#E5DFD0',
  '#fdebce': '#F0EAD8',
  '#ebd6d8': '#E6DCD8',
  '#ead5d7': '#E3DBD8',

  // Routes — cases sable, remplissages ivoire, autoroute AMBRE MediHelm
  '#e6dfcb': '#E2DCC8',
  '#d7d7d7': '#D9D4C7',
  '#d4d5d6': '#D2D8D3',
  '#fefdd7': '#FDFAEC',
  '#fffef9': '#FDFCF4',
  '#fefde1': '#FCF9E6',
  '#FFE9A5': '#F6C36A', // autoroute — ambre MediHelm
  '#fbdb98': '#F2C879',
  '#ffeabb': '#F6D392',
  '#ffe7b7': '#F4CE8A',
  '#ffedc0': '#F7D8A2',
  '#fff0c4': '#F8DBA9',
  '#d2b17d': '#CFA86F',
  '#e1c5c7': '#CBDAD4', // frontières comtés
  '#e8e8e8': '#E7E4D9',
  '#dddddd': '#DCD9CD',

  // Libellés — le bleu Voyager devient le TEAL PROFOND MediHelm
  '#405c78': '#0F6E56', // libellés principaux (villes, pays)
  '#6b7d91': '#67787A',
  '#8894a3': '#7F8C8E',
  '#a3abb5': '#9AA5A3',
  '#87919e': '#848F8D',
  '#798493': '#76817F',
  '#7c8a9b': '#798681',
  '#666666': '#5C6B66',
  'rgba(238, 238, 238, 1)': 'rgba(240, 243, 240, 1)',
  'rgba(255,255,255,0.15)': 'rgba(255,255,255,0.18)',
}

async function loadVoyager() {
  if (existsSync(CACHE)) {
    return JSON.parse(readFileSync(CACHE, 'utf8'))
  }
  const res = await fetch(VOYAGER_URL)
  if (!res.ok) throw new Error(`fetch Voyager ${res.status}`)
  const style = await res.json()
  writeFileSync(CACHE, JSON.stringify(style))
  return style
}

function recolor(node, stats) {
  if (Array.isArray(node)) {
    return node.map((v) => recolor(v, stats))
  }
  if (node && typeof node === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(node)) out[k] = recolor(v, stats)
    return out
  }
  if (typeof node === 'string' && node in MEDIHELM_COLORS) {
    stats.replaced += 1
    return MEDIHELM_COLORS[node]
  }
  return node
}

const style = await loadVoyager()
const stats = { replaced: 0 }

const branded = recolor(style, stats)
branded.name = 'MediHelm Voyager'
branded.id = 'medihelm-voyager'

// Halos des libellés : on force un halo ivoire cohérent avec le nouveau fond
for (const layer of branded.layers) {
  const paint = layer.paint ?? (layer.paint = {})
  if (layer.type === 'symbol' && paint['text-halo-color'] === undefined) {
    // Voyager définit le halo via text-halo-color existant — recoloré ci-dessus
    continue
  }
}

mkdirSync('public/map', { recursive: true })
writeFileSync(OUT, JSON.stringify(branded))
console.log(`✔ Style MediHelm généré : ${OUT}`)
console.log(`  ${branded.layers.length} couches, ${stats.replaced} couleurs rethématisées`)
console.log(`  sources : ${Object.keys(branded.sources).join(', ')} (tuiles OSM via CARTO — sans token)`)
