'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import MapGL, { Marker, Popup, NavigationControl, GeolocateControl, Source, Layer } from 'react-map-gl/maplibre'
import type { MapRef, LngLatBoundsLike } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapPin, Phone, Navigation, ShieldCheck, Check, X, Clock, ExternalLink, Info } from 'lucide-react'
import { buildDirectionsUrl, buildMapUrl } from '@/lib/directions'
import { formatPhoneBenin } from '@/lib/phone'
import { fetchRoute, type RouteInfo } from '@/lib/travel'
import { MAP_STYLE_URL, MAP_STYLE_FALLBACK_URL } from '@/lib/map-style'
import { cn } from '@/lib/utils'

/**
 * Carte géolocalisation PERSONNALISÉE MediHelm.
 *
 * - Fond de carte rethématisé aux couleurs de la marque (voir lib/map-style.ts,
 *   généré par scripts/build-medihelm-map-style.mjs) — même géographie OSM que
 *   Google Maps, zéro token.
 *
 * - COULEURS DES PINS (vue d'ensemble nationale) :
 *     · GRIS  — officine simplement référencée au registre ABMed (aucun compte
 *       MediHelm : informations de localisation uniquement) ;
 *     · VERT  — officine INSCRITE sur MediHelm (compte rattaché : stocks,
 *       gardes, services en ligne exploitables par le patient) ;
 *     · AMBRE — officine de garde aujourd'hui (priorité sur le vert : c'est
 *       l'information la plus actionnable pour le patient).
 *   Une officine qui s'inscrit officiellement passe donc du gris au vert.
 *
 * - PINS DIRECTS (zéro badge de comptage) : chaque officine est affichée
 *   en permanence à ses COORDONNÉES EXACTES — aucun badge circulaire ni
 *   agrégat ne se superpose aux pins. Les effectifs par département
 *   (nombre d'officines, nombre de gardes) sont consultables dans la
 *   LÉGENDE DÉPARTEMENTALE en bas de carte (panneau cliquable → zoom sur
 *   le département concerné).
 * - BADGE NOM : chaque pin individuel est accompagné du nom de l'officine,
 *   visible en permanence dès que le zoom sépare les officines — comme les
 *   labels Google Maps.
 *
 * - SURVOL (PC) : la fiche holographique s'affiche au passage du curseur et
 *   reste stable (délai de grâce 320 ms) ; CLIC (PC & mobile) : la fiche reste
 *   ouverte avec les actions. Elle s'affiche TOUJOURS AU-DESSUS du pin et la
 *   carte se décale pour n'être jamais masquée par la barre de navigation.
 *
 * - ITINÉRAIRES routiers réels OSRM (zéro token) : tracé sur la carte + panneau
 *   Marche/Moto/Voiture (km + durées) + mode « Y aller » avec suivi GPS.
 */

const MAP_STYLE = MAP_STYLE_URL // Style de marque MediHelm — auto-hébergé

/** Zoom au-delà duquel les badges nominatifs s'affichent sur les pins.
 *  Seuil HAUT : en zoom national/régional, seuls les PINS sont visibles
 *  (pas de pluie d'étiquettes sur les zones denses comme Cotonou) — les noms
 *  apparaissent dès que la vue « sépare » réellement les officines. */
const LABEL_ZOOM = 10.5
/** Délai de grâce avant fermeture de la fiche de survol (ms) */
const HOVER_GRACE_MS = 320

/**
 * Étendues géographiques réelles des 12 départements — boîtes englobantes
 * [ouest, sud, est, nord]. Servent au ZOOM par département déclenché depuis
 * la légende départementale (clic sur une ligne « ATACORA — 26 officines »).
 */
const DEPT_BOUNDS: Record<string, [number, number, number, number]> = {
  ALIBORI:    [2.55, 10.90, 3.65, 12.00],
  ATACORA:    [0.75,  9.90, 2.15, 11.15],
  DONGA:      [1.15,  9.30, 1.95,  9.95],
  BORGOU:     [2.15,  8.70, 3.45, 10.45], // Kalalé (3.38E) inclus
  COLLINES:   [1.65,  7.10, 2.65,  8.65],
  ZOU:        [1.85,  6.90, 2.45,  7.55],
  COUFFO:     [1.45,  6.65, 2.05,  7.15],
  ATLANTIQUE: [1.85,  6.15, 2.42,  6.95],
  LITTORAL:   [2.28,  6.15, 2.55,  6.48],
  OUEME:      [2.45,  6.15, 2.85,  6.85],
  PLATEAU:    [2.25,  6.55, 3.05,  7.45],
  MONO:       [1.55,  6.15, 2.05,  6.75],
}

/** Noms d'affichage des départements (légende) */
const DEPT_DISPLAY: Record<string, string> = {
  ALIBORI: 'Alibori',
  ATACORA: 'Atacora',
  DONGA: 'Donga',
  BORGOU: 'Borgou',
  COLLINES: 'Collines',
  ZOU: 'Zou',
  COUFFO: 'Couffo',
  ATLANTIQUE: 'Atlantique',
  LITTORAL: 'Littoral',
  OUEME: 'Ouémé',
  PLATEAU: 'Plateau',
  MONO: 'Mono',
}

