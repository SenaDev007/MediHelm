'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  isOnline,
  getPendingMutations,
  processPendingMutations,
  registerConnectivityListeners,
} from './offline-sync'

export interface OfflineStatus {
  isOnline: boolean
  pendingCount: number
  isSyncing: boolean
  lastSyncAt: string | null
}

export function useOffline() {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: isOnline(),
    pendingCount: 0,
    isSyncing: false,
    lastSyncAt: null,
  })

  // Refresh pending count
  const refreshPendingCount = useCallback(async () => {
    const mutations = await getPendingMutations()
    setStatus((prev) => ({
      ...prev,
      pendingCount: mutations.length,
    }))
  }, [])

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    setStatus((prev) => ({ ...prev, isSyncing: true }))
    try {
      const result = await processPendingMutations()
      await refreshPendingCount()
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: new Date().toISOString(),
      }))
      return result
    } catch {
      setStatus((prev) => ({ ...prev, isSyncing: false }))
      return { succeeded: 0, failed: 0, total: 0 }
    }
  }, [refreshPendingCount])

  // Register listeners on mount
  useEffect(() => {
    refreshPendingCount()

    const cleanup = registerConnectivityListeners({
      onOnline: () => {
        setStatus((prev) => ({ ...prev, isOnline: true }))
        triggerSync()
      },
      onOffline: () => {
        setStatus((prev) => ({ ...prev, isOnline: false }))
      },
    })

    // Poll pending count every 30s
    const interval = setInterval(refreshPendingCount, 30000)

    return () => {
      cleanup()
      clearInterval(interval)
    }
  }, [refreshPendingCount, triggerSync])

  return { ...status, triggerSync, refreshPendingCount }
}
