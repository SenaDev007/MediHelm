'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/app/pro/auth-context'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Badge,
} from '@/components/ui/badge'
import {
  Button,
} from '@/components/ui/button'
import {
  Input,
} from '@/components/ui/input'
import {
  Label,
} from '@/components/ui/label'
import {
  Separator,
} from '@/components/ui/separator'
import {
  ScrollArea,
} from '@/components/ui/scroll-area'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Calculator, ShoppingCart, DollarSign, CreditCard, Search, Plus, Trash2,
  Minus, X, Package, User, Lock, Unlock, Clock, TrendingUp,
  AlertCircle, CheckCircle2, Banknote, Wallet, Smartphone, ChevronDown,
  ChevronUp, Receipt, CircleDot,
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================================
// Types
// ============================================================

type StatutCaisse = 'OUVERTE' | 'FERMEE' | 'EN_CLOTURE'
type ModePaiement = 'ESPECES' | 'WAVE' | 'MTN_MONEY' | 'MOOV_MONEY' | 'CARTE_BANCAIRE' | 'CHEQUE' | 'CREDIT' | 'ASSURANCE'

interface Caisse {
  id: string
  pharmacieId: string
  nom: string
  actif: boolean
  sessions?: SessionCaisse[]
}

interface SessionCaisse {
  id: string
  pharmacieId: string
  caisseId: string
  utilisateurId: string
  statut: StatutCaisse
  soldeOuverture: number
  soldeCloture: number | null
  ecart: number | null
  ouvertLe: string
  fermeLe: string | null
  caisse?: { id: string; nom: string }
  utilisateur?: { id: string; nom: string; prenom: string }
  ventes?: VenteSimple[]
}

interface VenteSimple {
  id: string
  reference: string
  montantTotal: number
  montantPaye: number
  statut: string
  modePaiement: ModePaiement
  createdAt: string
  patient?: { id: string; nom: string; prenom: string } | null
}

interface Medicament {
  id: string
  nomCommercial: string
  dci: string
  forme: string
  dosage: string
  prixPublic: number
  surOrdonnance: boolean
  codeBarres?: string | null
  lots?: Array<{ id: string; quantite: number; dateExpiration: string }>
}

interface Patient {
  id: string
  nom: string
  prenom: string
  telephone: string
  email?: string | null
  numeroAssurance?: string | null
  assurance?: string | null
}

interface CartItem {
  medicamentId: string
  nomCommercial: string
  dci: string
  prixUnitaire: number
  quantite: number
  remise: number
}

interface SplitPaiement {
  id: string
  mode: ModePaiement
  montant: number
  reference: string
}

// ============================================================
// Helpers
// ============================================================

