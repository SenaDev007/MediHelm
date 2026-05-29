"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CatalogueItem } from "@/lib/grossiste-utils"
import { Edit2, Save, X, Package, PackageX } from "lucide-react"
import { useState } from "react"

interface ProductRowProps {
  product: CatalogueItem
  onSave: (id: string, data: Partial<CatalogueItem>) => void
}

export function ProductRow({ product, onSave }: ProductRowProps) {
  const [editing, setEditing] = useState(false)
  const [prix, setPrix] = useState(product.prixAchat.toString())
  const [disponible, setDisponible] = useState(product.disponible)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + " FCFA"
  }

  const handleSave = () => {
    onSave(product.id, {
      prixAchat: parseFloat(prix) || product.prixAchat,
      disponible,
    })
    setEditing(false)
  }

  const handleCancel = () => {
    setPrix(product.prixAchat.toString())
    setDisponible(product.disponible)
    setEditing(false)
  }

  return (
    <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
        {product.referenceGros}
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-medium">{product.nomCommercial}</div>
        <div className="text-xs text-muted-foreground">{product.dci}</div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {product.forme} — {product.dosage}
      </td>
      <td className="px-4 py-3 text-sm">
        {editing ? (
          <Input
            type="number"
            value={prix}
            onChange={(e) => setPrix(e.target.value)}
            className="w-28 h-8 text-sm"
            min={0}
          />
        ) : (
          <span className="font-semibold text-teal-600">{formatCurrency(product.prixAchat)}</span>
        )}
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDisponible(!disponible)}
            className={disponible ? "text-teal-600" : "text-destructive"}
          >
            {disponible ? <Package className="h-4 w-4 mr-1" /> : <PackageX className="h-4 w-4 mr-1" />}
            {disponible ? "Disponible" : "Indisponible"}
          </Button>
        ) : (
          <Badge variant={product.disponible ? "default" : "destructive"} className={product.disponible ? "bg-teal-600" : ""}>
            {product.disponible ? "En stock" : "Rupture"}
          </Badge>
        )}
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={handleSave} className="text-teal-600 hover:text-teal-800">
              <Save className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} className="text-destructive hover:text-destructive/80">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="text-muted-foreground hover:text-sidebar-primary">
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      </td>
    </tr>
  )
}
