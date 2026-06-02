'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote,
  Smartphone, Receipt, Lock, Unlock, AlertTriangle, FileText, User,
  Percent, Printer
} from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'

interface Medicament {
  id: string
  dci: string
  nomCommercial: string
  forme: string
  dosage: string
  prixVente: number
  prixAchat: number | null
  tva: number
  estStupefiant: boolean
  lots: { id: string; numeroLot: string; quantite: number; dateExpiration: string; prixAchat: number }[]
}

interface CartItem {
  medicament: Medicament
  quantite: number
  lotId: string | null
  remise: number
}

interface Patient {
  id: string
  nom: string
  prenom: string
  telephone: string | null
}

interface Ordonnance {
  id: string
  prescripteurNom: string
  dateOrdonnance: string
  statut: string
}

interface SessionCaisse {
  id: string
  dateOuverture: string
  dateFermeture: string | null
  fondDeCaisse: number
  totalEntrees: number
  totalSorties: number
  ecart: number | null
  caisse: { id: string; nom: string; numero: number }
  utilisateur: { id: string; nom: string; prenom: string }
}

interface MultiPayment {
  id: string
  modePaiement: string
  montant: number
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
  const [montantPaye, setMontantPaye] = useState('')
  const [activeTab, setActiveTab] = useState<'pos' | 'historique'>('pos')

  // Session caisse
  const [sessionCaisse, setSessionCaisse] = useState<SessionCaisse | null>(null)
  const [openSessionDialog, setOpenSessionDialog] = useState(false)
  const [closeSessionDialog, setCloseSessionDialog] = useState(false)
  const [fondDeCaisse, setFondDeCaisse] = useState('0')
  const [zReport, setZReport] = useState<Record<string, unknown> | null>(null)

  // Patient & Ordonnance
  const [patients, setPatients] = useState<Patient[]>([])
  const [ordonnances, setOrdonnances] = useState<Ordonnance[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [selectedOrdonnanceId, setSelectedOrdonnanceId] = useState<string>('')

  // Remise globale
  const [remiseGlobale, setRemiseGlobale] = useState(0)

  // Multi-paiement
  const [multiPaiements, setMultiPaiements] = useState<MultiPayment[]>([
    { id: '1', modePaiement: 'ESPECES', montant: 0 }
  ])

  // Receipt
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false)
  const [lastVente, setLastVente] = useState<Record<string, unknown> | null>(null)
  const [receiptCart, setReceiptCart] = useState<CartItem[]>([])
  const [receiptRemise, setReceiptRemise] = useState(0)
  const [receiptTVA, setReceiptTVA] = useState(0)
  const [receiptTotal, setReceiptTotal] = useState(0)
  const [receiptPatient, setReceiptPatient] = useState<string>('')
  const [receiptPaiements, setReceiptPaiements] = useState<MultiPayment[]>([])

  // Stupéfiant warning
  const [stupWarningOpen, setStupWarningOpen] = useState(false)

