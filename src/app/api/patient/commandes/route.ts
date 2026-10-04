import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { validate, commandePatientSchema } from '@/lib/validations'

class OrderError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M03_COMMANDES', 'read')
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    let patientId = searchParams.get('patientId')

    if (authResult.roleName === 'PATIENT') {
      const ownPatient = await db.patient.findFirst({
        where: { utilisateurId: authResult.id, actif: true },
        select: { id: true },
      })
      if (!ownPatient) return NextResponse.json({ error: 'Dossier patient introuvable' }, { status: 404 })
      if (patientId && patientId !== ownPatient.id) {
        return NextResponse.json({ error: 'Accès refusé à ce dossier patient' }, { status: 403 })
      }
      patientId = ownPatient.id
    }

    if (!patientId) {
      return NextResponse.json({ error: 'Le paramètre patientId est requis' }, { status: 400 })
    }

    const patient = await db.patient.findFirst({
      where: {
        id: patientId,
        ...(authResult.roleName === 'PLATFORM_ADMIN' ? {} : { pharmacieId: authResult.pharmacieId }),
      },
      select: { id: true },
    })
    if (!patient) return NextResponse.json({ error: 'Patient non trouvé' }, { status: 404 })

    const commandes = await db.commandePatient.findMany({
      where: { patientId },
      include: {
        lignes: {
          include: {
            medicament: { select: { id: true, nomCommercial: true, dci: true, forme: true } },
          },
        },
        pharmacie: { select: { id: true, nom: true, adresse: true, ville: true, telephone: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(commandes)
  } catch {
    console.error('Erreur GET patient/commandes')
    return NextResponse.json({ error: 'Erreur lors de la récupération des commandes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M03_COMMANDES', 'write')
    if (authResult instanceof Response) return authResult

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
    }
    const validation = validate(commandePatientSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    let patientId = data.patientId
    if (authResult.roleName === 'PATIENT') {
      const ownPatient = await db.patient.findFirst({
        where: { utilisateurId: authResult.id, actif: true },
        select: { id: true },
      })
      if (!ownPatient) return NextResponse.json({ error: 'Dossier patient introuvable' }, { status: 404 })
      if (patientId && patientId !== ownPatient.id) {
        return NextResponse.json({ error: 'Accès refusé à ce dossier patient' }, { status: 403 })
      }
      patientId = ownPatient.id
    }
    if (!patientId) return NextResponse.json({ error: 'patientId est requis' }, { status: 400 })

    if (authResult.roleName !== 'PLATFORM_ADMIN' && authResult.roleName !== 'PATIENT' && data.pharmacieId !== authResult.pharmacieId) {
      return NextResponse.json({ error: 'Accès refusé à cette pharmacie' }, { status: 403 })
    }

    const [patient, pharmacie] = await Promise.all([
      db.patient.findFirst({
        where: {
          id: patientId,
          actif: true,
          ...(authResult.roleName === 'PLATFORM_ADMIN' ? {} : { pharmacieId: authResult.pharmacieId }),
        },
        select: { id: true },
      }),
      db.pharmacie.findFirst({ where: { id: data.pharmacieId, actif: true }, select: { id: true } }),
    ])
    if (!patient) return NextResponse.json({ error: 'Patient non trouvé ou hors de votre pharmacie' }, { status: 404 })
    if (!pharmacie) return NextResponse.json({ error: 'Pharmacie active introuvable' }, { status: 404 })

    const now = new Date()
    const commande = await db.$transaction(async tx => {
      let montantTotal = 0
      const lignes = [] as Array<{ medicamentId: string; dci: string; quantite: number; prixUnitaire: number; prixTotal: number }>

      for (const ligne of data.lignes) {
        const medicament = await tx.medicament.findFirst({
          where: { id: ligne.medicamentId, pharmacieId: data.pharmacieId, actif: true },
          select: {
            id: true,
            dci: true,
            prixPublic: true,
            lots: { where: { dateExpiration: { gt: now }, quantite: { gt: 0 } }, select: { quantite: true } },
          },
        })
        if (!medicament) throw new OrderError('Un médicament n’est plus disponible dans cette pharmacie', 409)
        const stockDisponible = medicament.lots.reduce((total, lot) => total + lot.quantite, 0)
        if (stockDisponible < ligne.quantite) throw new OrderError(`Stock insuffisant pour ${medicament.dci}`, 409)

        const prixTotal = medicament.prixPublic * ligne.quantite
        montantTotal += prixTotal
        lignes.push({
          medicamentId: medicament.id,
          dci: medicament.dci,
          quantite: ligne.quantite,
          prixUnitaire: medicament.prixPublic,
          prixTotal,
        })
      }

      return tx.commandePatient.create({
        data: {
          patientId: patientId!,
          pharmacieId: data.pharmacieId,
          montantTotal,
          notes: data.notes || null,
          statut: 'RECUE',
          lignes: { create: lignes },
        },
        include: { lignes: true },
      })
    })

    return NextResponse.json(commande, { status: 201 })
  } catch (error) {
    if (error instanceof OrderError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Erreur POST patient/commandes')
    return NextResponse.json({ error: 'Erreur lors de la création de la commande' }, { status: 500 })
  }
}
