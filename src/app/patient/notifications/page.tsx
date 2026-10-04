'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePatientSession } from '@/hooks/use-patient-session'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Bell, Check, CheckCheck, Trash2, Filter, Clock, Package,
  AlertTriangle, ShieldCheck, Star, Syringe, ShoppingBag,
  Settings, Info, BellOff, BellRing, ChevronDown, ChevronUp
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Link from 'next/link'

interface Notification {
  id: string
  titre: string
  message: string
  type: string
  lue: boolean
  createdAt: string
  lien?: string
}

type NotificationType = 'COMMANDE' | 'ALERTE' | 'RAPPEL' | 'VACCINATION' | 'FIDELITE' | 'SYSTEME'

const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  COMMANDE: { icon: Package, color: 'bg-blue-50 text-blue-700', label: 'Commande' },
  ALERTE: { icon: AlertTriangle, color: 'bg-red-50 text-red-700', label: 'Alerte DPMED' },
  RAPPEL: { icon: Clock, color: 'bg-amber-50 text-amber-700', label: 'Rappel' },
  VACCINATION: { icon: Syringe, color: 'bg-green-50 text-green-700', label: 'Vaccination' },
  FIDELITE: { icon: Star, color: 'bg-purple-50 text-purple-700', label: 'Fidélité' },
  SYSTEME: { icon: Info, color: 'bg-teal-50 text-teal-800', label: 'Système' },
}



export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'toutes' | 'non_lues' | NotificationType>('toutes')
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState({
    commandes: true,
    alertes: true,
    rappels: true,
    vaccinations: true,
    fidelite: true,
    systeme: false,
  })

  const { userId, isLoading: sessionLoading } = usePatientSession()

  const fetchNotifications = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/patient/notifications?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.data || [])
      } else {
        setNotifications([])
      }
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, lue: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, lue: true })))
    toast.success('Toutes les notifications marquées comme lues')
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    toast.success('Notification supprimée')
  }

  const nonLuesCount = notifications.filter(n => !n.lue).length

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'toutes') return true
    if (filter === 'non_lues') return !n.lue
    return n.type === filter
  })

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'À l\'instant'
    if (minutes < 60) return `Il y a ${minutes} min`
    if (hours < 24) return `Il y a ${hours}h`
    if (days < 7) return `Il y a ${days}j`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const typeFilters = Object.entries(typeConfig).map(([key, { label }]) => ({
    key: key as NotificationType,
    label,
    count: notifications.filter(n => n.type === key).length,
  }))

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifications
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {nonLuesCount > 0 ? `${nonLuesCount} non lue${nonLuesCount !== 1 ? 's' : ''}` : 'Tout est à jour'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {nonLuesCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-primary"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Tout lire
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Notification preferences */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-teal-200">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-1">
                  <BellRing className="h-3 w-3" />
                  Préférences de notification
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'commandes' as const, label: 'Commandes', desc: 'Statut de vos commandes' },
                    { key: 'alertes' as const, label: 'Alertes DPMED', desc: 'Rappels et alertes sanitaires' },
                    { key: 'rappels' as const, label: 'Rappels médicaments', desc: 'Prise de médicaments' },
                    { key: 'vaccinations' as const, label: 'Vaccinations', desc: 'Rappels de vaccination' },
                    { key: 'fidelite' as const, label: 'Fidélité', desc: 'Points et récompenses' },
                    { key: 'systeme' as const, label: 'Système', desc: 'Mises à jour et informations' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-900">{label}</p>
                        <p className="text-[10px] text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={preferences[key]}
                        onCheckedChange={(checked) =>
                          setPreferences({ ...preferences, [key]: checked })
                        }
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        <Badge
          variant={filter === 'toutes' ? 'default' : 'secondary'}
          className={`cursor-pointer text-[11px] ${
            filter === 'toutes'
              ? 'bg-primary text-white border-0'
              : 'bg-teal-50 text-teal-800 border-0 hover:bg-teal-100'
          }`}
          onClick={() => setFilter('toutes')}
        >
          Toutes ({notifications.length})
        </Badge>
        <Badge
          variant={filter === 'non_lues' ? 'default' : 'secondary'}
          className={`cursor-pointer text-[11px] ${
            filter === 'non_lues'
              ? 'bg-primary text-white border-0'
              : 'bg-teal-50 text-teal-800 border-0 hover:bg-teal-100'
          }`}
          onClick={() => setFilter('non_lues')}
        >
          Non lues ({nonLuesCount})
        </Badge>
        {typeFilters.filter(t => t.count > 0).map(({ key, label, count }) => (
          <Badge
            key={key}
            variant={filter === key ? 'default' : 'secondary'}
            className={`cursor-pointer text-[11px] ${
              filter === key
                ? 'bg-primary text-white border-0'
                : 'bg-teal-50 text-teal-800 border-0 hover:bg-teal-100'
            }`}
            onClick={() => setFilter(key)}
          >
            {label} ({count})
          </Badge>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-teal-200">
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Notification list */}
      {!loading && filteredNotifications.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filteredNotifications.map((notification, idx) => {
              const config = typeConfig[notification.type] || typeConfig.SYSTEME
              const Icon = config.icon

              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: idx * 0.05 }}
                  layout
                >
                  <Card className={`border-teal-200 ${!notification.lue ? 'bg-primary/[0.03] border-primary/20' : ''}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                {!notification.lue && (
                                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                                )}
                                <h3 className={`text-xs font-semibold text-gray-900 ${!notification.lue ? '' : 'font-medium'}`}>
                                  {notification.titre}
                                </h3>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(notification.createdAt)}
                                </span>
                                <Badge className={`text-[9px] border-0 ${config.color}`}>
                                  {config.label}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-2">
                            {notification.lien && (
                              <Link href={notification.lien}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px] border-primary text-primary"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  Voir
                                </Button>
                              </Link>
                            )}
                            {!notification.lue && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] text-muted-foreground"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <Check className="h-3 w-3 mr-0.5" />
                                Marquer lu
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] text-muted-foreground hover:text-destructive ml-auto"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredNotifications.length === 0 && (
        <div className="text-center py-8">
          {filter === 'non_lues' ? (
            <>
              <BellOff className="h-12 w-12 text-teal-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900">Aucune notification non lue</p>
              <p className="text-xs text-muted-foreground mt-1">Vous êtes à jour !</p>
            </>
          ) : (
            <>
              <Bell className="h-12 w-12 text-teal-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900">Aucune notification</p>
              <p className="text-xs text-muted-foreground mt-1">
                Vos notifications apparaîtront ici
              </p>
            </>
          )}
        </div>
      )}

      {/* Bottom info */}
      {!loading && notifications.length > 0 && (
        <Card className="border-teal-200 bg-teal-50">
          <CardContent className="p-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-primary flex-shrink-0" />
            <p className="text-[10px] text-teal-800">
              Les notifications sont conservées pendant 30 jours. Configurez vos préférences
              pour ne recevoir que ce qui vous intéresse.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
