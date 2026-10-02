'use client'

import { useState, useEffect, useCallback } from 'react'

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check pending offline ventes
    const checkPending = () => {
      try {
        const pending = JSON.parse(localStorage.getItem('offline_ventes') || '[]')
        setPendingCount(pending.length)
      } catch {
        setPendingCount(0)
      }
    }

    checkPending()
    const interval = setInterval(checkPending, 5000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  const syncPendingVentes = useCallback(async () => {
    if (syncing) return
    setSyncing(true)
    try {
      const pending = JSON.parse(localStorage.getItem('offline_ventes') || '[]')
      if (pending.length === 0) {
        setSyncing(false)
        return
      }

      const response = await fetch('/api/ventes/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ventes: pending }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.failed === 0) {
          localStorage.removeItem('offline_ventes')
          setPendingCount(0)
        } else {
          // Remove synced ventes, keep failed ones
          const failedRefs = new Set(result.errors.map((e: { reference: string }) => e.reference))
          const remaining = pending.filter((v: { reference: string }) => failedRefs.has(v.reference))
          localStorage.setItem('offline_ventes', JSON.stringify(remaining))
          setPendingCount(remaining.length)
        }
      }
    } catch (error) {
      console.error('Auto-sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }, [syncing])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncPendingVentes()
    }
  }, [isOnline, pendingCount, syncPendingVentes])

  if (isOnline && pendingCount === 0) return null

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium transition-all duration-300 ${
        isOnline
          ? 'bg-amber-500 text-white'
          : 'bg-red-600 text-white'
      }`}
    >
      {isOnline ? (
        <span className="flex items-center justify-center gap-2">
          {syncing ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <span>⟳</span>
          )}
          Connexion rétablie — {pendingCount} vente(s) en attente de synchronisation...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <span>✗</span>
          Mode hors-ligne — {pendingCount} vente(s) enregistrée(s) localement
        </span>
      )}
    </div>
  )
}
