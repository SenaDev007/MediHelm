import { db } from '@/lib/db'
import { initiatePayment, verifyWebhookSignature, FEDAPAY_MODES } from '@/lib/fedapay'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/paiements/fedapay — Initier un paiement Fedapay
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { montant, modePaiement, venteId, phoneNumber, customerEmail, customerName } = body

    if (!montant || !modePaiement || !venteId) {
      return NextResponse.json(
        { error: 'montant, modePaiement et venteId sont requis' },
        { status: 400 }
      )
    }

    // Validate payment mode
    if (!FEDAPAY_MODES.includes(modePaiement)) {
      return NextResponse.json(
        { error: `Mode de paiement invalide. Modes acceptés: ${FEDAPAY_MODES.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify vente exists
    const vente = await db.vente.findUnique({ where: { id: venteId } })
    if (!vente) {
      return NextResponse.json({ error: 'Vente non trouvée' }, { status: 404 })
    }

    // Initiate Fedapay payment (simulation)
    const { checkoutUrl, transactionId } = await initiatePayment({
      amount: montant,
      mode: modePaiement,
      phoneNumber,
      customerEmail,
      customerName,
      metadata: { venteId },
    })

    // Create Paiement record
    const paiement = await db.paiement.create({
      data: {
        venteId,
        modePaiement: modePaiement as 'MTN_MONEY' | 'MOOV_MONEY' | 'WAVE' | 'CARTE',
        montant,
        reference: transactionId,
      },
    })

    return NextResponse.json({
      checkoutUrl,
      transactionId,
      paiementId: paiement.id,
    }, { status: 201 })
  } catch (error) {
    console.error('Erreur POST paiement fedapay:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'initiation du paiement' },
      { status: 500 }
    )
  }
}

// GET /api/paiements/fedapay — Lister les transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!pharmacieId) {
      return NextResponse.json(
        { error: 'pharmacieId est requis' },
        { status: 400 }
      )
    }

    // Get payments with Fedapay reference for this pharmacy
    const paiements = await db.paiement.findMany({
      where: {
        vente: { pharmacieId },
        reference: { startsWith: 'feda_' },
      },
      include: {
        vente: {
          select: {
            id: true,
            montantTotal: true,
            statut: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await db.paiement.count({
      where: {
        vente: { pharmacieId },
        reference: { startsWith: 'feda_' },
      },
    })

    return NextResponse.json({
      data: paiements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur GET paiements fedapay:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des transactions' },
      { status: 500 }
    )
  }
}
