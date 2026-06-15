import { db } from './db'

export async function logAudit(params: {
  pharmacieId: string
  utilisateurId?: string
  action: string
  entite: string
  entiteId?: string
  details?: Record<string, unknown>
  adresseIP?: string
}) {
  return db.auditLog.create({
    data: {
      pharmacieId: params.pharmacieId,
      utilisateurId: params.utilisateurId,
      action: params.action,
      entite: params.entite,
      entiteId: params.entiteId,
      details: params.details ?? undefined,
      adresseIP: params.adresseIP,
    },
  })
}
