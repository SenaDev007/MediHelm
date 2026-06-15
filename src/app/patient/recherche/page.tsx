'use client'

import { useState, useEffect, useCallback } from 'react'
import { SearchBar } from '@/components/patient/search-bar'
import { MedicationCard } from '@/components/patient/medication-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Filter, SlidersHorizontal, X, Pill, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface MedicamentResult {
  id: string
  nomCommercial: string
  dci: string
  dosage: string
  forme: string
  prixVente: number
  estGenerique: boolean
  estRemboursable: boolean
  pharmacieNom: string
  pharmacieId: string
  stockDisponible: boolean
  categorieATC?: { code: string; nom: string } | null
}

const filterOptions = {
  categories: ['Antibiotiques', 'Antalgiques', 'Anti-inflammatoires', 'Antihypertenseurs', 'Antidiabétiques', 'Vitamines'],
  priceRanges: [
    { label: '< 1 000 FCFA', min: 0, max: 1000 },
    { label: '1 000 - 5 000 FCFA', min: 1000, max: 5000 },
    { label: '5 000 - 10 000 FCFA', min: 5000, max: 10000 },
    { label: '> 10 000 FCFA', min: 10000, max: Infinity },
  ],
}

export default function RecherchePage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MedicamentResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedPriceRange, setSelectedPriceRange] = useState<number | null>(null)
  const [filterRemboursable, setFilterRemboursable] = useState(false)
  const [filterGenerique, setFilterGenerique] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [searchPerformed, setSearchPerformed] = useState(false)

  // Autocomplete suggestions
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/patient/recherche?q=${encodeURIComponent(query)}&limit=5&suggestions=true`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.suggestions || [])
        }
      } catch {
        // ignore
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Main search
  const performSearch = useCallback(async () => {
    if (query.length < 2) return
    setLoading(true)
    setSearchPerformed(true)
    try {
      const params = new URLSearchParams({ q: query })
      if (selectedCategory) params.set('categorie', selectedCategory)
      if (selectedPriceRange !== null) {
        params.set('prixMin', filterOptions.priceRanges[selectedPriceRange].min.toString())
        if (filterOptions.priceRanges[selectedPriceRange].max !== Infinity) {
          params.set('prixMax', filterOptions.priceRanges[selectedPriceRange].max.toString())
        }
      }
      if (filterRemboursable) params.set('remboursable', 'true')
      if (filterGenerique) params.set('generique', 'true')

      const res = await fetch(`/api/patient/recherche?${params}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [query, selectedCategory, selectedPriceRange, filterRemboursable, filterGenerique])

  useEffect(() => {
    if (query.length >= 2) {
      performSearch()
    } else {
      setResults([])
      setSearchPerformed(false)
    }
  }, [query, selectedCategory, selectedPriceRange, filterRemboursable, filterGenerique, performSearch])

  const handleAddToCart = (med: MedicamentResult) => {
    const cart = JSON.parse(localStorage.getItem('medihelm_cart') || '[]')
    const existingIndex = cart.findIndex((item: { medicamentId: string; pharmacieId: string }) => item.medicamentId === med.id && item.pharmacieId === med.pharmacieId)
    if (existingIndex >= 0) {
      cart[existingIndex].quantite += 1
    } else {
      cart.push({
        medicamentId: med.id,
        nomCommercial: med.nomCommercial,
        dci: med.dci,
        dosage: med.dosage,
        forme: med.forme,
        prixVente: med.prixVente,
        pharmacieId: med.pharmacieId,
        pharmacieNom: med.pharmacieNom,
        quantite: 1,
      })
    }
    localStorage.setItem('medihelm_cart', JSON.stringify(cart))
    // Show brief feedback
    const event = new CustomEvent('cart-updated')
    window.dispatchEvent(event)
  }

  const hasActiveFilters = selectedCategory || selectedPriceRange !== null || filterRemboursable || filterGenerique

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      {/* Search Bar */}
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Rechercher par nom, DCI, pathologie..."
        suggestions={suggestions}
        onSuggestionClick={(s) => {
          setQuery(s)
          setSuggestions([])
        }}
      />

      {/* Filter Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs border-teal-200"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="h-3 w-3 mr-1" />
          Filtres
          {hasActiveFilters && (
            <span className="ml-1 w-2 h-2 rounded-full bg-primary" />
          )}
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => {
              setSelectedCategory(null)
              setSelectedPriceRange(null)
              setFilterRemboursable(false)
              setFilterGenerique(false)
            }}
          >
            <X className="h-3 w-3 mr-1" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-xl border border-teal-200 p-4 space-y-3">
              {/* Category filter */}
              <div>
                <p className="text-xs font-semibold text-gray-900 mb-2">Catégorie</p>
                <div className="flex flex-wrap gap-1.5">
                  {filterOptions.categories.map((cat) => (
                    <Badge
                      key={cat}
                      variant={selectedCategory === cat ? 'default' : 'secondary'}
                      className={`cursor-pointer text-[11px] ${
                        selectedCategory === cat
                          ? 'bg-primary text-white border-0'
                          : 'bg-teal-50 text-teal-800 border-0 hover:bg-teal-100'
                      }`}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Price range filter */}
              <div>
                <p className="text-xs font-semibold text-gray-900 mb-2">Prix</p>
                <div className="flex flex-wrap gap-1.5">
                  {filterOptions.priceRanges.map((range, idx) => (
                    <Badge
                      key={idx}
                      variant={selectedPriceRange === idx ? 'default' : 'secondary'}
                      className={`cursor-pointer text-[11px] ${
                        selectedPriceRange === idx
                          ? 'bg-primary text-white border-0'
                          : 'bg-teal-50 text-teal-800 border-0 hover:bg-teal-100'
                      }`}
                      onClick={() => setSelectedPriceRange(selectedPriceRange === idx ? null : idx)}
                    >
                      {range.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Toggle filters */}
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterRemboursable}
                    onChange={(e) => setFilterRemboursable(e.target.checked)}
                    className="rounded border-teal-300 text-primary focus:ring-primary"
                  />
                  <span className="text-xs text-gray-900">Remboursable</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterGenerique}
                    onChange={(e) => setFilterGenerique(e.target.checked)}
                    className="rounded border-teal-300 text-primary focus:ring-primary"
                  />
                  <span className="text-xs text-gray-900">Générique</span>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-teal-200 p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 flex-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{results.length} résultat(s)</p>
          {results.map((med) => (
            <MedicationCard
              key={`${med.id}-${med.pharmacieId}`}
              id={med.id}
              nomCommercial={med.nomCommercial}
              dci={med.dci}
              dosage={med.dosage}
              forme={med.forme}
              prixVente={med.prixVente}
              estGenerique={med.estGenerique}
              estRemboursable={med.estRemboursable}
              pharmacieNom={med.pharmacieNom}
              stockDisponible={med.stockDisponible}
              onAddToCart={() => handleAddToCart(med)}
            />
          ))}
        </div>
      )}

      {!loading && searchPerformed && results.length === 0 && (
        <div className="text-center py-8">
          <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">Aucun médicament trouvé</p>
          <p className="text-xs text-muted-foreground mt-1">
            Essayez avec un autre terme de recherche ou modifiez les filtres
          </p>
        </div>
      )}

      {!loading && !searchPerformed && (
        <div className="text-center py-8">
          <Search className="h-12 w-12 text-teal-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">Recherchez un médicament</p>
          <p className="text-xs text-muted-foreground mt-1">
            Par nom commercial, DCI, pathologie ou code ATC
          </p>
        </div>
      )}
    </div>
  )
}
