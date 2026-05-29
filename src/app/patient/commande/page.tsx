'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ShoppingCart, Trash2, Plus, Minus, MapPin, CreditCard, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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

export default function CommandePage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedPharmacie, setSelectedPharmacie] = useState<string | null>(null)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderRef, setOrderRef] = useState('')

  useEffect(() => {
    const savedCart = localStorage.getItem('medihelm_cart')
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    }

    const handleCartUpdate = () => {
      const updated = localStorage.getItem('medihelm_cart')
      if (updated) setCart(JSON.parse(updated))
    }
    window.addEventListener('cart-updated', handleCartUpdate)
    return () => window.removeEventListener('cart-updated', handleCartUpdate)
  }, [])

  const updateCart = (newCart: CartItem[]) => {
    setCart(newCart)
    localStorage.setItem('medihelm_cart', JSON.stringify(newCart))
    const event = new CustomEvent('cart-updated')
    window.dispatchEvent(event)
  }

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart]
    newCart[index].quantite += delta
    if (newCart[index].quantite <= 0) {
      newCart.splice(index, 1)
    }
    updateCart(newCart)
  }

  const removeItem = (index: number) => {
    const newCart = [...cart]
    newCart.splice(index, 1)
    updateCart(newCart)
  }

  const total = cart.reduce((sum, item) => sum + item.prixVente * item.quantite, 0)
  const uniquePharmacies = [...new Map(cart.map(item => [item.pharmacieId, item.pharmacieNom])).entries()]

  // Group items by pharmacy
  const itemsByPharmacy = cart.reduce((acc, item) => {
    if (!acc[item.pharmacieId]) acc[item.pharmacieId] = []
    acc[item.pharmacieId].push(item)
    return acc
  }, {} as Record<string, CartItem[]>)

  const handlePlaceOrder = async () => {
    const pharmacieId = selectedPharmacie || (uniquePharmacies.length > 0 ? uniquePharmacies[0][0] : null)
    if (!pharmacieId || cart.length === 0) return

    try {
      const res = await fetch('/api/patient/commandes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId,
          lignes: cart.map(item => ({
            medicamentId: item.medicamentId,
            quantite: item.quantite,
            prixUnitaire: item.prixVente,
          })),
          montantTotal: total,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setOrderRef(data.reference || data.id || 'CMD-' + Date.now())
        setOrderPlaced(true)
        updateCart([])
      }
    } catch {
      // error handling
    }
  }

  if (orderPlaced) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"
        >
          <Check className="h-10 w-10 text-green-600" />
        </motion.div>
        <h1 className="text-xl font-bold text-teal-800">Commande confirmée !</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Référence : <span className="font-mono font-semibold text-primary">{orderRef}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Vous recevrez une notification quand votre commande sera prête.
        </p>
        <div className="flex gap-2 mt-6">
          <Link href="/patient/suivi" className="flex-1">
            <Button className="w-full bg-primary hover:bg-teal-700">Suivre la commande</Button>
          </Link>
          <Link href="/patient/recherche" className="flex-1">
            <Button variant="outline" className="w-full border-primary text-primary">
              Continuer mes achats
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
        <ShoppingCart className="h-5 w-5 text-primary" />
        Mon panier
      </h1>

      {cart.length === 0 ? (
        <Card className="border-teal-200">
          <CardContent className="p-6 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">Votre panier est vide</p>
            <p className="text-xs text-muted-foreground mt-1">Recherchez des médicaments pour commencer</p>
            <Link href="/patient/recherche">
              <Button size="sm" className="mt-3 bg-primary hover:bg-teal-700">
                Rechercher
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Items by pharmacy */}
          {Object.entries(itemsByPharmacy).map(([pharmacieId, items]) => (
            <div key={pharmacieId}>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-3 w-3 text-primary" />
                <p className="text-xs font-semibold text-gray-900">{items[0].pharmacieNom}</p>
              </div>
              <Card className="border-teal-200">
                <CardContent className="p-3 space-y-3">
                  {items.map((item, idx) => {
                    const globalIdx = cart.indexOf(item)
                    return (
                      <div key={`${item.medicamentId}-${idx}`} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.nomCommercial}</p>
                          <p className="text-[10px] text-muted-foreground">{item.dci} — {item.dosage}</p>
                          <p className="text-xs font-semibold text-teal-800 mt-0.5">
                            {(item.prixVente * item.quantite).toLocaleString('fr-FR')} FCFA
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(globalIdx, -1)}
                            className="w-7 h-7 rounded-full border border-teal-200 flex items-center justify-center hover:bg-teal-50"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantite}</span>
                          <button
                            onClick={() => updateQuantity(globalIdx, 1)}
                            className="w-7 h-7 rounded-full border border-teal-200 flex items-center justify-center hover:bg-teal-50"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => removeItem(globalIdx)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-destructive hover:bg-red-50 ml-1"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          ))}

          {/* Select pharmacy for pickup */}
          {uniquePharmacies.length > 1 && (
            <div>
              <p className="text-xs font-semibold text-gray-900 mb-2">Pharmacie de retrait</p>
              <div className="space-y-2">
                {uniquePharmacies.map(([id, nom]) => (
                  <Card
                    key={id}
                    className={`cursor-pointer border-teal-200 ${selectedPharmacie === id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedPharmacie(id)}
                  >
                    <CardContent className="p-3 flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedPharmacie === id ? 'border-primary' : 'border-teal-200'
                      }`}>
                        {selectedPharmacie === id && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <span className="text-xs font-medium text-gray-900">{nom}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <Separator className="bg-teal-200" />

          {/* Order summary */}
          <Card className="border-teal-200">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="font-medium">{total.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Frais</span>
                <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700 border-0">Gratuit</Badge>
              </div>
              <Separator className="bg-teal-200" />
              <div className="flex items-center justify-between text-sm font-bold">
                <span>Total</span>
                <span className="text-primary text-lg">{total.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment placeholder */}
          <Card className="border-teal-200">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Mode de paiement
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Badge className="justify-center py-2 bg-primary text-white border-0 cursor-pointer">Mobile Money</Badge>
                <Badge className="justify-center py-2 bg-teal-50 text-teal-800 border-0 cursor-pointer">Espèces</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Paiement à la pharmacie lors du retrait
              </p>
            </CardContent>
          </Card>

          {/* Place Order */}
          <Button
            className="w-full h-12 bg-primary hover:bg-teal-700 text-base font-semibold"
            onClick={handlePlaceOrder}
            disabled={cart.length === 0}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Confirmer la commande
          </Button>
        </>
      )}
    </div>
  )
}
