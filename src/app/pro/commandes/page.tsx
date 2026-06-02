'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ClipboardList, Plus, Truck, CheckCircle2, Clock, XCircle, AlertTriangle, Package, PackageCheck } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'

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
    medicamentId: string | null
    quantiteCommandee: number
    quantiteLivree: number
    prixAchat: number | null
    dateSouhaitee: string | null
    medicament: { nomCommercial: string; dci: string } | null
  }[]
  receptions: {
    id: string
    dateReception: string
    statut: string
    numeroBL: string | null
    lignes: {
      id: string
      medicamentId: string
      numeroLot: string
      dateExpiration: string
      quantiteBL: number
      quantiteRecue: number
      prixAchat: number
      medicament: { nomCommercial: string }
    }[]
  }[]
}

interface Fournisseur {
  id: string
  nom: string
  code: string
}

interface MedicamentSuggestion {
  id: string
  nomCommercial: string
  dci: string
  stockTotal: number
  stockMin: number
  fournisseurParDefaut: string | null
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA'
}

const statutConfig: Record<string, { label: string; color: string; icon: typeof Clock; next?: string }> = {
  BROUILLON: { label: 'Brouillon', color: 'bg-gray-400 text-white', icon: Clock, next: 'ENVOYEE' },
  ENVOYEE: { label: 'Envoyée', color: 'bg-blue-500 text-white', icon: Truck, next: 'CONFIRMEE' },
  CONFIRMEE: { label: 'Confirmée', color: 'bg-primary text-white', icon: CheckCircle2, next: 'EN_PREPARATION' },
  EN_PREPARATION: { label: 'En préparation', color: 'bg-amber-400 text-gray-900', icon: Clock, next: 'LIVREE' },
  LIVREE_PARTIELLEMENT: { label: 'Livraison partielle', color: 'bg-orange-500 text-white', icon: Truck },
  LIVREE: { label: 'Livrée', color: 'bg-green-600 text-white', icon: CheckCircle2 },
  ANNULEE: { label: 'Annulée', color: 'bg-destructive text-white', icon: XCircle },
}

