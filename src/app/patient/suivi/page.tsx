'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OrderStatusIndicator, getOrderStatusLabel } from '@/components/patient/order-status'
import { Package, Clock, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface OrderItem {
  id: string
  statut: string
  montantTotal: number
  pharmacieNom: string
  createdAt: string
  lignes: Array<{ nomCommercial: string; quantite: number; prixUnitaire: number }>
}

export default function SuiviPage() {
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch('/api/patient/commandes')
        if (res.ok) {
          const data = await res.json()
          setOrders(data)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  const activeOrders = orders.filter(o => !['PICKED_UP', 'CANCELLED'].includes(o.statut))
  const pastOrders = orders.filter(o => ['PICKED_UP', 'CANCELLED'].includes(o.statut))

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Suivi des commandes
        </h1>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={async () => {
            setLoading(true)
            const res = await fetch('/api/patient/commandes')
            if (res.ok) setOrders(await res.json())
            setLoading(false)
          }}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Actualiser
        </Button>
      </div>

      {/* Active orders */}
      <div>
        <h2 className="font-semibold text-gray-900 text-sm mb-3">Commandes en cours</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Card key={i} className="border-teal-200 animate-pulse">
                <CardContent className="p-4 space-y-3">
                  <div className="h-5 bg-teal-50 rounded w-1/2" />
                  <div className="h-4 bg-teal-50 rounded w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : activeOrders.length > 0 ? (
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-teal-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{order.pharmacieNom}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-primary">
                        {order.montantTotal.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                    <OrderStatusIndicator status={order.statut as 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'PICKED_UP' | 'CANCELLED'} createdAt={order.createdAt} />
                    {selectedOrder === order.id && order.lignes && (
                      <div className="mt-3 pt-3 border-t border-teal-100 space-y-1">
                        {order.lignes.map((ligne, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{ligne.nomCommercial} x{ligne.quantite}</span>
                            <span className="font-medium">{(ligne.prixUnitaire * ligne.quantite).toLocaleString('fr-FR')} FCFA</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-7 text-xs text-primary mt-2"
                      onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                    >
                      {selectedOrder === order.id ? 'Masquer les détails' : 'Voir les détails'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border-teal-200">
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Aucune commande en cours</p>
              <Link href="/patient/recherche">
                <Button size="sm" className="mt-2 bg-primary hover:bg-teal-700">Commander</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Past orders */}
      {pastOrders.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 text-sm mb-3">Historique</h2>
          <div className="space-y-2">
            {pastOrders.map((order) => (
              <Card key={order.id} className="border-teal-200 opacity-70">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-900">{order.pharmacieNom}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold">{order.montantTotal.toLocaleString('fr-FR')} FCFA</p>
                    <Badge variant="secondary" className="text-[10px] bg-teal-50 text-teal-800 border-0">
                      {getOrderStatusLabel(order.statut as 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'PICKED_UP' | 'CANCELLED')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
