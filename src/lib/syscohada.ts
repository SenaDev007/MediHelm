/**
 * MediHelm — Export comptable SYSCOHADA révisé (M08 + G09)
 *
 * Le journal exporté contient : date, libellé, compte débiteur, compte
 * créditeur, montant, référence — format CSV compatible Saari Comptabilité,
 * Sage 100 et Excel (MédiHelm_Specs §10.2).
 *
 * Sources de données (toutes isolées par pharmacieId) :
 *   1. Ventes VALIDÉES + paiements associés  → journal VT
 *   2. Réceptions fournisseurs (achats)      → journal AC
 *   3. Bulletins de paie (CNSS 3,6/15,4 %)   → journal PA
 *   4. Écritures comptables manuelles        → journal OD
 *
 * Plan comptable : SYSCOHADA révisé (OHADA) — jamais le plan français.
 * Devise : FCFA (XOF), jamais de conversion.
 */

import { db } from '@/lib/db'

// ─── Plan comptable SYSCOHADA révisé (extrait utilisé) ───────────────────────

export const COMPTES = {
  CAISSE: '571', // Caisse
  BANQUE: '5211', // Banques locales — comptes en FCFA
  CLIENTS: '411', // Clients et comptes rattachés
  FOURNISSEURS: '401', // Fournisseurs de stocks
  PERSONNEL_REMUNERATIONS: '421', // Personnel — rémunérations dues
  SECURITE_SOCIALE: '431', // Organismes de sécurité sociale (CNSS)
  TVA_FACTUREE: '4431', // État — TVA facturée sur ventes
  TVA_RECUPERABLE: '4451', // État — TVA récupérable sur achats
  ACHATS_MARCHANDISES: '601', // Achats de marchandises
  AUTRES_CHARGES: '618', // Autres charges externes diverses
  REMUNERATIONS: '661', // Rémunérations directes du personnel national
  CHARGES_SOCIALES: '664', // Charges sociales patronales (CNSS 15,4 %)
  VENTES_MARCHANDISES: '701', // Ventes de marchandises
  PRESTATIONS: '706', // Prestations de services
} as const

/** CNSS Bénin — part salariale 3,6 % / part patronale 15,4 % (CONSTANTES métier) */
export const CNSS_SALARIALE = 0.036
export const CNSS_PATRONALE = 0.154

/** TVA Bénin — 18 %. Médicaments essentiels souvent exonérés : 0 par défaut. */
export const TVA_DEFAUT = 0

/** Codes journaux SYSCOHADA */
const JOURNAL = {
  VENTES: 'VT',
  ACHATS: 'AC',
  PAIE: 'PA',
  DIVERS: 'OD',
} as const

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LigneJournal {
  /** Date d'écriture (ISO) */
  date: Date
  /** Code journal (VT/AC/PA/OD) */
  journal: string
  /** Libellé */
  libelle: string
  /** Compte débité */
  compteDebit: string
  /** Compte crédité */
  compteCredit: string
  /** Montant en FCFA (toujours positif) */
  montant: number
  /** Référence du document source */
  reference: string
  /** Document d'origine (traçabilité) */
  source: 'VENTE' | 'ACHAT' | 'PAIE' | 'MANUELLE'
}

export interface LigneBalance {
  compte: string
  intitule: string
  totalDebit: number
  totalCredit: number
  solde: number // > 0 : débiteur ; < 0 : créditeur
}

export interface ExportSyscohada {
  periode: { debut: string; fin: string }
  pharmacie: { id: string; nom: string }
  journal: LigneJournal[]
  balance: LigneBalance[]
  totaux: {
    lignes: number
    debit: number
    credit: number
    equilibre: boolean // principe de la partie double : débit === crédit
  }
  tvaTaux: number
}

// ─── Comptes par mode de paiement ────────────────────────────────────────────

const COMPTE_PAR_MODE: Record<string, string> = {
  ESPECES: COMPTES.CAISSE,
  WAVE: COMPTES.BANQUE,
  MTN_MONEY: COMPTES.BANQUE,
  MOOV_MONEY: COMPTES.BANQUE,
  CARTE_BANCAIRE: COMPTES.BANQUE,
  CHEQUE: COMPTES.BANQUE,
  CREDIT: COMPTES.CLIENTS,
  ASSURANCE: COMPTES.CLIENTS,
  TIERS_PAYANT: COMPTES.CLIENTS,
}