export default function CommandesPage() {
  const { pharmacie } = useAuth()
  const [commandes, setCommandes] = useState<Commande[]>([])
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [medicaments, setMedicaments] = useState<MedicamentSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatut, setFilterStatut] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null)
  const [activeTab, setActiveTab] = useState('commandes')

  // Create form
  const [formFournisseurId, setFormFournisseurId] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formLignes, setFormLignes] = useState<Array<{ dci: string; medicamentId: string; quantite: string; prixAchat: string; dateSouhaitee: string }>>([])

  // Reception dialog
  const [receptionDialogOpen, setReceptionDialogOpen] = useState(false)
  const [receptionCommande, setReceptionCommande] = useState<Commande | null>(null)
  const [receptionNumeroBL, setReceptionNumeroBL] = useState('')
  const [receptionLignes, setReceptionLignes] = useState<Array<{
    medicamentId: string
    nom: string
    quantiteBL: number
    numeroLot: string
    dateExpiration: string
    quantiteRecue: string
    prixAchat: string
    conformite: string
  }>>([])

  useEffect(() => {
    const pid = pharmacie?.id
    if (!pid) return
    Promise.all([
      fetch(`/api/commandes?pharmacieId=${pid}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/grossistes?pharmacieId=${pid}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/medicaments?pharmacieId=${pid}`).then(r => r.ok ? r.json() : []),
    ]).then(([cmds, fours, meds]) => {
      setCommandes(cmds)
      setFournisseurs(fours)
      setMedicaments(meds.map((m: MedicamentSuggestion & { lots: { quantite: number }[] }) => ({
        id: m.id,
        nomCommercial: m.nomCommercial,
        dci: m.dci,
        stockTotal: m.lots?.reduce((s: number, l: { quantite: number }) => s + l.quantite, 0) || 0,
        stockMin: m.stockMin,
        fournisseurParDefaut: m.fournisseurParDefaut,
      })))
      setLoading(false)
    }).catch(() => { setLoading(false) })
  }, [pharmacie?.id])

  const filteredCommandes = filterStatut === 'all'
    ? commandes
    : commandes.filter(c => c.statut === filterStatut)

  // Auto-suggest: médicaments en rupture
  const medsLowStock = useMemo(() => {
    return medicaments.filter(m => m.stockTotal <= m.stockMin)
  }, [medicaments])

  const refreshCommandes = async () => {
    if (!pharmacie?.id) return
    const cmds = await fetch(`/api/commandes?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : [])
    setCommandes(cmds)
  }

  // Create order with line items
  const handleCreateOrder = async () => {
    if (!pharmacie?.id || !formFournisseurId) return
    try {
      const lignes = formLignes
        .filter(l => l.dci || l.medicamentId)
        .map(l => ({
          dci: l.dci,
          medicamentId: l.medicamentId || null,
          quantiteCommandee: parseInt(l.quantite) || 1,
          prixAchat: l.prixAchat ? parseFloat(l.prixAchat) : null,
          dateSouhaitee: l.dateSouhaitee || null,
        }))

      const res = await fetch('/api/commandes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          fournisseurId: formFournisseurId,
          reference: `CMD-${Date.now()}`,
          statut: 'BROUILLON',
          dateCommande: new Date().toISOString(),
          observations: formNotes || null,
          lignes: lignes.length > 0 ? lignes : undefined,
        }),
      })
      if (res.ok) {
        toast.success('Commande créée avec succès')
        setCreateDialogOpen(false)
        setFormFournisseurId('')
        setFormNotes('')
        setFormLignes([])
        refreshCommandes()
      } else {
        toast.error('Erreur lors de la création de la commande')
      }
    } catch {
      toast.error('Erreur lors de la création de la commande')
    }
  }

  // Add line to create form
  const addFormLigne = (med?: MedicamentSuggestion) => {
    setFormLignes(prev => [...prev, {
      dci: med?.dci || '',
      medicamentId: med?.id || '',
      quantite: '1',
      prixAchat: '',
      dateSouhaitee: '',
    }])
  }

  const removeFormLigne = (index: number) => {
    setFormLignes(prev => prev.filter((_, i) => i !== index))
  }

  const updateFormLigne = (index: number, field: string, value: string) => {
    setFormLignes(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l))
  }

  // Status transition
  const handleStatusChange = async (cmdId: string, newStatut: string) => {
    try {
      const res = await fetch(`/api/commandes/${cmdId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: newStatut }),
      })
      if (res.ok) {
        toast.success(`Statut mis à jour: ${statutConfig[newStatut]?.label || newStatut}`)
        refreshCommandes()
      }
    } catch {
      toast.error('Erreur lors du changement de statut')
    }
  }

  // Open reception dialog
  const openReception = (cmd: Commande) => {
    setReceptionCommande(cmd)
    setReceptionNumeroBL('')
    setReceptionLignes(cmd.lignes.map(l => ({
      medicamentId: l.medicamentId || '',
      nom: l.medicament?.nomCommercial || l.dci,
      quantiteBL: l.quantiteCommandee - l.quantiteLivree,
      numeroLot: '',
      dateExpiration: '',
      quantiteRecue: String(l.quantiteCommandee - l.quantiteLivree),
      prixAchat: String(l.prixAchat || ''),
      conformite: 'CONFORME',
    })))
    setReceptionDialogOpen(true)
  }

  // Submit reception
  const handleReception = async () => {
    if (!receptionCommande || !pharmacie?.id) return
    try {
      const lignesReception = receptionLignes
        .filter(l => l.numeroLot && l.quantiteRecue)
        .map(l => ({
          medicamentId: l.medicamentId,
          numeroLot: l.numeroLot,
          dateExpiration: l.dateExpiration ? new Date(l.dateExpiration).toISOString() : new Date().toISOString(),
          quantiteBL: l.quantiteBL,
          quantiteRecue: parseInt(l.quantiteRecue) || 0,
          prixAchat: parseFloat(l.prixAchat) || 0,
        }))

      // Detect discrepancies and conformité
      const ecarts = lignesReception
        .filter(l => l.quantiteRecue !== l.quantiteBL || receptionLignes.find(rl => rl.medicamentId === l.medicamentId)?.conformite !== 'CONFORME')
        .map(l => {
          const rl = receptionLignes.find(r => r.medicamentId === l.medicamentId)
          return {
            medicamentId: l.medicamentId,
            attendu: l.quantiteBL,
            recu: l.quantiteRecue,
            ecart: l.quantiteBL - l.quantiteRecue,
            conformite: rl?.conformite || 'CONFORME',
          }
        })

      const hasEcart = ecarts.length > 0
      const hasRefuse = receptionLignes.some(l => l.conformite === 'REFUSE')

      // Determine reception status
      const receptionStatut = hasRefuse ? 'REFUSE' : hasEcart ? 'AVEC_ECART' : 'CONFORME'

      const res = await fetch('/api/receptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandeId: receptionCommande.id,
          pharmacieId: pharmacie.id,
          dateReception: new Date().toISOString(),
          numeroBL: receptionNumeroBL || null,
          statut: receptionStatut,
          ecarts: hasEcart ? ecarts : null,
          lignes: lignesReception,
        }),
      })

      if (res.ok) {
        toast.success(hasRefuse ? 'Réception enregistrée avec articles refusés' : hasEcart ? 'Réception enregistrée avec écarts détectés' : 'Réception enregistrée')
        setReceptionDialogOpen(false)
        refreshCommandes()
      } else {
        toast.error('Erreur lors de la réception')
      }
    } catch {
      toast.error('Erreur lors de la réception')
    }
  }

  // Quick order from low stock suggestion
  const handleQuickOrder = (med: MedicamentSuggestion) => {
    setFormFournisseurId(med.fournisseurParDefaut || '')
    setFormLignes([{
      dci: med.dci,
      medicamentId: med.id,
      quantite: String(med.stockMin * 2),
      prixAchat: '',
      dateSouhaitee: '',
    }])
    setCreateDialogOpen(true)
  }

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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelle commande</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fournisseur</Label>
                  <Select value={formFournisseurId} onValueChange={setFormFournisseurId}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un fournisseur" /></SelectTrigger>
                    <SelectContent>
                      {fournisseurs.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Observations</Label>
                  <Input placeholder="Notes..." value={formNotes} onChange={e => setFormNotes(e.target.value)} />
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Lignes de commande</Label>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => addFormLigne()}>
                    <Plus className="w-3 h-3" /> Ajouter ligne
                  </Button>
                </div>
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {formLignes.map((ligne, i) => {
                      const selectedMed = ligne.medicamentId ? medicaments.find(m => m.id === ligne.medicamentId) : null
                      return (
                        <div key={i} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-4">
                            {i === 0 && <Label className="text-[10px]">Médicament / DCI</Label>}
                            <Select value={ligne.medicamentId} onValueChange={v => {
                              const med = medicaments.find(m => m.id === v)
                              if (med) {
                                setFormLignes(prev => prev.map((l, j) => j === i ? { ...l, medicamentId: v, dci: med.dci, prixAchat: med.stockMin > 0 ? '' : '' } : l))
                              }
                            }}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Choisir médicament" />
                              </SelectTrigger>
                              <SelectContent>
                                {medicaments.map(m => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {m.nomCommercial} {m.stockTotal <= m.stockMin ? '⚠' : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {!ligne.medicamentId && (
                              <Input
                                placeholder="Ou saisir DCI"
                                className="h-8 text-xs mt-1"
                                value={ligne.dci}
                                onChange={e => updateFormLigne(i, 'dci', e.target.value)}
                              />
                            )}
                          </div>
                          <div className="col-span-2">
                            {i === 0 && <Label className="text-[10px]">Quantité</Label>}
                            <Input
                              type="number"
                              className="h-8 text-xs"
                              value={ligne.quantite}
                              onChange={e => updateFormLigne(i, 'quantite', e.target.value)}
                            />
                          </div>
                          <div className="col-span-2">
                            {i === 0 && <Label className="text-[10px]">Prix achat</Label>}
                            <Input
                              type="number"
                              className="h-8 text-xs"
                              placeholder="FCFA"
                              value={ligne.prixAchat}
                              onChange={e => updateFormLigne(i, 'prixAchat', e.target.value)}
                            />
                          </div>
                          <div className="col-span-2">
                            {i === 0 && <Label className="text-[10px]">Date souhaitée</Label>}
                            <Input
                              type="date"
                              className="h-8 text-xs"
                              value={ligne.dateSouhaitee}
                              onChange={e => updateFormLigne(i, 'dateSouhaitee', e.target.value)}
                            />
                          </div>
                          {selectedMed && (
                            <div className="col-span-1 flex items-center">
                              <Badge variant="outline" className="text-[8px] whitespace-nowrap">
                                Stock: {selectedMed.stockTotal}
                              </Badge>
                            </div>
                          )}
                          <div className={selectedMed ? 'col-span-1' : 'col-span-2'}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFormLigne(i)}>
                              <XCircle className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                    {formLignes.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Aucune ligne ajoutée. Cliquez sur "Ajouter ligne"
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <Button className="w-full" onClick={handleCreateOrder}>Créer la commande</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="commandes">Commandes</TabsTrigger>
          <TabsTrigger value="suggestions">
            Suggestions ({medsLowStock.length})
          </TabsTrigger>
          <TabsTrigger value="sobaps">SoBAPS</TabsTrigger>
        </TabsList>

        <TabsContent value="commandes" className="space-y-4 mt-4">
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
                  <Card key={cmd.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedCommande(cmd)}>
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
                        <div className="flex items-center gap-2">
                          <div className="text-center">
                            <span className="text-xs text-muted-foreground block">Lignes</span>
                            <span className="font-semibold">{cmd.lignes.length}</span>
                          </div>
                          <div className="text-center">
                            <span className="text-xs text-muted-foreground block">Montant</span>
                            <span className="font-semibold">{cmd.montantTotal ? formatFCFA(cmd.montantTotal) : '—'}</span>
                          </div>
                          {/* Status transition button */}
                          {config.next && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs"
                              onClick={() => handleStatusChange(cmd.id, config.next!)}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              {statutConfig[config.next!]?.label}
                            </Button>
                          )}
                          {/* Reception button */}
                          {(cmd.statut === 'CONFIRMEE' || cmd.statut === 'EN_PREPARATION' || cmd.statut === 'LIVREE_PARTIELLEMENT') && (
                            <Button
                              size="sm"
                              variant="default"
                              className="gap-1 text-xs"
                              onClick={() => openReception(cmd)}
                            >
                              <PackageCheck className="w-3 h-3" />
                              Réceptionner
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Médicaments sous le stock minimum
              </CardTitle>
            </CardHeader>
            <CardContent>
              {medsLowStock.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">Tous les stocks sont suffisants</p>
              ) : (
                <div className="space-y-2">
                  {medsLowStock.map(med => (
                    <div key={med.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 text-destructive">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{med.nomCommercial}</p>
                          <p className="text-xs text-muted-foreground">{med.dci}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-destructive">{med.stockTotal}</p>
                          <p className="text-[10px] text-muted-foreground">min: {med.stockMin}</p>
                        </div>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => handleQuickOrder(med)}>
                          <Plus className="w-3 h-3" />
                          Commander
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sobaps" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Réceptions SoBAPS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                Les livraisons SoBAPS apparaîtront ici automatiquement
                <p className="text-xs mt-1">Connectez votre compte SoBAPS pour activer la réception automatique</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedCommande} onOpenChange={() => setSelectedCommande(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                            {l.dateSouhaitee && (
                              <span className="text-xs text-muted-foreground ml-2">
                                Souhaitée: {new Date(l.dateSouhaitee).toLocaleDateString('fr-FR')}
                              </span>
                            )}
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

                {/* Réceptions */}
                {selectedCommande.receptions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Réceptions</h4>
                    <div className="space-y-2">
                      {selectedCommande.receptions.map(r => (
                        <div key={r.id} className="p-2 rounded-lg bg-muted/30 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{new Date(r.dateReception).toLocaleDateString('fr-FR')}</span>
                            <div className="flex items-center gap-2">
                              {r.numeroBL && <span className="text-xs text-muted-foreground">BL: {r.numeroBL}</span>}
                              <Badge variant={r.statut === 'CONFORME' ? 'default' : 'secondary'} className="text-[9px]">
                                {r.statut}
                              </Badge>
                            </div>
                          </div>
                          {r.lignes && r.lignes.length > 0 && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {r.lignes.map((rl, i) => (
                                <div key={i} className="flex justify-between">
                                  <span>{rl.medicament?.nomCommercial} — Lot: {rl.numeroLot}</span>
                                  <span>{rl.quantiteRecue}/{rl.quantiteBL}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCommande.observations && (
                  <div>
                    <span className="text-sm text-muted-foreground">Observations</span>
                    <p className="text-sm">{selectedCommande.observations}</p>
                  </div>
                )}

                {/* Status transition buttons */}
                {statutConfig[selectedCommande.statut]?.next && (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gap-1"
                      onClick={() => {
                        handleStatusChange(selectedCommande.id, statutConfig[selectedCommande.statut].next!)
                        setSelectedCommande(null)
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Passer à {statutConfig[statutConfig[selectedCommande.statut].next!]?.label}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reception Dialog */}
      <Dialog open={receptionDialogOpen} onOpenChange={setReceptionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-primary" />
              Réception — {receptionCommande?.reference}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>N° Bon de Livraison</Label>
              <Input
                placeholder="BL-XXX"
                value={receptionNumeroBL}
                onChange={e => setReceptionNumeroBL(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label className="font-semibold">Lignes à réceptionner</Label>
              {receptionLignes.map((ligne, i) => {
                const hasDiscrepancy = ligne.quantiteBL !== parseInt(ligne.quantiteRecue)
                return (
                  <div key={i} className={`p-3 rounded-lg border ${hasDiscrepancy ? 'border-amber-400 bg-amber-400/5' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{ligne.nom}</span>
                        {ligne.conformite === 'REFUSE' && (
                          <Badge variant="destructive" className="text-[9px]">Refusé</Badge>
                        )}
                        {ligne.conformite === 'AVEC_ECART' && (
                          <Badge className="text-[9px] bg-amber-400 text-gray-900">Avec écart</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Attendu: {ligne.quantiteBL}</span>
                        {hasDiscrepancy && (
                          <Badge variant="destructive" className="text-[9px]">Écart Qté</Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div>
                        <Label className="text-[10px]">N° Lot</Label>
                        <Input
                          className="h-8 text-xs"
                          value={ligne.numeroLot}
                          onChange={e => {
                            const updated = [...receptionLignes]
                            updated[i] = { ...updated[i], numeroLot: e.target.value }
                            setReceptionLignes(updated)
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Date expiration</Label>
                        <Input
                          type="date"
                          className="h-8 text-xs"
                          value={ligne.dateExpiration}
                          onChange={e => {
                            const updated = [...receptionLignes]
                            updated[i] = { ...updated[i], dateExpiration: e.target.value }
                            setReceptionLignes(updated)
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Qté reçue</Label>
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={ligne.quantiteRecue}
                          onChange={e => {
                            const updated = [...receptionLignes]
                            updated[i] = { ...updated[i], quantiteRecue: e.target.value }
                            setReceptionLignes(updated)
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Prix achat</Label>
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={ligne.prixAchat}
                          onChange={e => {
                            const updated = [...receptionLignes]
                            updated[i] = { ...updated[i], prixAchat: e.target.value }
                            setReceptionLignes(updated)
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Conformité</Label>
                        <Select
                          value={ligne.conformite}
                          onValueChange={v => {
                            const updated = [...receptionLignes]
                            updated[i] = { ...updated[i], conformite: v }
                            setReceptionLignes(updated)
                          }}
                        >
                          <SelectTrigger className={`h-8 text-xs ${ligne.conformite === 'REFUSE' ? 'border-destructive' : ligne.conformite === 'AVEC_ECART' ? 'border-amber-400' : ''}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CONFORME">Conforme</SelectItem>
                            <SelectItem value="AVEC_ECART">Avec écart</SelectItem>
                            <SelectItem value="REFUSE">Refusé</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <Button className="w-full" onClick={handleReception}>
              Confirmer la réception
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
