'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Bell, Search, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useState, useEffect } from 'react'

interface NotificationItem {
  id: string
  titre: string
  message: string
  createdAt: string
  lu: boolean
}

export function ProTopbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const { user, pharmacie } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (pharmacie?.id) {
      fetch(`/api/utilisateurs?pharmacieId=${pharmacie.id}`)
        .then(res => res.ok ? res.json() : [])
        .then(() => {
          // Fetch notifications for the pharmacy
          // For now, use the alertes op data
          fetch(`/api/stocks/alertes?pharmacieId=${pharmacie.id}`)
            .then(res => res.ok ? res.json() : [])
            .then(data => {
              const notifs = (data || []).slice(0, 5).map((a: { id: string; lot: { medicament: { nomCommercial: string } }; joursRestants: number }) => ({
                id: a.id,
                titre: 'Alerte expiration',
                message: `${a.lot?.medicament?.nomCommercial || 'Médicament'} — ${a.joursRestants}j restants`,
                createdAt: new Date().toISOString(),
                lu: false,
              }))
              setNotifications(notifs)
            })
            .catch(() => {})
        })
        .catch(() => {})
    }
  }, [pharmacie?.id])

  const unreadCount = notifications.filter(n => !n.lu).length

  const initials = user
    ? `${user.prenom.charAt(0)}${user.nom.charAt(0)}`
    : 'MH'

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 gap-4 shrink-0">
      {/* Left: Mobile menu + Search */}
      <div className="flex items-center gap-3 flex-1">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-foreground"
          onClick={onToggleSidebar}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="relative max-w-md flex-1 hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher médicament, patient, vente..."
            className="pl-9 h-9 bg-muted/50 border-border/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-foreground">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-destructive text-white">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-3 border-b">
              <h4 className="font-semibold text-sm">Notifications</h4>
            </div>
            <ScrollArea className="max-h-72">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Aucune notification
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="flex flex-col gap-1 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-0"
                    >
                      <span className="text-sm font-medium">{notif.titre}</span>
                      <span className="text-xs text-muted-foreground">{notif.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-xs font-medium">
                  {user ? `${user.prenom} ${user.nom}` : 'Utilisateur'}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {user?.role || 'Rôle'}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              {user ? `${user.prenom} ${user.nom}` : 'Utilisateur'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Mon profil</DropdownMenuItem>
            <DropdownMenuItem>Paramètres</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
