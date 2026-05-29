'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Smartphone, Receipt } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'

interface Medicament {
  id: string
  dci: string
  nomCommercial: string
  forme: string
  dosage: string
  prixVente: number
  prixAchat: number | null
  lots: { id: string; numeroLot: string; quantite: number; dateExpiration: string; prixAchat: number }[]
}

interface CartItem {
  medicament: Medicament
  quantite: number
  lotId: string | null
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA'
}

export default function VentesPage() {
  const { pharmacie } = useAuth()
  const [medicaments, setMedicaments] = useState<Medicament[]>([])
  const [ventes, setVentes] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentMode, setPaymentMode] = useState('ESPECES')
  const [montantPaye, setMontantPaye] = useState('')
  const [activeTab, setActiveTab] = useState<'pos' | 'historique'>('pos')

  useEffect(() => {
    if (pharmacie?.id) {
      setLoading(true)
      Promise.all([
        fetch(`/api/medicaments?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : []),
        fetch(`/api/ventes?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : []),
      ]).then(([meds, vents]) => {
        setMedicaments(meds)
        setVentes(vents)
      }).catch(() => {}).finally(() => setLoading(false))
    }
  }, [pharmacie?.id])

  const filteredMeds = useMemo(() => {
    if (!search) return medicaments.slice(0, 20)
    const q = search.toLowerCase()
    return medicaments.filter(m =>
      m.nomCommercial.toLowerCase().includes(q) ||
      m.dci.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [medicaments, search])

  const addToCart = (med: Medicament) => {
    setCart(prev => {
      const existing = prev.find(c => c.medicament.id === med.id)
      if (existing) {
        return prev.map(c =>
          c.medicament.id === med.id
            ? { ...c, quantite: c.quantite + 1 }
            : c
        )
      }
      return [...prev, { medicament: med, quantite: 1, lotId: med.lots[0]?.id || null }]
    })
  }

  const updateQuantity = (medId: string, delta: number) => {
    setCart(prev => {
      const updated = prev.map(c => {
        if (c.medicament.id === medId) {
          const newQty = c.quantite + delta
          return { ...c, quantite: newQty }
        }
        return c
      })
      return updated.filter(c => c.quantite > 0)
    })
  }

  const removeFromCart = (medId: string) => {
    setCart(prev => prev.filter(c => c.medicament.id !== medId))
  }

  const totalCart = cart.reduce((sum, c) => sum + c.medicament.prixVente * c.quantite, 0)
  const monnaie = montantPaye ? parseFloat(montantPaye) - totalCart : 0

  const handleValidateSale = async () => {
    if (!pharmacie?.id || cart.length === 0) return

    try {
      const lignes = cart.map(c => ({
        medicamentId: c.medicament.id,
        lotId: c.lotId,
        quantite: c.quantite,
        prixUnitaire: c.medicament.prixVente,
        montant: c.medicament.prixVente * c.quantite,
      }))

      const res = await fetch('/api/ventes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          utilisateurId: 'demo-admin',
          typeVente: 'COMPTOIR',
          statut: 'VALIDEE',
          montantTotal: totalCart,
          montantPaye: parseFloat(montantPaye) || totalCart,
          monnaieRendue: Math.max(0, monnaie),
          lignes,
          paiements: [{
            modePaiement: paymentMode,
            montant: parseFloat(montantPaye) || totalCart,
          }],
        }),
      })

      if (res.ok) {
        setCart([])
        setPaymentDialogOpen(false)
        setMontantPaye('')
        // Refresh ventes
        const ventesRes = await fetch(`/api/ventes?pharmacieId=${pharmacie.id}`)
        if (ventesRes.ok) setVentes(await ventesRes.json())
      }
    } catch {
      // Handle error silently
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" />
            Point de Vente
          </h1>
          <p className="text-sm text-muted-foreground">
            Créez une vente et encaissez
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'pos' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('pos')}
          >
            Caisse
          </Button>
          <Button
            variant={activeTab === 'historique' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('historique')}
          >
            Historique
          </Button>
        </div>
      </div>

      {activeTab === 'pos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Product Search / List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, DCI ou code-barres..."
                className="pl-9 h-11"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredMeds.map(med => {
                  const totalStock = med.lots.reduce((s, l) => s + l.quantite, 0)
                  const inCart = cart.find(c => c.medicament.id === med.id)

                  return (
                    <Card
                      key={med.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${inCart ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => addToCart(med)}
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm truncate block">{med.nomCommercial}</span>
                            <span className="text-xs text-muted-foreground">{med.dci} — {med.dosage}</span>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className="font-bold text-sm text-primary">{formatFCFA(med.prixVente)}</span>
                            <span className={`text-xs block ${totalStock <= 5 ? 'text-destructive' : 'text-muted-foreground'}`}>
                              Stock: {totalStock}
                            </span>
                          </div>
                        </div>
                        {inCart && (
                          <Badge className="mt-1 text-[9px] bg-primary text-primary-foreground">
                            ×{inCart.quantite} dans le panier
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Cart */}
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Panier ({cart.length} article{cart.length > 1 ? 's' : ''})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 max-h-96">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Panier vide
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {cart.map(item => (
                      <div key={item.medicament.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">{item.medicament.nomCommercial}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatFCFA(item.medicament.prixVente)} × {item.quantite}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.medicament.id, -1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-sm font-semibold w-6 text-center">{item.quantite}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.medicament.id, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.medicament.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <span className="text-sm font-bold w-24 text-right">
                          {formatFCFA(item.medicament.prixVente * item.quantite)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <Separator className="my-3" />

              {/* Total */}
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold text-primary">{formatFCFA(totalCart)}</span>
              </div>

              <Button
                className="w-full gap-2"
                disabled={cart.length === 0}
                onClick={() => setPaymentDialogOpen(true)}
              >
                <CreditCard className="w-4 h-4" />
                Encaisser
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Historique des ventes */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Articles</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground">Montant</th>
                    <th className="text-center p-3 text-xs font-medium text-muted-foreground">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {(ventes as { id: string; createdAt: string; typeVente: string; montantTotal: number; statut: string; lignes: unknown[] }[]).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                        Aucune vente enregistrée
                      </td>
                    </tr>
                  ) : (
                    (ventes as { id: string; createdAt: string; typeVente: string; montantTotal: number; statut: string; lignes: unknown[] }[]).slice(0, 20).map(v => (
                      <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3 text-sm">
                          {new Date(v.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3 text-sm">{v.typeVente}</td>
                        <td className="p-3 text-sm">{v.lignes?.length || 0} article(s)</td>
                        <td className="p-3 text-sm text-right font-semibold">{formatFCFA(v.montantTotal)}</td>
                        <td className="p-3 text-center">
                          <Badge
                            variant={v.statut === 'VALIDEE' ? 'default' : 'outline'}
                            className="text-[10px]"
                          >
                            {v.statut}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Paiement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">Total à payer</span>
              <span className="text-2xl font-bold text-primary block">{formatFCFA(totalCart)}</span>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Mode de paiement</label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ESPECES">
                    <span className="flex items-center gap-2"><Banknote className="w-4 h-4" /> Espèces</span>
                  </SelectItem>
                  <SelectItem value="WAVE">
                    <span className="flex items-center gap-2"><Smartphone className="w-4 h-4" /> Wave</span>
                  </SelectItem>
                  <SelectItem value="MTN_MONEY">
                    <span className="flex items-center gap-2"><Smartphone className="w-4 h-4" /> MTN Money</span>
                  </SelectItem>
                  <SelectItem value="MOOV_MONEY">
                    <span className="flex items-center gap-2"><Smartphone className="w-4 h-4" /> Moov Money</span>
                  </SelectItem>
                  <SelectItem value="CARTE">
                    <span className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Carte bancaire</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMode === 'ESPECES' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Montant reçu</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={montantPaye}
                  onChange={e => setMontantPaye(e.target.value)}
                />
                {monnaie > 0 && (
                  <p className="text-sm text-primary mt-1">
                    Monnaie à rendre : {formatFCFA(monnaie)}
                  </p>
                )}
              </div>
            )}

            <Button className="w-full" onClick={handleValidateSale} disabled={cart.length === 0}>
              Valider la vente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
