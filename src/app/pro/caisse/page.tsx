'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/app/pro/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
  UserPlus,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Printer,
  Package,
} from 'lucide-react'

// === Types ===

interface MedicamentResult {
  id: string
  dci: string
  nomCommercial: string
  codeCIP: string | null
  forme: string
  dosage: string
  prixVente: number
  tva: number
  estStupefiant: boolean
  estRemboursable: boolean
  lots: { id: string; numeroLot: string; quantite: number; dateExpiration: string }[]
}

interface CartItem {
  medicamentId: string
  nomCommercial: string
  dci: string
  prixUnitaire: number
  quantite: number
  stock: number
  remise: number
  lotId?: string
}

interface PatientResult {
  id: string
  nom: string
  prenom: string
  telephone: string | null
  email: string | null
}

interface OrdonnanceResult {
  id: string
  prescripteurNom: string
  dateOrdonnance: string
  statut: string
  patient: { nom: string; prenom: string } | null
}

interface SessionCaisseData {
  id: string
  fondDeCaisse: number
  totalEntrees: number
  totalSorties: number
  dateOuverture: string
  dateFermeture: string | null
  caisse: { id: string; nom: string; numero: number }
  utilisateur: { id: string; nom: string; prenom: string }
}

interface CaisseData {
  id: string
  nom: string
  numero: number
  actif: boolean
  sessionsCaisse: SessionCaisseData[]
}

type ModePaiement = 'ESPECES' | 'CARTE' | 'MOBILE_MONEY' | 'WAVE' | 'MTN_MONEY' | 'MOOV_MONEY' | 'TIERS_PAYANT'

const modePaiementLabels: Record<ModePaiement, string> = {
  ESPECES: 'Espèces',
  CARTE: 'Carte bancaire',
  MOBILE_MONEY: 'Mobile Money',
  WAVE: 'Wave',
  MTN_MONEY: 'MTN Money',
  MOOV_MONEY: 'Moov Money',
  TIERS_PAYANT: 'Tiers payant',
}

const modePaiementIcons: Record<ModePaiement, React.ReactNode> = {
  ESPECES: <Banknote className="h-4 w-4" />,
  CARTE: <CreditCard className="h-4 w-4" />,
  MOBILE_MONEY: <Smartphone className="h-4 w-4" />,
  WAVE: <Smartphone className="h-4 w-4" />,
  MTN_MONEY: <Smartphone className="h-4 w-4" />,
  MOOV_MONEY: <Smartphone className="h-4 w-4" />,
  TIERS_PAYANT: <FileText className="h-4 w-4" />,
}