  useEffect(() => {
    const pid = pharmacie?.id
    if (!pid) return
    Promise.all([
      fetch(`/api/medicaments?pharmacieId=${pid}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/ventes?pharmacieId=${pid}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/patients?pharmacieId=${pid}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/ordonnances?pharmacieId=${pid}&statut=VALIDEE`).then(r => r.ok ? r.json() : []),
      fetch(`/api/sessions-caisse?pharmacieId=${pid}&statut=ouverte`).then(r => r.ok ? r.json() : []),
    ]).then(([meds, vents, pats, ordos, sessions]) => {
      setMedicaments(meds)
      setVentes(vents)
      setPatients(pats)
      setOrdonnances(ordos)
      setSessionCaisse(sessions.length > 0 ? sessions[0] : null)
      setLoading(false)
    }).catch(() => { setLoading(false) })
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
      return [...prev, { medicament: med, quantite: 1, lotId: med.lots[0]?.id || null, remise: 0 }]
    })
  }

  const updateQuantity = (medId: string, delta: number) => {
    setCart(prev => {
      const updated = prev.map(c => {
        if (c.medicament.id === medId) {
          return { ...c, quantite: c.quantite + delta }
        }
        return c
      })
      return updated.filter(c => c.quantite > 0)
    })
  }

  const updateRemise = (medId: string, remise: number) => {
    setCart(prev => prev.map(c =>
      c.medicament.id === medId ? { ...c, remise: Math.min(remise, 100) } : c
    ))
  }

  const removeFromCart = (medId: string) => {
    setCart(prev => prev.filter(c => c.medicament.id !== medId))
  }

  // Calculs
  const sousTotal = cart.reduce((sum, c) => {
    const lineTotal = c.medicament.prixVente * c.quantite
    const lineRemise = lineTotal * (c.remise / 100)
    return sum + lineTotal - lineRemise
  }, 0)
  const remiseGlobaleMontant = sousTotal * (remiseGlobale / 100)
  const totalApresRemise = sousTotal - remiseGlobaleMontant

  // TVA
  const totalTVA = cart.reduce((sum, c) => {
    const lineTotal = c.medicament.prixVente * c.quantite
    const lineRemise = lineTotal * (c.remise / 100)
    const netLine = lineTotal - lineRemise
    return sum + (netLine * c.medicament.tva / 100)
  }, 0)

  const totalCart = totalApresRemise

  // Stupéfiant check
  const hasStupfiant = cart.some(c => c.medicament.estStupefiant)
  const stupfiantRequiresOrdo = hasStupfiant && !selectedOrdonnanceId

  // Multi-paiement
  const totalPaiements = multiPaiements.reduce((s, p) => s + p.montant, 0)
  const paiementRestant = totalCart - totalPaiements
  const monnaie = paiementRestant < 0 ? Math.abs(paiementRestant) : 0

  const addPaiement = () => {
    setMultiPaiements(prev => [...prev, { id: Date.now().toString(), modePaiement: 'ESPECES', montant: 0 }])
  }

  const removePaiement = (id: string) => {
    setMultiPaiements(prev => prev.filter(p => p.id !== id))
  }

  const updatePaiement = (id: string, field: 'modePaiement' | 'montant', value: string | number) => {
    setMultiPaiements(prev => prev.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ))
  }

  // Ouvrir session caisse
  const handleOpenSession = async () => {
    if (!pharmacie?.id) return
    try {
      // Trouver une caisse disponible pour cette pharmacie
      const caissesRes = await fetch(`/api/caisses?pharmacieId=${pharmacie.id}`)
      let caisseId = 'demo-caisse'
      if (caissesRes.ok) {
        const caissesData = await caissesRes.json()
        if (caissesData.length > 0) {
          // Prendre la première caisse sans session ouverte
          const availableCaisse = caissesData.find(
            (c: { id: string; sessionsCaisse: { id: string }[] }) => !c.sessionsCaisse || c.sessionsCaisse.length === 0
          )
          caisseId = availableCaisse?.id || caissesData[0]?.id || 'demo-caisse'
        } else {
          // Créer une caisse par défaut
          const createRes = await fetch('/api/caisses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pharmacieId: pharmacie.id,
              nom: 'Caisse Principale',
              numero: 1,
            }),
          })
          if (createRes.ok) {
            const newCaisse = await createRes.json()
            caisseId = newCaisse.id
          }
        }
      }

      const res = await fetch('/api/sessions-caisse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          utilisateurId: 'demo-admin',
          caisseId,
          fondDeCaisse: parseFloat(fondDeCaisse) || 0,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setSessionCaisse(data)
        setOpenSessionDialog(false)
        toast.success('Session de caisse ouverte')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur ouverture session')
      }
    } catch {
      toast.error('Erreur ouverture session')
    }
  }

  // Fermer session caisse
  const handleCloseSession = async () => {
    if (!sessionCaisse) return
    try {
      const res = await fetch(`/api/sessions-caisse/${sessionCaisse.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ecart: 0 }),
      })
      if (res.ok) {
        const data = await res.json()
        setZReport(data.zReport)
        setSessionCaisse(null)
        setCloseSessionDialog(false)
        toast.success('Session fermée — Z-report généré')
      }
    } catch {
      toast.error('Erreur fermeture session')
    }
  }

  // Valider vente
  const handleValidateSale = async () => {
    if (!pharmacie?.id || cart.length === 0) return

    if (stupfiantRequiresOrdo) {
      setStupWarningOpen(true)
      return
    }

    try {
      const lignes = cart.map(c => ({
        medicamentId: c.medicament.id,
        lotId: c.lotId,
        quantite: c.quantite,
        prixUnitaire: c.medicament.prixVente,
        montant: c.medicament.prixVente * c.quantite * (1 - c.remise / 100),
        remise: c.remise,
      }))

      const paiementsToSend = multiPaiements
        .filter(p => p.montant > 0)
        .map(p => ({
          modePaiement: p.modePaiement,
          montant: p.montant,
        }))

      if (paiementsToSend.length === 0) {
        paiementsToSend.push({
          modePaiement: 'ESPECES',
          montant: totalCart,
        })
      }

      const res = await fetch('/api/ventes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          utilisateurId: 'demo-admin',
          sessionId: sessionCaisse?.id || null,
          patientId: selectedPatientId || null,
          ordonnanceId: selectedOrdonnanceId || null,
          typeVente: selectedOrdonnanceId ? 'ORDONNANCE' : 'COMPTOIR',
          statut: 'VALIDEE',
          montantTotal: totalCart,
          montantRemise: remiseGlobaleMontant,
          montantPaye: Math.min(totalPaiements, totalCart),
          monnaieRendue: Math.max(0, monnaie),
          lignes,
          paiements: paiementsToSend,
        }),
      })

      if (res.ok) {
        const venteData = await res.json()
        setLastVente(venteData)
        // Sauvegarder les données du reçu avant de vider le panier
        setReceiptCart([...cart])
        setReceiptRemise(remiseGlobaleMontant)
        setReceiptTVA(totalTVA)
        setReceiptTotal(totalCart)
        const selPatient = patients.find(p => p.id === selectedPatientId)
        setReceiptPatient(selPatient ? `${selPatient.prenom} ${selPatient.nom}` : '')
        setReceiptPaiements([...multiPaiements.filter(p => p.montant > 0)])
        setCart([])
        setPaymentDialogOpen(false)
        setMontantPaye('')
        setRemiseGlobale(0)
        setSelectedPatientId('')
        setSelectedOrdonnanceId('')
        setMultiPaiements([{ id: '1', modePaiement: 'ESPECES', montant: 0 }])
        // Afficher le reçu
        setReceiptDialogOpen(true)
        // Refresh ventes
        const ventesRes = await fetch(`/api/ventes?pharmacieId=${pharmacie.id}`)
        if (ventesRes.ok) setVentes(await ventesRes.json())
        // Refresh session
        const sessRes = await fetch(`/api/sessions-caisse?pharmacieId=${pharmacie.id}&statut=ouverte`)
        if (sessRes.ok) {
          const sessions = await sessRes.json()
          setSessionCaisse(sessions.length > 0 ? sessions[0] : null)
        }
      }
    } catch {
      toast.error('Erreur lors de la validation')
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
          {/* Session caisse */}
          {sessionCaisse ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground flex items-center gap-1">
                <Unlock className="w-3 h-3" />
                Caisse ouverte
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setCloseSessionDialog(true)}>
                <Lock className="w-3 h-3 mr-1" /> Fermer session
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setOpenSessionDialog(true)}>
              <Unlock className="w-3 h-3 mr-1" /> Ouvrir session
            </Button>
          )}
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

      {/* Session info bar */}
      {sessionCaisse && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">Caisse: <strong>{sessionCaisse.caisse?.nom || 'Principale'}</strong></span>
              <span className="text-muted-foreground">Ouverte: <strong>{new Date(sessionCaisse.dateOuverture).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong></span>
              <span className="text-muted-foreground">Fond: <strong>{formatFCFA(sessionCaisse.fondDeCaisse)}</strong></span>
              <span className="text-muted-foreground">Entrées: <strong className="text-primary">{formatFCFA(sessionCaisse.totalEntrees)}</strong></span>
            </div>
            <span className="text-muted-foreground">
              Opérateur: <strong>{sessionCaisse.utilisateur?.prenom} {sessionCaisse.utilisateur?.nom}</strong>
            </span>
          </CardContent>
        </Card>
      )}

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

            <ScrollArea className="h-[calc(100vh-360px)]">
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
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-sm truncate">{med.nomCommercial}</span>
                              {med.estStupefiant && (
                                <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{med.dci} — {med.dosage}</span>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className="font-bold text-sm text-primary">{formatFCFA(med.prixVente)}</span>
                            <span className={`text-xs block ${totalStock <= 5 ? 'text-destructive' : 'text-muted-foreground'}`}>
                              Stock: {totalStock}
                            </span>
                            {med.tva > 0 && (
                              <span className="text-[10px] text-muted-foreground">TVA {med.tva}%</span>
                            )}
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
              <ScrollArea className="flex-1 max-h-64">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Panier vide
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {cart.map(item => (
                      <div key={item.medicament.id} className={`p-2 rounded-lg ${item.medicament.estStupefiant ? 'bg-destructive/5 border border-destructive/20' : 'bg-muted/30'}`}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium truncate">{item.medicament.nomCommercial}</span>
                              {item.medicament.estStupefiant && <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatFCFA(item.medicament.prixVente)} × {item.quantite}
                              {item.medicament.tva > 0 && <span className="ml-1">+TVA {item.medicament.tva}%</span>}
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
                        </div>
                        {/* Remise par ligne */}
                        <div className="flex items-center gap-1 mt-1">
                          <Percent className="w-3 h-3 text-muted-foreground" />
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            className="h-6 w-14 text-xs"
                            value={item.remise || ''}
                            placeholder="0"
                            onChange={e => updateRemise(item.medicament.id, parseFloat(e.target.value) || 0)}
                          />
                          <span className="text-[10px] text-muted-foreground">% remise</span>
                          <span className="text-xs font-semibold ml-auto">
                            {formatFCFA(item.medicament.prixVente * item.quantite * (1 - item.remise / 100))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <Separator className="my-3" />

              {/* Patient & Ordonnance */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 text-muted-foreground shrink-0" />
                  <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Patient (optionnel)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun patient</SelectItem>
                      {patients.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.prenom} {p.nom}{p.telephone ? ` — ${p.telephone}` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                  <Select value={selectedOrdonnanceId} onValueChange={setSelectedOrdonnanceId}>
                    <SelectTrigger className={`h-8 text-xs ${stupfiantRequiresOrdo ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder={stupfiantRequiresOrdo ? '⚠ Ordonnance requise (stupéfiant)' : 'Ordonnance (optionnel)'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune ordonnance</SelectItem>
                      {ordonnances.map(o => (
                        <SelectItem key={o.id} value={o.id}>Dr. {o.prescripteurNom} — {new Date(o.dateOrdonnance).toLocaleDateString('fr-FR')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Remise globale */}
              <div className="flex items-center gap-2 mb-3">
                <Percent className="w-3 h-3 text-muted-foreground" />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="h-8 w-16 text-xs"
                  value={remiseGlobale || ''}
                  placeholder="0"
                  onChange={e => setRemiseGlobale(parseFloat(e.target.value) || 0)}
                />
                <span className="text-xs text-muted-foreground">% remise globale</span>
                {remiseGlobaleMontant > 0 && (
                  <span className="text-xs text-destructive ml-auto">-{formatFCFA(remiseGlobaleMontant)}</span>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-1 mb-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Sous-total</span>
                  <span>{formatFCFA(sousTotal)}</span>
                </div>
                {remiseGlobaleMontant > 0 && (
                  <div className="flex items-center justify-between text-xs text-destructive">
                    <span>Remise globale ({remiseGlobale}%)</span>
                    <span>-{formatFCFA(remiseGlobaleMontant)}</span>
                  </div>
                )}
                {totalTVA > 0 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Dont TVA</span>
                    <span>{formatFCFA(totalTVA)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">{formatFCFA(totalCart)}</span>
                </div>
              </div>

              <Button
                className="w-full gap-2"
                disabled={cart.length === 0 || stupfiantRequiresOrdo}
                onClick={() => {
                  if (stupfiantRequiresOrdo) {
                    setStupWarningOpen(true)
                  } else {
                    setPaymentDialogOpen(true)
                    setMultiPaiements([{ id: '1', modePaiement: 'ESPECES', montant: totalCart }])
                  }
                }}
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
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground">Remise</th>
                    <th className="text-center p-3 text-xs font-medium text-muted-foreground">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {(ventes as { id: string; createdAt: string; typeVente: string; montantTotal: number; montantRemise: number; statut: string; lignes: unknown[] }[]).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                        Aucune vente enregistrée
                      </td>
                    </tr>
                  ) : (
                    (ventes as { id: string; createdAt: string; typeVente: string; montantTotal: number; montantRemise: number; statut: string; lignes: unknown[] }[]).slice(0, 20).map(v => (
                      <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3 text-sm">
                          {new Date(v.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3 text-sm">{v.typeVente}</td>
                        <td className="p-3 text-sm">{v.lignes?.length || 0} article(s)</td>
                        <td className="p-3 text-sm text-right font-semibold">{formatFCFA(v.montantTotal)}</td>
                        <td className="p-3 text-sm text-right">{v.montantRemise > 0 ? `-${formatFCFA(v.montantRemise)}` : '—'}</td>
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

      {/* Stupéfiant Warning Dialog */}
      <Dialog open={stupWarningOpen} onOpenChange={setStupWarningOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Stupéfiant détecté
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              Votre panier contient un médicament classé comme stupéfiant. La réglementation exige qu&apos;une ordonnance soit obligatoirement attachée à cette vente.
            </p>
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm font-medium text-destructive">Médicaments stupéfiants dans le panier :</p>
              <ul className="text-sm mt-1">
                {cart.filter(c => c.medicament.estStupefiant).map(c => (
                  <li key={c.medicament.id}>• {c.medicament.nomCommercial} ({c.medicament.dci})</li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              Veuillez sélectionner une ordonnance dans le panier pour continuer.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setStupWarningOpen(false)}>
              Compris
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog — Multi-paiement */}
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

            {/* Multi-paiement */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Modes de paiement</Label>
                <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={addPaiement}>
                  <Plus className="w-3 h-3" /> Ajouter
                </Button>
              </div>
              {multiPaiements.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2">
                  <Select value={p.modePaiement} onValueChange={v => updatePaiement(p.id, 'modePaiement', v)}>
                    <SelectTrigger className="h-9 text-xs flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ESPECES"><span className="flex items-center gap-1"><Banknote className="w-3 h-3" /> Espèces</span></SelectItem>
                      <SelectItem value="WAVE"><span className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> Wave</span></SelectItem>
                      <SelectItem value="MTN_MONEY"><span className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> MTN Money</span></SelectItem>
                      <SelectItem value="MOOV_MONEY"><span className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> Moov Money</span></SelectItem>
                      <SelectItem value="CARTE"><span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Carte</span></SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    className="h-9 w-28 text-xs"
                    placeholder="Montant"
                    value={p.montant || ''}
                    onChange={e => updatePaiement(p.id, 'montant', parseFloat(e.target.value) || 0)}
                  />
                  {multiPaiements.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removePaiement(p.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Résumé paiement */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total paiements</span>
                <span className="font-semibold">{formatFCFA(totalPaiements)}</span>
              </div>
              {paiementRestant > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Reste à payer</span>
                  <span className="font-semibold">{formatFCFA(paiementRestant)}</span>
                </div>
              )}
              {monnaie > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Monnaie à rendre</span>
                  <span className="font-semibold">{formatFCFA(monnaie)}</span>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              onClick={handleValidateSale}
              disabled={cart.length === 0 || totalPaiements < totalCart}
            >
              Valider la vente
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-primary" />
              Reçu de vente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm" id="receipt">
            <div className="text-center border-b pb-3">
              <p className="font-bold text-base">{pharmacie?.nom || 'Pharmacie'}</p>
              <p className="text-xs text-muted-foreground">{pharmacie?.adresse}</p>
              <p className="text-xs text-muted-foreground">{pharmacie?.telephone}</p>
            </div>
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>N° {lastVente?.id ? String(lastVente.id).substring(0, 8) : ''}</span>
              <span>{new Date().toLocaleDateString('fr-FR')} {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {receiptPatient && (
              <div className="text-xs text-muted-foreground">
                <User className="w-3 h-3 inline mr-1" />Client: {receiptPatient}
              </div>
            )}
            <Separator />
            <div className="space-y-1">
              {receiptCart.map((item, i) => (
                <div key={i} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{item.medicament.nomCommercial} ×{item.quantite}</span>
                    <span>{formatFCFA(item.medicament.prixVente * item.quantite)}</span>
                  </div>
                  {item.remise > 0 && (
                    <div className="flex justify-between text-[10px] text-destructive">
                      <span>  Remise {item.remise}%</span>
                      <span>-{formatFCFA(item.medicament.prixVente * item.quantite * item.remise / 100)}</span>
                    </div>
                  )}
                  {item.medicament.tva > 0 && (
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>  TVA {item.medicament.tva}%</span>
                      <span>{formatFCFA(item.medicament.prixVente * item.quantite * (1 - item.remise / 100) * item.medicament.tva / 100)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-1">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatFCFA(receiptTotal || Number(lastVente?.montantTotal || 0))}</span>
              </div>
              {receiptRemise > 0 && (
                <div className="flex justify-between text-destructive text-xs">
                  <span>Remise</span>
                  <span>-{formatFCFA(receiptRemise)}</span>
                </div>
              )}
              {receiptTVA > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Dont TVA</span>
                  <span>{formatFCFA(receiptTVA)}</span>
                </div>
              )}
            </div>
            {/* Paiements */}
            {receiptPaiements.length > 0 && (
              <div className="border-t pt-2 space-y-1">
                <p className="text-xs font-semibold">Paiement</p>
                {receiptPaiements.map((p, i) => (
                  <div key={i} className="flex justify-between text-xs text-muted-foreground">
                    <span>{p.modePaiement === 'ESPECES' ? 'Espèces' : p.modePaiement === 'WAVE' ? 'Wave' : p.modePaiement === 'MTN_MONEY' ? 'MTN Money' : p.modePaiement === 'MOOV_MONEY' ? 'Moov Money' : p.modePaiement === 'CARTE' ? 'Carte' : p.modePaiement}</span>
                    <span>{formatFCFA(p.montant)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="text-center text-xs text-muted-foreground pt-2 border-t">
              <p>Merci pour votre achat !</p>
              <p>MédiHelm — Pharmacie intelligente</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-1" onClick={() => setReceiptDialogOpen(false)}>
              Fermer
            </Button>
            <Button className="flex-1 gap-1" onClick={() => toast.success('Reçu imprimé')}>
              <Printer className="w-4 h-4" /> Imprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Open Session Dialog */}
      <Dialog open={openSessionDialog} onOpenChange={setOpenSessionDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="w-5 h-5 text-primary" />
              Ouvrir une session de caisse
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fond de caisse</Label>
              <Input
                type="number"
                value={fondDeCaisse}
                onChange={e => setFondDeCaisse(e.target.value)}
                placeholder="0"
              />
            </div>
            <Button className="w-full" onClick={handleOpenSession}>
              Ouvrir la session
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Session / Z-Report Dialog */}
      <Dialog open={closeSessionDialog} onOpenChange={setCloseSessionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Fermer la session — Z-Report
            </DialogTitle>
          </DialogHeader>
          {zReport ? (
            <div className="space-y-3 text-sm">
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex justify-between"><span>Fond de caisse</span><span className="font-semibold">{formatFCFA(Number(zReport.fondDeCaisse))}</span></div>
                <div className="flex justify-between"><span>Total entrées</span><span className="font-semibold text-primary">{formatFCFA(Number(zReport.totalEntrees))}</span></div>
                <div className="flex justify-between"><span>Total sorties</span><span className="font-semibold">{formatFCFA(Number(zReport.totalSorties))}</span></div>
                <div className="flex justify-between"><span>Théorique</span><span className="font-semibold">{formatFCFA(Number(zReport.theorique))}</span></div>
                <Separator />
                <div className="flex justify-between"><span>Écart</span><span className={`font-bold ${Number(zReport.ecart) !== 0 ? 'text-destructive' : 'text-primary'}`}>{formatFCFA(Number(zReport.ecart))}</span></div>
              </div>
              <Button className="w-full" onClick={() => { setZReport(null); setCloseSessionDialog(false) }}>Fermer</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sessionCaisse && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Fond de caisse</span><span className="font-semibold">{formatFCFA(sessionCaisse.fondDeCaisse)}</span></div>
                  <div className="flex justify-between"><span>Entrées</span><span className="font-semibold text-primary">{formatFCFA(sessionCaisse.totalEntrees)}</span></div>
                  <div className="flex justify-between"><span>Sorties</span><span className="font-semibold">{formatFCFA(sessionCaisse.totalSorties)}</span></div>
                </div>
              )}
              <p className="text-sm text-muted-foreground">Confirmez la fermeture de la session. Le Z-report sera généré automatiquement.</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setCloseSessionDialog(false)}>Annuler</Button>
                <Button className="flex-1" onClick={handleCloseSession}>Fermer la session</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
