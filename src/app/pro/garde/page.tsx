'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Moon, Plus, Calendar, Clock, User } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface GardeItem {
  id: string
  date: string
  type: string
  heureDebut: string
  heureFin: string
  pharmacienNom?: string
}

export default function GardePage() {
  const { pharmacie } = useAuth()
  const [gardes, setGardes] = useState<GardeItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (pharmacie?.id) {
      fetch(`/api/pharmacies?pharmacieId=${pharmacie.id}`)
        .then(() => {
          // Demo garde data
          setGardes([
            { id: '1', date: '2025-06-02', type: 'Nuit', heureDebut: '20:00', heureFin: '08:00', pharmacienNom: 'Dr. Adjo' },
            { id: '2', date: '2025-06-09', type: 'Week-end', heureDebut: '08:00', heureFin: '20:00', pharmacienNom: 'Dr. Kofi' },
            { id: '3', date: '2025-06-16', type: 'Nuit', heureDebut: '20:00', heureFin: '08:00', pharmacienNom: 'Dr. Adjo' },
          ])
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [pharmacie?.id])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Moon className="w-6 h-6 text-primary" />
            Pharmacie de Garde
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Planning et rapports de garde</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => toast('Fonctionnalité bientôt disponible')}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter planning
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gardes ce mois</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{gardes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Prochaine garde</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{gardes[0]?.date || 'Aucune'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">CA Dernière garde</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">85 400 <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planning de garde</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : gardes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucun planning de garde</div>
          ) : (
            <div className="space-y-3">
              {gardes.map((garde) => (
                <div key={garde.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{garde.date}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {garde.heureDebut} - {garde.heureFin}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={garde.type === 'Nuit' ? 'default' : 'secondary'}>
                      {garde.type}
                    </Badge>
                    {garde.pharmacienNom && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <User className="w-3 h-3" />
                        {garde.pharmacienNom}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