const formatFCFA = (amount: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA'

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const MODE_PAIEMENT_LABELS: Record<ModePaiement, string> = {
  ESPECES: 'Espèces',
  WAVE: 'Wave',
  MTN_MONEY: 'MTN Money',
  MOOV_MONEY: 'Moov Money',
  CARTE_BANCAIRE: 'Carte bancaire',
  CHEQUE: 'Chèque',
  CREDIT: 'Crédit',
  ASSURANCE: 'Assurance',
}

const MODE_PAIEMENT_ICONS: Record<ModePaiement, React.ReactNode> = {
  ESPECES: <Banknote className="h-4 w-4" />,
  WAVE: <Smartphone className="h-4 w-4" />,
  MTN_MONEY: <Smartphone className="h-4 w-4" />,
  MOOV_MONEY: <Smartphone className="h-4 w-4" />,
  CARTE_BANCAIRE: <CreditCard className="h-4 w-4" />,
  CHEQUE: <Wallet className="h-4 w-4" />,
  CREDIT: <Clock className="h-4 w-4" />,
  ASSURANCE: <Shield className="h-4 w-4" />,
}

const MODE_PAIEMENT_COLORS: Record<ModePaiement, string> = {
  ESPECES: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
  WAVE: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  MTN_MONEY: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
  MOOV_MONEY: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
  CARTE_BANCAIRE: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  CHEQUE: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
  CREDIT: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
  ASSURANCE: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',
}

// Shield icon for Assurance
function Shield({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  )
}

// ============================================================
// Main Page Component
// ============================================================

export default function CaissePage() {
  const { pharmacie, user } = useAuth()
  const pharmacieId = pharmacie?.id || ''
  const utilisateurId = user?.id || ''

  // Session state
  const [activeSession, setActiveSession] = useState<SessionCaisse | null>(null)
  const [caisses, setCaisses] = useState<Caisse[]>([])
  const [sessionLoading, setSessionLoading] = useState(true)

  // Open register dialog
  const [openDialogOpen, setOpenDialogOpen] = useState(false)
  const [selectedCaisseId, setSelectedCaisseId] = useState('')
  const [soldeOuverture, setSoldeOuverture] = useState('')
  const [openingSession, setOpeningSession] = useState(false)

  // Close register dialog
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [soldeCloture, setSoldeCloture] = useState('')
  const [closingSession, setClosingSession] = useState(false)

  // POS state
  const [cart, setCart] = useState<CartItem[]>([])
  const [medSearch, setMedSearch] = useState('')
  const [medicaments, setMedicaments] = useState<Medicament[]>([])
  const [medSearchLoading, setMedSearchLoading] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientSearch, setPatientSearch] = useState('')
  const [showNewPatient, setShowNewPatient] = useState(false)
  const [newPatient, setNewPatient] = useState({ nom: '', prenom: '', telephone: '' })
  const [posGlobalRemise, setPosGlobalRemise] = useState(0)

  // Payment state
  const [splitPaiements, setSplitPaiements] = useState<SplitPaiement[]>([
    { id: '1', mode: 'ESPECES', montant: 0, reference: '' },
  ])
  const [showSplitPayment, setShowSplitPayment] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Recent transactions
  const [recentVentes, setRecentVentes] = useState<VenteSimple[]>([])

  // ============================================================
  // Fetch active session & caisses
  // ============================================================

  const fetchSessionData = useCallback(async () => {
    if (!pharmacieId) return
    setSessionLoading(true)
    try {
      const [sessionRes, caissesRes] = await Promise.all([
        fetch(`/api/sessions-caisse?pharmacieId=${pharmacieId}&statut=OUVERTE`),
        fetch(`/api/caisses?pharmacieId=${pharmacieId}`),
      ])

      if (sessionRes.ok) {
        const sessions: SessionCaisse[] = await sessionRes.json()
        if (sessions.length > 0) {
          setActiveSession(sessions[0])
          setRecentVentes(sessions[0].ventes || [])
        } else {
          setActiveSession(null)
          setRecentVentes([])
        }
      }

      if (caissesRes.ok) {
        setCaisses(await caissesRes.json())
      }
    } catch {
      toast.error('Erreur lors du chargement de la caisse')
    } finally {
      setSessionLoading(false)
    }
  }, [pharmacieId])

  useEffect(() => {
    fetchSessionData()
  }, [fetchSessionData])

  // ============================================================
  // Fetch medicaments for POS search
  // ============================================================

  const fetchMedicaments = useCallback(async () => {
    if (!pharmacieId || !medSearch) {
      setMedicaments([])
      return
    }
    setMedSearchLoading(true)
    try {
      const res = await fetch(`/api/medicaments?pharmacieId=${pharmacieId}&search=${encodeURIComponent(medSearch)}&pageSize=10`)
      if (res.ok) {
        const data = await res.json()
        setMedicaments(data.data || data || [])
      }
    } catch {
      // silent
    } finally {
      setMedSearchLoading(false)
    }
  }, [pharmacieId, medSearch])

  useEffect(() => {
    const timeout = setTimeout(fetchMedicaments, 300)
    return () => clearTimeout(timeout)
  }, [fetchMedicaments])

  // ============================================================
  // Fetch patients for POS
  // ============================================================

  const fetchPatients = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const params = new URLSearchParams({ pharmacieId })
      if (patientSearch) params.set('search', patientSearch)
      const res = await fetch(`/api/patients?${params}`)
      if (res.ok) setPatients(await res.json())
    } catch {
      // silent
    }
  }, [pharmacieId, patientSearch])

  useEffect(() => {
    const timeout = setTimeout(fetchPatients, 300)
    return () => clearTimeout(timeout)
  }, [fetchPatients])

  // ============================================================
  // Cart calculations
  // ============================================================

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.prixUnitaire * item.quantite - item.remise), 0)
  }, [cart])

  const cartTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - posGlobalRemise)
  }, [cartSubtotal, posGlobalRemise])

  const totalPaidAmount = useMemo(() => {
    return splitPaiements.reduce((sum, p) => sum + p.montant, 0)
  }, [splitPaiements])

  const remainingAmount = useMemo(() => {
    return Math.max(0, cartTotal - totalPaidAmount)
  }, [cartTotal, totalPaidAmount])

  // ============================================================
  // Cart actions
  // ============================================================

  const addToCart = (med: Medicament) => {
    setCart(prev => {
      const existing = prev.find(i => i.medicamentId === med.id)
      if (existing) {
        return prev.map(i =>
          i.medicamentId === med.id
            ? { ...i, quantite: i.quantite + 1 }
            : i
        )
      }
      return [...prev, {
        medicamentId: med.id,
        nomCommercial: med.nomCommercial,
        dci: med.dci,
        prixUnitaire: med.prixPublic,
        quantite: 1,
        remise: 0,
      }]
    })
    toast.success(`${med.nomCommercial} ajouté`)
  }

  const removeFromCart = (medicamentId: string) => {
    setCart(prev => prev.filter(i => i.medicamentId !== medicamentId))
  }

  const updateCartItem = (medicamentId: string, field: 'quantite' | 'remise', value: number) => {
    setCart(prev => prev.map(i =>
      i.medicamentId === medicamentId
        ? { ...i, [field]: Math.max(0, value) }
        : i
    ))
  }

  const clearCart = () => {
    setCart([])
    setPosGlobalRemise(0)
    setSelectedPatientId('')
    setSplitPaiements([{ id: '1', mode: 'ESPECES', montant: 0, reference: '' }])
    setShowSplitPayment(false)
  }

  // ============================================================
  // Open register
  // ============================================================

  const handleOpenRegister = async () => {
    if (!selectedCaisseId) {
      toast.error('Sélectionnez une caisse')
      return
    }
    setOpeningSession(true)
    try {
      const res = await fetch('/api/sessions-caisse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId,
          caisseId: selectedCaisseId,
          utilisateurId,
          soldeOuverture: parseFloat(soldeOuverture) || 0,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur')
      }
      const session = await res.json()
      setActiveSession(session)
      setOpenDialogOpen(false)
      setSelectedCaisseId('')
      setSoldeOuverture('')
      toast.success('Caisse ouverte avec succès')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'ouverture')
    } finally {
      setOpeningSession(false)
    }
  }

  // ============================================================
  // Close register
  // ============================================================

  const handleCloseRegister = async () => {
    if (!activeSession) return
    setClosingSession(true)
    try {
      const res = await fetch(`/api/sessions-caisse/${activeSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cloturer',
          soldeCloture: parseFloat(soldeCloture) || 0,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur')
      }
      toast.success('Caisse clôturée avec succès')
      setCloseDialogOpen(false)
      setSoldeCloture('')
      setActiveSession(null)
      setRecentVentes([])
      clearCart()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la clôture')
    } finally {
      setClosingSession(false)
    }
  }

  // ============================================================
  // Submit sale (POS)
  // ============================================================

  const handleSubmitSale = async () => {
    if (cart.length === 0) {
      toast.error('Ajoutez au moins un médicament')
      return
    }
    if (remainingAmount > 0 && !showSplitPayment) {
      toast.error('Le montant payé est insuffisant')
      return
    }
    if (showSplitPayment && remainingAmount > 0) {
      toast.error(`Il reste ${formatFCFA(remainingAmount)} à payer`)
      return
    }

    setSubmitting(true)
    try {
      // Build payments
      const paiementData = showSplitPayment
        ? splitPaiements.filter(p => p.montant > 0).map(p => ({
          montant: p.montant,
          mode: p.mode,
          reference: p.reference || null,
        }))
        : [{ montant: cartTotal, mode: splitPaiements[0]?.mode || 'ESPECES' as ModePaiement }]

      const res = await fetch('/api/ventes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId,
          patientId: selectedPatientId || null,
          sessionId: activeSession?.id || null,
          utilisateurId,
          remise: posGlobalRemise,
          lignes: cart.map(item => ({
            medicamentId: item.medicamentId,
            quantite: item.quantite,
            prixUnitaire: item.prixUnitaire,
            remise: item.remise,
          })),
          paiements: paiementData,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur')
      }

      const vente = await res.json()
      toast.success(`Vente ${vente.reference} enregistrée`)

      // Add to recent transactions
      const newVente: VenteSimple = {
        id: vente.id,
        reference: vente.reference,
        montantTotal: vente.montantTotal,
        montantPaye: vente.montantPaye,
        statut: vente.statut,
        modePaiement: vente.modePaiement,
        createdAt: vente.createdAt,
        patient: vente.patient ? { id: vente.patient.id, nom: vente.patient.nom, prenom: vente.patient.prenom } : null,
      }
      setRecentVentes(prev => [newVente, ...prev].slice(0, 10))

      // Reset POS
      clearCart()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création de la vente')
    } finally {
      setSubmitting(false)
    }
  }

  // ============================================================
  // Create patient from POS
  // ============================================================

  const handleCreatePatient = async () => {
    if (!newPatient.nom || !newPatient.prenom) {
      toast.error('Nom et prénom sont requis')
      return
    }
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pharmacieId, ...newPatient }),
      })
      if (!res.ok) throw new Error('Erreur')
      const patient = await res.json()
      setSelectedPatientId(patient.id)
      setPatients(prev => [...prev, patient])
      setShowNewPatient(false)
      setNewPatient({ nom: '', prenom: '', telephone: '' })
      toast.success('Patient créé avec succès')
    } catch {
      toast.error('Erreur lors de la création du patient')
    }
  }

  // ============================================================
  // Split payment helpers
  // ============================================================

  const addSplitPaiement = () => {
    const id = String(Date.now())
    setSplitPaiements(prev => [...prev, { id, mode: 'ESPECES', montant: 0, reference: '' }])
  }

  const removeSplitPaiement = (id: string) => {
    setSplitPaiements(prev => prev.filter(p => p.id !== id).length > 0 ? prev.filter(p => p.id !== id) : prev)
  }

  const updateSplitPaiement = (id: string, field: 'mode' | 'montant' | 'reference', value: string | number) => {
    setSplitPaiements(prev => prev.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ))
  }

  const autoFillRemaining = (id: string) => {
    const otherTotal = splitPaiements.filter(p => p.id !== id).reduce((sum, p) => sum + p.montant, 0)
    const remaining = Math.max(0, cartTotal - otherTotal)
    updateSplitPaiement(id, 'montant', remaining)
  }

  // ============================================================
  // Keyboard shortcuts
  // ============================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeSession) return
      if (e.key === 'F2') {
        e.preventDefault()
        document.getElementById('med-search-input')?.focus()
      } else if (e.key === 'F4') {
        e.preventDefault()
        if (cart.length > 0) handleSubmitSale()
      } else if (e.key === 'Escape') {
        clearCart()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession, cart])

  // ============================================================
  // Session stats
  // ============================================================

  const sessionVentesTotal = useMemo(() => {
    return recentVentes
      .filter(v => v.statut === 'VALIDEE' || v.statut === 'EN_COURS')
      .reduce((sum, v) => sum + v.montantTotal, 0)
  }, [recentVentes])

  // ============================================================
  // Close dialog: calculate expected
  // ============================================================

  const expectedBalance = useMemo(() => {
    if (!activeSession) return 0
    return activeSession.soldeOuverture + sessionVentesTotal
  }, [activeSession, sessionVentesTotal])

  const ecart = useMemo(() => {
    const cloture = parseFloat(soldeCloture) || 0
    return cloture - expectedBalance
  }, [soldeCloture, expectedBalance])

  // ============================================================
  // Render: Loading
  // ============================================================

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#1D9E75] flex items-center justify-center animate-pulse">
            <Calculator className="h-5 w-5 text-white" />
          </div>
          <span className="text-sm text-muted-foreground">Chargement de la caisse...</span>
        </div>
      </div>
    )
  }

  // ============================================================
  // Render: No active session
  // ============================================================

  if (!activeSession) {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Caisse</h1>
            <p className="text-muted-foreground text-sm">Gestion de la caisse et point de vente</p>
          </div>

          {/* Closed state */}
          <Card className="max-w-lg mx-auto">
            <CardContent className="p-8 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Aucune caisse ouverte</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Ouvrez une session de caisse pour commencer à encaisser des ventes.
              </p>
              <Button
                onClick={() => setOpenDialogOpen(true)}
                className="bg-[#1D9E75] hover:bg-[#178a65] text-white gap-2 px-8"
              >
                <Unlock className="h-4 w-4" />
                Ouvrir la caisse
              </Button>
            </CardContent>
          </Card>

          {/* Open Register Dialog */}
          <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Unlock className="h-5 w-5 text-[#1D9E75]" />
                  Ouvrir la caisse
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Caisse</Label>
                  <Select value={selectedCaisseId} onValueChange={setSelectedCaisseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une caisse" />
                    </SelectTrigger>
                    <SelectContent>
                      {caisses.filter(c => c.actif).map(c => {
                        const hasOpenSession = c.sessions && c.sessions.length > 0
                        return (
                          <SelectItem key={c.id} value={c.id} disabled={hasOpenSession}>
                            {c.nom} {hasOpenSession ? '(déjà ouverte)' : ''}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  {caisses.filter(c => c.actif).length === 0 && (
                    <p className="text-xs text-destructive">Aucune caisse configurée. Créez-en une dans les paramètres.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Solde d&apos;ouverture (FCFA)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={soldeOuverture}
                    onChange={e => setSoldeOuverture(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Montant en espèces dans le tiroir au démarrage</p>
                </div>
                <div className="space-y-2">
                  <Label>Opérateur</Label>
                  <Input
                    value={user ? `${user.prenom} ${user.nom}` : ''}
                    disabled
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenDialogOpen(false)}>Annuler</Button>
                <Button
                  onClick={handleOpenRegister}
                  disabled={openingSession || !selectedCaisseId}
                  className="bg-[#1D9E75] hover:bg-[#178a65] text-white"
                >
                  {openingSession ? 'Ouverture...' : 'Ouvrir la caisse'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    )
  }

  // ============================================================
  // Render: Active session — POS Interface
  // ============================================================

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header bar with session info */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Calculator className="h-6 w-6 text-[#1D9E75]" />
              Caisse — {activeSession.caisse?.nom || 'Principale'}
            </h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                <CircleDot className="h-3 w-3 mr-1" />
                Session ouverte
              </Badge>
              <span>Ouverte le {formatDateTime(activeSession.ouvertLe)}</span>
              <span>par {activeSession.utilisateur?.prenom} {activeSession.utilisateur?.nom}</span>
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setCloseDialogOpen(true)}
            className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Lock className="h-4 w-4" />
            Clôturer la caisse
          </Button>
        </div>

        {/* Session KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-l-4 border-l-[#1D9E75]">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Solde d&apos;ouverture</p>
                  <p className="text-base sm:text-lg font-bold mt-0.5">{formatFCFA(activeSession.soldeOuverture)}</p>
                </div>
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-[#1D9E75]" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total ventes</p>
                  <p className="text-base sm:text-lg font-bold mt-0.5">{formatFCFA(sessionVentesTotal)}</p>
                </div>
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Nb. ventes</p>
                  <p className="text-base sm:text-lg font-bold mt-0.5">{recentVentes.length}</p>
                </div>
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Solde attendu</p>
                  <p className="text-base sm:text-lg font-bold mt-0.5">{formatFCFA(expectedBalance)}</p>
                </div>
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main POS Layout: Search+Cart | Payment+Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* LEFT: Search + Cart (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Medication Search */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="med-search-input"
                      placeholder="Rechercher un médicament (nom, DCI, code-barres)... [F2]"
                      className="pl-10"
                      value={medSearch}
                      onChange={e => setMedSearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* Search results dropdown */}
                {medSearch && medicaments.length > 0 && (
                  <div className="mt-2 border rounded-lg overflow-hidden">
                    <ScrollArea className="max-h-48">
                      <div className="divide-y">
                        {medicaments.map(med => (
                          <button
                            key={med.id}
                            className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                            onClick={() => { addToCart(med); setMedSearch(''); setMedicaments([]) }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{med.nomCommercial}</p>
                              <p className="text-xs text-muted-foreground truncate">{med.dci} — {med.dosage}</p>
                            </div>
                            <div className="ml-3 flex items-center gap-2">
                              <span className="text-sm font-semibold whitespace-nowrap">{formatFCFA(med.prixPublic)}</span>
                              <Plus className="h-4 w-4 text-[#1D9E75]" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
                {medSearch && medSearchLoading && (
                  <div className="mt-2 text-center text-sm text-muted-foreground py-3">Recherche en cours...</div>
                )}
                {medSearch && !medSearchLoading && medicaments.length === 0 && (
                  <div className="mt-2 text-center text-sm text-muted-foreground py-3">Aucun médicament trouvé</div>
                )}
              </CardContent>
            </Card>

            {/* Cart */}
            <Card>
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-[#1D9E75]" />
                    Panier
                    {cart.length > 0 && (
                      <Badge variant="secondary" className="bg-[#1D9E75]/10 text-[#1D9E75] text-xs">
                        {cart.length} article{cart.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </CardTitle>
                  {cart.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive h-8 gap-1">
                      <X className="h-3 w-3" /> Vider [Esc]
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Panier vide</p>
                    <p className="text-xs mt-1">Recherchez un médicament pour l&apos;ajouter</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Cart items */}
                    <ScrollArea className="max-h-72">
                      <div className="space-y-2">
                        {cart.map(item => (
                          <div key={item.medicamentId} className="flex items-start gap-2 p-2 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.nomCommercial}</p>
                              <p className="text-xs text-muted-foreground truncate">{item.dci}</p>
                              <div className="flex items-center gap-3 mt-1.5">
                                {/* Qty controls */}
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => updateCartItem(item.medicamentId, 'quantite', item.quantite - 1)}
                                    disabled={item.quantite <= 1}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    className="h-6 w-12 text-center text-xs p-0 border-0"
                                    value={item.quantite}
                                    onChange={e => updateCartItem(item.medicamentId, 'quantite', parseInt(e.target.value) || 1)}
                                    min={1}
                                  />
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => updateCartItem(item.medicamentId, 'quantite', item.quantite + 1)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                                {/* Unit price */}
                                <span className="text-xs text-muted-foreground">
                                  × {formatFCFA(item.prixUnitaire)}
                                </span>
                                {/* Remise per line */}
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">Rem:</span>
                                  <Input
                                    type="number"
                                    className="h-6 w-16 text-xs p-1 text-right"
                                    value={item.remise || ''}
                                    placeholder="0"
                                    onChange={e => updateCartItem(item.medicamentId, 'remise', parseFloat(e.target.value) || 0)}
                                  />
                                </div>
                              </div>
                            </div>
                            {/* Line total + remove */}
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-semibold text-sm">
                                {formatFCFA(item.prixUnitaire * item.quantite - item.remise)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => removeFromCart(item.medicamentId)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <Separator />

                    {/* Totals */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Sous-total</span>
                        <span>{formatFCFA(cartSubtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Remise globale</span>
                        <Input
                          type="number"
                          className="h-7 w-28 text-xs text-right p-1"
                          value={posGlobalRemise || ''}
                          placeholder="0"
                          onChange={e => setPosGlobalRemise(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span className="text-[#1D9E75]">{formatFCFA(cartTotal)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Patient + Payment + Recent (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Patient Selection */}
            <Card>
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-[#1D9E75]" />
                  Patient
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher un patient..."
                        className="pl-9 text-sm h-9"
                        value={patientSearch}
                        onChange={e => setPatientSearch(e.target.value)}
                      />
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setShowNewPatient(true)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Nouveau patient</TooltipContent>
                    </Tooltip>
                  </div>

                  {selectedPatientId && (
                    <div className="flex items-center justify-between p-2 rounded-lg border bg-emerald-50/50 border-emerald-200">
                      <span className="text-sm font-medium text-emerald-700">
                        {patients.find(p => p.id === selectedPatientId)
                          ? `${patients.find(p => p.id === selectedPatientId)!.prenom} ${patients.find(p => p.id === selectedPatientId)!.nom}`
                          : 'Patient sélectionné'}
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedPatientId('')}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {!selectedPatientId && patients.length > 0 && (
                    <ScrollArea className="max-h-32">
                      <div className="space-y-1">
                        {patients.slice(0, 5).map(p => (
                          <button
                            key={p.id}
                            className="w-full text-left p-2 rounded hover:bg-muted/50 text-sm transition-colors"
                            onClick={() => setSelectedPatientId(p.id)}
                          >
                            <span className="font-medium">{p.prenom} {p.nom}</span>
                            {p.telephone && <span className="text-muted-foreground ml-2 text-xs">{p.telephone}</span>}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  {/* New patient dialog inline */}
                  {showNewPatient && (
                    <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                      <p className="text-sm font-medium">Nouveau patient</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Prénom"
                          className="h-8 text-sm"
                          value={newPatient.prenom}
                          onChange={e => setNewPatient(prev => ({ ...prev, prenom: e.target.value }))}
                        />
                        <Input
                          placeholder="Nom"
                          className="h-8 text-sm"
                          value={newPatient.nom}
                          onChange={e => setNewPatient(prev => ({ ...prev, nom: e.target.value }))}
                        />
                      </div>
                      <Input
                        placeholder="Téléphone"
                        className="h-8 text-sm"
                        value={newPatient.telephone}
                        onChange={e => setNewPatient(prev => ({ ...prev, telephone: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-[#1D9E75] hover:bg-[#178a65] text-white h-8" onClick={handleCreatePatient}>
                          Créer
                        </Button>
                        <Button size="sm" variant="outline" className="h-8" onClick={() => setShowNewPatient(false)}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Section */}
            <Card>
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-[#1D9E75]" />
                    Paiement
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      setShowSplitPayment(!showSplitPayment)
                      if (!showSplitPayment) {
                        // Initialize first split payment with full amount
                        setSplitPaiements(prev => {
                          const updated = [...prev]
                          if (updated.length > 0) updated[0].montant = cartTotal
                          return updated
                        })
                      } else {
                        setSplitPaiements([{ id: '1', mode: 'ESPECES', montant: 0, reference: '' }])
                      }
                    }}
                  >
                    {showSplitPayment ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {showSplitPayment ? 'Paiement simple' : 'Paiement multiple'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {cartTotal === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Ajoutez des articles au panier
                  </div>
                ) : (
                  <div className="space-y-3">
                    {!showSplitPayment ? (
                      /* Simple payment */
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-1.5">
                          {(['ESPECES', 'WAVE', 'MTN_MONEY', 'MOOV_MONEY', 'CARTE_BANCAIRE', 'CHEQUE'] as ModePaiement[]).map(mode => (
                            <button
                              key={mode}
                              className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-colors ${splitPaiements[0]?.mode === mode ? MODE_PAIEMENT_COLORS[mode] : 'border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50'}`}
                              onClick={() => setSplitPaiements([{ id: '1', mode, montant: cartTotal, reference: '' }])}
                            >
                              {MODE_PAIEMENT_ICONS[mode]}
                              {MODE_PAIEMENT_LABELS[mode]}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Split payment */
                      <div className="space-y-2">
                        {splitPaiements.map((p, idx) => (
                          <div key={p.id} className="flex items-center gap-2 p-2 border rounded-lg">
                            <Select value={p.mode} onValueChange={v => updateSplitPaiement(p.id, 'mode', v)}>
                              <SelectTrigger className="h-8 w-32 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(['ESPECES', 'WAVE', 'MTN_MONEY', 'MOOV_MONEY', 'CARTE_BANCAIRE', 'CHEQUE'] as ModePaiement[]).map(mode => (
                                  <SelectItem key={mode} value={mode}>{MODE_PAIEMENT_LABELS[mode]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex-1 relative">
                              <Input
                                type="number"
                                className="h-8 text-sm pr-12"
                                placeholder="0"
                                value={p.montant || ''}
                                onChange={e => updateSplitPaiement(p.id, 'montant', parseFloat(e.target.value) || 0)}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 text-[10px] text-[#1D9E75] hover:text-[#178a65]"
                                onClick={() => autoFillRemaining(p.id)}
                              >
                                Solde
                              </Button>
                            </div>
                            {splitPaiements.length > 1 && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeSplitPaiement(p.id)}>
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1" onClick={addSplitPaiement}>
                          <Plus className="h-3 w-3" /> Ajouter un mode de paiement
                        </Button>

                        {/* Payment summary */}
                        <div className="space-y-1 text-xs pt-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total à payer</span>
                            <span className="font-semibold">{formatFCFA(cartTotal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total saisi</span>
                            <span className={totalPaidAmount >= cartTotal ? 'text-emerald-600 font-semibold' : 'text-destructive font-semibold'}>
                              {formatFCFA(totalPaidAmount)}
                            </span>
                          </div>
                          {remainingAmount > 0 && (
                            <div className="flex justify-between text-destructive">
                              <span>Reste à payer</span>
                              <span className="font-semibold">{formatFCFA(remainingAmount)}</span>
                            </div>
                          )}
                          {totalPaidAmount > cartTotal && (
                            <div className="flex justify-between text-amber-600">
                              <span>Excédent</span>
                              <span className="font-semibold">{formatFCFA(totalPaidAmount - cartTotal)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Encaisser button */}
                    <Button
                      className="w-full bg-[#1D9E75] hover:bg-[#178a65] text-white h-11 text-base font-semibold gap-2"
                      onClick={handleSubmitSale}
                      disabled={submitting || cart.length === 0 || (showSplitPayment && remainingAmount > 0)}
                    >
                      {submitting ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5" />
                          Encaisser {formatFCFA(cartTotal)} [F4]
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-[#1D9E75]" />
                  Dernières transactions
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {recentVentes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucune vente ce session</p>
                ) : (
                  <ScrollArea className="max-h-64">
                    <div className="space-y-2">
                      {recentVentes.slice(0, 10).map(v => (
                        <div key={v.id} className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/30 transition-colors">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground">{v.reference}</span>
                              <Badge
                                variant="secondary"
                                className={`${MODE_PAIEMENT_COLORS[v.modePaiement]} text-[10px] px-1.5 py-0`}
                              >
                                {MODE_PAIEMENT_LABELS[v.modePaiement]}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {v.patient ? `${v.patient.prenom} ${v.patient.nom}` : 'Sans patient'}
                              {' · '}
                              {formatDateTime(v.createdAt)}
                            </p>
                          </div>
                          <span className="font-semibold text-sm whitespace-nowrap ml-2">{formatFCFA(v.montantTotal)}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Close Register Dialog */}
        <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-red-500" />
                Clôturer la caisse
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Session summary */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Solde d&apos;ouverture</span>
                  <span className="font-medium">{formatFCFA(activeSession.soldeOuverture)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total des ventes</span>
                  <span className="font-medium">{formatFCFA(sessionVentesTotal)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold">Solde attendu</span>
                  <span className="font-bold">{formatFCFA(expectedBalance)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Solde de clôture (comptage en caisse)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={soldeCloture}
                  onChange={e => setSoldeCloture(e.target.value)}
                  className="text-lg"
                  autoFocus
                />
              </div>

              {soldeCloture && (
                <div className={`p-3 rounded-lg border ${ecart === 0 ? 'bg-emerald-50 border-emerald-200' : ecart > 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    {ecart === 0 ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : ecart > 0 ? (
                      <AlertCircle className="h-5 w-5 text-blue-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {ecart === 0 ? 'Caisse exacte' : ecart > 0 ? 'Excédent' : 'Manquant'}
                      </p>
                      <p className={`text-lg font-bold ${ecart === 0 ? 'text-emerald-600' : ecart > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {ecart === 0 ? '0 FCFA' : `${formatFCFA(Math.abs(ecart))} ${ecart > 0 ? 'en plus' : 'en moins'}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Cette action est irréversible. La session sera clôturée et aucune nouvelle vente ne pourra y être ajoutée.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>Annuler</Button>
              <Button
                variant="destructive"
                onClick={handleCloseRegister}
                disabled={closingSession || !soldeCloture}
              >
                {closingSession ? 'Clôture en cours...' : 'Clôturer la caisse'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