export interface PharmacyMapPoint {
  id: string
  nom: string
  adresse: string
  telephone: string
  latitude: number | null
  longitude: number | null
  estGarde?: boolean
  distance?: number
  ville?: string
  medicamentDispo?: boolean
  /** Officine inscrite sur MediHelm (au moins un compte rattaché) → pin vert */
  inscriteMediHelm?: boolean
  // ─── Registre officiel ABMed (fiche complète de l'officine) ───
  numeroAbmed?: string | null
  officielle?: boolean
  departement?: string | null
  zoneSanitaire?: string | null
  commune?: string | null
  arrondissement?: string | null
  localisation?: string | null
  pharmacienTitulaire?: string | null
  // ─── Garde du jour (heures de la vacation) ───
  gardeHeureDebut?: string | null
  gardeHeureFin?: string | null
}

interface PharmacyMapProps {
  pharmacies: PharmacyMapPoint[]
  userLatitude?: number
  userLongitude?: number
  onPharmacyClick?: (pharmacyId: string) => void
  selectedPharmacyId?: string
  onBoundsChange?: (bounds: LngLatBoundsLike) => void
  height?: string
  className?: string
  /** Destination d'itinéraire active — trace la route depuis l'utilisateur */
  route?: { destLat: number; destLng: number; destNom: string } | null
  /** Remonte l'itinéraire calculé (distance réelle, durée, tracé) */
  onRouteInfo?: (info: RouteInfo | null) => void
  /** Mode « en route » : la carte suit l'utilisateur et le marqueur pulse */
  navigation?: boolean
}

// ─── Variantes de couleur des pins ──────────────────────────────────────────
type PinVariant = 'garde' | 'inscrite' | 'registre'

function pinVariant(p: { estGarde?: boolean; inscriteMediHelm?: boolean }): PinVariant {
  if (p.estGarde) return 'garde' // la garde prime : info la plus actionnable
  if (p.inscriteMediHelm) return 'inscrite'
  return 'registre'
}

const PIN_COLORS: Record<PinVariant, { top: string; bottom: string; cross: string; labelColor: string; labelBorder: string; labelBg: string }> = {
  garde:    { top: '#F5B24B', bottom: '#D97E12', cross: '#D97E12', labelColor: '#92610A', labelBorder: 'rgba(217,126,18,0.55)', labelBg: 'rgba(255,251,235,0.95)' },
  inscrite: { top: '#27B086', bottom: '#0F6E56', cross: '#0F6E56', labelColor: '#0B5B47', labelBorder: 'rgba(15,110,86,0.35)',  labelBg: 'rgba(255,255,255,0.95)' },
  registre: { top: '#A8B0B9', bottom: '#6B7280', cross: '#4B5563', labelColor: '#4B5563', labelBorder: 'rgba(107,114,128,0.45)', labelBg: 'rgba(255,255,255,0.95)' },
}