// ─── Génération du journal ───────────────────────────────────────────────────

/**
 * Construit l'export SYSCOHADA complet d'une pharmacie sur une période.
 * Le principe de la partie double est garanti : chaque ligne équilibre
 * exactement un débit et un crédit de même montant.
 */
export async function genererExportSyscohada(params: {
  pharmacieId: string
  debut: Date
  fin: Date
  tvaTaux?: number
}): Promise<ExportSyscohada> {
  const { pharmacieId, debut, fin } = params
  const tvaTaux = params.tvaTaux ?? TVA_DEFAUT
  const journal: LigneJournal[] = []

  const pharmacie = await db.pharmacie.findUnique({
    where: { id: pharmacieId },
    select: { id: true, nom: true },
  })

  // 1 ── Ventes validées (journal VT)
  const ventes = await db.vente.findMany({
    where: {
      pharmacieId,
      createdAt: { gte: debut, lte: fin },
      statut: { in: ['VALIDEE', 'PARTIELLEMENT_PAYEE'] },
    },
    include: { paiements: true },
    orderBy: { createdAt: 'asc' },
  })

  for (const v of ventes) {
    // Décomposition HT / TVA (les montants MediHelm sont TTC)
    const ttc = v.montantTotal
    const tva = tvaTaux > 0 ? ttc - ttc / (1 + tvaTaux) : 0
    const ht = ttc - tva

    // Débit : paiements réellement enregistrés (571/5211), solde → 411 Clients
    const paiementsReussis = v.paiements.filter((p) => p.statut === 'REUSSI')
    let totalPaye = paiementsReussis.reduce((s, p) => s + p.montant, 0)
    // Garde-fou : jamais plus encaissé que le total de la vente
    if (totalPaye > ttc) totalPaye = ttc
    const regleParMode = new Map<string, number>()
    for (const p of paiementsReussis) {
      const compte = COMPTE_PAR_MODE[p.mode] ?? COMPTES.CAISSE
      regleParMode.set(compte, (regleParMode.get(compte) ?? 0) + p.montant)
    }
    // Fallback : aucune ligne de paiement → montantPaye de la vente
    if (regleParMode.size === 0 && v.montantPaye > 0) {
      const compte = COMPTE_PAR_MODE[v.modePaiement] ?? COMPTES.CAISSE
      regleParMode.set(compte, Math.min(v.montantPaye, ttc))
      totalPaye = Math.min(v.montantPaye, ttc)
    }
    const impaye = Math.max(0, ttc - totalPaye)
    if (impaye > 0) {
      regleParMode.set(COMPTES.CLIENTS, (regleParMode.get(COMPTES.CLIENTS) ?? 0) + impaye)
    }

    // Crédit : 701 Ventes (HT) + 4431 TVA facturée
    let creditRestant = ttc
    const credits: Array<{ compte: string; montant: number }> = [{ compte: COMPTES.VENTES_MARCHANDISES, montant: ht }]
    creditRestant -= ht
    if (tva > 0) {
      credits.push({ compte: COMPTES.TVA_FACTUREE, montant: tva })
      creditRestant -= tva
    }

    // Appariement débits ↔ crédits (partie double exacte)
    const debits = Array.from(regleParMode.entries()).map(([compte, montant]) => ({ compte, montant }))
    let i = 0
    for (const d of debits) {
      let reste = d.montant
      while (reste > 0.005 && i < credits.length) {
        const c = credits[i]
        const pris = Math.min(reste, c.montant)
        journal.push({
          date: v.createdAt,
          journal: JOURNAL.VENTES,
          libelle: `Vente ${v.reference}`,
          compteDebit: d.compte,
          compteCredit: c.compte,
          montant: round2(pris),
          reference: v.reference,
          source: 'VENTE',
        })
        c.montant -= pris
        reste -= pris
        if (c.montant <= 0.005) i++
      }
    }
  }

  // 2 ── Achats : réceptions fournisseurs (journal AC)
  const receptions = await db.receptionFournisseur.findMany({
    where: { pharmacieId, createdAt: { gte: debut, lte: fin } },
    include: { lignes: true, fournisseur: true },
    orderBy: { createdAt: 'asc' },
  })

  for (const r of receptions) {
    const montant = r.lignes.reduce((s, l) => s + l.quantite * l.prixAchat, 0)
    if (montant <= 0) continue
    const tva = tvaTaux > 0 ? montant * tvaTaux : 0
    journal.push({
      date: r.createdAt,
      journal: JOURNAL.ACHATS,
      libelle: `Achat ${r.fournisseur?.nom ?? 'fournisseur'} — BL ${r.numeroBL ?? 'sans BL'}`,
      compteDebit: COMPTES.ACHATS_MARCHANDISES,
      compteCredit: COMPTES.FOURNISSEURS,
      montant: round2(montant),
      reference: r.numeroBL ?? `REC-${r.id.slice(0, 8)}`,
      source: 'ACHAT',
    })
    if (tva > 0) {
      journal.push({
        date: r.createdAt,
        journal: JOURNAL.ACHATS,
        libelle: `TVA récupérable — BL ${r.numeroBL ?? ''}`,
        compteDebit: COMPTES.TVA_RECUPERABLE,
        compteCredit: COMPTES.FOURNISSEURS,
        montant: round2(tva),
        reference: r.numeroBL ?? `REC-${r.id.slice(0, 8)}`,
        source: 'ACHAT',
      })
    }
  }

  // 3 ── Paie (journal PA) — CNSS Bénin : salariale 3,6 % / patronale 15,4 %
  const bulletins = await db.bulletinPaie.findMany({
    where: { pharmacieId, createdAt: { gte: debut, lte: fin } },
    orderBy: { createdAt: 'asc' },
  })

  for (const b of bulletins) {
    const periode = `${String(b.mois).padStart(2, '0')}/${b.annee}`
    // 661 Brut (incl. primes) / 421 Net
    journal.push({
      date: b.createdAt,
      journal: JOURNAL.PAIE,
      libelle: `Paie ${periode} — brut ${Math.round(b.salaireBrut)} FCFA`,
      compteDebit: COMPTES.REMUNERATIONS,
      compteCredit: COMPTES.PERSONNEL_REMUNERATIONS,
      montant: round2(b.salaireBrut),
      reference: `PAY-${periode.replace('/', '-')}`,
      source: 'PAIE',
    })
    // Retenues (CNSS salariale) : 421 doit → 431 Sécurité sociale
    if (b.retenues > 0) {
      journal.push({
        date: b.createdAt,
        journal: JOURNAL.PAIE,
        libelle: `Retenues CNSS ${periode} (part salariale)`,
        compteDebit: COMPTES.PERSONNEL_REMUNERATIONS,
        compteCredit: COMPTES.SECURITE_SOCIALE,
        montant: round2(b.retenues),
        reference: `PAY-${periode.replace('/', '-')}`,
        source: 'PAIE',
      })
    }
    // Charges patronales 15,4 % : 664 / 431
    const patronale = b.salaireBrut * CNSS_PATRONALE
    if (patronale > 0) {
      journal.push({
        date: b.createdAt,
        journal: JOURNAL.PAIE,
        libelle: `Charges sociales patronales ${periode} (15,4 %)`,
        compteDebit: COMPTES.CHARGES_SOCIALES,
        compteCredit: COMPTES.SECURITE_SOCIALE,
        montant: round2(patronale),
        reference: `PAY-${periode.replace('/', '-')}`,
        source: 'PAIE',
      })
    }
  }

  // 4 ── Écritures manuelles (journal OD)
  const manuelles = await db.ecritureComptable.findMany({
    where: { pharmacieId, dateEcriture: { gte: debut, lte: fin } },
    orderBy: { dateEcriture: 'asc' },
  })

  for (const e of manuelles) {
    if (e.montant <= 0) continue
    const isRecette = e.type === 'RECETTE'
    journal.push({
      date: e.dateEcriture,
      journal: JOURNAL.DIVERS,
      libelle: e.libelle,
      compteDebit: isRecette ? COMPTES.CAISSE : COMPTES.AUTRES_CHARGES,
      compteCredit: isRecette ? COMPTES.PRESTATIONS : COMPTES.CAISSE,
      montant: round2(e.montant),
      reference: e.reference ?? `OD-${e.id.slice(0, 8)}`,
      source: 'MANUELLE',
    })
  }

  // ── Balance des comptes
  const balance = construireBalance(journal)
  const totalDebit = journal.reduce((s, l) => s + l.montant, 0)
  const totalCredit = balance.reduce((s, l) => s + l.totalCredit, 0)

  return {
    periode: { debut: debut.toISOString(), fin: fin.toISOString() },
    pharmacie: { id: pharmacie?.id ?? pharmacieId, nom: pharmacie?.nom ?? '' },
    journal,
    balance,
    totaux: {
      lignes: journal.length,
      debit: round2(totalDebit),
      credit: round2(totalCredit),
      equilibre: Math.abs(totalDebit - totalCredit) < 0.01,
    },
    tvaTaux,
  }
}

