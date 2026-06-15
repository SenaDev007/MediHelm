'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ShoppingCart,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  Truck,
  PackageCheck,
  Clock,
  PackageX,
  ArrowUpDown,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { OrderCard } from '@/components/grossistes/order-card'
import type { CommandeGrossiste } from '@/lib/grossiste-utils'
import { getStatusLabel, getStatusColor, formatFCFA, formatDateTimeFR } from '@/lib/grossiste-utils'
import { toast } from 'sonner'

interface CommandeDetail {
  id: string
  grossisteId: string
  pharmacieId: string | null
  reference: string
  statut: string
  montantTotal: number
  createdAt: string
  updatedAt: string
  grossiste: { id: string; nom: string; slug: string }
  pharmacie: { id: string; nom: string; ville: string; adresse: string; telephone: string } | null
  lignes: Array<{
    id: string
    dci: string
    nomCommercial: string | null
    quantite: number
    prixUnitaire: number
    montant: number
  }>
}

const STATUS_TABS = [
  { value: 'all', label: 'Toutes', icon: ShoppingCart },
  { value: 'ENVOYEE', label: 'Envoyées', icon: Clock },
  { value: 'CONFIRMEE', label: 'Confirmées', icon: CheckCircle },
  { value: 'EN_PREPARATION', label: 'En préparation', icon: PackageCheck },
  { value: 'EN_LIVRAISON', label: 'En livraison', icon: Truck },
  { value: 'LIVREE', label: 'Livrées', icon: CheckCircle },
  { value: 'REFUSEE', label: 'Refusées', icon: XCircle },
  { value: 'LITIGE', label: 'Litige', icon: PackageX },
]

