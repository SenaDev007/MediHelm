'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePatientSession } from '@/hooks/use-patient-session'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { OrderStatusIndicator, getOrderStatusLabel } from '@/components/patient/order-status'
import {
  Truck, Package, Clock, MapPin, Phone, ChevronDown,
  ChevronUp, Pill, RefreshCw, ShoppingBag, Check
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

type StatutCommande = 'EN_ATTENTE' | 'CONFIRMEE' | 'EN_PREPARATION' | 'PRETE' | 'LIVREE' | 'ANNULEE'

interface LigneCommande {
  id: string
  dci: string
  quantite: number
  prixUnitaire: number
  prixTotal: number
  medicament: {
    id: string
    nomCommercial: string
    dci: string
    forme: string
  } | null
}

interface Commande {
  id: string
  statut: StatutCommande
  montantTotal: number
  notes: string | null
  createdAt: string
  pharmacie: {
    id: string
    nom: string
    adresse: string
    ville: string
    telephone: string
  }
  lignes: LigneCommande[]
}

const statutBadgeColors: Record<StatutCommande, string> = {
  EN_ATTENTE: 'bg-amber-50 text-amber-700',
  CONFIRMEE: 'bg-blue-50 text-blue-700',
  EN_PREPARATION: 'bg-teal-50 text-teal-800',
  PRETE: 'bg-green-50 text-green-700',
  LIVREE: 'bg-teal-100 text-teal-900',
  ANNULEE: 'bg-red-50 text-red-700',
}

export default function SuiviPage() {
  const [commandes, setCommandes] = useState<Commande[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'toutes' | 'en_cours' | 'terminees'>('en_cours')

  const { patientId } = usePatientSession()

  const fetchCommandes = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/patient/commandes?patientId=${patientId}`)
      if (res.ok) {
        const data = await res.json()
        setCommandes(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    if (patientId) fetchCommandes()
  }, [fetchCommandes, patientId])

  const filteredCommandes = commandes.filter((c) => {
    if (filter === 'en_cours') return !['LIVREE', 'ANNULEE'].includes(c.statut)
    if (filter === 'terminees') return ['LIVREE', 'ANNULEE'].includes(c.statut)
    return true
  })

  const enCoursCount = commandes.filter(c => !['LIVREE', 'ANNULEE'].includes(c.statut)).length
  const termineesCount = commandes.filter(c => ['LIVREE', 'ANNULEE'].includes(c.statut)).length

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' FCFA'
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Suivi des commandes
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {enCoursCount} commande{enCoursCount !== 1 ? 's' : ''} en cours
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0"
          onClick={fetchCommandes}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { key: 'en_cours' as const, label: 'En cours', count: enCoursCount },
          { key: 'terminees' as const, label: 'Terminées', count: termineesCount },
          { key: 'toutes' as const, label: 'Toutes', count: commandes.length },
        ].map(({ key, label, count }) => (
          <Badge
            key={key}
            variant={filter === key ? 'default' : 'secondary'}
            className={`cursor-pointer text-xs ${
              filter === key
                ? 'bg-primary text-white border-0'
                : 'bg-teal-50 text-teal-800 border-0 hover:bg-teal-100'
            }`}
            onClick={() => setFilter(key)}
          >
            {label} ({count})
          </Badge>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-teal-200">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-5 w-1/4" />
                </div>
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Orders list */}
      {!loading && filteredCommandes.length > 0 && (
        <div className="space-y-3">
          {filteredCommandes.map((commande) => {
            const isExpanded = expandedId === commande.id
            const isCancelled = commande.statut === 'ANNULEE'

            return (
              <motion.div
                key={commande.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={`border-teal-200 ${isCancelled ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    {/* Top row */}
                    <div
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : commande.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary flex-shrink-0" />
                          <h3 className="font-semibold text-gray-900 text-sm truncate">
                            Commande {commande.id.slice(-6).toUpperCase()}
                          </h3>
                        </div>
                        <div className="ml-6 mt-1 space-y-0.5">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {commande.pharmacie.nom}
                          </p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(commande.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="text-sm font-bold text-teal-800">
                          {formatCurrency(commande.montantTotal)}
                        </p>
                        <Badge className={`text-[10px] border-0 ${statutBadgeColors[commande.statut]}`}>
                          {getOrderStatusLabel(commande.statut as keyof typeof getOrderStatusLabel extends infer K ? K extends string ? K : never : never)}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Status indicator */}
                    <div className="mt-3 ml-6">
                      <OrderStatusIndicator
                        status={commande.statut as 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'PICKED_UP' | 'CANCELLED'}
                        createdAt={commande.createdAt}
                      />
                    </div>

                    {/* Expanded detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-3 border-t border-teal-100 space-y-3">
                            {/* Items */}
                            <div>
                              <p className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1">
                                <Pill className="h-3 w-3" />
                                Articles ({commande.lignes.length})
                              </p>
                              <div className="space-y-2">
                                {commande.lignes.map((ligne) => (
                                  <div
                                    key={ligne.id}
                                    className="flex items-center justify-between p-2 bg-teal-50 rounded-lg"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-gray-900 truncate">
                                        {ligne.medicament?.nomCommercial || ligne.dci}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {ligne.dci} — x{ligne.quantite}
                                      </p>
                                    </div>
                                    <p className="text-xs font-semibold text-teal-800 ml-2">
                                      {formatCurrency(ligne.prixTotal)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Total */}
                            <div className="flex items-center justify-between p-2 bg-primary/5 rounded-lg">
                              <span className="text-xs font-semibold text-gray-900">Total</span>
                              <span className="text-sm font-bold text-teal-800">
                                {formatCurrency(commande.montantTotal)}
                              </span>
                            </div>

                            {/* Notes */}
                            {commande.notes && (
                              <div>
                                <p className="text-xs font-semibold text-gray-900 mb-1">Notes</p>
                                <p className="text-xs text-muted-foreground">{commande.notes}</p>
                              </div>
                            )}

                            {/* Pharmacy actions */}
                            <div className="flex gap-2">
                              <Link href={`/patient/pharmacies`} className="flex-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full h-8 text-xs border-primary text-primary"
                                >
                                  <MapPin className="h-3 w-3 mr-1" />
                                  Voir pharmacie
                                </Button>
                              </Link>
                              <a href={`tel:${commande.pharmacie.telephone}`} className="flex-1">
                                <Button
                                  size="sm"
                                  className="w-full h-8 text-xs bg-primary hover:bg-teal-700"
                                >
                                  <Phone className="h-3 w-3 mr-1" />
                                  Appeler
                                </Button>
                              </a>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredCommandes.length === 0 && (
        <div className="text-center py-8">
          <Truck className="h-12 w-12 text-teal-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">
            {filter === 'en_cours'
              ? 'Aucune commande en cours'
              : filter === 'terminees'
              ? 'Aucune commande terminée'
              : 'Aucune commande'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {filter === 'en_cours'
              ? 'Vos commandes actives apparaîtront ici'
              : 'Passez votre première commande'}
          </p>
          {filter !== 'en_cours' && (
            <Link href="/patient/recherche">
              <Button size="sm" className="mt-3 h-8 text-xs bg-primary hover:bg-teal-700">
                <ShoppingBag className="h-3 w-3 mr-1" />
                Commander
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Info banner */}
      {!loading && commandes.length > 0 && (
        <Card className="border-teal-200 bg-teal-50">
          <CardContent className="p-3 flex items-center gap-2">
            <Check className="h-4 w-4 text-primary flex-shrink-0" />
            <p className="text-[11px] text-teal-800">
              Vous recevrez une notification à chaque changement de statut de vos commandes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
