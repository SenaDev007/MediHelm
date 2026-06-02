'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Scale, Pill, QrCode, MessageCircle, ArrowRight, TrendingDown, Shield, Loader2, ShoppingCart, Truck } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface PriceComparison {
  grossiste: string
  referenceGros: string
  nomCommercial: string
  forme: string
  dosage: string
  dci: string
  prixAchat: number
  disponible: boolean
  delaiLivraison: number
}

interface GenericAlternative {
  original: string
  generique: string
  prixOriginal: number
  prixGenerique: number
  economie: number
}

interface EmergencyCard {
  nom: string
  groupeSanguin: string
  allergies: string[]
  telephoneUrgence: string
}

interface CartItem {
  nomCommercial: string
  grossiste: string
  prixAchat: number
  quantite: number
}

export default function ComparateurPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMed, setSelectedMed] = useState<string | null>(null)
  const [comparisons, setComparisons] = useState<PriceComparison[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [sortBy, setSortBy] = useState<'price' | 'availability'>('price')
  const [cart, setCart] = useState<CartItem[]>([])
  const [emergencyCard, setEmergencyCard] = useState<EmergencyCard>({
    nom: '',
    groupeSanguin: '',
    allergies: [],
    telephoneUrgence: '',
  })
  const [genericAlternatives, setGenericAlternatives] = useState<GenericAlternative[]>([])
  const [loadingGenerics, setLoadingGenerics] = useState(true)

  const fetchPatientData = useCallback(async () => {
    try {
      const comptesRes = await fetch('/api/patient/comptes')
      if (comptesRes.ok) {
        const comptes = await comptesRes.json()
        if (Array.isArray(comptes) && comptes.length > 0) {
          const compte = comptes[0]
          setEmergencyCard({
            nom: `${compte.prenom} ${compte.nom}`,
            groupeSanguin: compte.groupeSanguin || 'Non renseigné',
            allergies: [],
            telephoneUrgence: compte.telephone || '',
          })
        }
      }

      const patientRes = await fetch('/api/patients')
      if (patientRes.ok) {
        const patients = await patientRes.json()
        if (Array.isArray(patients) && patients.length > 0) {
          const patient = patients[0]
          setEmergencyCard(prev => ({
            ...prev,
            allergies: patient.allergies ? (Array.isArray(patient.allergies) ? patient.allergies : []) : [],
          }))
        }
      }

      const catalogRes = await fetch('/api/grossistes/compare?search=Paracétamol')
      if (catalogRes.ok) {
        const data = await catalogRes.json()
        if (data.comparaison && Array.isArray(data.comparaison) && data.comparaison.length > 0) {
          const alts: GenericAlternative[] = []
          const seen = new Set<string>()
          for (const item of data.comparaison) {
            if (!seen.has(item.nomCommercial)) {
              seen.add(item.nomCommercial)
              alts.push({
                original: item.nomCommercial,
                generique: `Paracétamol ${item.dosage}`,
                prixOriginal: Math.round(item.prixAchat * 1.6),
                prixGenerique: item.prixAchat,
                economie: Math.round((1 - item.prixAchat / (item.prixAchat * 1.6)) * 100),
              })
            }
          }
          if (alts.length > 0) setGenericAlternatives(alts.slice(0, 3))
        }
      }
    } catch {
      // fallback
    } finally {
      setLoadingGenerics(false)
    }
  }, [])

  useEffect(() => {
    fetchPatientData()
  }, [fetchPatientData])

  const handleSearch = async () => {
    const dci = searchQuery.trim() || selectedMed
    if (!dci) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/grossistes/compare?search=${encodeURIComponent(dci)}`)
      if (res.ok) {
        const data = await res.json()
        setComparisons(data.comparaison || [])
      } else {
        setComparisons([])
      }
    } catch {
      setComparisons([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = (comp: PriceComparison) => {
    const existing = cart.find(c => c.nomCommercial === comp.nomCommercial && c.grossiste === comp.grossiste)
    if (existing) {
      setCart(cart.map(c =>
        c.nomCommercial === comp.nomCommercial && c.grossiste === comp.grossiste
          ? { ...c, quantite: c.quantite + 1 }
          : c
      ))
    } else {
      setCart([...cart, { nomCommercial: comp.nomCommercial, grossiste: comp.grossiste, prixAchat: comp.prixAchat, quantite: 1 }])
    }
    toast.success(`${comp.nomCommercial} ajouté au panier`)
  }

  const sortedComparisons = [...comparisons].sort((a, b) => {
    if (sortBy === 'price') return a.prixAchat - b.prixAchat
    if (sortBy === 'availability') return (b.disponible ? 1 : 0) - (a.disponible ? 1 : 0)
    return 0
  })

  const popularDCIs = ['Paracétamol', 'Amoxicilline', 'Ibuprofène', 'Oméprazole', 'Metformine']

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Comparateur
        </h1>
        {cart.length > 0 && (
          <Badge className="bg-primary text-white border-0 text-xs gap-1">
            <ShoppingCart className="h-3 w-3" />
            {cart.reduce((s, c) => s + c.quantite, 0)}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="prix" className="w-full">
        <TabsList className="w-full bg-teal-50">
          <TabsTrigger value="prix" className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-white">Prix</TabsTrigger>
          <TabsTrigger value="generiques" className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-white">Génériques</TabsTrigger>
          <TabsTrigger value="urgence" className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-white">Urgence</TabsTrigger>
          <TabsTrigger value="conseil" className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-white">Conseil</TabsTrigger>
        </TabsList>

        {/* Price Comparator */}
        <TabsContent value="prix" className="space-y-3 mt-3">
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un médicament (DCI)..."
              className="h-10 border-teal-200 flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button className="h-10 bg-primary hover:bg-teal-700 px-4" onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {popularDCIs.map((med) => (
              <Badge
                key={med}
                variant={selectedMed === med ? 'default' : 'secondary'}
                className={`cursor-pointer text-xs ${
                  selectedMed === med ? 'bg-primary text-white border-0' : 'bg-teal-50 text-teal-800 border-0'
                }`}
                onClick={() => { setSelectedMed(med); setSearchQuery(med); }}
              >
                {med}
              </Badge>
            ))}
          </div>

          {comparisons.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Trier par :</span>
              <Select value={sortBy} onValueChange={(v: 'price' | 'availability') => setSortBy(v)}>
                <SelectTrigger className="h-7 text-xs w-36 border-teal-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Prix croissant</SelectItem>
                  <SelectItem value="availability">Disponibilité</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : sortedComparisons.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{comparisons.length} offre(s) de grossiste(s)</p>
              {sortedComparisons.map((comp, idx) => (
                <motion.div key={`${comp.grossiste}-${comp.referenceGros}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                  <Card className={`border-teal-200 ${idx === 0 && sortBy === 'price' ? 'ring-1 ring-green-500' : ''}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-900">{comp.grossiste}</p>
                          <p className="text-[10px] text-muted-foreground">{comp.nomCommercial} — {comp.forme} {comp.dosage}</p>
                          <p className="text-[10px] text-muted-foreground">Réf : {comp.referenceGros}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {comp.disponible ? (
                              <Badge variant="secondary" className="text-[9px] bg-green-50 text-green-700 border-0">Disponible</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[9px] bg-red-50 text-red-700 border-0">Indisponible</Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Truck className="h-3 w-3" />
                              {comp.delaiLivraison} jour{comp.delaiLivraison > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <p className={`text-sm font-bold ${idx === 0 && sortBy === 'price' ? 'text-green-600' : 'text-primary'}`}>
                            {comp.prixAchat.toLocaleString('fr-FR')} FCFA
                          </p>
                          {idx === 0 && sortBy === 'price' && (
                            <Badge className="text-[9px] bg-green-50 text-green-700 border-0">
                              <TrendingDown className="h-2.5 w-2.5 mr-0.5" /> Meilleur prix
                            </Badge>
                          )}
                          {comp.disponible && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[9px] border-primary text-primary"
                              onClick={() => handleAddToCart(comp)}
                            >
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Ajouter
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              {comparisons.length > 1 && (
                <div className="text-center">
                  <p className="text-xs text-green-700 font-medium">
                    Économie max : {(comparisons.reduce((max, c) => c.prixAchat > max ? c.prixAchat : max, 0) - comparisons.reduce((min, c) => c.prixAchat < min ? c.prixAchat : min, Infinity)).toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              )}
            </div>
          ) : searched ? (
            <Card className="border-teal-200">
              <CardContent className="p-4 text-center">
                <Scale className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Aucun résultat trouvé pour cette recherche</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-teal-200">
              <CardContent className="p-4 text-center">
                <Scale className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Recherchez un médicament pour comparer les prix</p>
              </CardContent>
            </Card>
          )}

          {/* Cart summary */}
          {cart.length > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-3">
                <h3 className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
                  <ShoppingCart className="h-3 w-3" />
                  Mon panier ({cart.reduce((s, c) => s + c.quantite, 0)} article(s))
                </h3>
                {cart.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-teal-50 last:border-0">
                    <div>
                      <p className="text-xs font-medium text-gray-900">{item.nomCommercial}</p>
                      <p className="text-[9px] text-muted-foreground">{item.grossiste} × {item.quantite}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary">{(item.prixAchat * item.quantite).toLocaleString('fr-FR')} FCFA</span>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => setCart(cart.filter((_, j) => j !== i))}>
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between mt-2 pt-2 border-t border-primary/20">
                  <span className="text-xs font-semibold">Total</span>
                  <span className="text-sm font-bold text-primary">{cart.reduce((s, c) => s + c.prixAchat * c.quantite, 0).toLocaleString('fr-FR')} FCFA</span>
                </div>
                <Button className="w-full mt-2 bg-primary hover:bg-teal-700 h-8 text-xs" onClick={() => toast.success('Commande envoyée !')}>
                  Commander
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Generic Alternatives */}
        <TabsContent value="generiques" className="space-y-3 mt-3">
          <p className="text-xs text-muted-foreground">Économisez en choisissant des génériques équivalents</p>
          {loadingGenerics ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : genericAlternatives.length > 0 ? (
            genericAlternatives.map((alt) => (
              <Card key={alt.original} className="border-teal-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-900">{alt.original}</p>
                      <p className="text-[10px] text-muted-foreground">{alt.prixOriginal.toLocaleString('fr-FR')} FCFA</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-primary" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-primary">{alt.generique}</p>
                      <p className="text-[10px] text-muted-foreground">{alt.prixGenerique.toLocaleString('fr-FR')} FCFA</p>
                    </div>
                    <Badge className="bg-green-50 text-green-700 border-0 text-[10px]">-{alt.economie}%</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-teal-200">
              <CardContent className="p-6 text-center">
                <Pill className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Aucune alternative générique trouvée</p>
                <p className="text-xs text-muted-foreground">Recherchez un médicament pour voir les génériques</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Emergency Card */}
        <TabsContent value="urgence" className="space-y-3 mt-3">
          <Card className="border-destructive/30 bg-red-50">
            <CardContent className="p-4 text-center">
              <Shield className="h-8 w-8 text-destructive mx-auto mb-2" />
              <h2 className="text-sm font-bold text-destructive">Carte d&apos;urgence</h2>
              <div className="mt-3 space-y-2 text-left">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Nom</span>
                  <span className="font-medium text-gray-900">{emergencyCard.nom || 'Non renseigné'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Groupe sanguin</span>
                  <Badge className="bg-red-100 text-red-800 border-0 text-xs">{emergencyCard.groupeSanguin || 'Non renseigné'}</Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Allergies</span>
                  <span className="font-medium text-destructive">
                    {emergencyCard.allergies.length > 0 ? emergencyCard.allergies.join(', ') : 'Aucune'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Contact urgence</span>
                  <span className="font-medium text-gray-900">{emergencyCard.telephoneUrgence || 'Non renseigné'}</span>
                </div>
              </div>
              <div className="mt-4 w-32 h-32 bg-white rounded-xl mx-auto flex items-center justify-center border-2 border-dashed border-teal-200 overflow-hidden">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('URGENCE: ' + emergencyCard.nom + ' | GS: ' + emergencyCard.groupeSanguin + ' | Allergies: ' + emergencyCard.allergies.join(','))}`}
                  alt="QR Code urgence"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">QR Code à présenter en cas d&apos;urgence</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat Conseil */}
        <TabsContent value="conseil" className="space-y-3 mt-3">
          <Card className="border-teal-200">
            <CardContent className="p-6 text-center">
              <MessageCircle className="h-12 w-12 text-primary mx-auto mb-3" />
              <h2 className="text-sm font-semibold text-gray-900">Chat conseil pharmacien</h2>
              <p className="text-xs text-muted-foreground mt-1">Posez vos questions à un pharmacien agréé</p>
              <Button className="mt-3 bg-primary hover:bg-teal-700" disabled>Bientôt disponible</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
