// ============================================================
// MediHelm — ParseGS1 Service
// Extraction des données GS1 DataMatrix (AI 01, 10, 17, 21)
// Référence: MH-SPECS-2025-v2.0 — Module Scan
// ============================================================

export interface GS1ParseResult {
  success: boolean
  gtin?: string        // AI 01 — Global Trade Item Number (14 chars)
  lot?: string         // AI 10 — Batch/Lot number
  expiration?: string  // AI 17 — Expiration date (YYMMDD)
  serial?: string      // AI 21 — Serial number
  rawCode: string
  error?: string
}

/**
 * Parse a GS1 DataMatrix code string
 * Extracts Application Identifiers: 01=GTIN, 10=Lot, 17=Expiration, 21=Serial
 * GS1 codes use FNC1 (ASCII 29 / \x1D) as separator, or parentheses in HRI format
 */
export function parseGS1(code: string): GS1ParseResult {
  if (!code || code.trim().length === 0) {
    return { success: false, rawCode: code, error: 'Code vide' }
  }

  const result: GS1ParseResult = { success: true, rawCode: code }

  try {
    // Try binary format (FNC1 separator = ASCII 29)
    if (code.includes('\x1D') || code.length > 20) {
      parseBinaryFormat(code, result)
    } else {
      // Try HRI format with parentheses (01)12345678901234(10)LOT123(17)251231
      parseHRIFormat(code, result)
    }

    // Validate at least one AI was found
    if (!result.gtin && !result.lot && !result.expiration && !result.serial) {
      // Try plain barcode (EAN-13 or similar)
      if (/^\d{13}$/.test(code.trim())) {
        result.gtin = code.trim()
      } else if (/^\d{8}$/.test(code.trim())) {
        result.gtin = code.trim()
      } else {
        result.success = false
        result.error = 'Aucun identifiant GS1 reconnu dans le code'
      }
    }
  } catch (e) {
    result.success = false
    result.error = `Erreur de parsing: ${e instanceof Error ? e.message : 'Erreur inconnue'}`
  }

  return result
}

function parseBinaryFormat(code: string, result: GS1ParseResult) {
  const separator = '\x1D'
  let remaining = code

  // Check for GS1-128 starting with ]C1 or raw binary
  if (remaining.startsWith(']C1')) {
    remaining = remaining.substring(3)
  }

  while (remaining.length > 0) {
    // AI 01 — GTIN (14 digits)
    if (remaining.startsWith('01') && remaining.length >= 16) {
      result.gtin = remaining.substring(2, 16)
      remaining = remaining.substring(16)
      if (remaining.startsWith(separator)) remaining = remaining.substring(1)
    }
    // AI 10 — Lot (variable, up to 20 chars, FNC1 terminated)
    else if (remaining.startsWith('10')) {
      remaining = remaining.substring(2)
      const sepIdx = remaining.indexOf(separator)
      result.lot = sepIdx >= 0 ? remaining.substring(0, sepIdx) : remaining.substring(0, 20)
      remaining = sepIdx >= 0 ? remaining.substring(sepIdx + 1) : ''
    }
    // AI 17 — Expiration date (6 digits YYMMDD)
    else if (remaining.startsWith('17') && remaining.length >= 8) {
      result.expiration = remaining.substring(2, 8)
      remaining = remaining.substring(8)
      if (remaining.startsWith(separator)) remaining = remaining.substring(1)
    }
    // AI 21 — Serial (variable, up to 20 chars, FNC1 terminated)
    else if (remaining.startsWith('21')) {
      remaining = remaining.substring(2)
      const sepIdx = remaining.indexOf(separator)
      result.serial = sepIdx >= 0 ? remaining.substring(0, sepIdx) : remaining.substring(0, 20)
      remaining = sepIdx >= 0 ? remaining.substring(sepIdx + 1) : ''
    }
    // AI 11 — Production date (6 digits)
    else if (remaining.startsWith('11') && remaining.length >= 8) {
      remaining = remaining.substring(8)
      if (remaining.startsWith(separator)) remaining = remaining.substring(1)
    }
    // Skip unknown AI (2-digit)
    else {
      // Try to skip to next FNC1
      const sepIdx = remaining.indexOf(separator)
      if (sepIdx >= 0) {
        remaining = remaining.substring(sepIdx + 1)
      } else {
        break
      }
    }
  }
}

