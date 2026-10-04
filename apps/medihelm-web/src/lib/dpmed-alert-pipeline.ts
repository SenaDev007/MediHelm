// ============================================================
// MediHelm — DPMED Alert Pipeline
// 10-step alert processing: reception → diffusion → acquittement
// SLA: < 2 minutes for 600 pharmacies + 10,000 patients
// Référence: MH-SPECS-2025-v2.0 — M18 Alertes DPMED
// ============================================================

import db from './db'
import crypto from 'crypto'

export interface DPMEDAlertPayload {
  referenceOfficielle: string
  titre: string
  typeAlerte: 'RAPPEL_LOT' | 'CONTREFACON' | 'AMM_SUSPENDUE' | 'INTERDICTION' | 'INFORMATION' | 'PHARMACOVIGILANCE'
  niveauUrgence: 'INFO' | 'ATTENTION' | 'URGENT' | 'URGENCE_IMMEDIATE'
  dciConcernee?: string
  description?: string
  dateEmissionDPMED: string
  signatureNumerique?: string
  pharmaciesConcernees?: string[]
}

/**
 * Complete DPMED alert pipeline
 * Steps 1-10 as specified in MH-SPECS-2025-v2.0
 */
export async function processDPMEDAlert(payload: DPMEDAlertPayload, sourceIp?: string): Promise<{
  success: boolean
  alerteId?: string
  pharmaciesNotifiees?: number
  patientsNotifies?: number
  tempsTotal?: number
  errors?: string[]
}> {
  const startTime = Date.now()
  const errors: string[] = []

  try {
    // Step 1: Webhook DPMED reception (already handled by the API route)

    // Step 2: IP whitelist verification
    if (sourceIp && process.env.DPMED_IP_WHITELIST) {
      const allowedIps = process.env.DPMED_IP_WHITELIST.split(',').map(ip => ip.trim())
      if (!allowedIps.includes(sourceIp)) {
        return { success: false, errors: [`IP ${sourceIp} non autorisée`] }
      }
    }

    // Step 3: RSA-256 signature verification
    if (payload.signatureNumerique && process.env.DPMED_PUBLIC_KEY) {
      try {
        const verifier = crypto.createVerify('RSA-SHA256')
        verifier.update(JSON.stringify({
          referenceOfficielle: payload.referenceOfficielle,
          titre: payload.titre,
          typeAlerte: payload.typeAlerte,
          dateEmissionDPMED: payload.dateEmissionDPMED,
        }))
        const isValid = verifier.verify(
          process.env.DPMED_PUBLIC_KEY,
          payload.signatureNumerique,
          'base64'
        )
        if (!isValid) {
          return { success: false, errors: ['Signature RSA-256 invalide'] }
        }
      } catch (e) {
        errors.push(`Vérification RSA échouée: ${e instanceof Error ? e.message : 'Erreur'}`)
      }
    }

    // Step 4: Deduplication — check if alert already exists
    const existing = await db.alerteDPMED.findUnique({
      where: { referenceOfficielle: payload.referenceOfficielle },
    })
    if (existing) {
      return {
        success: true,
        alerteId: existing.id,
        pharmaciesNotifiees: 0,
        patientsNotifies: 0,
        tempsTotal: Date.now() - startTime,
        errors: ['Alerte déjà traitée (déduplication)'],
      }
    }

    // Step 5: Create AlerteDPMED in DB
    const alerte = await db.alerteDPMED.create({
      data: {
        referenceOfficielle: payload.referenceOfficielle,
        titre: payload.titre,
        typeAlerte: payload.typeAlerte,
        niveauUrgence: payload.niveauUrgence,
        dciConcernee: payload.dciConcernee || null,
        description: payload.description || null,
        signatureNumerique: payload.signatureNumerique || '',
        dateEmissionDPMED: new Date(payload.dateEmissionDPMED),
        statut: 'EN_DIFFUSION',
      },
    })

    // Step 6: Queue for processing (in production: BullMQ priority 1)
    // For now, process synchronously

    // Step 7: Identify concerned pharmacies
    let pharmaciesNotifiees = 0

    if (payload.pharmaciesConcernees && payload.pharmaciesConcernees.length > 0) {
      // Explicit list of pharmacy IDs provided
      const found = await db.pharmacie.findMany({
        where: {
          id: { in: payload.pharmaciesConcernees },
          actif: true,
        },
        select: { id: true },
      })
      const pharmacieIds = found.map(p => p.id)

      if (pharmacieIds.length > 0) {
        await db.diffusionAlerte.createMany({
          data: pharmacieIds.map(pharmacieId => ({
            alerteId: alerte.id,
            pharmacieId,
            statut: 'EN_ATTENTE' as const,
          })),
        })
        pharmaciesNotifiees = pharmacieIds.length
      }
    } else if (payload.dciConcernee) {
      // Find pharmacies that have this DCI in stock
      const pharmaciesAvecDCI = await db.medicament.findMany({
        where: {
          dci: { equals: payload.dciConcernee, mode: 'insensitive' },
          actif: true,
        },
        select: { pharmacieId: true },
        distinct: ['pharmacieId'],
      })

      const diffusions = pharmaciesAvecDCI.map(p => ({
        alerteId: alerte.id,
        pharmacieId: p.pharmacieId,
        statut: 'EN_ATTENTE' as const,
      }))

      if (diffusions.length > 0) {
        await db.diffusionAlerte.createMany({ data: diffusions })
        pharmaciesNotifiees = diffusions.length
      }
    }

    // Also diffuse to all active pharmacies for URGENCE_IMMEDIATE
    if (payload.niveauUrgence === 'URGENCE_IMMEDIATE' || (!payload.dciConcernee && !payload.pharmaciesConcernees)) {
      const allPharmacies = await db.pharmacie.findMany({
        where: { actif: true },
        select: { id: true },
      })

      const existingDiffusions = await db.diffusionAlerte.findMany({
        where: { alerteId: alerte.id },
        select: { pharmacieId: true },
      })
      const existingIds = new Set(existingDiffusions.map(d => d.pharmacieId))

      const newDiffusions = allPharmacies
        .filter(p => !existingIds.has(p.id))
        .map(p => ({
          alerteId: alerte.id,
          pharmacieId: p.id,
          statut: 'EN_ATTENTE' as const,
        }))

      if (newDiffusions.length > 0) {
        await db.diffusionAlerte.createMany({ data: newDiffusions })
        pharmaciesNotifiees += newDiffusions.length
      }
    }

    // Step 8: Identify concerned patients (purchases last 90 days)
    let patientsNotifies = 0
    if (payload.dciConcernee) {
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const concernedPatients = await db.ligneVente.findMany({
        where: {
          medicament: {
            dci: { equals: payload.dciConcernee, mode: 'insensitive' },
          },
          vente: {
            createdAt: { gte: ninetyDaysAgo },
          },
        },
        select: { vente: { select: { patientId: true } } },
        distinct: ['venteId'],
      })

      patientsNotifies = concernedPatients.filter(p => p.vente.patientId).length
    }

    // Step 9: Push Firebase FCM + in-app notifications
    try {
      const diffusions = await db.diffusionAlerte.findMany({
        where: { alerteId: alerte.id },
        select: { pharmacieId: true },
      })

      const pharmacyIds = diffusions.map(d => d.pharmacieId)

      // Get users for notified pharmacies
      const pharmacyUsers = await db.utilisateur.findMany({
        where: {
          pharmacieId: { in: pharmacyIds },
          actif: true,
        },
        select: { id: true },
        take: 300,
      })

      // Create in-app notifications (batched)
      const notificationData = pharmacyUsers.map(user => ({
        userId: user.id,
        titre: `ALERTE DPMED: ${payload.titre}`,
        message: payload.description || `Alerte ${payload.typeAlerte} - ${payload.niveauUrgence}`,
        type: 'ALERTE_DPMED',
        lien: '/pro/alertes',
      }))

      if (notificationData.length > 0) {
        // Create in batches of 50 to avoid DB overload
        for (let i = 0; i < notificationData.length; i += 50) {
          const batch = notificationData.slice(i, i + 50)
          await db.notification.createMany({ data: batch })
        }
      }

      // Push via FCM if configured
      if (process.env.FIREBASE_SERVER_KEY) {
        try {
          const { sendPushNotification } = await import('./push-notifications')
          await sendPushNotification({
            title: `ALERTE DPMED: ${payload.titre}`,
            body: payload.description || `Alerte ${payload.typeAlerte} - ${payload.niveauUrgence}`,
            data: {
              alerteId: alerte.id,
              type: 'ALERTE_DPMED',
              niveauUrgence: payload.niveauUrgence,
            },
            clickAction: '/pro/alertes',
          })
        } catch (e) {
          errors.push(`Push FCM échoué: ${e instanceof Error ? e.message : 'Erreur'}`)
        }
      }
    } catch (e) {
      errors.push(`Notifications échouées: ${e instanceof Error ? e.message : 'Erreur'}`)
    }

    // Step 10: SMS AfricasTalking for URGENT / URGENCE_IMMEDIATE
    if (
      (payload.niveauUrgence === 'URGENT' || payload.niveauUrgence === 'URGENCE_IMMEDIATE') &&
      pharmaciesNotifiees > 0
    ) {
      try {
        const { sendBulkSMS } = await import('./sms')

        // Get phone numbers for pharmacy contacts
        const pharmacyContacts = await db.utilisateur.findMany({
          where: {
            pharmacieId: { in: (await db.diffusionAlerte.findMany({ where: { alerteId: alerte.id }, select: { pharmacieId: true } })).map(d => d.pharmacieId) },
            actif: true,
            telephone: { not: null },
          },
          select: { telephone: true },
          take: 600,
        })

        const phones = pharmacyContacts
          .map(u => u.telephone)
          .filter((p): p is string => !!p)

        if (phones.length > 0) {
          const smsResult = await sendBulkSMS(
            phones,
            `[MediHelm] ALERTE DPMED: ${payload.titre}. ${payload.dciConcernee ? `DCI: ${payload.dciConcernee}.` : ''} Consultez votre espace pro.`,
            'MediHelm'
          )
          if (smsResult.failed > 0) {
            errors.push(`SMS: ${smsResult.failed} échecs sur ${smsResult.sent + smsResult.failed}`)
          }
        }
      } catch (e) {
        errors.push(`SMS échoué: ${e instanceof Error ? e.message : 'Erreur'}`)
      }
    }

    // Step 10b: Email notifications for URGENCE_IMMEDIATE
    if (payload.niveauUrgence === 'URGENCE_IMMEDIATE') {
      try {
        const { sendEmail, alerteDPMEDEmail } = await import('./email')

        const emailUsers = await db.utilisateur.findMany({
          where: {
            pharmacieId: { in: (await db.diffusionAlerte.findMany({ where: { alerteId: alerte.id }, select: { pharmacieId: true } })).map(d => d.pharmacieId) },
            actif: true,
            email: { not: '' },
          },
          select: { email: true, nom: true },
          take: 200,
        })

        // Send emails in batches (Resend limit)
        for (let i = 0; i < emailUsers.length; i += 50) {
          const batch = emailUsers.slice(i, i + 50)
          for (const user of batch) {
            const { subject, html, text } = alerteDPMEDEmail(
              user.nom,
              payload.titre,
              payload.description || ''
            )
            await sendEmail({
              to: user.email,
              subject,
              html,
              text,
            })
          }
        }
      } catch (e) {
        errors.push(`Email alerte échoué: ${e instanceof Error ? e.message : 'Erreur'}`)
      }
    }

    const tempsTotal = Date.now() - startTime

    // Log the pipeline execution
    try {
      await db.auditLog.create({
        data: {
          action: 'DPMED_ALERT_PROCESSED',
          entity: 'AlerteDPMED',
          entityId: alerte.id,
          details: JSON.stringify({
            referenceOfficielle: payload.referenceOfficielle,
            pharmaciesNotifiees,
            patientsNotifies,
            tempsTotal,
            errors: errors.length > 0 ? errors : undefined,
          }),
        },
      })
    } catch {
      // Audit log failure should not block the pipeline
    }

    return {
      success: true,
      alerteId: alerte.id,
      pharmaciesNotifiees,
      patientsNotifies,
      tempsTotal,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error) {
    return {
      success: false,
      errors: [`Erreur pipeline: ${error instanceof Error ? error.message : 'Erreur inconnue'}`],
    }
  }
}
