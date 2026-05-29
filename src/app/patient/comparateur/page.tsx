'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Scale, Pill, QrCode, MessageCircle, ArrowRight, TrendingDown, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

interface PriceComparison {
  pharmacieNom: string
  prixVente: number
  estGenerique: boolean
  distance: number
}

const mockComparisons: Record<string, PriceComparison[]> = {
  'Paracétamol': [
    { pharmacieNom: 'Pharmacie Centrale', prixVente: 500, estGenerique: true, distance: 0.5 },
    { pharmacieNom: 'Pharmacie du Plateau', prixVente: 650, estGenerique: false, distance: 1.2 },
    { pharmacieNom: 'Pharmacie Haie Vive', prixVente: 550, estGenerique: true, distance: 2.1 },
    { pharmacieNom: 'Pharmacie Akpakpa', prixVente: 700, estGenerique: false, distance: 3.5 },
  ],
  'Amoxicilline': [
    { pharmacieNom: 'Pharmacie Centrale', prixVente: 2500, estGenerique: false, distance: 0.5 },
    { pharmacieNom: 'Pharmacie du Plateau', prixVente: 2200, estGenerique: true, distance: 1.2 },
    { pharmacieNom: 'Pharmacie Haie Vive', prixVente: 2800, estGenerique: false, distance: 2.1 },
  ],
}

const genericAlternatives = [
  { original: 'Doliprane 1000mg', generique: 'Paracétamol 1000mg', prixOriginal: 800, prixGenerique: 350, economie: 56 },
  { original: 'Augmentin 1g', generique: 'Amoxicilline/Ac. Clav. 1g', prixOriginal: 5500, prixGenerique: 2800, economie: 49 },
  { original: 'Xanax 0.5mg', generique: 'Alprazolam 0.5mg', prixOriginal: 3200, prixGenerique: 1500, economie: 53 },
]

export default function ComparateurPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMed, setSelectedMed] = useState<string | null>(null)
  const [emergencyCard] = useState({
    nom: 'Jean Doe',
    groupeSanguin: 'O+',
    allergies: ['Pénicilline'],
    telephoneUrgence: '+229 97 00 00 00',
  })

  const comparisons = selectedMed ? mockComparisons[selectedMed] || [] : []

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
        <Scale className="h-5 w-5 text-primary" />
        Comparateur
      </h1>

      <Tabs defaultValue="prix" className="w-full">
        <TabsList className="w-full bg-teal-50">
          <TabsTrigger value="prix" className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
            Prix
          </TabsTrigger>
          <TabsTrigger value="generiques" className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
            Génériques
          </TabsTrigger>
          <TabsTrigger value="urgence" className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
            Urgence
          </TabsTrigger>
          <TabsTrigger value="conseil" className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
            Conseil
          </TabsTrigger>
        </TabsList>

        {/* Price Comparator */}
        <TabsContent value="prix" className="space-y-3 mt-3">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un médicament..."
            className="h-10 border-teal-200"
          />
          <div className="flex gap-1.5 flex-wrap">
            {Object.keys(mockComparisons).map((med) => (
              <Badge
                key={med}
                variant={selectedMed === med ? 'default' : 'secondary'}
                className={`cursor-pointer text-xs ${
                  selectedMed === med ? 'bg-primary text-white border-0' : 'bg-teal-50 text-teal-800 border-0'
                }`}
                onClick={() => setSelectedMed(med)}
              >
                {med}
              </Badge>
            ))}
          </div>

          {comparisons.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{comparisons.length} pharmacie(s)</p>
              {comparisons.sort((a, b) => a.prixVente - b.prixVente).map((comp, idx) => (
                <motion.div key={comp.pharmacieNom} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                  <Card className={`border-teal-200 ${idx === 0 ? 'ring-1 ring-primary' : ''}`}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{comp.pharmacieNom}</p>
                        <p className="text-[10px] text-muted-foreground">{comp.distance.toFixed(1)} km</p>
                        {comp.estGenerique && (
                          <Badge variant="secondary" className="text-[9px] bg-teal-50 text-teal-800 border-0 mt-0.5">
                            Générique
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{comp.prixVente.toLocaleString('fr-FR')} FCFA</p>
                        {idx === 0 && (
                          <Badge className="text-[9px] bg-green-50 text-green-700 border-0">
                            <TrendingDown className="h-2.5 w-2.5 mr-0.5" /> Meilleur prix
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="border-teal-200">
              <CardContent className="p-4 text-center">
                <Scale className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Sélectionnez un médicament pour comparer les prix</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Generic Alternatives */}
        <TabsContent value="generiques" className="space-y-3 mt-3">
          <p className="text-xs text-muted-foreground">
            Économisez en choisissant des génériques équivalents
          </p>
          {genericAlternatives.map((alt) => (
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
                  <Badge className="bg-green-50 text-green-700 border-0 text-[10px]">
                    -{alt.economie}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
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
                  <span className="font-medium text-gray-900">{emergencyCard.nom}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Groupe sanguin</span>
                  <Badge className="bg-red-100 text-red-800 border-0 text-xs">{emergencyCard.groupeSanguin}</Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Allergies</span>
                  <span className="font-medium text-destructive">{emergencyCard.allergies.join(', ')}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Contact urgence</span>
                  <span className="font-medium text-gray-900">{emergencyCard.telephoneUrgence}</span>
                </div>
              </div>
              <div className="mt-4 w-32 h-32 bg-white rounded-xl mx-auto flex items-center justify-center border-2 border-dashed border-teal-200">
                <QrCode className="h-16 w-16 text-teal-300" />
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
              <p className="text-xs text-muted-foreground mt-1">
                Posez vos questions à un pharmacien agréé
              </p>
              <Button className="mt-3 bg-primary hover:bg-teal-700" disabled>
                Bientôt disponible
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
