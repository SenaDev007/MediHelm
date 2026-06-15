"use client"

import { Bell, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface GrossisteTopbarProps {
  grossisteName: string
  notificationCount?: number
}

export function GrossisteTopbar({ grossisteName, notificationCount = 0 }: GrossisteTopbarProps) {
  return (
    <header className="flex items-center justify-between border-b border-sidebar-border bg-card px-6 py-3">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-foreground hidden sm:block">
          Portail Grossistes
        </h2>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            className="pl-9 h-9 bg-muted/50 border-border/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {notificationCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-destructive text-white text-[10px]">
                  {notificationCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Nouvelle commande reçue</span>
                <span className="text-xs text-muted-foreground">Il y a 5 minutes</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Commande CMD-0842 confirmée</span>
                <span className="text-xs text-muted-foreground">Il y a 30 minutes</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Alerte stock bas — Paracétamol</span>
                <span className="text-xs text-muted-foreground">Il y a 2 heures</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                  {grossisteName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden md:block">{grossisteName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{grossisteName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Mon profil</DropdownMenuItem>
            <DropdownMenuItem>Paramètres API</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Déconnexion</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
