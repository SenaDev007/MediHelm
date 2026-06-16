'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePatientSession } from '@/hooks/use-patient-session'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Star, Gift, TrendingUp, Award, ShoppingBag, ArrowRight,
  Clock, MapPin, Percent, Crown, Sparkles, Info
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import Link from 'next/link'

interface FideliteData {
  patientId: string
  nom: string
  prenom: string
  pointsFidelite: number
  pharmacie: {
    id: string
    nom: string
  }
}

interface Transaction {
  id: string
  type: 'GAGNE' | 'UTILISE'
  points: number
  description: string
  date: string
  commandeId?: string
}

interface Reward {
  id: string
  nom: string
  description: string
  pointsRequis: number
  categorie: string
  disponible: boolean
}

interface Level {
  min: number
  name: string
  color: string
  icon: string
}

interface EarningRule {
  description: string
  points: string
  type: string
}

// Default levels shown before API data loads
const defaultLevels: Level[] = [
  { min: 0, name: 'Bronze', color: 'text-amber-700', icon: '🥉' },
  { min: 200, name: 'Argent', color: 'text-gray-500', icon: '🥈' },
  { min: 500, name: 'Or', color: 'text-yellow-600', icon: '🥇' },
  { min: 1000, name: 'Diamant', color: 'text-blue-600', icon: '💎' },
]

