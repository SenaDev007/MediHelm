'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, Phone, MapPin } from 'lucide-react'
import Link from 'next/link'

interface GardeWidgetProps {
  pharmacieNom: string
  pharmacieAdresse: string
  pharmacieTelephone: string
  heureDebut: string
  heureFin: string
}

export function GardeWidget({
  pharmacieNom,
  pharmacieAdresse,
  pharmacieTelephone,
  heureDebut,
  heureFin,
}: GardeWidgetProps) {
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-teal-50 to-white">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-teal-800">Pharmacie de garde aujourd&apos;hui</h3>
        </div>
        <div className="space-y-2">
          <p className="font-medium text-gray-900">{pharmacieNom}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {pharmacieAdresse}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
              {heureDebut} — {heureFin}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Link href="/patient/garde" className="flex-1">
            <Button size="sm" variant="outline" className="w-full h-8 text-xs border-primary text-primary">
              Détails
            </Button>
          </Link>
          <a href={`tel:${pharmacieTelephone}`} className="flex-1">
            <Button size="sm" className="w-full h-8 text-xs bg-primary hover:bg-teal-700">
              <Phone className="h-3 w-3 mr-1" />
              Appeler
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
