import { db } from '@backend/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, GROSSISTE_TENANT_ROLES } from '@backend/lib/api-auth'

// GET: List webhooks for a grossiste
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request, 'M17_GROSSISTES', 'read')
    if (auth instanceof Response) return auth

    const { id } = await params

    // Le partenaire grossiste accède aux webhooks de SON grossiste; les rôles
    // pharmacie n'ont pas à inspecter la configuration d'un grossiste.
    if (
      auth.roleName !== 'PLATFORM_ADMIN' &&
      !(GROSSISTE_TENANT_ROLES.includes(auth.roleName as (typeof GROSSISTE_TENANT_ROLES)[number]) && auth.grossisteId === id)
    ) {
      return NextResponse.json({ error: 'Accès refusé à ce grossiste' }, { status: 403 })
    }

    const grossiste = await db.grossiste.findUnique({
      where: { id },
      select: { id: true, nom: true },
    })

    if (!grossiste) {
      return NextResponse.json({ error: 'Grossiste non trouvé' }, { status: 404 })
    }

    // Fetch webhooks from the database
    const webhooks = await db.webhookConfig.findMany({
      where: { grossisteId: id },
      select: {
        id: true,
        eventType: true,
        url: true,
        actif: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(webhooks)
  } catch (error) {
    console.error('Erreur GET grossistes/webhooks:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des webhooks' },
      { status: 500 }
    )
  }
}
