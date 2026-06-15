'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePatientSession } from '@/hooks/use-patient-session'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  ShoppingCart, Plus, Minus, Trash2, MapPin, CreditCard,
  Package, ShoppingBag, Loader2, Check, AlertCircle, Store,
  X, ArrowRight, ShieldCheck
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Link from 'next/link'

interface CartItem {
  medicamentId: string
  nomCommercial: string
  dci: string
  dosage: string
  forme: string
  prixVente: number
  pharmacieId: string
  pharmacieNom: string
  quantite: number
}

interface PharmacyOption {
  id: string
  nom: string
  adresse: string
  ville: string
  telephone: string
}

const CART_KEY = 'medihelm_cart'

export default function CommandePage() {
  const { patientId } = usePatientSession()
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'pharmacy' | 'payment' | 'confirm'>('cart')
  const [pharmacies, setPharmacies] = useState<PharmacyOption[]>([])
  const [selectedPharmacieId, setSelectedPharmacieId] = useState<string | null>(null)
  const [loadingPharmacies, setLoadingPharmacies] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_KEY)
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch {
        setCart([])
      }
    }
  }, [])

  // Save cart to localStorage
  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart)
    localStorage.setItem(CART_KEY, JSON.stringify(newCart))
    window.dispatchEvent(new CustomEvent('cart-updated'))
  }

  // Group items by pharmacy
  const itemsByPharmacy = cart.reduce<Record<string, CartItem[]>>((acc, item) => {
    if (!acc[item.pharmacieId]) acc[item.pharmacieId] = []
    acc[item.pharmacieId].push(item)
    return acc
  }, {})

  const totalByPharmacy = Object.entries(itemsByPharmacy).map(([pharmacieId, items]) => ({
    pharmacieId,
    pharmacieNom: items[0].pharmacieNom,
    items,
    total: items.reduce((sum, item) => sum + item.prixVente * item.quantite, 0),
  }))

  const grandTotal = cart.reduce((sum, item) => sum + item.prixVente * item.quantite, 0)
  const totalItems = cart.reduce((sum, item) => sum + item.quantite, 0)

  const updateQuantity = (medicamentId: string, pharmacieId: string, delta: number) => {
    const newCart = cart.map(item => {
      if (item.medicamentId === medicamentId && item.pharmacieId === pharmacieId) {
        const newQty = Math.max(0, item.quantite + delta)
        return { ...item, quantite: newQty }
      }
      return item
    }).filter(item => item.quantite > 0)
    saveCart(newCart)
  }

  const removeItem = (medicamentId: string, pharmacieId: string) => {
    const newCart = cart.filter(
      item => !(item.medicamentId === medicamentId && item.pharmacieId === pharmacieId)
    )
    saveCart(newCart)
    toast.success('Article retiré du panier')
  }

  const clearCart = () => {
    saveCart([])
    toast.success('Panier vidé')
  }

  // Fetch pharmacies for checkout
  const fetchPharmacies = useCallback(async () => {
    setLoadingPharmacies(true)
    try {
      const res = await fetch('/api/patient/pharmacies-proches')
      if (res.ok) {
        const data = await res.json()
        setPharmacies(data.map((p: { id: string; nom: string; adresse: string; ville: string; telephone: string }) => ({
          id: p.id,
          nom: p.nom,
          adresse: p.adresse,
          ville: p.ville,
          telephone: p.telephone,
        })))
        // Pre-select pharmacy from cart if only one
        if (totalByPharmacy.length === 1) {
          setSelectedPharmacieId(totalByPharmacy[0].pharmacieId)
        } else if (data.length > 0) {
          setSelectedPharmacieId(data[0].id)
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingPharmacies(false)
    }
  }, [])

  const handleCheckout = () => {
    setCheckoutStep('pharmacy')
    fetchPharmacies()
  }

  const handlePayment = () => {
    setCheckoutStep('payment')
  }

  const handleSubmitOrder = async () => {
    if (!selectedPharmacieId) {
      toast.error('Veuillez sélectionner une pharmacie')
      return
    }

    if (!patientId) {
      toast.error('Session patient non disponible')
      return
    }

    setSubmitting(true)
    try {
      const lignes = cart.map(item => ({
        medicamentId: item.medicamentId,
        dci: item.dci,
        quantite: item.quantite,
        prixUnitaire: item.prixVente,
      }))

      const res = await fetch('/api/patient/commandes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          pharmacieId: selectedPharmacieId,
          lignes,
          notes: 'Commande depuis l\'app patient',
        }),
      })

      if (res.ok) {
        setOrderSuccess(true)
        saveCart([])
        toast.success('Commande passée avec succès !')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erreur lors de la commande')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' FCFA'
  }

  // Success state
  if (orderSuccess) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="w-20 h-20 rounded-full bg-green-100 mx-auto flex items-center justify-center mb-4">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-teal-800 mb-2">Commande envoyée !</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Votre commande a été transmise à la pharmacie.
            Vous recevrez une notification de confirmation.
          </p>
          <div className="space-y-3">
            <Link href="/patient/suivi">
              <Button className="w-full h-11 bg-primary hover:bg-teal-700">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Suivre ma commande
              </Button>
            </Link>
            <Link href="/patient/recherche">
              <Button variant="outline" className="w-full h-11 border-teal-200">
                Continuer mes achats
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  // Empty cart
  if (cart.length === 0 && checkoutStep === 'cart') {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ShoppingCart className="h-16 w-16 text-teal-200 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-teal-800 mb-2">Votre panier est vide</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Recherchez des médicaments pour commencer vos achats
          </p>
          <Link href="/patient/recherche">
            <Button className="h-11 bg-primary hover:bg-teal-700">
              Rechercher un médicament
            </Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            {checkoutStep === 'cart' && 'Mon panier'}
            {checkoutStep === 'pharmacy' && 'Choisir la pharmacie'}
            {checkoutStep === 'payment' && 'Paiement'}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalItems} article{totalItems !== 1 ? 's' : ''} — {formatCurrency(grandTotal)}
          </p>
        </div>
        {checkoutStep === 'cart' && cart.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-destructive hover:text-red-700"
            onClick={clearCart}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Vider
          </Button>
        )}
        {checkoutStep !== 'cart' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setCheckoutStep(checkoutStep === 'payment' ? 'pharmacy' : 'cart')}
          >
            Retour
          </Button>
        )}
      </div>

      {/* Step indicator */}
      {checkoutStep !== 'cart' && (
        <div className="flex items-center gap-2">
          {['cart', 'pharmacy', 'payment'].map((step, idx) => {
            const stepLabels = ['Panier', 'Pharmacie', 'Paiement']
            const isActive = step === checkoutStep ||
              (step === 'cart' && (checkoutStep === 'pharmacy' || checkoutStep === 'payment' || checkoutStep === 'confirm')) ||
              (step === 'pharmacy' && checkoutStep === 'payment')
            return (
              <div key={step} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isActive ? 'bg-primary text-white' : 'bg-teal-50 text-muted-foreground'
                }`}>
                  {idx + 1}
                </div>
                <span className={`text-[10px] ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  {stepLabels[idx]}
                </span>
                {idx < 2 && <div className="flex-1 h-px bg-teal-100" />}
              </div>
            )
          })}
        </div>
      )}

      {/* CART STEP */}
      {checkoutStep === 'cart' && (
        <div className="space-y-3">
          {totalByPharmacy.map(({ pharmacieId, pharmacieNom, items, total }) => (
            <Card key={pharmacieId} className="border-teal-200">
              <CardContent className="p-4">
                {/* Pharmacy header */}
                <div className="flex items-center gap-2 mb-3">
                  <Store className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-semibold text-gray-900">{pharmacieNom}</h3>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={`${item.medicamentId}-${item.pharmacieId}`} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-medium text-gray-900 truncate">{item.nomCommercial}</h4>
                        <p className="text-[10px] text-muted-foreground">{item.dci} — {item.dosage}</p>
                        <p className="text-xs font-semibold text-teal-800 mt-0.5">
                          {formatCurrency(item.prixVente * item.quantite)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(item.medicamentId, item.pharmacieId, -1)}
                          className="w-7 h-7 rounded-full border border-teal-200 flex items-center justify-center hover:bg-teal-50"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-semibold w-6 text-center">{item.quantite}</span>
                        <button
                          onClick={() => updateQuantity(item.medicamentId, item.pharmacieId, 1)}
                          className="w-7 h-7 rounded-full border border-teal-200 flex items-center justify-center hover:bg-teal-50"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeItem(item.medicamentId, item.pharmacieId)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-red-50 ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-3 bg-teal-100" />

                {/* Subtotal */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Sous-total</span>
                  <span className="text-sm font-bold text-teal-800">{formatCurrency(total)}</span>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Grand total & checkout */}
          <Card className="border-primary/30 bg-gradient-to-br from-teal-50 to-white">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-teal-800">{formatCurrency(grandTotal)}</span>
              </div>
              <Button
                className="w-full h-11 bg-primary hover:bg-teal-700 text-sm font-semibold"
                onClick={handleCheckout}
              >
                Commander
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PHARMACY STEP */}
      {checkoutStep === 'pharmacy' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Sélectionnez la pharmacie où vous souhaitez récupérer votre commande
          </p>

          {loadingPharmacies ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="border-teal-200 animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-5 bg-teal-50 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-teal-50 rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {pharmacies.map((pharmacy) => (
                <motion.div
                  key={pharmacy.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card
                    className={`cursor-pointer transition-all ${
                      selectedPharmacieId === pharmacy.id
                        ? 'border-primary ring-1 ring-primary bg-teal-50'
                        : 'border-teal-200 hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedPharmacieId(pharmacy.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          selectedPharmacieId === pharmacy.id
                            ? 'border-primary bg-primary'
                            : 'border-teal-300'
                        }`}>
                          {selectedPharmacieId === pharmacy.id && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">{pharmacy.nom}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {pharmacy.adresse}, {pharmacy.ville}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          <Button
            className="w-full h-11 bg-primary hover:bg-teal-700 text-sm font-semibold"
            onClick={handlePayment}
            disabled={!selectedPharmacieId}
          >
            Continuer vers le paiement
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* PAYMENT STEP */}
      {checkoutStep === 'payment' && (
        <div className="space-y-3">
          {/* Order summary */}
          <Card className="border-teal-200">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-xs font-semibold text-gray-900">Récapitulatif</h3>
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={`${item.medicamentId}-${item.pharmacieId}`} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-900 truncate">{item.nomCommercial} x{item.quantite}</p>
                    </div>
                    <p className="text-xs font-medium text-teal-800 ml-2">
                      {formatCurrency(item.prixVente * item.quantite)}
                    </p>
                  </div>
                ))}
              </div>
              <Separator className="bg-teal-100" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">Total</span>
                <span className="text-lg font-bold text-teal-800">{formatCurrency(grandTotal)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Selected pharmacy */}
          {selectedPharmacieId && pharmacies.length > 0 && (
            <Card className="border-teal-200">
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold text-gray-900 mb-2">Pharmacie de retrait</h3>
                {(() => {
                  const p = pharmacies.find(ph => ph.id === selectedPharmacieId)
                  return p ? (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-900">{p.nom}</p>
                        <p className="text-[10px] text-muted-foreground">{p.adresse}, {p.ville}</p>
                      </div>
                    </div>
                  ) : null
                })()}
              </CardContent>
            </Card>
          )}

          {/* Payment method */}
          <Card className="border-teal-200">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-xs font-semibold text-gray-900">Mode de paiement</h3>
              <div className="space-y-2">
                {[
                  { id: 'fedapay', label: 'Fedapay', desc: 'Mobile Money, carte bancaire', icon: '💳' },
                  { id: 'wave', label: 'Wave', desc: 'Paiement mobile Wave', icon: '🌊' },
                  { id: 'mtn', label: 'MTN MoMo', desc: 'Mobile Money MTN', icon: '📱' },
                  { id: 'especes', label: 'Espèces', desc: 'Payer à la pharmacie', icon: '💵' },
                ].map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-teal-200 hover:border-primary/50 cursor-pointer transition-colors"
                  >
                    <span className="text-lg">{method.icon}</span>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900">{method.label}</p>
                      <p className="text-[10px] text-muted-foreground">{method.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Confirm button */}
          <Button
            className="w-full h-12 bg-primary hover:bg-teal-700 text-sm font-bold"
            onClick={handleSubmitOrder}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            {submitting ? 'Traitement en cours...' : `Confirmer — ${formatCurrency(grandTotal)}`}
          </Button>

          <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            Paiement sécurisé par Fedapay
          </p>
        </div>
      )}
    </div>
  )
}