function parseHRIFormat(code: string, result: GS1ParseResult) {
  // HRI format: (01)12345678901234(10)LOT123(17)251231
  const aiPattern = /\((\d{2})\)([^()]+)/g
  let match

  while ((match = aiPattern.exec(code)) !== null) {
    const ai = match[1]
    const value = match[2]

    switch (ai) {
      case '01':
        result.gtin = value
        break
      case '10':
        result.lot = value
        break
      case '17':
        result.expiration = value
        break
      case '21':
        result.serial = value
        break
    }
  }

  // Also try without parentheses - just straight codes
  if (!result.gtin && !result.lot) {
    // Try matching 01 followed by 14 digits
    const gtinMatch = code.match(/01(\d{14})/)
    if (gtinMatch) result.gtin = gtinMatch[1]

    const lotMatch = code.match(/10([A-Za-z0-9]+)/)
    if (lotMatch) result.lot = lotMatch[1]

    const expMatch = code.match(/17(\d{6})/)
    if (expMatch) result.expiration = expMatch[1]

    const serialMatch = code.match(/21([A-Za-z0-9]+)/)
    if (serialMatch) result.serial = serialMatch[1]
  }
}

/**
 * Convert GS1 expiration date (YYMMDD) to JavaScript Date
 */
export function parseGS1Date(dateStr: string): Date | null {
  if (!dateStr || dateStr.length !== 6) return null
  const year = 2000 + parseInt(dateStr.substring(0, 2))
  const month = parseInt(dateStr.substring(2, 4)) - 1
  const day = parseInt(dateStr.substring(4, 6))
  return new Date(year, month, day)
}

// ============================================================
// ScanResolver — 5-step resolution pipeline
// ============================================================

import { db } from '@/lib/db'
import type { Medicament, Lot } from '@prisma/client'

export interface ScanResult {
  status: 'CONFORME' | 'ALERTE' | 'NON_REFERENCE'
  message: string
  medicament?: {
    id: string
    nomCommercial: string
    dci: string
    forme: string
    dosage: string
  }
  lot?: {
    id: string
    numeroLot: string
    quantite: number
    dateExpiration: string
  }
  alertes?: Array<{
    type: string
    titre: string
    description: string
    niveauUrgence: string
  }>
  surveillances?: Array<{
    type: string
    description: string
    niveauRisque: string
  }>
  tempsReponse?: number
}

/**
 * 5-step scan resolution:
 * 1. parseGS1 → extract GTIN, lot, expiration, serial
 * 2. findMedicament → lookup by codeBarres (GTIN)
 * 3. checkAlertes → check DPMED alerts for this DCI/lot
 * 4. checkPeremption → verify expiration date
 * 5. determineAction → return CONFORME/ALERTE/NON_REFERENCE
 */
