'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useSession, SessionProvider } from 'next-auth/react'

interface AdminUser {
  id: string
  nom: string
  prenom: string
  email: string
  role: string
  avatarUrl?: string
}

interface AdminAuthContextType {
  user: AdminUser | null
  isLoading: boolean
  isAuthenticated: boolean
  isPlatformAdmin: boolean
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isPlatformAdmin: false,
  logout: () => {},
})

function AdminAuthProviderInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'

  const user: AdminUser | null = session?.user
    ? {
        id: (session.user as Record<string, unknown>).id as string || '',
        nom: ((session.user as Record<string, unknown>).nom as string) || '',
        prenom: ((session.user as Record<string, unknown>).prenom as string) || '',
        email: session.user.email || '',
        role: ((session.user as Record<string, unknown>).roleName as string) || '',
        avatarUrl: (session.user as Record<string, unknown>).avatarUrl as string | undefined,
      }
    : null

  const roleName = (session?.user as Record<string, unknown>)?.roleName as string
  const isPlatformAdmin = roleName === 'PLATFORM_ADMIN'
  const isAuthenticated = !!session?.user && isPlatformAdmin

  const logout = useCallback(() => {
    window.location.href = '/api/auth/signout'
  }, [])

  return (
    <AdminAuthContext.Provider value={{ user, isLoading, isAuthenticated, isPlatformAdmin, logout }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      <AdminAuthProviderInner>{children}</AdminAuthProviderInner>
    </SessionProvider>
  )
}

export const useAdminAuth = () => useContext(AdminAuthContext)
