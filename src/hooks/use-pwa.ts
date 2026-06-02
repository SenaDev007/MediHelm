'use client'
import { useEffect, useState, useSyncExternalStore } from 'react'

// Helper to subscribe to online/offline events
function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getOnlineSnapshot() {
  return navigator.onLine
}

function getOnlineServerSnapshot() {
  return true
}

export function usePWA() {
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot)
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true
  })
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return { isInstalled, isOnline, updateAvailable }
}
