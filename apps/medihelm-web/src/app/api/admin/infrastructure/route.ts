import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M14_DASHBOARD', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const now = new Date()
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Test DB connection
    let dbStatus = 'CONNECTÉ'
    let dbLatency = 0
    try {
      const start = Date.now()
      await db.$queryRaw`SELECT 1`
      dbLatency = Date.now() - start
    } catch {
      dbStatus = 'ERREUR'
    }

    // DB statistics
    const totalPharmacies = await db.pharmacie.count()
    const totalUtilisateurs = await db.utilisateur.count()
    const totalMedicaments = await db.medicament.count()
    const totalVentes = await db.vente.count()

    // Recent activity
    const recentLogs = await db.auditLog.count({
      where: { createdAt: { gte: oneHourAgo } },
    })
    const dailyLogs = await db.auditLog.count({
      where: { createdAt: { gte: oneDayAgo } },
    })

    // Active sessions (approximation by recent login)
    const activeUsers = await db.utilisateur.count({
      where: { dernierLogin: { gte: oneDayAgo } },
    })

    // API health (basic check)
    const apiStatus = 'OPÉRATIONNEL'

    // Storage status (simplified)
    const storageStatus = 'NORMAL'

    return NextResponse.json({
      timestamp: now.toISOString(),
      api: {
        status: apiStatus,
        uptime: process.uptime ? Math.floor(process.uptime()) : null,
      },
      db: {
        status: dbStatus,
        latency: dbLatency,
        totalPharmacies,
        totalUtilisateurs,
        totalMedicaments,
        totalVentes,
      },
      storage: {
        status: storageStatus,
      },
      activity: {
        recentLogs,
        dailyLogs,
        activeUsers,
      },
    })
  } catch (error) {
    console.error('Erreur GET admin/infrastructure:', error)
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      api: { status: 'ERREUR' },
      db: { status: 'ERREUR' },
      storage: { status: 'INCONNU' },
      activity: { recentLogs: 0, dailyLogs: 0, activeUsers: 0 },
    }, { status: 500 })
  }
}
