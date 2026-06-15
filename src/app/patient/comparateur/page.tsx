'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowUpDown, Search, MapPin, TrendingDown, TrendingUp,
  Pill, Store, Check, X, AlertTriangle, Loader2, Star,
  SlidersHorizontal, BarChart3, Phone
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Link from 'next/link'

interface CompareResult {
  pharmacieId: string
  pharmacieNom: string
  pharmacieAdresse: string
  pharmacieVille: string
  pharmacieTelephone: string
  prixVente: number
  distance: number | null
  stockDisponible: boolean
  estGarde: boolean
  medicamentId: string
  medicamentNom: string
  dci: string
  dosage: string
  forme: string
  estGenerique: boolean
}

type SortField = 'prix' | 'distance' | 'disponibilite'
type SortOrder = 'asc' | 'desc'

export default function ComparateurPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CompareResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchPerformed, setSearchPerformed] = useState(false)
  const [sortField, setSortField] = useState<SortField>('prix')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [filterDispo, setFilterDispo] = useState(false)
  const [filterGenerique, setFilterGenerique] = useState(false)

  const handleSearch = useCallback(async () => {
    if (query.length < 2) {
      toast.error('Saisissez au moins 2 caractères')
      return
    }

    setLoading(true)
    setSearchPerformed(true)
    try {
      const params = new URLSearchParams({ q: query })
      if (filterGenerique) params.set('generique', 'true')

      const res = await fetch(`/api/patient/recherche?${params}`)
      if (res.ok) {
        const data = await res.json()
        // Transform search results into compare format
        const compareResults: CompareResult[] = data.map((med: {
          id: string; nomCommercial: string; dci: string; dosage: string; forme: string;
          prixVente: number; estGenerique: boolean; pharmacieId: string; pharmacieNom: string;
          stockDisponible: boolean;
        }) => ({
          pharmacieId: med.pharmacieId,
          pharmacieNom: med.pharmacieNom,
          pharmacieAdresse: '',
          pharmacieVille: '',
          pharmacieTelephone: '',
          prixVente: med.prixVente,
          distance: null,
          stockDisponible: med.stockDisponible,
          estGarde: false,
          medicamentId: med.id,
          medicamentNom: med.nomCommercial,
          dci: med.dci,
          dosage: med.dosage,
          forme: med.forme,
          estGenerique: med.estGenerique,
        }))
        setResults(compareResults)
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }, [query, filterGenerique])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const filteredResults = results
    .filter(r => !filterDispo || r.stockDisponible)
    .sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'prix':
          comparison = a.prixVente - b.prixVente
          break
        case 'distance':
          comparison = (a.distance || 999) - (b.distance || 999)
          break
        case 'disponibilite':
          comparison = (a.stockDisponible ? 0 : 1) - (b.stockDisponible ? 0 : 1)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  const minPrice = results.length > 0 ? Math.min(...results.map(r => r.prixVente)) : 0
  const maxPrice = results.length > 0 ? Math.max(...results.map(r => r.prixVente)) : 0

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' FCFA'
  }

  const getPriceDiff = (price: number) => {
    if (price === minPrice && minPrice !== maxPrice) return { label: 'Meilleur prix', color: 'bg-green-50 text-green-700' }
    if (price === maxPrice && minPrice !== maxPrice) return { label: 'Prix le plus élevé', color: 'bg-red-50 text-red-700' }
    return null
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Comparateur de prix
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Comparez les prix des médicaments entre pharmacies
        </p>
      </div>

      {/* Search */}
      <Card className="border-teal-200">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un médicament..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-11 border-teal-200 focus:border-primary focus:ring-primary"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          {/* Filters row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              className="h-8 bg-primary hover:bg-teal-700"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Search className="h-3 w-3 mr-1" />}
              Comparer
            </Button>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={filterDispo}
                onChange={(e) => setFilterDispo(e.target.checked)}
                className="rounded border-teal-300 text-primary focus:ring-primary"
              />
              <span className="text-[11px] text-gray-700">En stock</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={filterGenerique}
                onChange={(e) => setFilterGenerique(e.target.checked)}
                className="rounded border-teal-300 text-primary focus:ring-primary"
              />
              <span className="text-[11px] text-gray-700">Générique</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Sort buttons */}
      {results.length > 0 && (
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Trier par :</span>
          {[
            { field: 'prix' as SortField, label: 'Prix', icon: TrendingDown },
            { field: 'distance' as SortField, label: 'Distance', icon: MapPin },
            { field: 'disponibilite' as SortField, label: 'Disponibilité', icon: Check },
          ].map(({ field, label, icon: Icon }) => (
            <Badge
              key={field}
              variant={sortField === field ? 'default' : 'secondary'}
              className={`cursor-pointer text-[11px] ${
                sortField === field
                  ? 'bg-primary text-white border-0'
                  : 'bg-teal-50 text-teal-800 border-0 hover:bg-teal-100'
              }`}
              onClick={() => toggleSort(field)}
            >
              <Icon className="h-3 w-3 mr-0.5" />
              {label}
              {sortField === field && (
                sortOrder === 'asc' ? ' ↑' : ' ↓'
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Price range summary */}
      {results.length > 1 && (
        <Card className="border-teal-200 bg-gradient-to-r from-teal-50 to-white">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground">Fourchette de prix</p>
              <p className="text-sm font-bold text-teal-800">
                {formatCurrency(minPrice)} — {formatCurrency(maxPrice)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Écart</p>
              <p className="text-sm font-bold text-amber-600">
                {formatCurrency(maxPrice - minPrice)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-teal-200">
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results table (as cards for mobile) */}
      {!loading && filteredResults.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{filteredResults.length} résultat(s)</p>
          {filteredResults.map((result, idx) => {
            const priceDiff = getPriceDiff(result.prixVente)
            const isBestPrice = result.prixVente === minPrice && minPrice !== maxPrice

            return (
              <motion.div
                key={`${result.pharmacieId}-${result.medicamentId}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className={`border-teal-200 ${isBestPrice ? 'border-green-300 ring-1 ring-green-200' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Pharmacy name */}
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-primary flex-shrink-0" />
                          <h3 className="text-sm font-semibold text-gray-900 truncate">{result.pharmacieNom}</h3>
                          {result.estGarde && (
                            <Badge className="text-[9px] bg-amber-500 text-white border-0">Garde</Badge>
                          )}
                        </div>

                        {/* Medicament info */}
                        <div className="ml-6 mt-1">
                          <p className="text-xs text-muted-foreground">{result.dci} — {result.dosage}</p>
                          {result.estGenerique && (
                            <Badge className="text-[9px] bg-teal-50 text-teal-800 border-0 mt-0.5">Générique</Badge>
                          )}
                        </div>

                        {/* Distance */}
                        {result.distance !== null && (
                          <p className="text-[11px] text-muted-foreground mt-1 ml-6 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {result.distance.toFixed(1)} km
                          </p>
                        )}

                        {/* Stock */}
                        <div className="ml-6 mt-1">
                          {result.stockDisponible ? (
                            <Badge className="text-[10px] bg-green-50 text-green-700 border-0">
                              <Check className="h-3 w-3 mr-0.5" /> En stock
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] bg-red-50 text-red-700 border-0">
                              <AlertTriangle className="h-3 w-3 mr-0.5" /> Rupture
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex flex-col items-end gap-1.5">
                        <p className={`text-base font-bold ${isBestPrice ? 'text-green-700' : 'text-teal-800'}`}>
                          {formatCurrency(result.prixVente)}
                        </p>
                        {priceDiff && (
                          <Badge className={`text-[9px] border-0 ${priceDiff.color}`}>
                            {isBestPrice ? <Star className="h-3 w-3 mr-0.5" /> : null}
                            {priceDiff.label}
                          </Badge>
                        )}
                        {result.pharmacieTelephone && (
                          <a href={`tel:${result.pharmacieTelephone}`}>
                            <Button size="sm" className="h-7 text-[10px] bg-primary hover:bg-teal-700">
                              <Phone className="h-3 w-3 mr-0.5" />
                              Appeler
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Empty states */}
      {!loading && searchPerformed && filteredResults.length === 0 && results.length > 0 && (
        <div className="text-center py-8">
          <SlidersHorizontal className="h-10 w-10 text-teal-200 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Aucun résultat avec ces filtres</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-xs"
            onClick={() => { setFilterDispo(false); setFilterGenerique(false) }}
          >
            Réinitialiser les filtres
          </Button>
        </div>
      )}

      {!loading && searchPerformed && results.length === 0 && (
        <div className="text-center py-8">
          <Pill className="h-12 w-12 text-teal-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">Aucun résultat</p>
          <p className="text-xs text-muted-foreground mt-1">
            Essayez avec un autre nom de médicament
          </p>
        </div>
      )}

      {!loading && !searchPerformed && (
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 text-teal-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">Comparez les prix</p>
          <p className="text-xs text-muted-foreground mt-1">
            Recherchez un médicament pour voir les prix dans différentes pharmacies
          </p>
        </div>
      )}

      {/* Info */}
      <Card className="border-teal-200 bg-teal-50">
        <CardContent className="p-3">
          <p className="text-[10px] text-teal-800 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
            Les prix peuvent varier. Vérifiez auprès de la pharmacie pour le prix exact.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