const fcfa = (amount: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA'

export default function CaissePage() {
  const { user, pharmacie, isAuthenticated } = useAuth()
  const pharmacieId = pharmacie?.id || ''

  // === Session Caisse State ===
  const [caisses, setCaisses] = useState<CaisseData[]>([])
  const [activeSession, setActiveSession] = useState<SessionCaisseData | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [openSessionDialog, setOpenSessionDialog] = useState(false)
  const [selectedCaisseId, setSelectedCaisseId] = useState('')
  const [fondDeCaisse, setFondDeCaisse] = useState('10000')

  // === Product Search State ===
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MedicamentResult[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // === Cart State ===
  const [cart, setCart] = useState<CartItem[]>([])
  const [globalRemise, setGlobalRemise] = useState(0)

  // === Patient/Ordonnance Linking ===
  const [patientSearch, setPatientSearch] = useState('')
  const [patientResults, setPatientResults] = useState<PatientResult[]>([])
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null)
  const [ordonnances, setOrdonnances] = useState<OrdonnanceResult[]>([])
  const [selectedOrdonnance, setSelectedOrdonnance] = useState<OrdonnanceResult | null>(null)

  // === Payment State ===
  const [paymentDialog, setPaymentDialog] = useState(false)
  const [paiements, setPaiements] = useState<{ mode: ModePaiement; montant: string }[]>([
    { mode: 'ESPECES', montant: '' },
  ])
  const [processingSale, setProcessingSale] = useState(false)

  // === Sale Result State ===
  const [saleResult, setSaleResult] = useState<{ success: boolean; venteId?: string; error?: string } | null>(null)
  const [venteType, setVenteType] = useState<'COMPTOIR' | 'ORDONNANCE'>('COMPTOIR')

  // === Close Session State ===
  const [closeSessionDialog, setCloseSessionDialog] = useState(false)
  const [soldePhysique, setSoldePhysique] = useState('')
  const [closingSession, setClosingSession] = useState(false)

  // === Fetch Caisses and Active Session ===
  const fetchCaissesAndSession = useCallback(async () => {
    if (!pharmacieId) return
    setLoadingSession(true)
    try {
      const [caissesRes, sessionsRes] = await Promise.all([
        fetch(`/api/caisses?pharmacieId=${pharmacieId}`),
        fetch(`/api/sessions-caisse?pharmacieId=${pharmacieId}&statut=ouverte`),
      ])
      if (caissesRes.ok) setCaisses(await caissesRes.json())
      if (sessionsRes.ok) {
        const sessions: SessionCaisseData[] = await sessionsRes.json()
        const mySession = sessions.find((s: SessionCaisseData) => s.utilisateur.id === user?.id)
        setActiveSession(mySession || sessions[0] || null)
      }
    } catch (err) {
      console.error('Erreur chargement caisses:', err)
    } finally {
      setLoadingSession(false)
    }
  }, [pharmacieId, user?.id])

  useEffect(() => {
    fetchCaissesAndSession()
  }, [fetchCaissesAndSession])

  // === Fetch Ordonnances ===
  useEffect(() => {
    if (!pharmacieId) return
    fetch(`/api/ordonnances?pharmacieId=${pharmacieId}&statut=VALIDEE`)
      .then((r) => r.json())
      .then(setOrdonnances)
      .catch(() => {})
  }, [pharmacieId])

  // === Product Search (debounced) ===
  const searchProducts = useCallback(
    async (query: string) => {
      if (!pharmacieId || query.length < 2) {
        setSearchResults([])
        return
      }
      setSearching(true)
      try {
        const res = await fetch(`/api/medicaments?pharmacieId=${pharmacieId}&search=${encodeURIComponent(query)}`)
        if (res.ok) setSearchResults(await res.json())
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    },
    [pharmacieId]
  )

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => searchProducts(searchQuery), 300)
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [searchQuery, searchProducts])

  // === Patient Search (debounced) ===
  const searchPatients = useCallback(
    async (query: string) => {
      if (!pharmacieId || query.length < 2) {
        setPatientResults([])
        return
      }
      try {
        const res = await fetch(`/api/patients?pharmacieId=${pharmacieId}&search=${encodeURIComponent(query)}`)
        if (res.ok) setPatientResults(await res.json())
      } catch {
        setPatientResults([])
      }
    },
    [pharmacieId]
  )

  useEffect(() => {
    const timeout = setTimeout(() => searchPatients(patientSearch), 300)
    return () => clearTimeout(timeout)
  }, [patientSearch, searchPatients])

  // === Cart Operations ===
  const addToCart = (med: MedicamentResult) => {
    const totalStock = med.lots.reduce((s, l) => s + l.quantite, 0)
    setCart((prev) => {
      const existing = prev.find((i) => i.medicamentId === med.id)
      if (existing) {
        if (existing.quantite >= totalStock) return prev
        return prev.map((i) =>
          i.medicamentId === med.id ? { ...i, quantite: i.quantite + 1 } : i
        )
      }
      const firstLot = med.lots[0]
      return [
        ...prev,
        {
          medicamentId: med.id,
          nomCommercial: med.nomCommercial,
          dci: med.dci,
          prixUnitaire: med.prixVente,
          quantite: 1,
          stock: totalStock,
          remise: 0,
          lotId: firstLot?.id,
        },
      ]
    })
    setSearchQuery('')
    setSearchResults([])
  }

  const updateQty = (medicamentId: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.medicamentId !== medicamentId) return i
        const newQty = i.quantite + delta
        if (newQty <= 0) return i
        if (newQty > i.stock) return i
        return { ...i, quantite: newQty }
      })
    )
  }

  const removeFromCart = (medicamentId: string) => {
    setCart((prev) => prev.filter((i) => i.medicamentId !== medicamentId))
  }

  const updateItemRemise = (medicamentId: string, remise: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.medicamentId === medicamentId
          ? { ...i, remise: Math.min(Math.max(remise, 0), i.prixUnitaire * i.quantite) }
          : i
      )
    )
  }

  // === Totals ===
  const sousTotal = cart.reduce((s, i) => s + i.prixUnitaire * i.quantite - i.remise, 0)
  const montantRemise = globalRemise
  const montantTotal = Math.max(sousTotal - montantRemise, 0)

  // === Open Session ===
  const handleOpenSession = async () => {
    if (!selectedCaisseId || !user?.id) return
    try {
      const res = await fetch('/api/sessions-caisse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId,
          utilisateurId: user.id,
          caisseId: selectedCaisseId,
          fondDeCaisse: parseFloat(fondDeCaisse) || 0,
        }),
      })
      if (res.ok) {
        const session = await res.json()
        setActiveSession(session)
        setOpenSessionDialog(false)
      }
    } catch (err) {
      console.error('Erreur ouverture session:', err)
    }
  }

  // === Close Session ===
  const handleCloseSession = async () => {
    if (!activeSession) return
    setClosingSession(true)
    try {
      const res = await fetch(`/api/sessions-caisse/${activeSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soldePhysique: parseFloat(soldePhysique) || 0,
        }),
      })
      if (res.ok) {
        setActiveSession(null)
        setCloseSessionDialog(false)
        setSoldePhysique('')
        fetchCaissesAndSession()
      }
    } catch (err) {
      console.error('Erreur fermeture session:', err)
    } finally {
      setClosingSession(false)
    }
  }

  // === Payment ===
  const totalPaiements = paiements.reduce((s, p) => s + (parseFloat(p.montant) || 0), 0)
  const resteAPayer = montantTotal - totalPaiements

  const addPaiement = () => {
    setPaiements([...paiements, { mode: 'ESPECES', montant: '' }])
  }

  const removePaiement = (idx: number) => {
    if (paiements.length <= 1) return
    setPaiements(paiements.filter((_, i) => i !== idx))
  }

  const updatePaiement = (idx: number, field: 'mode' | 'montant', value: string) => {
    setPaiements(
      paiements.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    )
  }

  // === Create Vente ===
  const handleCreateVente = async () => {
    if (!activeSession || !user?.id || cart.length === 0) return
    if (resteAPayer > 0.5) return // Must pay full amount

    setProcessingSale(true)
    try {
      const lignes = cart.map((item) => ({
        medicamentId: item.medicamentId,
        lotId: item.lotId || undefined,
        quantite: item.quantite,
        prixUnitaire: item.prixUnitaire,
        montant: item.prixUnitaire * item.quantite - item.remise,
        remise: item.remise,
      }))

      const paiementData = paiements
        .filter((p) => parseFloat(p.montant) > 0)
        .map((p) => ({
          modePaiement: p.mode,
          montant: parseFloat(p.montant),
        }))

      const body = {
        pharmacieId,
        utilisateurId: user.id,
        sessionId: activeSession.id,
        patientId: selectedPatient?.id || undefined,
        ordonnanceId: selectedOrdonnance?.id || undefined,
        typeVente: venteType,
        statut: 'VALIDEE',
        montantTotal,
        montantRemise,
        montantPaye: totalPaiements,
        monnaieRendue: Math.max(totalPaiements - montantTotal, 0),
        lignes,
        paiements: paiementData,
      }

      const res = await fetch('/api/ventes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const vente = await res.json()
        setSaleResult({ success: true, venteId: vente.id })
        setCart([])
        setGlobalRemise(0)
        setSelectedPatient(null)
        setSelectedOrdonnance(null)
        setPatientSearch('')
        setPaiements([{ mode: 'ESPECES', montant: '' }])
        setPaymentDialog(false)
        fetchCaissesAndSession()
      } else {
        const err = await res.json()
        setSaleResult({ success: false, error: err.error || 'Erreur lors de la vente' })
      }
    } catch {
      setSaleResult({ success: false, error: 'Erreur réseau' })
    } finally {
      setProcessingSale(false)
    }
  }

  // === Print Ticket ===
  const handlePrintTicket = (venteId: string) => {
    window.open(`/api/ticket?type=ticket&venteId=${venteId}`, '_blank')
  }

  // === Quick Actions ===
  const startVenteRapide = () => {
    setVenteType('COMPTOIR')
    setSelectedPatient(null)
    setSelectedOrdonnance(null)
    setPatientSearch('')
  }

  const startVenteOrdonnance = () => {
    setVenteType('ORDONNANCE')
  }

  // === Loading / Unauthenticated ===
  if (!isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Connectez-vous pour accéder à la caisse</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full -m-4 md:-m-6">
      {/* === Session Caisse Banner === */}
      <div
        className="border-b px-4 py-2 flex items-center justify-between flex-wrap gap-2"
        style={{ background: activeSession ? '#E1F5EE' : '#FEF3C7' }}
      >
        <div className="flex items-center gap-3">
          {activeSession ? (
            <>
              <Unlock className="h-4 w-4 text-[#1D9E75]" />
              <span className="text-sm font-medium">
                Session ouverte — <strong>{activeSession.caisse.nom}</strong>
              </span>
              <Badge variant="outline" className="text-[#085041] border-[#1D9E75]">
                Fond : {fcfa(activeSession.fondDeCaisse)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                par {activeSession.utilisateur.prenom} {activeSession.utilisateur.nom}
              </span>
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                Aucune session ouverte — ouvrez une session pour encaisser
              </span>
            </>
          )}
        </div>
        <div className="flex gap-2">
          {activeSession ? (
            <Button
              size="sm"
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => setCloseSessionDialog(true)}
            >
              Fermer la session
            </Button>
          ) : (
            <Button
              size="sm"
              style={{ background: '#1D9E75' }}
              className="text-white hover:opacity-90"
              onClick={() => setOpenSessionDialog(true)}
            >
              Ouvrir une session
            </Button>
          )}
        </div>
      </div>

      {/* === Quick Actions === */}
      <div className="px-4 py-2 border-b bg-background flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant={venteType === 'COMPTOIR' ? 'default' : 'outline'}
          style={venteType === 'COMPTOIR' ? { background: '#1D9E75' } : {}}
          onClick={startVenteRapide}
          className="text-sm"
        >
          <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
          Vente rapide
        </Button>
        <Button
          size="sm"
          variant={venteType === 'ORDONNANCE' ? 'default' : 'outline'}
          style={venteType === 'ORDONNANCE' ? { background: '#1D9E75' } : {}}
          onClick={startVenteOrdonnance}
          className="text-sm"
        >
          <FileText className="h-3.5 w-3.5 mr-1.5" />
          Vente ordonnance
        </Button>

        {/* Patient linking */}
        <div className="ml-auto flex items-center gap-2">
          {selectedPatient ? (
            <Badge variant="secondary" className="gap-1 pr-1">
              <UserPlus className="h-3 w-3" />
              {selectedPatient.prenom} {selectedPatient.nom}
              <button
                className="ml-1 rounded-full hover:bg-muted p-0.5"
                onClick={() => setSelectedPatient(null)}
              >
                <XCircle className="h-3 w-3" />
              </button>
            </Badge>
          ) : (
            <div className="relative">
              <Input
                placeholder="Rechercher patient (nom/tél)..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-56 h-8 text-xs"
              />
              {patientResults.length > 0 && (
                <div className="absolute top-full left-0 z-50 mt-1 w-64 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {patientResults.map((p) => (
                    <button
                      key={p.id}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent flex justify-between"
                      onClick={() => {
                        setSelectedPatient(p)
                        setPatientSearch('')
                        setPatientResults([])
                      }}
                    >
                      <span>
                        {p.prenom} {p.nom}
                      </span>
                      <span className="text-muted-foreground">{p.telephone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Ordonnance linking */}
          {venteType === 'ORDONNANCE' && (
            <Select
              value={selectedOrdonnance?.id || ''}
              onValueChange={(val) => {
                const o = ordonnances.find((ord) => ord.id === val)
                setSelectedOrdonnance(o || null)
              }}
            >
              <SelectTrigger className="w-56 h-8 text-xs">
                <SelectValue placeholder="Lier une ordonnance..." />
              </SelectTrigger>
              <SelectContent>
                {ordonnances.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    Dr. {o.prescripteurNom} — {new Date(o.dateOrdonnance).toLocaleDateString('fr-FR')}
                    {o.patient ? ` (${o.patient.nom})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* === Main Content: Left (Search) + Right (Cart) === */}
      <div className="flex flex-1 overflow-hidden">
        {/* === Left Panel: Product Search === */}
        <div className="w-full md:w-1/2 lg:w-3/5 border-r flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un médicament (DCI, nom commercial, code CIP)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 text-base"
                disabled={!activeSession}
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          <ScrollArea className="flex-1">
            {!activeSession ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Lock className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">Ouvrez une session pour commencer</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="p-2 space-y-1">
                {searchResults.map((med) => {
                  const totalStock = med.lots.reduce((s, l) => s + l.quantite, 0)
                  return (
                    <button
                      key={med.id}
                      className="w-full text-left p-3 rounded-lg border hover:border-[#1D9E75] hover:bg-[#E1F5EE]/50 transition-colors flex items-center justify-between gap-3"
                      onClick={() => addToCart(med)}
                      disabled={totalStock === 0}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {med.nomCommercial}
                          </span>
                          {med.estStupefiant && (
                            <Badge variant="destructive" className="text-[10px] px-1 py-0">
                              Stupéfiant
                            </Badge>
                          )}
                          {med.estRemboursable && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0 text-[#1D9E75] border-[#1D9E75]"
                            >
                              Remboursable
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {med.dci} — {med.forme} {med.dosage}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-sm" style={{ color: '#085041' }}>
                          {fcfa(med.prixVente)}
                        </p>
                        <p className={`text-xs ${totalStock <= 5 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          <Package className="h-3 w-3 inline mr-0.5" />
                          Stock: {totalStock}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : searchQuery.length >= 2 && !searching ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Aucun résultat pour &ldquo;{searchQuery}&rdquo;</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Package className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Recherchez un médicament pour l&apos;ajouter</p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* === Right Panel: Shopping Cart === */}
        <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col bg-muted/20">
          <div className="p-3 border-b">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" style={{ color: '#1D9E75' }} />
              Panier
              {cart.length > 0 && (
                <Badge className="ml-1" style={{ background: '#1D9E75' }}>
                  {cart.length}
                </Badge>
              )}
            </h3>
          </div>

          <ScrollArea className="flex-1">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Panier vide</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {cart.map((item) => (
                  <Card key={item.medicamentId} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.nomCommercial}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.dci}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-red-500"
                        onClick={() => removeFromCart(item.medicamentId)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQty(item.medicamentId, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantite}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQty(item.medicamentId, 1)}
                          disabled={item.quantite >= item.stock}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {fcfa(item.prixUnitaire)} × {item.quantite}
                        </p>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Remise:</span>
                          <Input
                            type="number"
                            min={0}
                            value={item.remise || ''}
                            onChange={(e) =>
                              updateItemRemise(item.medicamentId, parseFloat(e.target.value) || 0)
                            }
                            className="h-6 w-16 text-xs px-1"
                          />
                        </div>
                        <p className="font-semibold text-sm" style={{ color: '#085041' }}>
                          {fcfa(item.prixUnitaire * item.quantite - item.remise)}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* === Cart Totals === */}
          {cart.length > 0 && (
            <div className="border-t p-3 space-y-2 bg-background">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{fcfa(sousTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Remise globale</span>
                <Input
                  type="number"
                  min={0}
                  value={globalRemise || ''}
                  onChange={(e) => setGlobalRemise(parseFloat(e.target.value) || 0)}
                  className="h-7 w-28 text-xs text-right px-2"
                />
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span style={{ color: '#1D9E75' }}>{fcfa(montantTotal)}</span>
              </div>

              <Button
                className="w-full h-11 text-base font-semibold"
                style={{ background: '#1D9E75' }}
                disabled={!activeSession || cart.length === 0}
                onClick={() => {
                  setPaiements([{ mode: 'ESPECES', montant: montantTotal.toString() }])
                  setPaymentDialog(true)
                }}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Encaisser {fcfa(montantTotal)}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* === Open Session Dialog === */}
      <Dialog open={openSessionDialog} onOpenChange={setOpenSessionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5" style={{ color: '#1D9E75' }} />
              Ouvrir une session de caisse
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Caisse</Label>
              <Select value={selectedCaisseId} onValueChange={setSelectedCaisseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une caisse" />
                </SelectTrigger>
                <SelectContent>
                  {caisses
                    .filter((c) => c.actif)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nom} (#{c.numero})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fond de caisse (FCFA)</Label>
              <Input
                type="number"
                value={fondDeCaisse}
                onChange={(e) => setFondDeCaisse(e.target.value)}
                placeholder="10000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSessionDialog(false)}>
              Annuler
            </Button>
            <Button
              style={{ background: '#1D9E75' }}
              className="text-white"
              onClick={handleOpenSession}
              disabled={!selectedCaisseId}
            >
              Ouvrir la session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Close Session Dialog === */}
      <Dialog open={closeSessionDialog} onOpenChange={setCloseSessionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-600" />
              Fermer la session de caisse
            </DialogTitle>
          </DialogHeader>
          {activeSession && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Caisse</span>
                  <span className="font-medium">{activeSession.caisse.nom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fond de caisse</span>
                  <span>{fcfa(activeSession.fondDeCaisse)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total entrées</span>
                  <span className="text-[#1D9E75] font-medium">{fcfa(activeSession.totalEntrees)}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between font-semibold">
                  <span>Solde théorique</span>
                  <span>{fcfa(activeSession.fondDeCaisse + activeSession.totalEntrees - activeSession.totalSorties)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Solde physique compté (FCFA)</Label>
                <Input
                  type="number"
                  value={soldePhysique}
                  onChange={(e) => setSoldePhysique(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseSessionDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleCloseSession}
              disabled={closingSession}
            >
              {closingSession ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Fermer la session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Payment Dialog === */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" style={{ color: '#1D9E75' }} />
              Paiement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Total */}
            <div className="p-3 rounded-lg text-center" style={{ background: '#E1F5EE' }}>
              <p className="text-sm text-muted-foreground">Total à payer</p>
              <p className="text-2xl font-bold" style={{ color: '#085041' }}>
                {fcfa(montantTotal)}
              </p>
            </div>

            {/* Payment Lines */}
            <div className="space-y-3">
              {paiements.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select
                    value={p.mode}
                    onValueChange={(val) => updatePaiement(idx, 'mode', val)}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(modePaiementLabels) as ModePaiement[]).map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          <span className="flex items-center gap-2">
                            {modePaiementIcons[mode]}
                            {modePaiementLabels[mode]}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Montant"
                      value={p.montant}
                      onChange={(e) => updatePaiement(idx, 'montant', e.target.value)}
                      className="pr-2"
                    />
                  </div>
                  {paiements.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-500"
                      onClick={() => removePaiement(idx)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={addPaiement}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Ajouter un mode de paiement
            </Button>

            {/* Payment Summary */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total payé</span>
                <span className="font-medium">{fcfa(totalPaiements)}</span>
              </div>
              <div className="flex justify-between">
                <span>Reste à payer</span>
                <span
                  className={`font-medium ${resteAPayer > 0.5 ? 'text-red-600' : 'text-[#1D9E75]'}`}
                >
                  {fcfa(Math.max(resteAPayer, 0))}
                </span>
              </div>
              {totalPaiements > montantTotal && (
                <div className="flex justify-between">
                  <span>Monnaie à rendre</span>
                  <span className="font-medium text-amber-600">
                    {fcfa(totalPaiements - montantTotal)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(false)}>
              Annuler
            </Button>
            <Button
              style={{ background: '#1D9E75' }}
              className="text-white"
              onClick={handleCreateVente}
              disabled={processingSale || resteAPayer > 0.5 || totalPaiements === 0}
            >
              {processingSale ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Valider la vente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Sale Result Dialog === */}
      <Dialog
        open={!!saleResult}
        onOpenChange={(open) => {
          if (!open) setSaleResult(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {saleResult?.success ? (
                <CheckCircle2 className="h-6 w-6 text-[#1D9E75]" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
              {saleResult?.success ? 'Vente enregistrée !' : 'Erreur'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            {saleResult?.success ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  La vente a été enregistrée avec succès.
                </p>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    if (saleResult.venteId) handlePrintTicket(saleResult.venteId)
                  }}
                >
                  <Printer className="h-4 w-4" />
                  Imprimer le ticket
                </Button>
              </div>
            ) : (
              <p className="text-red-600">{saleResult?.error}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              style={{ background: '#1D9E75' }}
              className="text-white"
              onClick={() => setSaleResult(null)}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
