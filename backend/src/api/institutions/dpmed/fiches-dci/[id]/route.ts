import { NextRequest, NextResponse } from 'next/server'
import { db } from '@backend/lib/db'
import { requireAuth, checkInstitutionRole } from '@backend/lib/api-auth'

/**
 * GET /api/institutions/dpmed/fiches-dci/[id] — Détail d'une fiche DCI
 * Lecture : institutions + rôles pharmacie (référentiel national).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, 'M18_ALERTES_DPMED', 'read')
  if (auth instanceof Response) return auth

  const rolePharmacie = ['ADMIN', 'DIRECTEUR', 'PHARMACIEN', 'CAISSIER', 'MAGASINIER', 'COMPTABLE', 'STAGIAIRE', 'PROMOTEUR']
  const roleInstitution = ['DPMED_ADMIN', 'SOBAPS_VIEWER', 'ABRP_VIEWER', 'PLATFORM_ADMIN']
  if (!roleInstitution.includes(auth.roleName) && !rolePharmacie.includes(auth.roleName)) {
    return NextResponse.json({ error: 'Accès réservé aux institutions et professionnels de santé.' }, { status: 403 })
  }

  try {
    const { id } = await params
    const fiche = await db.ficheDCI.findUnique({ where: { id } })
    if (!fiche) {
      return NextResponse.json({ error: 'Fiche DCI introuvable' }, { status: 404 })
    }
    return NextResponse.json({
      ...fiche,
      interactions: safeJson(fiche.interactions),
      effetsIndesirables: safeJson(fiche.effetsIndesirables),
    })
  } catch (error) {
    console.error('Erreur GET fiche DCI:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement de la fiche' }, { status: 500 })
  }
}

/**
 * PATCH /api/institutions/dpmed/fiches-dci/[id] — Mettre à jour une fiche
 * Réservé DPMED_ADMIN (RW — CDC Institutionnel §5).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, 'M18_ALERTES_DPMED', 'read')
  if (auth instanceof Response) return auth

  const guard = checkInstitutionRole(auth, ['DPMED_ADMIN'])
  if (guard) return guard

  try {
    const { id } = await params
    const body = await request.json()
    const {
      dci,
      classeTherapeutique,
      mecanisme,
      indications,
      posologie,
      contreIndications,
      interactions,
      effetsIndesirables,
      conservation,
      source,
    } = body ?? {}

    const fiche = await db.ficheDCI.findUnique({ where: { id } })
    if (!fiche) {
      return NextResponse.json({ error: 'Fiche DCI introuvable' }, { status: 404 })
    }

    // Unicité de la DCI en cas de renommage
    if (dci && String(dci).trim() !== fiche.dci) {
      const existe = await db.ficheDCI.findUnique({ where: { dci: String(dci).trim() } })
      if (existe) {
        return NextResponse.json({ error: 'Une autre fiche porte déjà cette DCI' }, { status: 409 })
      }
    }

    const interRaw =
      interactions === undefined
        ? undefined
        : typeof interactions === 'string'
          ? interactions
          : JSON.stringify(interactions ?? [])
    const eiRaw =
      effetsIndesirables === undefined
        ? undefined
        : typeof effetsIndesirables === 'string'
          ? effetsIndesirables
          : JSON.stringify(effetsIndesirables ?? [])
    if (interRaw !== undefined && !Array.isArray(safeJson(interRaw))) {
      return NextResponse.json({ error: 'interactions doit être un tableau JSON' }, { status: 400 })
    }
    if (eiRaw !== undefined && !Array.isArray(safeJson(eiRaw))) {
      return NextResponse.json({ error: 'effetsIndesirables doit être un tableau JSON' }, { status: 400 })
    }

    const updated = await db.ficheDCI.update({
      where: { id },
      data: {
        ...(dci !== undefined && { dci: String(dci).trim() }),
        ...(classeTherapeutique !== undefined && { classeTherapeutique: String(classeTherapeutique).trim() }),
        ...(mecanisme !== undefined && { mecanisme }),
        ...(indications !== undefined && { indications }),
        ...(posologie !== undefined && { posologie }),
        ...(contreIndications !== undefined && { contreIndications }),
        ...(interRaw !== undefined && { interactions: interRaw }),
        ...(eiRaw !== undefined && { effetsIndesirables: eiRaw }),
        ...(conservation !== undefined && { conservation }),
        ...(source !== undefined && { source }),
      },
    })

    return NextResponse.json({
      ...updated,
      interactions: safeJson(updated.interactions),
      effetsIndesirables: safeJson(updated.effetsIndesirables),
    })
  } catch (error) {
    console.error('Erreur PATCH fiche DCI:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour de la fiche' }, { status: 500 })
  }
}

/**
 * DELETE /api/institutions/dpmed/fiches-dci/[id] — Supprimer une fiche
 * Réservé DPMED_ADMIN.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, 'M18_ALERTES_DPMED', 'read')
  if (auth instanceof Response) return auth

  const guard = checkInstitutionRole(auth, ['DPMED_ADMIN'])
  if (guard) return guard

  try {
    const { id } = await params
    const fiche = await db.ficheDCI.findUnique({ where: { id } })
    if (!fiche) {
      return NextResponse.json({ error: 'Fiche DCI introuvable' }, { status: 404 })
    }

    await db.ficheDCI.delete({ where: { id } })
    return NextResponse.json({ ok: true, dci: fiche.dci })
  } catch (error) {
    console.error('Erreur DELETE fiche DCI:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression de la fiche' }, { status: 500 })
  }
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}