// ─── Balance ─────────────────────────────────────────────────────────────────

const INTITULES: Record<string, string> = {
  [COMPTES.CAISSE]: 'Caisse',
  [COMPTES.BANQUE]: 'Banques locales (FCFA)',
  [COMPTES.CLIENTS]: 'Clients et comptes rattachés',
  [COMPTES.FOURNISSEURS]: 'Fournisseurs de stocks',
  [COMPTES.PERSONNEL_REMUNERATIONS]: 'Personnel — rémunérations dues',
  [COMPTES.SECURITE_SOCIALE]: 'Sécurité sociale (CNSS)',
  [COMPTES.TVA_FACTUREE]: 'État — TVA facturée',
  [COMPTES.TVA_RECUPERABLE]: 'État — TVA récupérable',
  [COMPTES.ACHATS_MARCHANDISES]: 'Achats de marchandises',
  [COMPTES.AUTRES_CHARGES]: 'Autres charges externes',
  [COMPTES.REMUNERATIONS]: 'Rémunérations directes du personnel',
  [COMPTES.CHARGES_SOCIALES]: 'Charges sociales patronales',
  [COMPTES.VENTES_MARCHANDISES]: 'Ventes de marchandises',
  [COMPTES.PRESTATIONS]: 'Prestations de services',
}

