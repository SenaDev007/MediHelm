"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Truck,
  PackageCheck,
  Eye,
  Package,
} from "lucide-react"
import { OrderCard } from "@/components/grossistes/order-card"
import {
  CommandeGrossiste,
  getStatusColor,
  getStatusLabel,
  formatFCFA,
  formatDateTimeFR,
} from "@/lib/grossiste-utils"

export default function CommandesPage() {
  const [orders, setOrders] = useState<CommandeGrossiste[]>([])
  const [filteredOrders, setFilteredOrders] = useState<CommandeGrossiste[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<CommandeGrossiste | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [pharmacieFilter, setPharmacieFilter] = useState("ALL")
  const [pharmacies, setPharmacies] = useState<Array<{ id: string; nom: string }>>([])
  const [grossisteId, setGrossisteId] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)

      // Get grossiste ID first
      if (!grossisteId) {
        const gRes = await fetch("/api/grossistes?actif=true")
        const grossistes = await gRes.json()
        if (grossistes.length > 0) {
          setGrossisteId(grossistes[0].id)
        } else {
          setLoading(false)
          return
        }
      }

      const gid = grossisteId || ""
      const res = await fetch(`/api/grossistes/${gid}/commandes`)
      const data = await res.json()
      setOrders(data)

      // Extract unique pharmacies
      const uniquePharmacies = Array.from(
        new Map(data.map((o: CommandeGrossiste) => [o.pharmacieId, o.pharmacie])).values()
      ).filter(Boolean) as Array<{ id: string; nom: string }>
      setPharmacies(uniquePharmacies)
    } catch (error) {
      console.error("Erreur chargement commandes:", error)
      toast.error("Erreur lors du chargement des commandes")
    } finally {
      setLoading(false)
    }
  }, [grossisteId])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Apply filters
  useEffect(() => {
    let result = [...orders]

    if (statusFilter !== "ALL") {
      result = result.filter(o => o.statut === statusFilter)
    }

    if (pharmacieFilter !== "ALL") {
      result = result.filter(o => o.pharmacieId === pharmacieFilter)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(o =>
        (o.referenceGrossiste || "").toLowerCase().includes(term) ||
        o.id.toLowerCase().includes(term) ||
        (o.pharmacie?.nom || "").toLowerCase().includes(term)
      )
    }

    setFilteredOrders(result)
  }, [orders, statusFilter, pharmacieFilter, searchTerm])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/grossistes/commandes/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: newStatus }),
      })

      if (!res.ok) throw new Error("Erreur lors de la mise à jour")

      const updated = await res.json()
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o))

      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, ...updated })
      }

      toast.success(`Commande ${getStatusLabel(newStatus).toLowerCase()}`)
    } catch (error) {
      console.error("Erreur:", error)
      toast.error("Erreur lors de la mise à jour du statut")
    }
  }

  const handleViewDetail = async (order: CommandeGrossiste) => {
    try {
      const res = await fetch(`/api/grossistes/commandes/${order.id}`)
      const detail = await res.json()
      setSelectedOrder(detail)
      setDetailOpen(true)
    } catch (error) {
      console.error("Erreur:", error)
      setSelectedOrder(order)
      setDetailOpen(true)
    }
  }

  // Count by status
  const statusCounts: Record<string, number> = {}
  orders.forEach(o => {
    statusCounts[o.statut] = (statusCounts[o.statut] || 0) + 1
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Commandes</h1>
          <p className="text-muted-foreground mt-1">
            Gérez les commandes reçues des pharmacies ({orders.length} au total)
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchOrders}
          className="self-start"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { status: "ENVOYEE", label: "Envoyées", icon: Package },
          { status: "CONFIRMEE", label: "Confirmées", icon: CheckCircle },
          { status: "EN_PREPARATION", label: "En prép.", icon: PackageCheck },
          { status: "EN_LIVRAISON", label: "En livraison", icon: Truck },
          { status: "LIVREE", label: "Livrées", icon: CheckCircle },
          { status: "REFUSEE", label: "Refusées", icon: XCircle },
        ].map(({ status, label, icon: Icon }) => (
          <Card
            key={status}
            className={`cursor-pointer transition-all hover:shadow-md ${
              statusFilter === status ? "ring-2 ring-[#1D9E75]" : ""
            }`}
            onClick={() => setStatusFilter(statusFilter === status ? "ALL" : status)}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <Icon className="h-5 w-5 text-[#1D9E75] shrink-0" />
              <div>
                <p className="text-xl font-bold">{statusCounts[status] || 0}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence ou pharmacie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                <SelectItem value="ENVOYEE">Envoyée</SelectItem>
                <SelectItem value="CONFIRMEE">Confirmée</SelectItem>
                <SelectItem value="REFUSEE">Refusée</SelectItem>
                <SelectItem value="EN_PREPARATION">En préparation</SelectItem>
                <SelectItem value="EN_LIVRAISON">En livraison</SelectItem>
                <SelectItem value="LIVREE">Livrée</SelectItem>
                <SelectItem value="LITIGE">Litige</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pharmacieFilter} onValueChange={setPharmacieFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Filtrer par pharmacie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes les pharmacies</SelectItem>
                {pharmacies.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-lg font-medium text-muted-foreground">Aucune commande trouvée</p>
          <p className="text-sm text-muted-foreground mt-1">
            {orders.length === 0
              ? "Vous n'avez pas encore reçu de commandes"
              : "Ajustez vos filtres pour voir plus de résultats"}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onViewDetail={handleViewDetail}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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
              {selectedOrder?.referenceGrossiste || selectedOrder?.id.substring(0, 8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-5">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Pharmacie</p>
                  <p className="font-medium">{selectedOrder.pharmacie?.nom || "—"}</p>
                  <p className="text-xs text-muted-foreground">{selectedOrder.pharmacie?.ville}, {selectedOrder.pharmacie?.adresse}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Montant total</p>
                  <p className="text-xl font-bold text-[#1D9E75]">{formatFCFA(selectedOrder.montantTotal)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date d&apos;envoi</p>
                  <p className="font-medium">{formatDateTimeFR(selectedOrder.dateEnvoi)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date de confirmation</p>
                  <p className="font-medium">{formatDateTimeFR(selectedOrder.dateConfirmation)}</p>
                </div>
                {selectedOrder.dateLivraisonPrev && (
                  <div>
                    <p className="text-sm text-muted-foreground">Livraison prévue</p>
                    <p className="font-medium">{formatDateTimeFR(selectedOrder.dateLivraisonPrev)}</p>
                  </div>
                )}
                {selectedOrder.dateLivraisonReelle && (
                  <div>
                    <p className="text-sm text-muted-foreground">Livraison effective</p>
                    <p className="font-medium">{formatDateTimeFR(selectedOrder.dateLivraisonReelle)}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Line Items */}
              <div>
                <h4 className="font-semibold text-sm mb-3">Lignes de commande</h4>
                {selectedOrder.commandeInterne?.lignes && selectedOrder.commandeInterne.lignes.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">DCI</th>
                          <th className="text-right px-3 py-2 font-medium">Qté cmd.</th>
                          <th className="text-right px-3 py-2 font-medium">Qté liv.</th>
                          <th className="text-right px-3 py-2 font-medium">Prix unit.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.commandeInterne.lignes.map((ligne) => (
                          <tr key={ligne.id} className="border-t border-border/30">
                            <td className="px-3 py-2">{ligne.dci}</td>
                            <td className="px-3 py-2 text-right">{ligne.quantiteCommandee}</td>
                            <td className="px-3 py-2 text-right">{ligne.quantiteLivree}</td>
                            <td className="px-3 py-2 text-right font-medium">
                              {ligne.prixAchat ? formatFCFA(ligne.prixAchat) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Détail des lignes non disponible pour cette commande
                  </p>
                )}
              </div>

              <Separator />

              {/* Actions in Dialog */}
              <div className="flex flex-wrap gap-2">
                {selectedOrder.statut === "ENVOYEE" && (
                  <>
                    <Button
                      className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white"
                      onClick={() => {
                        handleStatusChange(selectedOrder.id, "CONFIRMEE")
                        setDetailOpen(false)
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirmer
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleStatusChange(selectedOrder.id, "REFUSEE")
                        setDetailOpen(false)
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Refuser
                    </Button>
                  </>
                )}
                {selectedOrder.statut === "CONFIRMEE" && (
                  <Button
                    className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white"
                    onClick={() => {
                      handleStatusChange(selectedOrder.id, "EN_PREPARATION")
                      setDetailOpen(false)
                    }}
                  >
                    <PackageCheck className="h-4 w-4 mr-2" />
                    Marquer en préparation
                  </Button>
                )}
                {selectedOrder.statut === "EN_PREPARATION" && (
                  <Button
                    className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white"
                    onClick={() => {
                      handleStatusChange(selectedOrder.id, "EN_LIVRAISON")
                      setDetailOpen(false)
                    }}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Marquer en livraison
                  </Button>
                )}
                {selectedOrder.statut === "EN_LIVRAISON" && (
                  <Button
                    className="bg-[#085041] hover:bg-[#085041]/90 text-white"
                    onClick={() => {
                      handleStatusChange(selectedOrder.id, "LIVREE")
                      setDetailOpen(false)
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marquer livrée
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
