/**
 * Normalisation des numéros de téléphone béninois.
 *
 * Depuis novembre 2024, l'ARCEP a fait passer tous les numéros du Bénin de 8 à
 * 10 chiffres en les préfixant par « 01 » (ex. « 21 30 36 93 » devient
 * « 01 21 30 36 93 »). Le registre ABMed ainsi que les anciennes données
 * contiennent encore des formats hétérogènes :
 *
 *   « 21-30-36-93 »          → 01 21 30 36 93
 *   « 97 68 47 31 »          → 01 97 68 47 31
 *   « 65858737/54106610 »    → 01 65 85 87 37 (premier numéro)
 *   « 94 01 39 84 95 81 … »  → 01 94 01 39 84 (numéros concaténés du registre)
 *   « Non publié »           → aucune valeur (masqué côté interface)
 *
 * L'interface patient affiche systématiquement le numéro de l'OFFICINE
 * (champ `telephone`, colonne ABMed « Contact officine ») — jamais le contact
 * personnel du pharmacien (`contactPharmacien`).
 */

export interface PhoneBenin {
  /** Numéro formaté pour l'affichage : « 01 21 30 36 93 » */
  display: string
  /** Lien tel: au format international : « +2290121303693 » */
  tel: string
  /** Chiffres normalisés (10 chiffres, préfixe 01) */
  digits: string
}

const NON_PUBLIE = /non\s*publi|non\s*dispo|n\/?a\b|^—|^-$|aucun/i

/**
 * Normalise un numéro béninois vers le format à 10 chiffres préfixé « 01 ».
 * Retourne `null` lorsque le numéro est absent / non publié / illisible.
 */
export function formatPhoneBenin(raw?: string | null): PhoneBenin | null {
  if (!raw) return null
  const text = raw.trim()
  if (!text || NON_PUBLIE.test(text)) return null

  // Le registre concatène parfois plusieurs numéros (« 65858737/54106610 ») :
  // on retient le premier segment exploitable.
  const segments = text.split(/[/,;]+/)
  for (const segment of segments) {
    let digits = segment.replace(/\D/g, '')
    if (digits.length < 8) continue

    // Indicatif +229 déjà présent → on le retire
    if (digits.startsWith('229') && digits.length >= 11 && digits.length <= 14) {
      digits = digits.slice(3)
    }

    if (digits.length === 8) {
      // Ancien plan 8 chiffres → préfixe 01
      digits = `01${digits}`
    } else if (digits.length > 10) {
      // Numéros concaténés sans séparateur (registre ABMed) → premier numéro
      digits = `01${digits.slice(0, 8)}`
    } else if (digits.length !== 10) {
      continue
    }
    // digits fait maintenant 10 caractères ; s'il ne commence pas par 01 on
    // l'affiche tel quel (format déjà à 10 chiffres du nouveau plan).

    const display = digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim()
    return { display, tel: `+229${digits}`, digits }
  }

  return null
}

/**
 * Version utilitaire : renvoie la chaîne d'affichage seule (ou « — »).
 */
export function phoneDisplay(raw?: string | null): string {
  return formatPhoneBenin(raw)?.display ?? '—'
}
