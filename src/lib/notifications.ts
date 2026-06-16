import { db } from '@/lib/db'

export interface CreateNotificationParams {
  userId: string
  titre: string
  message: string
  type?: string
  lien?: string
}

export async function createNotification(params: CreateNotificationParams) {
  const notification = await db.notification.create({
    data: {
      userId: params.userId,
      titre: params.titre,
      message: params.message,
      type: params.type || 'INFO',
      lien: params.lien,
    },
  })

  // In production: send push notification via FCM
  // In production: send SMS via provider (e.g., Orange SMS API)
  // In production: send email via SMTP

  return notification
}

export async function notifyPharmacieUsers(pharmacieId: string, params: Omit<CreateNotificationParams, 'userId'>) {
  const users = await db.utilisateur.findMany({
    where: { pharmacieId, actif: true },
    select: { id: true },
  })

  const notifications = await Promise.all(
    users.map(user =>
      createNotification({
        ...params,
        userId: user.id,
      })
    )
  )

  return notifications
}
