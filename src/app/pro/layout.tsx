'use client'

import { AuthProvider, useAuth } from './auth-context'
import { ProSidebar } from '@/components/pro/sidebar'
import { ProTopbar } from '@/components/pro/topbar'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useState } from 'react'

function ProLayoutInner({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center animate-pulse">
            <svg className="w-6 h-6 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <span className="text-sm text-muted-foreground">Chargement de MédiHelm Pro...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <ProSidebar />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <ProSidebar />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <ProTopbar onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProLayoutInner>{children}</ProLayoutInner>
    </AuthProvider>
  )
}