export default function CommandesPage() {
  const [commandes, setCommandes] = useState<CommandeGrossiste[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatut, setFilterStatut] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [grossisteId, setGrossisteId] = useState<string>('')
  const [grossistes, setGrossistes] = useState<Array<{ id: string; nom: string }>>([])
  const [selectedOrder, setSelectedOrder] = useState<CommandeDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    orderId: string
    newStatus: string
    label: string
  } | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'montant'>('date')

  // ─── Fetch grossistes ────────────────────────────────────────
  useEffect(() => {
    const fetchGrossistes = async () => {
      try {
        const res = await fetch('/api/grossistes?actif=true')
        if (res.ok) {
          const data = await res.json()
          setGrossistes(data)
          if (data.length > 0) setGrossisteId(data[0].id)
        }
      } catch (error) {
        console.error('Erreur:', error)
      }
    }
    fetchGrossistes()
  }, [])

  // ─── Fetch commandes ─────────────────────────────────────────
  const fetchCommandes = useCallback(async () => {
    if (!grossisteId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/grossistes/${grossisteId}/commandes?limit=100`)
      if (res.ok) {
        const data = await res.json()
        const cmds = (data.commandes || data).map((c: CommandeGrossiste) => ({
          ...c,
          referenceGrossiste: c.referenceGrossiste || c.reference || null,
          dateEnvoi: c.dateEnvoi || c.createdAt,
          dateConfirmation: c.dateConfirmation || null,
          dateLivraisonPrev: c.dateLivraisonPrev || null,
          dateLivraisonReelle: c.dateLivraisonReelle || null,
          pharmacie: c.pharmacie || null,
          montantTotal: c.montantTotal || 0,
        }))
        setCommandes(cmds)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }, [grossisteId])

  useEffect(() => {
    fetchCommandes()
  }, [fetchCommandes])

  // ─── Filter & sort ───────────────────────────────────────────
  const filteredCommandes = commandes
    .filter(c => {
      if (filterStatut !== 'all' && c.statut !== filterStatut) return false
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        if (
          !(c.referenceGrossiste || c.reference || '').toLowerCase().includes(term) &&
          !(c.pharmacie?.nom || '').toLowerCase().includes(term)
        )
          return false
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'montant') return (b.montantTotal || 0) - (a.montantTotal || 0)
      return new Date(b.createdAt || b.dateEnvoi).getTime() - new Date(a.createdAt || a.dateEnvoi).getTime()
    })

  // ─── Status change ───────────────────────────────────────────
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/grossistes/commandes/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: newStatus }),
      })
      if (res.ok) {
        toast.success(`Commande ${getStatusLabel(newStatus).toLowerCase()}`)
        fetchCommandes()
        if (selectedOrder?.id === orderId) {
          const detailRes = await fetch(`/api/grossistes/commandes/${orderId}`)
          if (detailRes.ok) setSelectedOrder(await detailRes.json())
        }
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors du changement de statut')
      }
    } catch (error) {
      console.error(error)
      toast.error('Erreur de connexion')
    }
  }

  const handleConfirmAction = () => {
    if (!confirmAction) return
    handleStatusChange(confirmAction.orderId, confirmAction.newStatus)
    setConfirmDialogOpen(false)
    setConfirmAction(null)
  }

  const requestStatusChange = (orderId: string, newStatus: string, label: string) => {
    if (newStatus === 'REFUSEE' || newStatus === 'ANNULEE') {
      setConfirmAction({ orderId, newStatus, label })
      setConfirmDialogOpen(true)
    } else {
      handleStatusChange(orderId, newStatus)
    }
  }

  // ─── View detail ─────────────────────────────────────────────
  const handleViewDetail = async (order: CommandeGrossiste) => {
    try {
      const res = await fetch(`/api/grossistes/commandes/${order.id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedOrder(data)
        setDetailOpen(true)
      }
    } catch (error) {
      console.error(error)
      toast.error('Erreur lors du chargement du détail')
    }
  }

  // ─── Stats ───────────────────────────────────────────────────
  const totalCommandes = commandes.length
  const envoyees = commandes.filter(c => c.statut === 'ENVOYEE').length
  const confirmees = commandes.filter(
    c => c.statut === 'CONFIRMEE' || c.statut === 'EN_PREPARATION'
  ).length
  const livrees = commandes.filter(c => c.statut === 'LIVREE').length
  const montantTotalLivrees = commandes
    .filter(c => c.statut === 'LIVREE')
    .reduce((acc, c) => acc + (c.montantTotal || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
            <ShoppingCart className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Commandes</h1>
            <p className="text-sm text-muted-foreground">
              Gestion des commandes reçues des pharmacies
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={grossisteId} onValueChange={setGrossisteId}>
            <SelectTrigger className="w-48 border-teal-200">
              <SelectValue placeholder="Sélectionner grossiste" />
            </SelectTrigger>
            <SelectContent>
              {grossistes.map(g => (
                <SelectItem key={g.id} value={g.id}>
                  {g.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="border-teal-300 text-teal-700"
            onClick={() => setSortBy(sortBy === 'date' ? 'montant' : 'date')}
          >
            <ArrowUpDown className="h-4 w-4 mr-1" />
            {sortBy === 'date' ? 'Trier par montant' : 'Trier par date'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-teal-500">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{totalCommandes}</p>
            <p className="text-xs text-muted-foreground">Total commandes</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-700">{envoyees}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-600">{confirmees}</p>
            <p className="text-xs text-muted-foreground">Confirmées / Préparation</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-lg font-bold text-green-700">{livrees}</p>
            <p className="text-xs text-muted-foreground">
              Livrées · {formatFCFA(montantTotalLivrees)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Tabs */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map(tab => {
              const count =
                tab.value === 'all'
                  ? commandes.length
                  : commandes.filter(c => c.statut === tab.value).length
              const isActive = filterStatut === tab.value
              return (
                <Button
                  key={tab.value}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  className={
                    isActive
                      ? 'bg-teal-600 hover:bg-teal-700'
                      : 'border-teal-200 text-teal-700'
                  }
                  onClick={() => setFilterStatut(tab.value)}
                >
                  <tab.icon className="h-3.5 w-3.5 mr-1.5" />
                  {tab.label}
                  {count > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 text-xs">
                      {count}
                    </Badge>
                  )}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Rechercher par référence ou pharmacie..."
                className="pl-8 border-teal-200"
              />
            </div>
            {searchTerm && (
              <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')}>
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders Grid */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            <span className="ml-2 text-muted-foreground">Chargement des commandes...</span>
          </CardContent>
        </Card>
      ) : filteredCommandes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Aucune commande trouvée</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filterStatut !== 'all'
                ? `Aucune commande avec le statut "${getStatusLabel(filterStatut)}"`
                : 'Les commandes des pharmacies apparaîtront ici'}
            </p>
            {filterStatut !== 'all' && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-teal-300 text-teal-700"
                onClick={() => setFilterStatut('all')}
              >
                Voir toutes les commandes
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCommandes.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onViewDetail={handleViewDetail}
              onStatusChange={(orderId, newStatus) => {
                requestStatusChange(orderId, newStatus, getStatusLabel(newStatus))
              }}
            />
          ))}
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Détail de la commande
              {selectedOrder && (
                <Badge className={getStatusColor(selectedOrder.statut)}>
                  {getStatusLabel(selectedOrder.statut)}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Référence : {selectedOrder?.reference}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Pharmacie :</span>
                  <p className="font-medium">{selectedOrder.pharmacie?.nom || '—'}</p>
                  {selectedOrder.pharmacie?.ville && (
                    <p className="text-xs text-muted-foreground">
                      {selectedOrder.pharmacie.ville} · {selectedOrder.pharmacie.adresse}
                    </p>
                  )}
                  {selectedOrder.pharmacie?.telephone && (
                    <p className="text-xs text-muted-foreground">
                      Tél : {selectedOrder.pharmacie.telephone}
                    </p>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Montant total :</span>
                  <p className="text-lg font-bold text-teal-600">
                    {formatFCFA(selectedOrder.montantTotal)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date de commande :</span>
                  <p className="font-medium">{formatDateTimeFR(selectedOrder.createdAt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Grossiste :</span>
                  <p className="font-medium">{selectedOrder.grossiste?.nom || '—'}</p>
                </div>
              </div>

              {/* Status Actions in Detail */}
              {['ENVOYEE', 'CONFIRMEE', 'EN_PREPARATION', 'EN_LIVRAISON'].includes(
                selectedOrder.statut
              ) && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">Actions rapides</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedOrder.statut === 'ENVOYEE' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                            onClick={() =>
                              handleStatusChange(selectedOrder.id, 'CONFIRMEE')
                            }
                          >
                            <CheckCircle className="h-4 w-4 mr-1" /> Confirmer
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              requestStatusChange(selectedOrder.id, 'REFUSEE', 'Refuser')
                            }
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Refuser
                          </Button>
                        </>
                      )}
                      {selectedOrder.statut === 'CONFIRMEE' && (
                        <Button
                          size="sm"
                          className="bg-teal-600 hover:bg-teal-700 text-white"
                          onClick={() =>
                            handleStatusChange(selectedOrder.id, 'EN_PREPARATION')
                          }
                        >
                          <PackageCheck className="h-4 w-4 mr-1" /> En préparation
                        </Button>
                      )}
                      {selectedOrder.statut === 'EN_PREPARATION' && (
                        <Button
                          size="sm"
                          className="bg-teal-600 hover:bg-teal-700 text-white"
                          onClick={() =>
                            handleStatusChange(selectedOrder.id, 'EN_LIVRAISON')
                          }
                        >
                          <Truck className="h-4 w-4 mr-1" /> En livraison
                        </Button>
                      )}
                      {selectedOrder.statut === 'EN_LIVRAISON' && (
                        <Button
                          size="sm"
                          className="bg-teal-800 hover:bg-teal-900 text-white"
                          onClick={() => handleStatusChange(selectedOrder.id, 'LIVREE')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Marquer livrée
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Line Items */}
              {selectedOrder.lignes && selectedOrder.lignes.length > 0 && (
                <>
                  <Separator />
                  <div className="border rounded-lg">
                    <div className="p-3 bg-muted/50 border-b">
                      <h4 className="font-semibold text-sm">
                        Lignes de commande ({selectedOrder.lignes.length})
                      </h4>
                    </div>
                    <ScrollArea className="max-h-60">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 font-medium text-muted-foreground">
                              DCI
                            </th>
                            <th className="text-right p-2 font-medium text-muted-foreground">
                              Qté
                            </th>
                            <th className="text-right p-2 font-medium text-muted-foreground">
                              Prix unit.
                            </th>
                            <th className="text-right p-2 font-medium text-muted-foreground">
                              Montant
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.lignes.map(ligne => (
                            <tr
                              key={ligne.id}
                              className="border-b last:border-0 hover:bg-muted/20"
                            >
                              <td className="p-2">
                                <div className="font-medium">{ligne.dci}</div>
                                {ligne.nomCommercial && (
                                  <div className="text-xs text-muted-foreground">
                                    {ligne.nomCommercial}
                                  </div>
                                )}
                              </td>
                              <td className="p-2 text-right">{ligne.quantite}</td>
                              <td className="p-2 text-right">
                                {formatFCFA(ligne.prixUnitaire)}
                              </td>
                              <td className="p-2 text-right font-semibold text-teal-600">
                                {formatFCFA(ligne.montant)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-muted/30">
                            <td colSpan={3} className="p-2 text-right font-semibold">
                              Total :
                            </td>
                            <td className="p-2 text-right font-bold text-teal-600">
                              {formatFCFA(selectedOrder.montantTotal)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </ScrollArea>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l&apos;action</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir {confirmAction?.label?.toLowerCase()} cette commande ?
              {confirmAction?.newStatus === 'REFUSEE' &&
                ' Cette action informera la pharmacie du refus.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant={confirmAction?.newStatus === 'REFUSEE' ? 'destructive' : 'default'}
              className={
                confirmAction?.newStatus !== 'REFUSEE'
                  ? 'bg-teal-600 hover:bg-teal-700'
                  : ''
              }
              onClick={handleConfirmAction}
            >
              {confirmAction?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
