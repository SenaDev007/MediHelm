'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bell, Pill, Package, AlertTriangle, Clock, Check, Eye, EyeOff, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface NotificationItem {
  id: string
  titre: string
  message: string
  type: string
  lu: boolean
  createdAt: string
}

const typeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  RAPPEL: { icon: Pill, color: 'bg-primary/10 text-primary' },
  COMMANDE: { icon: Package, color: 'bg-blue-500/10 text-blue-600' },
  DP_MED: { icon: AlertTriangle, color: 'bg-destructive/10 text-destructive' },
  FIDELITE: { icon: Clock, color: 'bg-amber-400/10 text-amber-600' },
  GARDE: { icon: Bell, color: 'bg-teal-800/10 text-teal-800' },
}

const filterTypes = [
  { key: 'ALL', label: 'Toutes' },
  { key: 'RAPPEL', label: 'Rappels' },
  { key: 'COMMANDE', label: 'Commandes' },
  { key: 'DP_MED', label: 'Alertes DPMED' },
  { key: 'FIDELITE', label: 'Fidélité' },
]

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const patientRes = await fetch('/api/patients')
      if (patientRes.ok) {
        const patients = await patientRes.json()
        if (Array.isArray(patients) && patients.length > 0) {
          const patientId = patients[0].id
          const res = await fetch(`/api/patient/notifications?patientId=${patientId}`)
          if (res.ok) {
            const data = await res.json()
            if (Array.isArray(data) && data.length > 0) {
              setNotifications(data.map((n: NotificationItem) => ({
                id: n.id,
                titre: n.titre,
                message: n.message,
                type: n.typeReference || 'RAPPEL',
                lu: n.lu,
                createdAt: n.createdAt,
              })))
            }
          }
        }
      }
    } catch {
      // fallback
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const filtered = filter === 'ALL'
    ? notifications
    : notifications.filter(n => n.type === filter)

  const unreadCount = notifications.filter(n => !n.lu).length

  const toggleRead = async (id: string, currentRead: boolean) => {
    setTogglingId(id)
    // Optimistic update
    setNotifications(notifications.map(n => n.id === id ? { ...n, lu: !currentRead } : n))
    try {
      const res = await fetch('/api/patient/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, lu: !currentRead }),
      })
      if (res.ok) {
        toast.success(currentRead ? 'Marquée comme non lue' : 'Marquée comme lue')
      } else {
        // Revert on failure
        setNotifications(notifications.map(n => n.id === id ? { ...n, lu: currentRead } : n))
        toast.error('Erreur lors de la mise à jour')
      }
    } catch {
      // Revert on failure
      setNotifications(notifications.map(n => n.id === id ? { ...n, lu: currentRead } : n))
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setTogglingId(null)
    }
  }

  const markAllAsRead = async () => {
    setNotifications(notifications.map(n => ({ ...n, lu: true })))
    try {
      const patientRes = await fetch('/api/patients')
      if (patientRes.ok) {
        const patients = await patientRes.json()
        if (Array.isArray(patients) && patients.length > 0) {
          await fetch(`/api/patient/notifications?patientId=${patients[0].id}`, { method: 'PUT' })
        }
      }
      toast.success('Toutes les notifications marquées comme lues')
    } catch {
      // optimistic
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notifications
          {unreadCount > 0 && (
            <Badge className="bg-destructive text-white border-0 text-[10px]">{unreadCount}</Badge>
          )}
        </h1>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" onClick={markAllAsRead}>
            <Check className="h-3 w-3 mr-1" />
            Tout lire
          </Button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {filterTypes.map(ft => (
          <Badge
            key={ft.key}
            variant={filter === ft.key ? 'default' : 'secondary'}
            className={`cursor-pointer text-[11px] whitespace-nowrap ${
              filter === ft.key
                ? 'bg-primary text-white border-0'
                : 'bg-teal-50 text-teal-800 border-0 hover:bg-teal-100'
            }`}
            onClick={() => setFilter(ft.key)}
          >
            {ft.label}
          </Badge>
        ))}
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {filtered.map((notification) => {
          const config = typeConfig[notification.type] || typeConfig.RAPPEL
          return (
            <motion.div key={notification.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              <Card
                className={`border-teal-200 transition-all ${
                  !notification.lu ? 'bg-primary/5 border-primary/30' : ''
                }`}
              >
                <CardContent className="p-3 flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
                    <config.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-gray-900">{notification.titre}</p>
                      {!notification.lu && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(notification.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 flex-shrink-0"
                    disabled={togglingId === notification.id}
                    onClick={() => toggleRead(notification.id, notification.lu)}
                    title={notification.lu ? 'Marquer comme non lue' : 'Marquer comme lue'}
                  >
                    {togglingId === notification.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : notification.lu ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-primary" />
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
        {filtered.length === 0 && (
          <Card className="border-teal-200">
            <CardContent className="p-6 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Aucune notification</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
