import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth , checkInstitutionRole } from '@/lib/api-auth'
import { validate, alerteDPMEDSchema } from '@/lib/validations'

export async function GET(request: Request) {
  // Auth: DPMED_ADMIN, SOBAPS_VIEWER, ABRP_VIEWER or PLATFORM_ADMIN
  const auth = await requireAuth(request, 'M18_ALERTES_DPMED', 'read')
  if (auth instanceof Response) return auth

  // Garde de rôle institutionnel — les permissions de module seules ne suffisent pas
  const guardError = checkInstitutionRole(auth, ['DPMED_ADMIN', 'SOBAPS_VIEWER', 'ABRP_VIEWER'])
  if (guardError) return guardError

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const urgence = searchParams.get('urgence')
    const statut = searchParams.get('statut')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (type) where.typeAlerte = type
    if (urgence) where.niveauUrgence = urgence
    if (statut) where.statut = statut

    const [alertes, total] = await Promise.all([
      db.alerteDPMED.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          diffusions: {
            select: {
              id: true,
              statut: true,
              pharmacieId: true,
              pharmacie: {
                select: { id: true, nom: true, ville: true },
              },
            },
          },
        },
      }),
      db.alerteDPMED.count({ where }),
    ])

    return NextResponse.json({
      alertes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur listage alertes DPMED:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des alertes' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  // Auth: DPMED_ADMIN or PLATFORM_ADMIN required for writing alerts
  const auth = await requireAuth(request, 'M18_ALERTES_DPMED', 'write')
  if (auth instanceof Response) return auth

  // Seuls les rôles institutionnels DPMED peuvent émettre une alerte nationale
  // (les permissions M18 write incluent DIRECTEUR — réservé à l'autorité)
  const guardError = checkInstitutionRole(auth, ['DPMED_ADMIN'])
  if (guardError) return guardError

  try {
    const body = await request.json()

    // Zod validation
    const validation = validate(alerteDPMEDSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.flatten() },
        { status: 400 }
      )
    }
    const validatedData = validation.data

    const {
      titre,
      description,
      typeAlerte,
      niveauUrgence,
      dciConcernee,
      numerosLotConcernes,
      fabricantConcerne,
      sourceEmission,
      referenceOfficielle,
      signatureNumerique,
      dateEmissionDPMED,
      statut,
    } = { ...body, ...validatedData }

    if (!titre || !typeAlerte || !niveauUrgence) {
      return NextResponse.json(
        { error: 'Titre, type et niveau d\'urgence sont requis' },
        { status: 400 }
      )
    }

    // Create the alert
    const alerte = await db.alerteDPMED.create({
      data: {
        titre,
        description: description || '',
        typeAlerte,
        niveauUrgence,
        dciConcernee: dciConcernee || null,
        signatureNumerique: signatureNumerique || `SIG-DPMED-${Date.now()}`,
        referenceOfficielle: referenceOfficielle || `DPMED-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        dateEmissionDPMED: dateEmissionDPMED ? new Date(dateEmissionDPMED) : new Date(),
        statut: statut || 'EN_DIFFUSION',
      },
    })

    // Auto-create DiffusionAlerte for all active pharmacies
    const pharmacies = await db.pharmacie.findMany({
      where: { actif: true },
      select: { id: true },
    })

    if (pharmacies.length > 0) {
      await db.diffusionAlerte.createMany({
        data: pharmacies.map(p => ({
          alerteId: alerte.id,
          pharmacieId: p.id,
          statut: 'EN_ATTENTE',
        })),
      })
    }

    // ---------- Chaîne de diffusion (M18) ----------
    // 1. Notification in-app à chaque utilisateur actif des pharmacies (push future: FCM/SMS)
    const typeNotif = ['URGENT', 'URGENCE_IMMEDIATE'].includes(niveauUrgence) ? 'URGENT' : 'ALERTE'
    const utilisateursPharmacies = await db.utilisateur.findMany({
      where: { actif: true, pharmacie: { actif: true }, role: { in: ['OWNER', 'DIRECTEUR', 'PHARMACIEN'] } },
      select: { id: true },
      take: 1000,
    })
    if (utilisateursPharmacies.length > 0) {
      await db.notification.createMany({
        data: utilisateursPharmacies.map(u => ({
          userId: u.id,
          titre: `Alerte DPMED ${niveauUrgence}: ${titre}`.slice(0, 120),
          message: `${typeAlerte}${dciConcernee ? ` — ${dciConcernee}` : ''}. ${referenceOfficielle || alerte.referenceOfficielle}. Vérifiez vos stocks et lots concernés.`,
          type: typeNotif,
          lien: '/pro/alertes',
          lue: false,
        })),
      })
    }

    // 2. Patients exposés: identification via leurs achats de la DCI concernée
    //    (ventes des 6 derniers mois) → notification immédiate (F-P11)
    let patientsNotifies = 0
    if (dciConcernee) {
      const sixMois = new Date(Date.now() - 182 * 24 * 60 * 60 * 1000)
      const patientsTouches = await db.patient.findMany({
        where: {
          actif: true,
          ventes: {
            some: {
              createdAt: { gte: sixMois },
              lignes: { some: { medicament: { dci: { equals: dciConcernee, mode: 'insensitive' } } } },
            },
          },
        },
        select: { utilisateurId: true },
        take: 500,
      })
      const usersPatients = patientsTouches
        .map(p => p.utilisateurId)
        .filter((id): id is string => Boolean(id))
      if (usersPatients.length > 0) {
        await db.notification.createMany({
          data: usersPatients.map(uid => ({
            userId: uid,
            titre: 'Alerte sanitaire sur un médicament que vous avez acheté',
            message: `Une alerte officielle DPMED (${typeAlerte}) concerne ${dciConcernee}. Consultez les instructions officielles et contactez votre pharmacie si vous détenez ce médicament.`,
            type: 'URGENT',
            lien: '/patient/notifications',
            lue: false,
          })),
        })
        patientsNotifies = usersPatients.length
      }
    }

    // 3. Statut de l'alerte: les diffusions étant émises, l'alerte est DIFFUSEE
    await db.alerteDPMED.update({
      where: { id: alerte.id },
      data: { statut: 'DIFFUSEE' },
    })

    // 4. Journal d'audit de l'émission
    await db.auditLog.create({
      data: {
        userId: auth.id,
        action: 'ALERTE_DPMED_EMISSION',
        entity: 'AlerteDPMED',
        entityId: alerte.id,
        details: `${titre} — ${pharmacies.length} pharmacie(s), ${utilisateursPharmacies.length} utilisateur(s) pharmacie notifié(s), ${patientsNotifies} patient(s) exposé(s) notifié(s)`,
      },
    })

    // Return with diffusions included
    const result = await db.alerteDPMED.findUnique({
      where: { id: alerte.id },
      include: {
        diffusions: {
          include: {
            pharmacie: {
              select: { id: true, nom: true, ville: true, telephone: true, email: true },
            },
          },
        },
      },
    })

    return NextResponse.json({
      ...result,
      diffusionStats: {
        pharmacies: pharmacies.length,
        utilisateursNotifies: utilisateursPharmacies.length,
        patientsNotifies,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Erreur création alerte DPMED:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'alerte' },
      { status: 500 }
    )
  }
}