// ─── Pin officine MediHelm — écusson personnalisé + badge nominatif ─────────
function PharmacyMarker({
  nom,
  variant,
  isSelected,
  isDimmed,
  showLabel,
  onHover,
  onLeave,
  onClick,
}: {
  nom: string
  variant: PinVariant
  isSelected?: boolean
  isDimmed?: boolean
  showLabel: boolean
  onHover: () => void
  onLeave: () => void
  onClick: () => void
}) {
  const size = isSelected ? 46 : 36
  const pinH = size + 14
  const c = PIN_COLORS[variant]
  const gradId = `mh-grad-${variant}-${size}`

  return (
    <button
      type="button"
      aria-label={nom}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      className="medihelm-pin group border-0 bg-transparent cursor-pointer p-0 block"
      style={{ width: size, height: pinH }}
    >
      <svg width={size} height={pinH} viewBox={`0 0 ${size} ${pinH}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c.top} />
            <stop offset="100%" stopColor={c.bottom} />
          </linearGradient>
        </defs>

        {/* Ombre portée au sol */}
        <ellipse cx={size / 2} cy={pinH - 2} rx={size * 0.24} ry={2.6} fill="rgba(15,110,86,0.25)" />

        {/* Tête de pin — goutte inversée arrondie */}
        <path
          d={`M${size / 2} ${pinH - 3}
              C ${size / 2 - 2.4} ${pinH - 3 - size * 0.42} ${size * 0.14} ${size * 0.86} ${size * 0.14} ${size * 0.5}
              C ${size * 0.14} ${size * 0.2} ${size * 0.34} 2 ${size / 2} 2
              C ${size * 0.66} 2 ${size * 0.86} ${size * 0.2} ${size * 0.86} ${size * 0.5}
              C ${size * 0.86} ${size * 0.86} ${size / 2 + 2.4} ${pinH - 3 - size * 0.42} ${size / 2} ${pinH - 3} Z`}
          fill={`url(#${gradId})`}
          stroke="white"
          strokeWidth="2.4"
        />

        {/* Écusson intérieur */}
        <rect
          x={size / 2 - size * 0.21}
          y={size * 0.5 - size * 0.27}
          width={size * 0.42}
          height={size * 0.42}
          rx={size * 0.1}
          fill="rgba(255,255,255,0.92)"
        />

        {/* Croix pharmacie (brand MediHelm) */}
        <g transform={`translate(${size / 2}, ${size * 0.5 - size * 0.06})`} fill={c.cross}>
          <rect x={-size * 0.045} y={-size * 0.145} width={size * 0.09} height={size * 0.29} rx={size * 0.02} />
          <rect x={-size * 0.145} y={-size * 0.045} width={size * 0.29} height={size * 0.09} rx={size * 0.02} />
        </g>

        {/* Pastille « garde » — point ambre + halo */}
        {variant === 'garde' && (
          <>
            <circle cx={size - 4} cy={8} r={7} fill="#EF9F27" stroke="white" strokeWidth="2" />
            <circle cx={size - 4} cy={8} r={3.2} fill="white" />
          </>
        )}

        {/* Pastille verte « inscrite MediHelm » */}
        {variant === 'inscrite' && (
          <>
            <circle cx={size - 4} cy={8} r={7} fill="#1D9E75" stroke="white" strokeWidth="2" />
            <circle cx={size - 4} cy={8} r={2.6} fill="white" />
          </>
        )}

        {/* Indisponible (recherche médicament) — pin estompé + pastille grise */}
        {isDimmed && (
          <>
            <circle cx={4} cy={size * 0.5} r={6.5} fill="#6B7280" stroke="white" strokeWidth="2" />
            <path d={`M1.4 ${size * 0.5} l5.2 -5.2 M1.4 ${size * 0.5} l5.2 5.2`} stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </>
        )}

        {/* Halo sélection — pulsation */}
        {isSelected && (
          <circle cx={size / 2} cy={size * 0.5 - size * 0.06} r={size * 0.44} fill="none" stroke={c.bottom} strokeWidth="2.4" opacity="0.45">
            <animate attributeName="r" from={size * 0.36} to={size * 0.55} dur="1.1s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.5" to="0" dur="1.1s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>

      {/* Badge nominatif — toujours visible (sans survol), comme Google Maps */}
      {showLabel && (
        <span
          aria-hidden
          className="pointer-events-none absolute whitespace-nowrap max-w-[128px] truncate text-[10px] font-semibold leading-none px-1.5 py-[3px] rounded-md shadow-sm"
          style={{
            left: 'calc(100% + 3px)',
            top: 8,
            background: c.labelBg,
            color: c.labelColor,
            border: `1px solid ${c.labelBorder}`,
            backdropFilter: 'blur(2px)',
          }}
        >
          {nom}
        </span>
      )}
    </button>
  )
}

// ─── Fiche officine « holographique » (contenu popup — Lucide, zéro emoji) ──
function PharmacyCard({
  p,
  userLatitude,
  userLongitude,
  interactive,
  onEnter,
  onLeave,
}: {
  p: PharmacyMapPoint
  userLatitude?: number
  userLongitude?: number
  interactive: boolean
  onEnter?: () => void
  onLeave?: () => void
}) {
  const phone = formatPhoneBenin(p.telephone)
  const variant = pinVariant(p)
  const c = PIN_COLORS[variant]

  const headerGradient =
    variant === 'garde'
      ? 'linear-gradient(135deg, #F5B24B 0%, #D97E12 100%)'
      : variant === 'inscrite'
        ? 'linear-gradient(135deg, #27B086 0%, #0F6E56 100%)'
        : 'linear-gradient(135deg, #A8B0B9 0%, #6B7280 100%)'

  return (
    <div
      style={{
        minWidth: 236,
        maxWidth: 286,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: 0,
        borderRadius: 12,
        overflow: 'hidden',
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* Bandeau marque */}
      <div
        style={{
          background: headerGradient,
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width={16} height={16} viewBox="0 0 16 16" fill="white">
            <rect x={6} y={2} width={4} height={12} rx={1} />
            <rect x={2} y={6} width={12} height={4} rx={1} />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.nom}
          </div>
          {p.estGarde ? (
            <div style={{ fontSize: 10, color: '#FFF3D6', fontWeight: 700, marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
              <ShieldCheck size={11} strokeWidth={2.4} />
              Pharmacie de garde
            </div>
          ) : p.inscriteMediHelm ? (
            <div style={{ fontSize: 10, color: '#CFF5E8', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
              <svg width={9} height={9} viewBox="0 0 12 12" fill="#7BE3C0">
                <path d="M4.5 8.6 1.4 5.5l1.1-1.1 2 2 4-4L9.6 3.5z" />
              </svg>
              Inscrite sur MediHelm
            </div>
          ) : (
            <div style={{ fontSize: 10, color: '#F3F4F6', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Info size={11} strokeWidth={2.4} />
              Référencée registre ABMed
            </div>
          )}
        </div>
      </div>

      {/* Corps — informations de l'officine */}
      <div style={{ padding: '8px 12px 10px' }}>
        {/* Localisation / adresse */}
        <div style={{ fontSize: 12, color: '#4B5563', display: 'flex', alignItems: 'flex-start', gap: 5, lineHeight: 1.3 }}>
          <MapPin size={13} style={{ flexShrink: 0, marginTop: 1, color: c.cross }} />
          <span>{p.adresse}{p.ville ? `, ${p.ville}` : ''}</span>
        </div>

        {/* Département · Zone sanitaire · Commune · Arrondissement */}
        {(p.departement || p.zoneSanitaire || p.commune || p.arrondissement) && (
          <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {p.departement && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#0F6E56', background: '#E1F5EE', padding: '2px 7px', borderRadius: 8 }}>
                {p.departement}
              </span>
            )}
            {p.commune && (
              <span style={{ fontSize: 10, fontWeight: 600, color: '#1D9E75', background: '#F0FAF6', padding: '2px 7px', borderRadius: 8, border: '1px solid #CBEADD' }}>
                {p.commune}
              </span>
            )}
            {p.zoneSanitaire && (
              <span style={{ fontSize: 10, fontWeight: 600, color: '#5B4A12', background: '#FDF3E0', padding: '2px 7px', borderRadius: 8 }}>
                ZS {p.zoneSanitaire}
              </span>
            )}
            {p.numeroAbmed && (
              <span style={{ fontSize: 10, fontWeight: 500, color: '#6B7280', background: '#F3F4F6', padding: '2px 7px', borderRadius: 8 }}>
                ABMed {p.numeroAbmed}
              </span>
            )}
          </div>
        )}

        {/* Statut de garde du jour + horaires de la vacation */}
        {p.estGarde && (
          <div style={{
            marginTop: 6, display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 8px', borderRadius: 8, alignSelf: 'flex-start', width: 'fit-content',
            background: '#FDF3E0', border: '1px solid rgba(217,126,18,0.4)',
            color: '#92610A', fontSize: 11, fontWeight: 700,
          }}>
            <Clock size={12} style={{ flexShrink: 0 }} />
            De garde aujourd&apos;hui{(p.gardeHeureDebut && p.gardeHeureFin) ? ` · ${p.gardeHeureDebut} — ${p.gardeHeureFin}` : ''}
          </div>
        )}

        {/* Inscrite MediHelm — services complets disponibles */}
        {p.inscriteMediHelm && !p.estGarde && (
          <div style={{
            marginTop: 6, display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 8px', borderRadius: 8, width: 'fit-content',
            background: '#E1F5EE', border: '1px solid rgba(15,110,86,0.35)',
            color: '#0F6E56', fontSize: 11, fontWeight: 600,
          }}>
            <Check size={12} style={{ flexShrink: 0 }} />
            Stocks, gardes et services en ligne
          </div>
        )}

        {/* Téléphone de l'officine — format béninois 01 … */}
        {phone ? (
          <a
            href={`tel:${phone.tel}`}
            style={{ fontSize: 12, color: '#0F6E56', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontWeight: 500 }}
          >
            <Phone size={13} style={{ flexShrink: 0 }} />
            {phone.display}
          </a>
        ) : (
          <div style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
            <Phone size={13} style={{ flexShrink: 0 }} />
            Non publié
          </div>
        )}

        {p.distance !== undefined && (
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#0F6E56',
              background: '#E1F5EE',
              padding: '2px 8px',
              borderRadius: 10,
            }}>
              {p.distance.toFixed(1)} km
            </span>
          </div>
        )}

        {p.medicamentDispo !== undefined && (
          <div style={{
            fontSize: 11, marginTop: 4, padding: '2px 8px', borderRadius: 10,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: p.medicamentDispo ? '#dcfce7' : '#fef2f2',
            color: p.medicamentDispo ? '#166534' : '#991b1b',
            fontWeight: 600,
          }}>
            {p.medicamentDispo ? <Check size={11} /> : <X size={11} />}
            {p.medicamentDispo ? 'Médicament disponible' : 'Indisponible'}
          </div>
        )}

        {interactive && (
          <>
            {/* Actions */}
            <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
              {phone ? (
                <a
                  href={`tel:${phone.tel}`}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    background: 'linear-gradient(135deg, #27B086 0%, #0F6E56 100%)',
                    color: 'white',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontSize: 11,
                    fontWeight: 600,
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  <Phone size={12} />
                  Appeler
                </a>
              ) : <div style={{ flex: 1 }} />}
              <a
                href={buildDirectionsUrl({
                  destLat: p.latitude!,
                  destLng: p.longitude!,
                  destName: p.nom,
                  originLat: userLatitude,
                  originLng: userLongitude,
                })}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  padding: '6px 0',
                  background: 'white',
                  color: '#0F6E56',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  textAlign: 'center',
                  border: '1.5px solid #1D9E75',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <Navigation size={12} />
                Itinéraire
              </a>
            </div>

            {/* Mêmes coordonnées que Google Maps */}
            <a
              href={buildMapUrl(p.latitude!, p.longitude!, `${p.nom} ${p.ville || ''} Bénin`)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                marginTop: 6,
                fontSize: 10,
                color: '#6B7280',
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={10} />
              Voir sur Google Maps
            </a>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Bandeau d'identification de zone (retour visuel du zoom départemental) ─
function ZoneBanner({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-30 max-w-[92%]">
      <div
        className="rounded-full pl-3 pr-3.5 py-1.5 text-[11px] font-semibold text-teal-900 shadow-lg flex items-center gap-1.5"
        style={{ background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(15,110,86,0.35)' }}
      >
        <MapPin size={12} className="text-primary shrink-0" />
        <span className="truncate">{label}</span>
      </div>
    </div>
  )
}

// ─── Légende des couleurs des pins ──────────────────────────────────────────
function MapLegend() {
  const [open, setOpen] = useState(false)

  const entries: Array<{ color: string; label: string }> = [
    { color: 'linear-gradient(135deg, #27B086 0%, #0F6E56 100%)', label: 'Inscrite sur MediHelm' },
    { color: 'linear-gradient(135deg, #A8B0B9 0%, #6B7280 100%)', label: 'Registre ABMed (non inscrite)' },
    { color: 'linear-gradient(135deg, #F5B24B 0%, #D97E12 100%)', label: 'De garde aujourd\'hui' },
  ]

  return (
    <div>
      {open ? (
        <div
          className="rounded-xl px-2.5 py-2 shadow-md backdrop-blur-sm space-y-1.5"
          style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(15,110,86,0.25)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold tracking-wide text-[#0F6E56]">LÉGENDE</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[#6B7280] hover:text-[#0F6E56]"
              aria-label="Fermer la légende"
            >
              <X size={11} />
            </button>
          </div>
          {entries.map(e => (
            <div key={e.label} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                style={{ background: e.color }}
              />
              <span className="text-[9.5px] font-medium text-gray-700 leading-tight">{e.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 shadow-sm backdrop-blur-sm hover:bg-white transition-colors"
          style={{ border: '1px solid rgba(15,110,86,0.18)' }}
          aria-label="Afficher la légende"
        >
          <svg width={12} height={12} viewBox="0 0 12 12" fill="#0F6E56">
            <rect x={4.5} y={1} width={3} height={10} rx={0.8} />
            <rect x={1} y={4.5} width={10} height={3} rx={0.8} />
          </svg>
          <span className="text-[10px] font-semibold tracking-wide text-[#0F6E56]">Légende</span>
        </button>
      )}
    </div>
  )
}

// ─── Légende départementale — effectifs par département (HORS carte) ────────
// Remplace les anciens badges circulaires : le nombre d'officines et le
// nombre de gardes de chaque département se consultent dans ce panneau en
// bas de carte — la carte elle-même ne montre QUE les pins réels. Chaque
// ligne est cliquable : la carte vole vers le département concerné.
function DeptLegend({ stats, onSelect }: { stats: DeptStat[]; onSelect: (stat: DeptStat) => void }) {
  const [open, setOpen] = useState(false)

  if (stats.length === 0) return null

  const totalOfficines = stats.reduce((sum, d) => sum + d.officines, 0)
  const totalGardes = stats.reduce((sum, d) => sum + d.gardes, 0)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 shadow-sm backdrop-blur-sm hover:bg-white transition-colors"
        style={{ border: '1px solid rgba(15,110,86,0.18)' }}
        aria-label="Effectifs par département"
      >
        <MapPin size={12} className="text-[#0F6E56] shrink-0" />
        <span className="text-[10px] font-semibold tracking-wide text-[#0F6E56]">
          Départements · {stats.length}
        </span>
      </button>
    )
  }

  return (
    <div
      className="rounded-xl px-2.5 py-2 shadow-md backdrop-blur-sm w-[218px]"
      style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(15,110,86,0.25)' }}
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-[10px] font-bold tracking-wide text-[#0F6E56]">
          EFFECTIFS PAR DÉPARTEMENT
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[#6B7280] hover:text-[#0F6E56]"
          aria-label="Fermer les effectifs"
        >
          <X size={11} />
        </button>
      </div>

      <div className="max-h-[168px] overflow-y-auto space-y-[3px] pr-1">
        {stats.map(d => (
          <button
            key={d.dept}
            type="button"
            onClick={() => onSelect(d)}
            className="w-full flex items-center justify-between gap-2 rounded-md px-1.5 py-[3px] text-left hover:bg-teal-50/80 transition-colors"
            aria-label={`${DEPT_DISPLAY[d.dept] ?? d.dept} — ${d.officines} officines${d.gardes > 0 ? ` · ${d.gardes} de garde` : ''} — zoomer`}
          >
            <span className="text-[9.5px] font-semibold text-gray-700 truncate">
              {DEPT_DISPLAY[d.dept] ?? d.dept}
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <span className="text-[9.5px] font-medium text-gray-500">{d.officines}</span>
              {d.gardes > 0 ? (
                <span
                  className="text-[8.5px] font-bold rounded-full px-1.5 py-[1px]"
                  style={{ background: 'rgba(245,178,75,0.18)', color: '#92610A', border: '1px solid rgba(217,126,18,0.35)' }}
                >
                  {d.gardes} garde{d.gardes > 1 ? 's' : ''}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-1.5 pt-1.5 border-t border-teal-100/70 flex items-center justify-between">
        <span className="text-[9px] font-semibold text-[#0F6E56]">Total</span>
        <span className="text-[9px] font-medium text-gray-600">
          {totalOfficines} officines{totalGardes > 0 ? ` · ${totalGardes} de garde` : ''}
        </span>
      </div>
    </div>
  )
}

// ─── Statistiques départementales (légende du bas de carte) ────────────────
type DeptStat = {
  dept: string
  officines: number
  gardes: number
}

export default function PharmacyMap({
  pharmacies,
  userLatitude,
  userLongitude,
  onPharmacyClick,
  selectedPharmacyId,
  onBoundsChange,
  height = '400px',
  className,
  route,
  onRouteInfo,
  navigation = false,
}: PharmacyMapProps) {
  const mapRef = useRef<MapRef>(null)
  /** Zoom courant (pour les badges nominatifs) — la caméra est en mode
   *  NON CONTRÔLÉ : react-maplibre n'écrase jamais les déplacements
   *  programmatiques (fitBounds/flyTo) avec des props obsolètes.
   *  Le zoom est QUANTIFIÉ (pas de 0,5) pour éviter des re-rendus des
   *  ~400 marqueurs à chaque pixel de pincement. */
  const [currentZoom, setCurrentZoom] = useState(userLatitude ? 14 : 7)
  // Fiche persistante (clic / tap — mobile & PC)
  const [popupInfo, setPopupInfo] = useState<PharmacyMapPoint | null>(null)
  // Fiche éphémère (survol PC — stable grâce au délai de grâce)
  const [hoverInfo, setHoverInfo] = useState<PharmacyMapPoint | null>(null)
  const [styleFailed, setStyleFailed] = useState(false)
  const [routeData, setRouteData] = useState<RouteInfo | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [zoneBanner, setZoneBanner] = useState<string | null>(null)

  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const zoneBannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // ─── Statistiques par département (légende départementale) ─────────────────
  // Les effectifs (nombre d'officines, nombre de gardes du jour) sont calculés
  // depuis les données affichées : la légende reflète TOUJOURS la carte. Un
  // clic sur une ligne zoome sur le département (focusDepartment).
  const deptStats = useMemo<DeptStat[]>(() => {
    const byDept = new Map<string, DeptStat>()
    for (const p of pharmacies) {
      if (!p.latitude || !p.longitude) continue
      const d = (p.departement ?? '').toString().trim().toUpperCase()
      if (!d) continue
      const cur = byDept.get(d) ?? { dept: d, officines: 0, gardes: 0 }
      cur.officines += 1
      if (p.estGarde) cur.gardes += 1
      byDept.set(d, cur)
    }
    return Array.from(byDept.values()).sort((a, b) => b.officines - a.officines)
  }, [pharmacies])

  /** Pins à afficher : TOUTES les officines géolocalisées, en permanence.
   *  Aucun badge de comptage ne se superpose aux positions réelles ;
   *  l'ordre de rendu met les pins de garde (ambre) puis les inscrites
   *  (vert) AU-DESSUS des pins registre (gris) lors des chevauchements
   *  inévitables en zoom national — l'information la plus actionnable
   *  reste visible. */
  const mapPoints = useMemo(
    () =>
      pharmacies
        .filter(p => p.latitude && p.longitude)
        .slice()
        .sort((a, b) => {
          const rank = (p: PharmacyMapPoint) => (p.estGarde ? 2 : p.inscriteMediHelm ? 1 : 0)
          return rank(a) - rank(b)
        }),
    [pharmacies]
  )

  // ─── Cadrage automatique : TOUT le Bénin + position utilisateur ───────────
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (!mapReady) return
    const validPharmacies = pharmacies.filter(p => p.latitude && p.longitude)
    if (validPharmacies.length === 0 || !mapRef.current) return

    const bounds: [number, number, number, number] = [
      Math.min(...validPharmacies.map(p => p.longitude!)),
      Math.min(...validPharmacies.map(p => p.latitude!)),
      Math.max(...validPharmacies.map(p => p.longitude!)),
      Math.max(...validPharmacies.map(p => p.latitude!)),
    ]

    if (userLatitude && userLongitude) {
      bounds[0] = Math.min(bounds[0], userLongitude)
      bounds[1] = Math.min(bounds[1], userLatitude)
      bounds[2] = Math.max(bounds[2], userLongitude)
      bounds[3] = Math.max(bounds[3], userLatitude)
    }

    try {
      mapRef.current.fitBounds(bounds as LngLatBoundsLike, { padding: 60, maxZoom: 15 })
    } catch {
      // cadrage indisponible (carte non prête) — le cadrage initial s'en charge
    }
  }, [mapReady, pharmacies, userLatitude, userLongitude])

  /**
   * Ouvre la fiche d'une officine et décale la carte vers le bas pour que la
   * fiche holographique (affichée AU-DESSUS du pin) reste entièrement visible
   * — jamais masquée par la barre de navigation ni le sheet mobile.
   */
  const openPharmacyCard = useCallback((p: PharmacyMapPoint, opts?: { fly?: boolean; atLng?: number; atLat?: number }) => {
    const target: PharmacyMapPoint = opts?.atLng !== undefined && opts?.atLat !== undefined && p.latitude && p.longitude
      ? { ...p, longitude: opts.atLng, latitude: opts.atLat }
      : p
    setPopupInfo(target)
    const lng = opts?.atLng ?? p.longitude
    const lat = opts?.atLat ?? p.latitude
    if (lng && lat && mapRef.current) {
      const containerH = mapContainerRef.current?.clientHeight ?? 600
      mapRef.current.easeTo({
        center: [lng, lat],
        offset: [0, -Math.round(containerH * 0.13)],
        duration: opts?.fly ? 800 : 420,
      })
    }
  }, [])

  // Recentre la carte sur la pharmacie sélectionnée (depuis la liste)
  useEffect(() => {
    if (!selectedPharmacyId || !mapRef.current) return
    const target = pharmacies.find(p => p.id === selectedPharmacyId)
    if (target?.latitude && target?.longitude) {
      openPharmacyCard(target, { fly: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPharmacyId])

  // ─── Itinéraire actif : tracé OSRM depuis la position utilisateur ─────────
  const userPosRef = useRef<{ lat: number; lng: number } | null>(null)
  userPosRef.current = userLatitude !== undefined && userLongitude !== undefined
    ? { lat: userLatitude, lng: userLongitude }
    : userPosRef.current

  const routeKey = route ? `${route.destLat.toFixed(6)},${route.destLng.toFixed(6)}` : null

  useEffect(() => {
    if (!route) {
      setRouteData(null)
      onRouteInfo?.(null)
      return
    }
    const origin = userPosRef.current
    if (!origin) {
      setRouteData(null)
      onRouteInfo?.(null)
      return
    }

    let cancelled = false
    setRouteLoading(true)
    fetchRoute(origin, { lat: route.destLat, lng: route.destLng }).then((info) => {
      if (cancelled) return
      setRouteData(info)
      setRouteLoading(false)
      onRouteInfo?.(info)
      // Cadrer l'itinéraire entier
      if (mapRef.current && info.coords.length >= 2) {
        const lngs = info.coords.map(c => c[0])
        const lats = info.coords.map(c => c[1])
        mapRef.current.fitBounds(
          [
            Math.min(...lngs), Math.min(...lats),
            Math.max(...lngs), Math.max(...lats),
          ] as LngLatBoundsLike,
          { padding: 70, maxZoom: 14, duration: 900 }
        )
      }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey])

  // ─── Mode « en route » : la carte suit l'utilisateur ──────────────────────
  useEffect(() => {
    if (!navigation || !userLatitude || !userLongitude || !mapRef.current) return
    const map = mapRef.current.getMap()
    mapRef.current.easeTo({
      center: [userLongitude, userLatitude],
      zoom: Math.max(map.getZoom(), 14.5),
      duration: 900,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, userLatitude, userLongitude])

  // Nettoyage des minuteurs
  useEffect(() => () => {
    if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current)
    if (zoneBannerTimer.current) clearTimeout(zoneBannerTimer.current)
  }, [])

  // ─── Fiche de survol : délai de grâce + maintien au survol de la fiche ────
  const cancelHoverClose = useCallback(() => {
    if (hoverCloseTimer.current) {
      clearTimeout(hoverCloseTimer.current)
      hoverCloseTimer.current = null
    }
  }, [])

  const scheduleHoverClose = useCallback(() => {
    cancelHoverClose()
    hoverCloseTimer.current = setTimeout(() => setHoverInfo(null), HOVER_GRACE_MS)
  }, [cancelHoverClose])

  const showZoneBanner = useCallback((label: string) => {
    setZoneBanner(label)
    if (zoneBannerTimer.current) clearTimeout(zoneBannerTimer.current)
    zoneBannerTimer.current = setTimeout(() => setZoneBanner(null), 2600)
  }, [])

  const handleMove = useCallback((evt: { viewState: { zoom: number } }) => {
    // Zoom QUANTIFIÉ (pas de 0,5) : les ~400 marqueurs ne se re-rendent
    // qu'en franchissant un demi-niveau de zoom, pas à chaque pixel.
    const quantized = Math.round(evt.viewState.zoom * 2) / 2
    setCurrentZoom(prev => (prev === quantized ? prev : quantized))
    if (onBoundsChange && mapRef.current) {
      const map = mapRef.current.getMap()
      const b = map.getBounds()
      if (!b) return
      onBoundsChange([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()])
    }
  }, [onBoundsChange])

  // ─── Légende départementale : zoom sur le département cliqué ────────────
  const focusDepartment = useCallback((stat: DeptStat) => {
    const box = DEPT_BOUNDS[stat.dept]
    if (!box || !mapRef.current) return
    const label = DEPT_DISPLAY[stat.dept] ?? stat.dept
    showZoneBanner(
      stat.gardes > 0
        ? `${label} — ${stat.officines} officines · ${stat.gardes} de garde`
        : `${label} — ${stat.officines} officines`,
    )

    // Zoom cible calculé explicitement (Mercator) : cadre entièrement le
    // département dans la zone utile de la carte (sans les panneaux flottants).
    const w = Math.max((mapContainerRef.current?.clientWidth ?? 900) - 150, 100)
    const h = Math.max((mapContainerRef.current?.clientHeight ?? 600) - 150, 100)
    const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
    const dx = Math.max(box[2] - box[0], 0.02)
    const dyRad = Math.max(mercY(box[3]) - mercY(box[1]), 0.0005)
    const zFit = Math.min(
      Math.log2((360 * w) / (256 * dx)),
      Math.log2((2 * Math.PI * h) / (256 * dyRad)),
    )
    const targetZoom = Math.min(zFit, 12.5)

    mapRef.current.flyTo({
      center: [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2],
      zoom: targetZoom,
      duration: 850,
    })
  }, [showZoneBanner])

  const handleMapLoad = useCallback(() => {
    setMapReady(true)
  }, [])

  // Fin de déplacement/animation : remonte les bornes finales (les pages
  // qui filtrent leur liste selon la vue doivent avoir la position d'arrivée).
  const handleMoveEnd = useCallback(() => {
    if (onBoundsChange && mapRef.current) {
      const map = mapRef.current.getMap()
      const b = map.getBounds()
      if (!b) return
      onBoundsChange([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()])
    }
  }, [onBoundsChange])

  // Le style de marque local n'a pas pu charger → repli CDN Voyager
  const handleMapError = useCallback(() => {
    setStyleFailed((prev) => (prev ? prev : true))
  }, [])

  // Fiche affichée : priorité au survol (PC), sinon la fiche cliquée
  const activeInfo = hoverInfo ?? popupInfo
  const isFromHover = hoverInfo !== null

  // ─── Cadrage INITIAL (mode non contrôlé) ──────────────────────────────────
  // Calculé au MONTAGE (les pages montent la carte une fois les données
  // chargées) : react-maplibre l'applique en interne, sans conflit avec les
  // déplacements programmatiques ultérieurs (fitBounds/flyTo/easeTo).
  const initialViewState = useMemo(() => {
    const valid = pharmacies.filter(p => p.latitude && p.longitude)
    if (valid.length === 0) {
      return {
        longitude: userLongitude || 2.3912,
        latitude: userLatitude || 6.3703,
        zoom: userLatitude ? 14 : 7,
      }
    }
    const bounds: [number, number, number, number] = [
      Math.min(...valid.map(p => p.longitude!)),
      Math.min(...valid.map(p => p.latitude!)),
      Math.max(...valid.map(p => p.longitude!)),
      Math.max(...valid.map(p => p.latitude!)),
    ]
    if (userLatitude && userLongitude) {
      bounds[0] = Math.min(bounds[0], userLongitude)
      bounds[1] = Math.min(bounds[1], userLatitude)
      bounds[2] = Math.max(bounds[2], userLongitude)
      bounds[3] = Math.max(bounds[3], userLatitude)
    }
    return {
      bounds,
      fitBoundsOptions: { padding: 60, maxZoom: 15 },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={mapContainerRef}
      className={cn('relative w-full overflow-hidden', className ?? 'rounded-xl border border-teal-200')}
      style={{ height }}
    >
      <MapGL
        ref={mapRef}
        initialViewState={initialViewState}
        onMove={handleMove}
        onMoveEnd={handleMoveEnd}
        onLoad={handleMapLoad}
        onError={handleMapError}
        mapStyle={styleFailed ? MAP_STYLE_FALLBACK_URL : MAP_STYLE}
        scrollZoom
        attributionControl={{ compact: true }}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl
          position="top-left"
          trackUserLocation
          showAccuracyCircle
        />

        {/* Itinéraire actif — tracé routier réel (OSRM) */}
        {routeData && routeData.coords.length >= 2 && (
          <Source
            id="mh-route"
            type="geojson"
            data={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: routeData.coords },
            }}
          >
            <Layer
              id="mh-route-casing"
              type="line"
              paint={{
                'line-color': routeData.exact ? '#0F6E56' : '#6B7280',
                'line-width': 9,
                'line-opacity': 0.22,
              }}
            />
            <Layer
              id="mh-route-line"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{
                'line-color': routeData.exact ? '#1D9E75' : '#6B7280',
                'line-width': 4,
                ...(routeData.exact ? {} : { 'line-dasharray': [2, 2] }),
              }}
            />
          </Source>
        )}

        {/* Position utilisateur — pastille bleu MediHelm pulsée */}
        {userLatitude && userLongitude && (
          <Marker longitude={userLongitude} latitude={userLatitude} anchor="center">
            <div className="relative">
              <div className={cn(
                'rounded-full border-[3px] border-white shadow-lg flex items-center justify-center',
                navigation ? 'w-8 h-8 bg-[#378ADD]' : 'w-7 h-7 bg-[#378ADD]'
              )}>
                {navigation ? (
                  <Navigation size={14} className="text-white" strokeWidth={2.4} />
                ) : (
                  <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                    <circle cx={6} cy={6} r={3} fill="white" opacity="0.8" />
                  </svg>
                )}
              </div>
              <div className={cn(
                'absolute rounded-full border-2 border-[#378ADD] opacity-40 animate-ping',
                navigation ? '-top-2.5 -left-2.5 w-12 h-12' : '-top-2 -left-2 w-11 h-11'
              )} />
            </div>
          </Marker>
        )}

        {/* TOUTES les officines — pins individuels aux coordonnées EXACTES.
         *  Aucun badge de comptage ne recouvre les positions : la carte ne
         *  montre QUE des pins de géolocalisation (légende départementale
         *  en bas de carte pour les effectifs). */}
        {mapPoints.map((p) => {
          if (!p.latitude || !p.longitude) return null
          const isHovered = hoverInfo?.id === p.id
          const isSelected = selectedPharmacyId === p.id
          const showLabel = p.estGarde || p.inscriteMediHelm || isSelected || isHovered || currentZoom >= LABEL_ZOOM

          return (
            <Marker
              key={p.id}
              longitude={p.longitude}
              latitude={p.latitude}
              anchor="bottom"
            >
              <PharmacyMarker
                nom={p.nom}
                variant={pinVariant(p)}
                isSelected={isSelected}
                isDimmed={p.medicamentDispo === false}
                showLabel={showLabel}
                onHover={() => {
                  cancelHoverClose()
                  setHoverInfo(p)
                }}
                onLeave={scheduleHoverClose}
                onClick={() => {
                  onPharmacyClick?.(p.id)
                  setHoverInfo(null)
                  openPharmacyCard(p)
                }}
              />
            </Marker>
          )
        })}

        {/* Fiche officine — survol (PC) OU clic (mobile & PC) — TOUJOURS AU-DESSUS du pin */}
        {activeInfo && activeInfo.latitude && activeInfo.longitude && (
          <Popup
            longitude={activeInfo.longitude}
            latitude={activeInfo.latitude}
            anchor="bottom"
            offset={[0, -50] as [number, number]}
            closeOnClick={false}
            closeButton={!isFromHover}
            onClose={() => setPopupInfo(null)}
            className="medihelm-popup"
            style={{ zIndex: 30 }}
          >
            <PharmacyCard
              p={activeInfo}
              userLatitude={userLatitude}
              userLongitude={userLongitude}
              interactive={!isFromHover}
              onEnter={isFromHover ? cancelHoverClose : undefined}
              onLeave={isFromHover ? scheduleHoverClose : undefined}
            />
          </Popup>
        )}
      </MapGL>

      {/* Bandeau d'identification de zone (tap sur un badge/cluster — mobile) */}
      {zoneBanner && <ZoneBanner label={zoneBanner} />}

      {/* Chargement de l'itinéraire */}
      {routeLoading && (
        <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-30">
          <div className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-teal-900 shadow-lg flex items-center gap-1.5"
            style={{ background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(15,110,86,0.35)' }}>
            <Navigation size={12} className="text-primary animate-pulse" />
            Calcul de l&apos;itinéraire…
          </div>
        </div>
      )}

      {/* Légendes du bas de carte — couleurs + effectifs par département.
          Les BADGES de comptage sur la carte ont été supprimés : les
          effectifs se consultent ici, sans jamais recouvrir les pins. */}
      <div className="absolute bottom-2 left-2 z-10 flex flex-col items-start gap-1.5">
        <MapLegend />
        <DeptLegend stats={deptStats} onSelect={focusDepartment} />
      </div>

      {/* Signature de marque — badge discret en bas à droite */}
      <div className="pointer-events-none absolute bottom-2 right-2 z-10">
        <div
          className="flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 shadow-sm backdrop-blur-sm"
          style={{ border: '1px solid rgba(15,110,86,0.18)' }}
        >
          <svg width={12} height={12} viewBox="0 0 12 12" fill="#0F6E56">
            <rect x={4.5} y={1} width={3} height={10} rx={0.8} />
            <rect x={1} y={4.5} width={10} height={3} rx={0.8} />
          </svg>
          <span className="text-[10px] font-semibold tracking-wide text-[#0F6E56]">
            Carte MediHelm
          </span>
        </div>
      </div>
    </div>
  )
}
