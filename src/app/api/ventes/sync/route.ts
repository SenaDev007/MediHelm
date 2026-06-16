import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { validate, venteSchema } from '@/lib/validations'

// POST /api/ventes/sync — Sync offline ventes to the server
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, 'M02_POS', 'write')
  if (authResult instanceof Response) return authResult
  const user = authResult

  try {
    const body = await request.json()
    const { ventes } = body as { ventes: unknown[] }

    if (!ventes || !Array.isArray(ventes)) {
      return Response.json({ error: 'Données de ventes requises' }, { status: 400 })
    }

    const results = { succeeded: 0, failed: 0, errors: [] as string[] }

    for (const venteData of ventes) {
      try {
        // Validate each vente
        const validation = validate(venteSchema, venteData)
        if (!validation.success) {
          results.failed++
          results.errors.push(`Vente invalide: ${validation.errors.issues.map(i => i.message).join(', ')}`)
          continue
        }

        const data = validation.data

        // Verify pharmacie ownership
        if (data.patientId) {
          const patient = await db.patient.findFirst({
            where: { id: data.patientId, pharmacieId: user.pharmacieId },
          })
          if (!patient) {
            results.failed++
            results.errors.push('Patient non trouvé pour cette pharmacie')
            continue
          }
        }

        // Calculate total
        const montantTotal = data.lignes.reduce(
          (sum, l) => sum + l.quantite * l.prixUnitaire,
          0
        )

        // Create vente
        const vente = await db.vente.create({
          data: {
            pharmacieId: user.pharmacieId,
            modePaiement: data.modePaiement,
            montantTotal,
            patientId: data.patientId,
            ordonnanceId: data.ordonnanceId,
            statut: 'TERMINEE',
            lignes: {
              create: data.lignes.map((l) => ({
                medicamentId: l.medicamentId,
                lotId: l.lotId,
                quantite: l.quantite,
                prixUnitaire: l.prixUnitaire,
                pharmacieId: user.pharmacieId,
              })),
            },
          },
        })

        // Decrement stock for each line (FEFO — First Expired, First Out)
        for (const ligne of data.lignes) {
          let remainingQty = ligne.quantite

          if (ligne.lotId) {
            // Specific lot
            await db.lot.update({
              where: { id: ligne.lotId },
              data: { quantite: { decrement: remainingQty } },
            })
          } else {
            // FEFO: decrement from earliest expiring lots
            const lots = await db.lot.findMany({
              where: {
                medicamentId: ligne.medicamentId,
                pharmacieId: user.pharmacieId,
                quantite: { gt: 0 },
                dateExpiration: { gt: new Date() },
              },
              orderBy: { dateExpiration: 'asc' },
            })

            for (const lot of lots) {
              if (remainingQty <= 0) break
              const deduct = Math.min(remainingQty, lot.quantite)
              await db.lot.update({
                where: { id: lot.id },
                data: { quantite: { decrement: deduct } },
              })
              remainingQty -= deduct
            }
          }
        }

        results.succeeded++
      } catch (error) {
        results.failed++
        results.errors.push(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
      }
    }

    return Response.json({
      ...results,
      total: ventes.length,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Sync error:', error)
    return Response.json({ error: 'Erreur de synchronisation' }, { status: 500 })
  }
}
