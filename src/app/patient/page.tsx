'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Search, MapPin, ShieldCheck, ShoppingCart, Clock, Bell,
  Heart, Package, AlertTriangle, Star, ChevronRight, Pill,
  QrCode, Syringe, Shield
} from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GardeWidget } from '@/components/patient/garde-widget'
import { useEffect, useState } from 'react'

const quickActions = [
  { href: '/patient/recherche', icon: Search, label: 'Rechercher\nmédicament', color: 'bg-primary/10 text-primary' },
  { href: '/patient/pharmacies', icon: MapPin, label: 'Pharmacies\nproches', color: 'bg-blue-brand/10 text-blue-brand' },
  { href: '/patient/garde', icon: ShieldCheck, label: 'Pharmacie\nde garde', color: 'bg-amber-400/10 text-amber-600' },
  { href: '/patient/urgence', icon: Shield, label: 'Carte\nurgence', color: 'bg-red-500/10 text-red-600' },
  { href: '/patient/vaccinations', icon: Syringe, label: 'Carnet\nvaccination', color: 'bg-green-600/10 text-green-700' },
  { href: '/patient/comparateur', icon: Star, label: 'Comparateur\nprix', color: 'bg-purple-600/10 text-purple-700' },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export default function PatientHomePage() {
  const [activeAlerts, setActiveAlerts] = useState<Array<{ id: string; titre: string; niveauUrgence: string }>>([])
  const [activeOrders, setActiveOrders] = useState<Array<{ id: string; statut: string; pharmacie: string; montant: number }>>([])
  const [gardePharmacy, setGardePharmacy] = useState<{
    nom: string; adresse: string; telephone: string; heureDebut: string; heureFin: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHomeData() {
      try {
        // Fetch garde pharmacy
        const gardeRes = await fetch('/api/pharmacies?garde=aujourdhui')
        if (gardeRes.ok) {
          const gardeData = await gardeRes.json()
          if (gardeData.length > 0) {
            const g = gardeData[0]
            setGardePharmacy({
              nom: g.nom,
              adresse: g.adresse,
              telephone: g.telephone,
              heureDebut: g.planningsGarde?.[0]?.heureDebut
                ? new Date(g.planningsGarde[0].heureDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                : '08:00',
              heureFin: g.planningsGarde?.[0]?.heureFin
                ? new Date(g.planningsGarde[0].heureFin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                : '08:00',
            })
          }
        }

        // Fetch DPMED alerts
        const alertRes = await fetch('/api/alertes/dpmed')
        if (alertRes.ok) {
          const alertData = await alertRes.json()
          setActiveAlerts(alertData.slice(0, 3).map((a: { id: string; titre: string; niveauUrgence: string }) => ({
            id: a.id,
            titre: a.titre,
            niveauUrgence: a.niveauUrgence,
          })))
        }
      } catch {
        // Silently fail for home page data
      } finally {
        setLoading(false)
      }
    }
    fetchHomeData()
  }, [])

  return (
    <div className="px-4 py-4 space-y-5 max-w-lg mx-auto">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-xl font-bold text-teal-800">Bonjour 👋</h1>
        <p className="text-sm text-muted-foreground">
          Bienvenue sur MédiHelm Patient — votre santé, gratuitement.
        </p>
      </motion.div>

      {/* DPMED Alert Banner */}
      {activeAlerts.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Link href="/patient/rappels">
            <Card className="border-destructive/30 bg-red-50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-destructive">
                    Alerte DPMED — {activeAlerts.length} alerte(s) active(s)
                  </p>
                  <p className="text-xs text-red-700/70 truncate">{activeAlerts[0].titre}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-destructive/50 flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      )}

      {/* Quick Actions Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-3 gap-3"
      >
        {quickActions.map((action) => (
          <motion.div key={action.href} variants={item}>
            <Link href={action.href}>
              <Card className="hover:shadow-md transition-all border-teal-200 h-full">
                <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                  <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-medium text-gray-900 whitespace-pre-line leading-tight">
                    {action.label}
                  </span>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Pharmacie de garde */}
      {!loading && gardePharmacy && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <GardeWidget
            pharmacieNom={gardePharmacy.nom}
            pharmacieAdresse={gardePharmacy.adresse}
            pharmacieTelephone={gardePharmacy.telephone}
            heureDebut={gardePharmacy.heureDebut}
            heureFin={gardePharmacy.heureFin}
          />
        </motion.div>
      )}

      {/* Active Orders */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-900 text-sm">Mes commandes</h2>
          <Link href="/patient/suivi" className="text-xs text-primary hover:underline">
            Voir tout
          </Link>
        </div>
        {activeOrders.length > 0 ? (
          <div className="space-y-2">
            {activeOrders.map((order) => (
              <Card key={order.id} className="border-teal-200">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900">{order.pharmacie}</p>
                    <p className="text-[10px] text-muted-foreground">{order.statut}</p>
                  </div>
                  <p className="text-sm font-semibold text-teal-800">{order.montant.toLocaleString('fr-FR')} FCFA</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-teal-200">
            <CardContent className="p-4 text-center">
              <ShoppingCart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Aucune commande en cours</p>
              <Link href="/patient/recherche">
                <Button size="sm" className="mt-2 h-8 text-xs bg-primary hover:bg-teal-700">
                  Commander
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Medication Reminders */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-900 text-sm">Rappels médicaments</h2>
          <Link href="/patient/notifications" className="text-xs text-primary hover:underline">
            Configurer
          </Link>
        </div>
        <Card className="border-teal-200">
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Configurez vos rappels pour ne jamais oublier vos médicaments
            </p>
            <Link href="/patient/notifications">
              <Button size="sm" variant="outline" className="mt-2 h-8 text-xs border-primary text-primary">
                <Bell className="h-3 w-3 mr-1" />
                Activer les rappels
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Loyalty Summary */}
      <div>
        <Link href="/patient/fidelite">
          <Card className="border-amber-400/30 bg-gradient-to-r from-amber-50 to-teal-50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-900">Programme fidélité</p>
                <p className="text-[10px] text-muted-foreground">Gagnez des points à chaque achat</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Free banner */}
      <div className="text-center py-2">
        <Badge variant="secondary" className="bg-teal-50 text-teal-800 border-0 text-xs">
          <Shield className="h-3 w-3 mr-1" />
          MédiHelm Patient — 100% Gratuit
        </Badge>
      </div>
    </div>
  )
}