export function construireBalance(journal: LigneJournal[]): LigneBalance[] {
  const parCompte = new Map<string, LigneBalance>()
  const touch = (compte: string) => {
    if (!parCompte.has(compte)) {
      parCompte.set(compte, {
        compte,
        intitule: INTITULES[compte] ?? `Compte ${compte}`,
        totalDebit: 0,
        totalCredit: 0,
        solde: 0,
      })
    }
    return parCompte.get(compte)!
  }
  for (const l of journal) {
    touch(l.compteDebit).totalDebit += l.montant
    touch(l.compteCredit).totalCredit += l.montant
  }
  return Array.from(parCompte.values())
    .map((c) => ({ ...c, solde: round2(c.totalDebit - c.totalCredit) }))
    .sort((a, b) => a.compte.localeCompare(b.compte))
}

// ─── Formats CSV (Saari / Sage 100 / Excel) ──────────────────────────────────

const fmtDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`

const esc = (s: string) => `"${s.replace(/"/g, '""')}"`

/** Format « journal simple » — exactement la colonne des Specs §10.2 */
export function journalCSVSimple(export_: ExportSyscohada): string {
  const head = 'Date;Libellé;Compte débiteur;Compte créditeur;Montant;Référence'
  const lines = export_.journal.map((l) =>
    [
      fmtDate(l.date),
      esc(l.libelle),
      l.compteDebit,
      l.compteCredit,
      l.montant.toFixed(2),
      esc(l.reference),
    ].join(';')
  )
  return [head, ...lines].join('\r\n') + '\r\n'
}

/**
 * Format « écritures détaillées » (une ligne par compte) — le format
 * universel d'import Sage 100 / Saari : Date;Journal;Compte;Libellé;Débit;Crédit;Référence
 */
export function journalCSVDouble(export_: ExportSyscohada): string {
  const head = 'Date;Journal;Compte;Libellé;Débit;Crédit;Référence'
  const lines = export_.journal.flatMap((l) => [
    [fmtDate(l.date), l.journal, l.compteDebit, esc(l.libelle), l.montant.toFixed(2), '0.00', esc(l.reference)].join(';'),
    [fmtDate(l.date), l.journal, l.compteCredit, esc(l.libelle), '0.00', l.montant.toFixed(2), esc(l.reference)].join(';'),
  ])
  return [head, ...lines].join('\r\n') + '\r\n'
}