export async function resolveScan(
  rawCode: string,
  pharmacieId: string,
  contexte: 'VENTE' | 'RECEPTION' | 'INVENTAIRE' | 'PATIENT' = 'VENTE',
  utilisateurId?: string
): Promise<ScanResult> {
  const startTime = Date.now()

  // Step 1: Parse GS1 code
  const parsed = parseGS1(rawCode)

  // Step 2: Find medicament by code-barres (GTIN)
  let medicament: Medicament | null = null
  let lot: Lot & { medicament?: Medicament } | null = null

  if (parsed.gtin) {
    medicament = await db.medicament.findFirst({
      where: { codeBarres: parsed.gtin, pharmacieId, actif: true },
    })
  }

  // If not found by GTIN, try finding by lot number
  if (!medicament && parsed.lot) {
    lot = await db.lot.findFirst({
      where: { numeroLot: parsed.lot, pharmacieId },
      include: { medicament: true },
    })
    if (lot) {
      medicament = lot.medicament ?? null
    }
  }

  // If still not found, try raw code as barcode
  if (!medicament) {
    medicament = await db.medicament.findFirst({
      where: {
        OR: [
          { codeBarres: rawCode.trim() },
          { codeBarres: rawCode.trim().replace(/^0+/, '') },
        ],
        pharmacieId,
        actif: true,
      },
    })
  }

  // If lot not found yet but we have a medicament, try to find lot
  if (medicament && !lot && parsed.lot) {
    lot = await db.lot.findFirst({
      where: { numeroLot: parsed.lot, medicamentId: medicament.id, pharmacieId },
    })
  }

  // Step 3: Check DPMED alerts
  const alertes: ScanResult['alertes'] = []
  if (medicament) {
    const activeAlertes = await db.alerteDPMED.findMany({
      where: {
        statut: 'EN_DIFFUSION',
        dciConcernee: { equals: medicament.dci, mode: 'insensitive' },
      },
      take: 5,
    })

    for (const alerte of activeAlertes) {
      alertes.push({
        type: alerte.typeAlerte,
        titre: alerte.titre,
        description: alerte.description || '',
        niveauUrgence: alerte.niveauUrgence,
      })
    }
  }

  // Step 4: Check surveillance
  const surveillances: ScanResult['surveillances'] = []
  if (medicament) {
    const activeSurveillances = await db.medicamentSurveillance.findMany({
      where: {
        dci: { equals: medicament.dci, mode: 'insensitive' },
        statut: 'ACTIVE',
      },
      take: 5,
    })

    for (const surv of activeSurveillances) {
      surveillances.push({
        type: surv.typeSurveillance,
        description: surv.description,
        niveauRisque: surv.niveauRisque,
      })
    }
  }

  // Check peremption
  let isExpired = false
  if (lot) {
    isExpired = new Date(lot.dateExpiration) < new Date()
  } else if (parsed.expiration) {
    const expDate = parseGS1Date(parsed.expiration)
    if (expDate) isExpired = expDate < new Date()
  }

  // Step 5: Determine action
  let status: ScanResult['status']
  let message: string

  if (!medicament) {
    status = 'NON_REFERENCE'
    message = 'Médicament non référencé dans la base de données'
  } else if (alertes.length > 0 || surveillances.length > 0) {
    status = 'ALERTE'
    message = alertes.length > 0
      ? `ALERTE DPMED: ${alertes[0].titre}`
      : `Sous surveillance: ${surveillances[0].description}`
  } else if (isExpired) {
    status = 'ALERTE'
    message = 'Lot expiré — ne pas délivrer'
  } else {
    status = 'CONFORME'
    message = 'Médicament conforme — délivrance autorisée'
  }

  const tempsReponse = Date.now() - startTime

  // Log scan
  try {
    await db.scanLog.create({
      data: {
        pharmacieId,
        utilisateurId,
        rawCode,
        contexte,
        resultat: status,
        medicamentId: medicament?.id,
        lotId: lot?.id,
        tempsReponse,
      },
    })
  } catch {
    // ScanLog model might not exist yet
  }

  return {
    status,
    message,
    medicament: medicament ? {
      id: medicament.id,
      nomCommercial: medicament.nomCommercial,
      dci: medicament.dci,
      forme: medicament.forme,
      dosage: medicament.dosage,
    } : undefined,
    lot: lot ? {
      id: lot.id,
      numeroLot: lot.numeroLot,
      quantite: lot.quantite,
      dateExpiration: lot.dateExpiration.toISOString(),
    } : undefined,
    alertes: alertes.length > 0 ? alertes : undefined,
    surveillances: surveillances.length > 0 ? surveillances : undefined,
    tempsReponse,
  }
}
