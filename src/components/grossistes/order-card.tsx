"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CommandeGrossiste,
  getStatusColor,
  getStatusLabel,
} from "@/lib/grossiste-utils"
import {
  CheckCircle,
  XCircle,
  Truck,
  PackageCheck,
  Clock,
  Eye,
} from "lucide-react"

interface OrderCardProps {
  order: CommandeGrossiste
  onViewDetail: (order: CommandeGrossiste) => void
  onStatusChange: (orderId: string, newStatus: string) => void
}

export function OrderCard({ order, onViewDetail, onStatusChange }: OrderCardProps) {
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return "—"
    return new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + " FCFA"
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-semibold">
              {order.referenceGrossiste || order.id.substring(0, 8).toUpperCase()}
            </CardTitle>
            <Badge className={getStatusColor(order.statut)}>
              {getStatusLabel(order.statut)}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetail(order)}
            className="text-sidebar-primary hover:text-sidebar-primary/80"
          >
            <Eye className="h-4 w-4 mr-1" />
            Détail
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Pharmacie :</span>
            <p className="font-medium">{order.pharmacie?.nom || "—"}, {order.pharmacie?.ville || ""}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Montant :</span>
            <p className="font-semibold text-teal-600">{formatCurrency(order.montantTotal)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Date envoi :</span>
            <p className="font-medium">{formatDate(order.dateEnvoi)}</p>
          </div>
          {order.dateConfirmation && (
            <div>
              <span className="text-muted-foreground">Confirmée le :</span>
              <p className="font-medium">{formatDate(order.dateConfirmation)}</p>
            </div>
          )}
        </div>

        {/* Action buttons based on status */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {order.statut === "ENVOYEE" && (
            <>
              <Button
                size="sm"
                className="bg-sidebar-primary hover:bg-sidebar-primary/90 text-white"
                onClick={() => onStatusChange(order.id, "CONFIRMEE")}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Confirmer
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onStatusChange(order.id, "REFUSEE")}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Refuser
              </Button>
            </>
          )}
          {order.statut === "CONFIRMEE" && (
            <Button
              size="sm"
              className="bg-sidebar-primary hover:bg-sidebar-primary/90 text-white"
              onClick={() => onStatusChange(order.id, "EN_PREPARATION")}
            >
              <PackageCheck className="h-4 w-4 mr-1" />
              En préparation
            </Button>
          )}
          {order.statut === "EN_PREPARATION" && (
            <Button
              size="sm"
              className="bg-sidebar-primary hover:bg-sidebar-primary/90 text-white"
              onClick={() => onStatusChange(order.id, "EN_LIVRAISON")}
            >
              <Truck className="h-4 w-4 mr-1" />
              En livraison
            </Button>
          )}
          {order.statut === "EN_LIVRAISON" && (
            <Button
              size="sm"
              className="bg-teal-800 hover:bg-teal-800/90 text-white"
              onClick={() => onStatusChange(order.id, "LIVREE")}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Marquer livrée
            </Button>
          )}
          {order.statut === "LIVREE" && (
            <div className="flex items-center gap-1 text-sm text-teal-600">
              <CheckCircle className="h-4 w-4" />
              Commande livrée
            </div>
          )}
          {order.statut === "REFUSEE" && (
            <div className="flex items-center gap-1 text-sm text-destructive">
              <XCircle className="h-4 w-4" />
              Commande refusée
            </div>
          )}
          {order.statut === "LITIGE" && (
            <div className="flex items-center gap-1 text-sm text-amber-500">
              <Clock className="h-4 w-4" />
              En litige
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
