import { db } from '@/lib/db'

export interface CreateNotificationParams {
  pharmacieId: string
  utilisateurId?: string
  patientId?: string
  titre: string
  message: string
  canal: 'PUSH' | 'SMS' | 'EMAIL' | 'IN_APP'
  typeReference?: string
  referenceId?: string
}

export async function createNotification(params: CreateNotificationParams) {
  const notification = await db.notification.create({
    data: {
      pharmacieId: params.pharmacieId,
      utilisateurId: params.utilisateurId,
      patientId: params.patientId,
      titre: params.titre,
      message: params.message,
      canal: params.canal,
      typeReference: params.typeReference,
      referenceId: params.referenceId,
    },
  })

  // In production: send push notification via FCM
  // In production: send SMS via provider (e.g., Orange SMS API)
  // In production: send email via SMTP

  return notification
}

export async function notifyPharmacieUsers(pharmacieId: string, params: Omit<CreateNotificationParams, 'pharmacieId'>) {
  const users = await db.utilisateur.findMany({
    where: { pharmacieId, actif: true },
    select: { id: true },
  })

  const notifications = await Promise.all(
    users.map(user =>
      createNotification({
        ...params,
        pharmacieId,
        utilisateurId: user.id,
      })
    )
  )

  return notifications
}
