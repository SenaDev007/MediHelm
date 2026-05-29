'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ClipboardList, Plus, Truck, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Commande {
  id: string
  reference: string
  statut: string
  dateCommande: string
  dateLivraisonPrev: string | null
  dateLivraisonReelle: string | null
  montantTotal: number | null
  observations: string | null
  fournisseur: {
    id: string
    nom: string
    code: string
  }
  lignes: {
    id: string
    dci: string
    quantiteCommandee: number
    quantiteLivree: number
    prixAchat: number | null
    medicament: { nomCommercial: string } | null
  }[]
  receptions: {
    id: string
    dateReception: string
    statut: string
  }[]
}

interface Fournisseur {
  id: string
  nom: string
  code: string
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA'
}

const statutConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  BROUILLON: { label: 'Brouillon', color: 'bg-gray-400 text-white', icon: Clock },
  ENVOYEE: { label: 'Envoyée', color: 'bg-blue-500 text-white', icon: Truck },
  CONFIRMEE: { label: 'Confirmée', color: 'bg-primary text-white', icon: CheckCircle2 },
  EN_PREPARATION: { label: 'En préparation', color: 'bg-amber-400 text-gray-900', icon: Clock },
  LIVREE_PARTIELLEMENT: { label: 'Livraison partielle', color: 'bg-orange-500 text-white', icon: Truck },
  LIVREE: { label: 'Livrée', color: 'bg-green-600 text-white', icon: CheckCircle2 },
  ANNULEE: { label: 'Annulée', color: 'bg-destructive text-white', icon: XCircle },
}

export default function CommandesPage() {
  const { pharmacie } = useAuth()
  const [commandes, setCommandes] = useState<Commande[]>([])
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatut, setFilterStatut] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null)

  useEffect(() => {
    if (pharmacie?.id) {
      setLoading(true)
      Promise.all([
        fetch(`/api/commandes?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : []),
        fetch(`/api/grossistes?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : []),
      ]).then(([cmds, fours]) => {
        setCommandes(cmds)
        setFournisseurs(fours)
      }).catch(() => {}).finally(() => setLoading(false))
    }
  }, [pharmacie?.id])

  const filteredCommandes = filterStatut === 'all'
    ? commandes
    : commandes.filter(c => c.statut === filterStatut)

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Commandes Fournisseurs
          </h1>
          <p className="text-sm text-muted-foreground">
            {commandes.length} commandes • Gestion des approvisionnements
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouvelle commande
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nouvelle commande</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label>Fournisseur</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    {fournisseurs.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>DCI / Médicament</Label>
                <Input placeholder="Rechercher un médicament..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantité</Label>
                  <Input type="number" placeholder="0" />
                </div>
                <div>
                  <Label>Prix d&apos;achat unitaire</Label>
                  <Input type="number" placeholder="0" />
                </div>
              </div>
              <div>
                <Label>Observations</Label>
                <Input placeholder="Notes..." />
              </div>
              <Button className="w-full">Créer la commande</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterStatut === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatut('all')}
        >
          Toutes
        </Button>
        {Object.entries(statutConfig).map(([key, config]) => (
          <Button
            key={key}
            variant={filterStatut === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatut(key)}
          >
            {config.label}
          </Button>
        ))}
      </div>

      {/* Commandes List */}
      <div className="space-y-3">
        {filteredCommandes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucune commande trouvée
            </CardContent>
          </Card>
        ) : (
          filteredCommandes.map(cmd => {
            const config = statutConfig[cmd.statut] || statutConfig.BROUILLON
            const Icon = config.icon
            return (
              <Card key={cmd.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedCommande(cmd)}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${config.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{cmd.reference}</span>
                          <Badge className={`text-[9px] ${config.color}`}>{config.label}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {cmd.fournisseur.nom} • {new Date(cmd.dateCommande).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <span className="text-xs text-muted-foreground block">Lignes</span>
                        <span className="font-semibold">{cmd.lignes.length}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-xs text-muted-foreground block">Montant</span>
                        <span className="font-semibold">{cmd.montantTotal ? formatFCFA(cmd.montantTotal) : '—'}</span>
                      </div>
                      {cmd.receptions.length > 0 && (
                        <div className="text-center">
                          <span className="text-xs text-muted-foreground block">Réceptions</span>
                          <span className="font-semibold text-primary">{cmd.receptions.length}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedCommande} onOpenChange={() => setSelectedCommande(null)}>
        <DialogContent className="max-w-lg">
          {selectedCommande && (
            <>
              <DialogHeader>
                <DialogTitle>Commande {selectedCommande.reference}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Fournisseur</span>
                    <p className="font-medium">{selectedCommande.fournisseur.nom}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Statut</span>
                    <p>
                      <Badge className={statutConfig[selectedCommande.statut]?.color || 'bg-gray-400'}>
                        {statutConfig[selectedCommande.statut]?.label || selectedCommande.statut}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date commande</span>
                    <p className="font-medium">{new Date(selectedCommande.dateCommande).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Livraison prévue</span>
                    <p className="font-medium">
                      {selectedCommande.dateLivraisonPrev
                        ? new Date(selectedCommande.dateLivraisonPrev).toLocaleDateString('fr-FR')
                        : 'Non définie'}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Lignes de commande</h4>
                  <ScrollArea className="max-h-48">
                    <div className="space-y-2">
                      {selectedCommande.lignes.map(l => (
                        <div key={l.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
                          <div>
                            <span className="font-medium">{l.medicament?.nomCommercial || l.dci}</span>
                            <span className="text-xs text-muted-foreground ml-2">QT: {l.quantiteCommandee}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground">Livré: {l.quantiteLivree}/{l.quantiteCommandee}</span>
                            {l.prixAchat && <span className="block text-xs">{formatFCFA(l.prixAchat)}/u</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {selectedCommande.observations && (
                  <div>
                    <span className="text-sm text-muted-foreground">Observations</span>
                    <p className="text-sm">{selectedCommande.observations}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
