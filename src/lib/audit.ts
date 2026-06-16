// ============================================================
// MediHelm — Audit Trail System
// Comprehensive logging of all mutations for compliance
// Référence: MH-SPECS-2025-v2.0 — Audit & Traçabilité
// ============================================================

import { db } from '@/lib/db'

export interface AuditLogEntry {
  action: string
  module: string
  entity: string
  entityId?: string
  pharmacieId?: string
  userId?: string
  details?: Record<string, unknown>
  ip?: string
  userAgent?: string
}

/**
 * Log an audit event to the database
 *
 * Maps the enhanced AuditLogEntry to the Prisma AuditLog model.
 * Extra fields (module, pharmacieId, userAgent) are stored inside
 * the `details` JSON string since the schema doesn't have dedicated
 * columns for them.
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const enrichedDetails: Record<string, unknown> = {
      ...entry.details,
      module: entry.module,
      ...(entry.pharmacieId ? { pharmacieId: entry.pharmacieId } : {}),
      ...(entry.userAgent ? { userAgent: entry.userAgent } : {}),
    }

    await db.auditLog.create({
      data: {
        userId: entry.userId || null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId || null,
        details: JSON.stringify(enrichedDetails),
        ipAddress: entry.ip || null,
      },
    })
  } catch (error) {
    // Don't throw on audit logging failure — it should not break the main flow
    console.error('[Audit] Failed to log:', error)
  }
}

/**
 * Log a mutation (create/update/delete) with before/after snapshot
 */
export async function logMutation(params: {
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  module: string
  entity: string
  entityId: string
  pharmacieId?: string
  userId?: string
  before?: unknown
  after?: unknown
  request?: Request
}): Promise<void> {
  await logAudit({
    action: params.action,
    module: params.module,
    entity: params.entity,
    entityId: params.entityId,
    pharmacieId: params.pharmacieId,
    userId: params.userId,
    details: {
      before: params.before,
      after: params.after,
    },
    ip: params.request ? getClientIp(params.request) : undefined,
    userAgent: params.request?.headers.get('user-agent') || undefined,
  })
}

/**
 * Extract client IP from request
 */
function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown'
}

/**
 * Get audit trail for an entity
 */
export async function getEntityAuditTrail(
  entity: string,
  entityId: string,
  options?: { limit?: number; offset?: number }
): Promise<any[]> {
  return db.auditLog.findMany({
    where: { entity, entityId },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50,
    skip: options?.offset || 0,
  })
}

/**
 * Get audit trail for a pharmacy
 *
 * Since pharmacieId is stored inside the details JSON,
 * we filter using a string contains search on the details field.
 */
export async function getPharmacieAuditTrail(
  pharmacieId: string,
  options?: { limit?: number; offset?: number; module?: string; action?: string }
): Promise<any[]> {
  return db.auditLog.findMany({
    where: {
      details: { contains: pharmacieId },
      ...(options?.action ? { action: options.action } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50,
    skip: options?.offset || 0,
  })
}
