'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import MapGL, { Marker, Popup, NavigationControl, GeolocateControl, Source, Layer } from 'react-map-gl/maplibre'
import type { MapRef, LngLatBoundsLike } from 'react-map-gl/maplibre'
import SuperCluster from 'supercluster'
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
 * - CLUSTERING PAR DÉPARTEMENT : chaque département possède son propre index
 *   spatial — un agrégat ne mélange JAMAIS deux départements. En vue nationale,
 *   un badge circulaire par département est positionné aux COORDONNÉES du
 *   chef-lieu (Kandi pour l'Alibori, Natitingou pour l'Atacora…) — jamais à la
 *   frontière — avec un algorithme d'anti-collision qui écarte les badges du
 *   Sud (Littoral/Atlantique/Ouémé…) pour qu'ils restent tous lisibles.
 *
 * - SPIDERMANY : deux officines peuvent partager la même adresse (ou être à
 *   quelques mètres). Le clic sur un agrégat qui ne peut plus se séparer par
 *   le zoom déploie ses officines en cercle autour du point — chacune devient
 *   un pin individuel cliquable (la « badge 2 » de Parakou enfin visible).
 *
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

/** Zoom au-delà duquel les badges nominatifs s'affichent sur tous les pins */
const LABEL_ZOOM = 8
/** Délai de grâce avant fermeture de la fiche de survol (ms) */
const HOVER_GRACE_MS = 320
/** Zoom de bascule : en dessous, un badge par département ; au-dessus, clusters internes */
const DEPT_BADGE_ZOOM = 8.6

/**
 * Centres officiels des départements du Bénin (chefs-lieux / position centrale
 * du territoire) — [longitude, latitude]. Les badges départementaux y sont
 * ancrés : l'Alibori à Kandi (et non à la frontière nigériane), etc.
 */
