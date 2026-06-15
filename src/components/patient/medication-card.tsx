'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, ShoppingCart, Check, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface MedicationCardProps {
  id: string
  nomCommercial: string
  dci: string
  dosage: string
  forme: string
  prixVente: number
  estGenerique: boolean
  estRemboursable: boolean
  pharmacieNom?: string
  stockDisponible?: boolean
  onAddToCart?: () => void
}

export function MedicationCard({
  id,
  nomCommercial,
  dci,
  dosage,
  forme,
  prixVente,
  estGenerique,
  estRemboursable,
  pharmacieNom,
  stockDisponible = true,
  onAddToCart,
}: MedicationCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow border-teal-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-sm">{nomCommercial}</h3>
              {estGenerique && (
                <Badge variant="secondary" className="text-[10px] bg-teal-50 text-teal-800 border-0">
                  Générique
                </Badge>
              )}
              {estRemboursable && (
                <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-800 border-0">
                  Remboursable
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{dci}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {dosage} - {forme}
              </span>
            </div>
            {pharmacieNom && (
              <p className="text-xs text-primary mt-1">📍 {pharmacieNom}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="font-bold text-teal-800">{prixVente.toLocaleString('fr-FR')} FCFA</p>
            <div className="flex items-center gap-1">
              {stockDisponible ? (
                <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700 border-0">
                  <Check className="h-3 w-3 mr-0.5" /> En stock
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] bg-red-50 text-red-700 border-0">
                  <AlertTriangle className="h-3 w-3 mr-0.5" /> Rupture
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            className="flex-1 h-8 text-xs bg-primary hover:bg-teal-700"
            onClick={onAddToCart}
            disabled={!stockDisponible}
          >
            <ShoppingCart className="h-3 w-3 mr-1" />
            Commander
          </Button>
          <Link href={`/patient/pharmacies?medicament=${id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full h-8 text-xs border-primary text-primary hover:bg-teal-50">
              Pharmacies
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