export default function FidelitePage() {
  const [fideliteData, setFideliteData] = useState<FideliteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'resume' | 'historique' | 'recompenses'>('resume')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [rewardsCatalog, setRewardsCatalog] = useState<Reward[]>([])
  const [levelNames, setLevelNames] = useState<Level[]>(defaultLevels)
  const [earningRules, setEarningRules] = useState<EarningRule[]>([])
  const [loadingRewards, setLoadingRewards] = useState(true)

  const { patientId, isLoading: sessionLoading } = usePatientSession()

  const fetchFidelite = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/patient/fidelite?patientId=${patientId}`)
      if (res.ok) {
        const data = await res.json()
        setFideliteData(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [patientId])

  const fetchTransactions = useCallback(async () => {
    if (!patientId) return
    try {
      const res = await fetch(`/api/patient/fidelite/transactions?patientId=${patientId}`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data)
      }
    } catch {
      // ignore
    }
  }, [patientId])

  useEffect(() => {
    fetchFidelite()
    fetchTransactions()
  }, [fetchFidelite, fetchTransactions])

  // Fetch rewards catalog from API
  useEffect(() => {
    async function fetchRewards() {
      setLoadingRewards(true)
      try {
        const res = await fetch('/api/patient/fidelite/recompenses')
        if (res.ok) {
          const data = await res.json()
          if (data.rewards) setRewardsCatalog(data.rewards)
          if (data.levels) setLevelNames(data.levels)
          if (data.earningRules) setEarningRules(data.earningRules)
        }
      } catch {
        // Keep defaults
      } finally {
        setLoadingRewards(false)
      }
    }
    fetchRewards()
  }, [])

  const points = fideliteData?.pointsFidelite || 0

  const getCurrentLevel = () => {
    for (let i = levelNames.length - 1; i >= 0; i--) {
      if (points >= levelNames[i].min) return levelNames[i]
    }
    return levelNames[0]
  }

  const getNextLevel = () => {
    const current = getCurrentLevel()
    const idx = levelNames.findIndex(l => l.name === current.name)
    return idx < levelNames.length - 1 ? levelNames[idx + 1] : null
  }

  const currentLevel = getCurrentLevel()
  const nextLevel = getNextLevel()
  const progressToNext = nextLevel
    ? ((points - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100
    : 100

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const earnedPoints = transactions.filter(t => t.type === 'GAGNE').reduce((sum, t) => sum + t.points, 0)
  const usedPoints = transactions.filter(t => t.type === 'UTILISE').reduce((sum, t) => sum + Math.abs(t.points), 0)

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          Programme fidélité
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gagnez des points à chaque achat en pharmacie
        </p>
      </div>

      {/* Session loading */}
      {sessionLoading && (
        <Card className="border-teal-200">
          <CardContent className="p-5 space-y-3">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {!sessionLoading && loading && (
        <Card className="border-teal-200">
          <CardContent className="p-5 space-y-3">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </CardContent>
        </Card>
      )}

      {/* Points summary card */}
      {!sessionLoading && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-amber-300 bg-gradient-to-br from-amber-50 via-teal-50 to-white">
            <CardContent className="p-5">
              {/* Level badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{currentLevel.icon}</span>
                  <div>
                    <p className={`text-sm font-bold ${currentLevel.color}`}>{currentLevel.name}</p>
                    <p className="text-[10px] text-muted-foreground">Niveau actuel</p>
                  </div>
                </div>
                {fideliteData?.pharmacie && (
                  <Badge variant="secondary" className="text-[10px] bg-teal-50 text-teal-800 border-0">
                    <MapPin className="h-3 w-3 mr-0.5" />
                    {fideliteData.pharmacie.nom}
                  </Badge>
                )}
              </div>

              {/* Points display */}
              <div className="text-center mb-4">
                <p className="text-4xl font-bold text-teal-800">{points}</p>
                <p className="text-xs text-muted-foreground">points de fidélité</p>
              </div>

              {/* Progress to next level */}
              {nextLevel && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className={currentLevel.color}>{currentLevel.name}</span>
                    <span className={nextLevel.color}>{nextLevel.icon} {nextLevel.name}</span>
                  </div>
                  <Progress value={progressToNext} className="h-2 bg-amber-100" />
                  <p className="text-[10px] text-muted-foreground text-center">
                    {nextLevel.min - points} points restants pour atteindre {nextLevel.name}
                  </p>
                </div>
              )}

              {!nextLevel && (
                <div className="text-center">
                  <Badge className="bg-amber-100 text-amber-800 border-0">
                    <Crown className="h-3 w-3 mr-1" />
                    Niveau maximum atteint !
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats row */}
      {!sessionLoading && !loading && (
        <div className="grid grid-cols-3 gap-2">
          <Card className="border-teal-200">
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-4 w-4 text-green-500 mx-auto mb-1" />
              <p className="text-sm font-bold text-gray-900">{earnedPoints}</p>
              <p className="text-[10px] text-muted-foreground">Gagnés</p>
            </CardContent>
          </Card>
          <Card className="border-teal-200">
            <CardContent className="p-3 text-center">
              <ShoppingBag className="h-4 w-4 text-orange-500 mx-auto mb-1" />
              <p className="text-sm font-bold text-gray-900">{usedPoints}</p>
              <p className="text-[10px] text-muted-foreground">Utilisés</p>
            </CardContent>
          </Card>
          <Card className="border-teal-200">
            <CardContent className="p-3 text-center">
              <Gift className="h-4 w-4 text-amber-500 mx-auto mb-1" />
              <p className="text-sm font-bold text-gray-900">{points}</p>
              <p className="text-[10px] text-muted-foreground">Disponibles</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-2">
        {[
          { key: 'resume' as const, label: 'Résumé', icon: Info },
          { key: 'historique' as const, label: 'Historique', icon: Clock },
          { key: 'recompenses' as const, label: 'Récompenses', icon: Gift },
        ].map(({ key, label, icon: Icon }) => (
          <Badge
            key={key}
            variant={activeTab === key ? 'default' : 'secondary'}
            className={`cursor-pointer text-xs ${
              activeTab === key
                ? 'bg-primary text-white border-0'
                : 'bg-teal-50 text-teal-800 border-0 hover:bg-teal-100'
            }`}
            onClick={() => setActiveTab(key)}
          >
            <Icon className="h-3 w-3 mr-1" />
            {label}
          </Badge>
        ))}
      </div>

      {/* Resume tab */}
      {activeTab === 'resume' && (
        <div className="space-y-3">
          <Card className="border-teal-200">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                Comment gagner des points ?
              </h3>
              <div className="space-y-2">
                {earningRules.length > 0 ? earningRules.map((rule) => (
                  <div key={rule.type} className="flex items-center justify-between p-2 bg-teal-50 rounded-lg">
                    <span className="text-xs text-gray-900">{rule.description}</span>
                    <Badge className={`text-[10px] border-0 ${rule.type === 'purchase' ? 'bg-primary/10 text-primary' : 'bg-amber-50 text-amber-700'}`}>{rule.points}</Badge>
                  </div>
                )) : (
                  <>
                    <div className="flex items-center justify-between p-2 bg-teal-50 rounded-lg">
                      <span className="text-xs text-gray-900">Chaque achat en pharmacie</span>
                      <Badge className="text-[10px] bg-primary/10 text-primary border-0">1 pt / 100 FCFA</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-teal-50 rounded-lg">
                      <span className="text-xs text-gray-900">Première commande</span>
                      <Badge className="text-[10px] bg-amber-50 text-amber-700 border-0">+50 pts</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-teal-50 rounded-lg">
                      <span className="text-xs text-gray-900">Parrainage d&apos;un ami</span>
                      <Badge className="text-[10px] bg-amber-50 text-amber-700 border-0">+100 pts</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-teal-50 rounded-lg">
                      <span className="text-xs text-gray-900">Avis sur une pharmacie</span>
                      <Badge className="text-[10px] bg-amber-50 text-amber-700 border-0">+20 pts</Badge>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Link href="/patient/recherche">
            <Button className="w-full h-10 bg-primary hover:bg-teal-700 text-sm">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Commander pour gagner des points
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}

      {/* History tab */}
      {activeTab === 'historique' && (
        <div className="space-y-2">
          {transactions.map((transaction, idx) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="border-teal-200">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    transaction.type === 'GAGNE' ? 'bg-green-50' : 'bg-orange-50'
                  }`}>
                    {transaction.type === 'GAGNE' ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <ShoppingBag className="h-4 w-4 text-orange-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{transaction.description}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(transaction.date)}</p>
                  </div>
                  <span className={`text-sm font-bold ${
                    transaction.type === 'GAGNE' ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {transaction.type === 'GAGNE' ? '+' : ''}{transaction.points} pts
                  </span>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {transactions.length === 0 && (
            <div className="text-center py-8">
              <Clock className="h-10 w-10 text-teal-200 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Aucune transaction pour le moment</p>
            </div>
          )}
        </div>
      )}

      {/* Rewards tab */}
      {activeTab === 'recompenses' && (
        <div className="space-y-3">
          {rewardsCatalog.map((reward, idx) => {
            const canRedeem = points >= reward.pointsRequis

            return (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className={`border-teal-200 ${!reward.disponible ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-amber-500" />
                          <h3 className="text-sm font-semibold text-gray-900">{reward.nom}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-6">{reward.description}</p>
                        <div className="flex items-center gap-2 mt-2 ml-6">
                          <Badge className={`text-[10px] border-0 ${
                            canRedeem && reward.disponible
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            <Star className="h-3 w-3 mr-0.5" />
                            {reward.pointsRequis} pts
                          </Badge>
                          <Badge className={`text-[10px] border-0 ${
                            reward.categorie === 'remise' ? 'bg-teal-50 text-teal-800'
                            : reward.categorie === 'livraison' ? 'bg-blue-50 text-blue-700'
                            : reward.categorie === 'service' ? 'bg-purple-50 text-purple-700'
                            : 'bg-amber-50 text-amber-700'
                          }`}>
                            {reward.categorie}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className={`h-8 text-xs ${
                          canRedeem && reward.disponible
                            ? 'bg-primary hover:bg-teal-700'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        disabled={!canRedeem || !reward.disponible}
                        onClick={() => {
                          if (canRedeem && reward.disponible) {
                            toast.info('Échange de points — Fonctionnalité à venir')
                          }
                        }}
                      >
                        Échanger
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