const DEPT_CENTERS: Record<string, [number, number]> = {
  ALIBORI: [2.9383, 11.1339],    // Kandi
  ATACORA: [1.3778, 10.3044],    // Natitingou
  DONGA: [1.6653, 9.7083],       // Djougou
  BORGOU: [2.6344, 9.3522],      // Parakou
  LITTORAL: [2.4234, 6.3653],    // Cotonou
  ATLANTIQUE: [2.2071, 6.5031],  // Allada
  OUEME: [2.6061, 6.4969],       // Porto-Novo
  PLATEAU: [2.6260, 6.9900],     // Pobè / Adja-Ouèrè
  COUFFO: [1.6728, 6.9392],      // Aplahoué
  ZOU: [2.2794, 7.1827],         // Abomey
  COLLINES: [2.1846, 7.7714],    // Dassa-Zoumè
  MONO: [1.7161, 6.6372],        // Lokossa
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
  showClusters?: boolean
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

// ─── Badge départemental — ancré au chef-lieu, anti-collision ───────────────
function DepartmentMarker({
  dept,
  count,
  longitude,
  latitude,
  onClick,
}: {
  dept: string
  count: number
  longitude: number
  latitude: number
  onClick: () => void
}) {
  const size = count < 15 ? 46 : count < 60 ? 56 : 66
  const [hovered, setHovered] = useState(false)

  return (
    <Marker longitude={longitude} latitude={latitude} anchor="center">
      <div className="relative">
        <button
          type="button"
          onClick={onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          aria-label={`Département ${dept} — ${count} officines — explorer`}
          className="border-0 bg-transparent cursor-pointer p-0 block"
          style={{ width: size, height: size }}
        >
          <div className="flex flex-col items-center">
            <div
              style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #27B086 0%, #0F6E56 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: size < 50 ? 14 : 17,
                border: '3px solid white',
                boxShadow: hovered ? '0 4px 20px rgba(15,110,86,0.55)' : '0 3px 14px rgba(15,110,86,0.45)',
                transition: 'box-shadow 150ms',
              }}
            >
              {count}
            </div>
            {/* Nom du département — toujours visible */}
            <div
              className="mt-1 whitespace-nowrap rounded-full px-2 py-[2px] text-[10px] font-bold tracking-wide shadow-sm"
              style={{ background: 'rgba(255,255,255,0.96)', color: '#0F6E56', border: '1px solid rgba(15,110,86,0.35)' }}
            >
              {dept}
            </div>
          </div>
        </button>

        {/* Aide au survol (PC) */}
        {hovered && (
          <div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 z-10 whitespace-nowrap"
            style={{ bottom: 'calc(100% + 10px)' }}
          >
            <div
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-teal-900 shadow-lg"
              style={{ background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(15,110,86,0.35)' }}
            >
              {dept} — {count} officines
              <div className="text-[9px] font-medium text-teal-600">Cliquez pour explorer</div>
            </div>
          </div>
        )}
      </div>
    </Marker>
  )
}

// ─── Cluster interne à un département (vue rapprochée) ─────────────────────
function ClusterMarker({
  count,
  dept,
  longitude,
  latitude,
  onClick,
}: {
  count: number
  dept: string | null
  longitude: number
  latitude: number
  onClick: () => void
}) {
  const size = count < 10 ? 44 : count < 50 ? 56 : 68
  const [hovered, setHovered] = useState(false)

  return (
    <Marker longitude={longitude} latitude={latitude} anchor="center">
      <div className="relative">
        <button
          type="button"
          onClick={onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          aria-label={`${count} officines${dept ? ` — ${dept}` : ''} — afficher`}
          className="border-0 bg-transparent cursor-pointer p-0"
          style={{ width: size, height: size }}
        >
          <div
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #27B086 0%, #0F6E56 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: size < 50 ? 14 : 18,
              border: '3px solid white',
              boxShadow: '0 3px 14px rgba(15,110,86,0.45)',
            }}
          >
            {count}
          </div>
        </button>

        {/* Étiquette département — survol PC */}
        {dept && (
          <div
            className={cn(
              'pointer-events-none absolute left-1/2 -translate-x-1/2 z-10 whitespace-nowrap transition-all duration-150',
              hovered ? 'opacity-100 -translate-y-1' : 'opacity-0 translate-y-0'
            )}
            style={{ bottom: 'calc(100% + 8px)' }}
          >
            <div
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-teal-900 shadow-lg"
              style={{ background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(15,110,86,0.35)' }}
            >
              {dept} ({count})
              <div className="text-[9px] font-medium text-teal-600">Cliquez pour afficher les officines</div>
            </div>
          </div>
        )}
      </div>
    </Marker>
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

// ─── Bandeau d'identification de zone (tap cluster/badge mobile) ────────────
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
    <div className="absolute bottom-2 left-2 z-10">
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

// ─── Types internes du modèle d'affichage ───────────────────────────────────
type ClusterPoint = {
  type: 'Feature'
  properties: {
    cluster: false
    pharmacyId: string
    nom: string
    adresse: string
    telephone: string
    estGarde: boolean
    inscriteMediHelm: boolean
    distance?: number
    ville?: string
    medicamentDispo?: boolean
    departement: string | null
  }
  geometry: { type: 'Point'; coordinates: [number, number] }
}

type DeptGroup = {
  dept: string
  center: [number, number]
  bounds: [number, number, number, number] // [ouest, sud, est, nord]
  total: number
  sc: SuperCluster
}

type DisplayItem =
  | { kind: 'dept'; dept: string; count: number; lng: number; lat: number }
  | { kind: 'cluster'; clusterId: number; dept: string | null; count: number; lng: number; lat: number }
  | { kind: 'pharmacy'; pharmacy: PharmacyMapPoint }

type SpiderState = {
  key: string
  center: [number, number]
  zoom: number
  items: Array<{ p: PharmacyMapPoint; lng: number; lat: number }>
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
  showClusters = true,
  route,
  onRouteInfo,
  navigation = false,
}: PharmacyMapProps) {
  const mapRef = useRef<MapRef>(null)
  /** Zoom courant (pour les badges nominatifs) — la caméra est en mode
   *  NON CONTRÔLÉ : react-maplibre n'écrase jamais les déplacements
   *  programmatiques (fitBounds/flyTo) avec des props obsolètes. */
  const [currentZoom, setCurrentZoom] = useState(userLatitude ? 14 : 7)
  // Fiche persistante (clic / tap — mobile & PC)
  const [popupInfo, setPopupInfo] = useState<PharmacyMapPoint | null>(null)
  // Fiche éphémère (survol PC — stable grâce au délai de grâce)
  const [hoverInfo, setHoverInfo] = useState<PharmacyMapPoint | null>(null)
  const [styleFailed, setStyleFailed] = useState(false)
  const [routeData, setRouteData] = useState<RouteInfo | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [zoneBanner, setZoneBanner] = useState<string | null>(null)
  const [display, setDisplay] = useState<DisplayItem[]>([])
  // Déploiement « araignée » d'un agrégat non séparable par le zoom
  const [spiderfy, setSpiderfy] = useState<SpiderState | null>(null)

  const superclusterRef = useRef<SuperCluster | null>(null) // officines sans département (défensif)
  const deptGroupsRef = useRef<DeptGroup[]>([])
  const updateDisplayRef = useRef<(() => void) | null>(null) // dernière version de updateDisplay
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const zoneBannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  const points = useMemo<ClusterPoint[]>(
    () =>
      pharmacies
        .filter(p => p.latitude && p.longitude)
        .map(p => ({
          type: 'Feature' as const,
          properties: {
            cluster: false,
            pharmacyId: p.id,
            nom: p.nom,
            adresse: p.adresse,
            telephone: p.telephone,
            estGarde: p.estGarde || false,
            inscriteMediHelm: p.inscriteMediHelm || false,
            distance: p.distance,
            ville: p.ville,
            medicamentDispo: p.medicamentDispo,
            departement: p.departement ?? null,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [p.longitude!, p.latitude!] as [number, number],
          },
        })),
    [pharmacies]
  )

  // ─── Index spatiaux : UN SuperCluster par département ─────────────────────
  // Un agrégat ne peut jamais mélanger deux départements ; le badge
  // départemental est ancré aux coordonnées du chef-lieu.
  useEffect(() => {
    if (!showClusters) return

    const groups = new Map<string, ClusterPoint[]>()
    const loose: ClusterPoint[] = []

    for (const pt of points) {
      const d = (pt.properties.departement ?? '').toString().trim().toUpperCase()
      if (d) {
        const arr = groups.get(d) ?? []
        arr.push(pt)
        groups.set(d, arr)
      } else {
        loose.push(pt)
      }
    }

    const makeSC = (pts: ClusterPoint[]) => {
      const sc = new SuperCluster({
        radius: 56,
        maxZoom: 16,
        map: (props) => ({ count: 1 }),
        reduce: (acc, props) => { acc.count += props.count },
      })
      sc.load(pts)
      return sc
    }

    const deptGroups: DeptGroup[] = Array.from(groups.entries()).map(([dept, pts]) => {
      const lngs = pts.map(p => p.geometry.coordinates[0])
      const lats = pts.map(p => p.geometry.coordinates[1])
      const known = DEPT_CENTERS[dept]
      const center: [number, number] = known ?? [
        (Math.min(...lngs) + Math.max(...lngs)) / 2,
        (Math.min(...lats) + Math.max(...lats)) / 2,
      ]
      return {
        dept,
        center,
        bounds: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
        total: pts.length,
        sc: makeSC(pts),
      }
    })

    deptGroupsRef.current = deptGroups
    superclusterRef.current = loose.length > 0 ? makeSC(loose) : null
    setSpiderfy(null) // les données ont changé → tout déploiement est obsolète

    // Les groupes viennent d'être (re)construits : recalcul immédiat du modèle
    // d'affichage si la carte est déjà chargée (sinon handleMapLoad s'en charge).
    if (mapRef.current?.loaded()) {
      updateDisplayRef.current?.()
    }
  }, [points, showClusters])

  /** Anti-collision des badges départementaux (vue nationale : Sud dense) */
  const separateDeptBadges = useCallback(
    (map: maplibregl.Map, badges: Array<{ kind: 'dept'; dept: string; count: number; lng: number; lat: number }>) => {
      if (badges.length <= 1) return badges
      const radiusOf = (count: number) => (count < 15 ? 23 : count < 60 ? 28 : 33) + 12
      const placed: Array<{ x: number; y: number; r: number }> = []
      const out: Array<{ kind: 'dept'; dept: string; count: number; lng: number; lat: number }> = []

      // Les départements les plus fournis gardent la priorité sur leur position exacte
      for (const b of [...badges].sort((a, b2) => b2.count - a.count)) {
        const p = map.project([b.lng, b.lat])
        let x = p.x
        let y = p.y
        const r = radiusOf(b.count)
        let clash = () => placed.some(q => Math.hypot(x - q.x, y - q.y) < r + q.r + 6)
        let attempt = 0
        while (clash() && attempt < 56) {
          attempt++
          const ring = Math.ceil(attempt / 8)
          const angle = ((attempt % 8) / 8) * Math.PI * 2 + ring * 0.7
          const dist = ring * (r + 16)
          x = p.x + Math.cos(angle) * dist
          y = p.y + Math.sin(angle) * dist
        }
        placed.push({ x, y, r })
        const pos = map.unproject([x, y])
        out.push({ ...b, lng: pos.lng, lat: pos.lat })
      }
      return out
    },
    []
  )

  /** Résultat brut de SuperCluster.getClusters (cluster ou officine individuelle) */
type RawCluster = {
  id?: number
  properties: { cluster?: boolean; pharmacyId?: string; point_count?: number }
  geometry: { coordinates: [number, number] }
}

// ─── Recalcul du modèle d'affichage à chaque déplacement ─────────────────
  const updateDisplay = useCallback(() => {
    if (!showClusters || !mapRef.current) return
    const map = mapRef.current.getMap() as maplibregl.Map
    const bounds = map.getBounds()
    if (!bounds) return
    const zoom = map.getZoom()

    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ]

    const useDeptBadges = zoom < DEPT_BADGE_ZOOM
    const items: DisplayItem[] = []
    const deptBadges: Array<{ kind: 'dept'; dept: string; count: number; lng: number; lat: number }> = []

    for (const g of deptGroupsRef.current) {
      const clusters = g.sc.getClusters(bbox, zoom) as unknown as RawCluster[]

      // Le département est-il entièrement agrégé en un seul cluster ?
      const singleFull = clusters.length === 1 && clusters[0].properties.cluster === true
        && clusters[0].properties.point_count === g.total

      // Le chef-lieu est-il visible (marge) ? Sinon on montre les clusters bruts
      const [clng, clat] = g.center
      const m = 0.8 // marge en degrés ≈ garde le badge ancré près de son département
      const centerVisible = clng > bbox[0] - m && clng < bbox[2] + m && clat > bbox[1] - m && clat < bbox[3] + m

      if ((useDeptBadges || singleFull) && clusters.length > 0 && centerVisible) {
        deptBadges.push({ kind: 'dept', dept: g.dept, count: g.total, lng: clng, lat: clat })
        continue
      }

      for (const c of clusters) {
        if (c.properties.cluster) {
          items.push({
            kind: 'cluster',
            clusterId: c.id as number,
            dept: g.dept,
            count: c.properties.point_count || 0,
            lng: c.geometry.coordinates[0],
            lat: c.geometry.coordinates[1],
          })
        } else {
          const pharmacy = pharmacies.find(p => p.id === c.properties.pharmacyId)
          if (pharmacy) items.push({ kind: 'pharmacy', pharmacy })
        }
      }
    }

    // Officines sans département (défensif — la base ABMed est complète)
    if (superclusterRef.current) {
      const loose = superclusterRef.current.getClusters(bbox, zoom) as unknown as RawCluster[]
      for (const c of loose) {
        if (c.properties.cluster) {
          items.push({
            kind: 'cluster',
            clusterId: c.id as number,
            dept: null,
            count: c.properties.point_count || 0,
            lng: c.geometry.coordinates[0],
            lat: c.geometry.coordinates[1],
          })
        } else {
          const pharmacy = pharmacies.find(p => p.id === c.properties.pharmacyId)
          if (pharmacy) items.push({ kind: 'pharmacy', pharmacy })
        }
      }
    }

    setDisplay([...separateDeptBadges(map, deptBadges), ...items])
  }, [showClusters, pharmacies, separateDeptBadges])
  updateDisplayRef.current = updateDisplay

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
    setCurrentZoom(evt.viewState.zoom)
    // Le moindre changement de zoom referme le déploiement « araignée »
    setSpiderfy(prev => (prev && Math.abs(evt.viewState.zoom - prev.zoom) > 0.02 ? null : prev))
    updateDisplay()
    if (onBoundsChange && mapRef.current) {
      const map = mapRef.current.getMap()
      const b = map.getBounds()
      if (!b) return
      onBoundsChange([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()])
    }
  }, [updateDisplay, onBoundsChange])

  // ─── Clic badge départemental : zoom sur le département ───────────────────
  const handleDeptClick = useCallback((dept: string) => {
    const g = deptGroupsRef.current.find(x => x.dept === dept)
    if (!g || !mapRef.current) return
    showZoneBanner(`${dept} — ${g.total} officines`)
    setSpiderfy(null)

    // Zoom cible calculé explicitement (fitBounds de maplibre ne garantit pas
    // de franchir le seuil des badges départementaux) : on cadre le département
    // tout en restant TOUJOURS au-dessus du seuil → clusters de villes, puis
    // officines individuelles.
    const w = Math.max((mapContainerRef.current?.clientWidth ?? 900) - 150, 100)
    const h = Math.max((mapContainerRef.current?.clientHeight ?? 600) - 150, 100)
    const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
    const dx = Math.max(g.bounds[2] - g.bounds[0], 0.02)
    const dyRad = Math.max(mercY(g.bounds[3]) - mercY(g.bounds[1]), 0.0005)
    const zFit = Math.min(
      Math.log2((360 * w) / (256 * dx)),
      Math.log2((2 * Math.PI * h) / (256 * dyRad)),
    )
    const targetZoom = Math.max(Math.min(zFit, 13), DEPT_BADGE_ZOOM + 0.45)

    mapRef.current.flyTo({
      center: [(g.bounds[0] + g.bounds[2]) / 2, (g.bounds[1] + g.bounds[3]) / 2],
      zoom: targetZoom,
      duration: 850,
    })
  }, [showZoneBanner])

  /** Positions en cercle autour d'un point (déploiement « araignée ») */
  const spiderPositions = useCallback((map: maplibregl.Map, center: [number, number], n: number): Array<[number, number]> => {
    const c = map.project(center)
    const radius = n <= 5 ? 48 : n <= 10 ? 68 : 90
    const out: Array<[number, number]> = []
    for (let i = 0; i < n; i++) {
      const angle = Math.PI / 2 + (2 * Math.PI * i) / n
      const p = map.unproject([c.x + Math.cos(angle) * radius, c.y + Math.sin(angle) * radius])
      out.push([p.lng, p.lat])
    }
    return out
  }, [])

  // ─── Clic cluster : zoom d'expansion OU déploiement « araignée » ──────────
  const handleClusterClick = useCallback((item: Extract<DisplayItem, { kind: 'cluster' }>) => {
    const map = mapRef.current
    if (!map) return
    const g = item.dept !== null ? deptGroupsRef.current.find(x => x.dept === item.dept) : undefined
    const sc = g?.sc ?? superclusterRef.current
    if (!sc) return

    if (item.dept) showZoneBanner(`${item.dept} — ${item.count} officines`)

    const zoom = map.getZoom()
    const expansionZoom = sc.getClusterExpansionZoom(item.clusterId)

    if (expansionZoom > zoom + 0.5) {
      // Le cluster se sépare encore par le zoom → on zoome
      setSpiderfy(null)
      map.flyTo({ center: [item.lng, item.lat], zoom: expansionZoom + 0.1, duration: 600 })
      return
    }

    // Cluster indivisible par le zoom (officines voisines/identiques) →
    // déploiement en cercle : chaque officine devient un pin cliquable.
    const leaves = sc.getLeaves(item.clusterId, 200) as Array<{ properties: { pharmacyId?: string } }>
    const pts = leaves
      .map(l => pharmacies.find(p => p.id === l.properties.pharmacyId))
      .filter((p): p is PharmacyMapPoint => Boolean(p))
    if (pts.length === 0) return

    const rawMap = map.getMap() as maplibregl.Map
    const positions = spiderPositions(rawMap, [item.lng, item.lat], pts.length)
    setSpiderfy({
      key: `${item.dept ?? 'x'}:${item.clusterId}`,
      center: [item.lng, item.lat],
      zoom,
      items: pts.map((p, i) => ({ p, lng: positions[i][0], lat: positions[i][1] })),
    })
  }, [pharmacies, showZoneBanner, spiderPositions])

  const handleMapLoad = useCallback(() => {
    setMapReady(true)
    updateDisplay()
  }, [updateDisplay])

  // Fin de déplacement/animation : recalcul garanti à la position finale
  // (le modèle peut sinon rester figé sur une vue intermédiaire du fitBounds).
  const handleMoveEnd = useCallback(() => {
    updateDisplay()
  }, [updateDisplay])

  // Le style de marque local n'a pas pu charger → repli CDN Voyager
  const handleMapError = useCallback(() => {
    setStyleFailed((prev) => (prev ? prev : true))
  }, [])

  // Fiche affichée : priorité au survol (PC), sinon la fiche cliquée
  const activeInfo = hoverInfo ?? popupInfo
  const isFromHover = hoverInfo !== null

  // Pins individuels sans clustering (mode liste brute)
  const unclusteredItems = useMemo(
    () => pharmacies.filter(p => p.latitude && p.longitude).map(p => ({ kind: 'pharmacy' as const, pharmacy: p })),
    [pharmacies]
  )

  const renderItems = showClusters ? display : unclusteredItems

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
        onClick={() => setSpiderfy(null)}
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

        {/* Déploiement « araignée » — rayons + point central */}
        {spiderfy && spiderfy.items.length > 0 && (
          <Source
            id="mh-spider"
            type="geojson"
            data={{
              type: 'FeatureCollection',
              features: [
                ...spiderfy.items.map(it => ({
                  type: 'Feature' as const,
                  properties: {},
                  geometry: { type: 'LineString' as const, coordinates: [[spiderfy.center[0], spiderfy.center[1]], [it.lng, it.lat]] },
                })),
                {
                  type: 'Feature' as const,
                  properties: {},
                  geometry: { type: 'Point' as const, coordinates: spiderfy.center },
                },
              ],
            }}
          >
            <Layer
              id="mh-spider-lines"
              type="line"
              paint={{ 'line-color': '#0F6E56', 'line-width': 1.6, 'line-opacity': 0.55 }}
            />
            <Layer
              id="mh-spider-dot"
              type="circle"
              filter={['==', '$type', 'Point']}
              paint={{ 'circle-radius': 4.5, 'circle-color': '#0F6E56', 'circle-stroke-width': 1.6, 'circle-stroke-color': '#ffffff' }}
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

        {/* Badges départementaux + clusters + officines individuelles */}
        {renderItems.map((item) => {
          if (item.kind === 'dept') {
            return (
              <DepartmentMarker
                key={`dept-${item.dept}`}
                dept={item.dept}
                count={item.count}
                longitude={item.lng}
                latitude={item.lat}
                onClick={() => handleDeptClick(item.dept)}
              />
            )
          }

          if (item.kind === 'cluster') {
            // Le cluster déployé en « araignée » est remplacé par ses officines
            if (spiderfy && spiderfy.key === `${item.dept ?? 'x'}:${item.clusterId}`) return null
            return (
              <ClusterMarker
                key={`cluster-${item.dept ?? 'x'}-${item.clusterId}`}
                count={item.count}
                dept={item.dept}
                longitude={item.lng}
                latitude={item.lat}
                onClick={() => handleClusterClick(item)}
              />
            )
          }

          const p = item.pharmacy
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

        {/* Officines déployées en « araignée » (cluster indivisible) */}
        {spiderfy?.items.map(({ p, lng, lat }) => (
          <Marker key={`spider-${p.id}`} longitude={lng} latitude={lat} anchor="bottom">
            <PharmacyMarker
              nom={p.nom}
              variant={pinVariant(p)}
              isSelected={selectedPharmacyId === p.id}
              isDimmed={p.medicamentDispo === false}
              showLabel
              onHover={() => {
                cancelHoverClose()
                setHoverInfo({ ...p, longitude: lng, latitude: lat })
              }}
              onLeave={scheduleHoverClose}
              onClick={() => {
                onPharmacyClick?.(p.id)
                setHoverInfo(null)
                openPharmacyCard(p, { atLng: lng, atLat: lat })
              }}
            />
          </Marker>
        ))}

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

      {/* Légende des couleurs — gris / vert / ambre */}
      <MapLegend />

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