/** Balance des comptes en CSV */
export function balanceCSV(export_: ExportSyscohada): string {
  const head = 'Compte;Intitulé;Total débit;Total crédit;Solde débiteur;Solde créditeur'
  const lines = export_.balance.map((b) =>
    [
      b.compte,
      esc(b.intitule),
      b.totalDebit.toFixed(2),
      b.totalCredit.toFixed(2),
      b.solde > 0 ? b.solde.toFixed(2) : '0.00',
      b.solde < 0 ? Math.abs(b.solde).toFixed(2) : '0.00',
    ].join(';')
  )
  const tot = [
    'TOTAL',
    '—',
    export_.totaux.debit.toFixed(2),
    export_.totaux.credit.toFixed(2),
    '',
    '',
  ].join(';')
  return [head, ...lines, tot].join('\r\n') + '\r\n'
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ─── Export SYSCOHADA GROSSISTE (module G09) ─────────────────────────────────

/**
 * Journal SYSCOHADA du grossiste : facturation des officines clientes.
 * Chaque commande livrée = D 411 Clients (TTC) / C 701 Ventes (HT) + 4431 TVA.
 * Les encaissements (montantPaye) soldent le 411 : D 5211 / C 411.
 */
export async function genererExportSyscohadaGrossiste(params: {
  grossisteId: string
  debut: Date
  fin: Date
  tvaTaux?: number
}): Promise<ExportSyscohada> {
  const { grossisteId, debut, fin } = params
  const tvaTaux = params.tvaTaux ?? TVA_DEFAUT
  const journal: LigneJournal[] = []

  const grossiste = await db.grossiste.findUnique({
    where: { id: grossisteId },
    select: { id: true, nom: true },
  })

  const commandes = await db.commandeGrossiste.findMany({
    where: {
      grossisteId,
      createdAt: { gte: debut, lte: fin },
      statut: { in: ['LIVREE', 'LIVREE_PARTIELLEMENT', 'EN_LIVRAISON', 'LITIGE'] },
    },
    include: { pharmacie: { select: { nom: true } } },
    orderBy: { createdAt: 'asc' },
  })

  for (const c of commandes) {
    if (c.montantTotal <= 0) continue
    const ttc = c.montantTotal
    const tva = tvaTaux > 0 ? ttc - ttc / (1 + tvaTaux) : 0
    const ht = ttc - tva
    const client = c.pharmacie?.nom ?? 'Officine cliente'

    // Facturation : D 411 / C 701 (+4431 si TVA)
    let creditRestant = ttc
    const credits: Array<{ compte: string; montant: number }> = [
      { compte: COMPTES.VENTES_MARCHANDISES, montant: ht },
    ]
    creditRestant -= ht
    if (tva > 0) {
      credits.push({ compte: COMPTES.TVA_FACTUREE, montant: tva })
      creditRestant -= tva
    }
    let i = 0
    let reste = ttc
    while (reste > 0.005 && i < credits.length) {
      const cr = credits[i]
      const pris = Math.min(reste, cr.montant)
      journal.push({
        date: c.createdAt,
        journal: 'VT',
        libelle: `Facture ${c.reference} — ${client}`,
        compteDebit: COMPTES.CLIENTS,
        compteCredit: cr.compte,
        montant: round2(pris),
        reference: c.reference,
        source: 'VENTE',
      })
      cr.montant -= pris
      reste -= pris
      if (cr.montant <= 0.005) i++
    }

    // Encaissement partiel : D 5211 Banques / C 411 Clients
    if (c.montantPaye > 0) {
      journal.push({
        date: c.createdAt,
        journal: 'VT',
        libelle: `Encaissement ${c.reference} — ${client}`,
        compteDebit: COMPTES.BANQUE,
        compteCredit: COMPTES.CLIENTS,
        montant: round2(Math.min(c.montantPaye, ttc)),
        reference: `ENC-${c.reference}`,
        source: 'VENTE',
      })
    }
  }

  const balance = construireBalance(journal)
  const totalDebit = journal.reduce((s, l) => s + l.montant, 0)
  const totalCredit = balance.reduce((s, l) => s + l.totalCredit, 0)

  return {
    periode: { debut: debut.toISOString(), fin: fin.toISOString() },
    pharmacie: { id: grossiste?.id ?? grossisteId, nom: grossiste?.nom ?? '' },
    journal,
    balance,
    totaux: {
      lignes: journal.length,
      debit: round2(totalDebit),
      credit: round2(totalCredit),
      equilibre: Math.abs(totalDebit - totalCredit) < 0.01,
    },
    tvaTaux,
  }
}
