// ============================================================
// MediHelm — Offline Sync Service
// Client-side sync: queue mutations, process on reconnect
// FEFO offline, CMUP offline, lastSync tracking
// Référence: MH-SPECS-2025-v2.0 — Offline Mode
// ============================================================

const DB_NAME = 'medihelm-offline'
const DB_VERSION = 1
const STORE_QUEUES = 'mutation-queue'
const STORE_CACHE = 'offline-cache'
const STORE_SYNC = 'sync-meta'

export interface OfflineMutation {
  id: string
  url: string
  method: string
  headers: Record<string, string>
  body: string
  timestamp: number
  pharmacieId?: string
  module?: string
  retries: number
}

export interface SyncMeta {
  key: string
  lastSyncedAt: string
  etag?: string
}

// Open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_QUEUES)) {
        db.createObjectStore(STORE_QUEUES, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(STORE_SYNC)) {
        db.createObjectStore(STORE_SYNC, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Queue a mutation for later sync
export async function queueMutation(mutation: Omit<OfflineMutation, 'id' | 'retries'>): Promise<string> {
  const db = await openDB()
  const id = crypto.randomUUID()
  const item: OfflineMutation = { ...mutation, id, retries: 0 }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUES, 'readwrite')
    tx.objectStore(STORE_QUEUES).add(item)
    tx.oncomplete = () => resolve(id)
    tx.onerror = () => reject(tx.error)
  })
}

// Get all pending mutations
export async function getPendingMutations(): Promise<OfflineMutation[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUES, 'readonly')
    const request = tx.objectStore(STORE_QUEUES).getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Process all pending mutations (called when back online)
export async function processPendingMutations(): Promise<{
  succeeded: number
  failed: number
  total: number
}> {
  const mutations = await getPendingMutations()
  let succeeded = 0
  let failed = 0

  for (const mutation of mutations) {
    try {
      const response = await fetch(mutation.url, {
        method: mutation.method,
        headers: {
          ...mutation.headers,
          'X-Offline-Sync': 'true',
          'X-Offline-Timestamp': String(mutation.timestamp),
        },
        body: mutation.body,
      })

      if (response.ok) {
        await removeMutation(mutation.id)
        succeeded++
      } else {
        mutation.retries++
        await updateMutation(mutation)
        failed++
      }
    } catch {
      mutation.retries++
      await updateMutation(mutation)
      failed++
    }
  }

  // Trigger service worker sync
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'TRIGGER_SYNC' })
  }

  return { succeeded, failed, total: mutations.length }
}

// Remove a mutation from the queue
async function removeMutation(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUES, 'readwrite')
    tx.objectStore(STORE_QUEUES).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Update a mutation (e.g., increment retries)
async function updateMutation(mutation: OfflineMutation): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUES, 'readwrite')
    tx.objectStore(STORE_QUEUES).put(mutation)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Cache data for offline use
export async function cacheOfflineData(key: string, data: unknown): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CACHE, 'readwrite')
    tx.objectStore(STORE_CACHE).put({ key, data, cachedAt: new Date().toISOString() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Get cached offline data
export async function getOfflineData<T>(key: string): Promise<T | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CACHE, 'readonly')
    const request = tx.objectStore(STORE_CACHE).get(key)
    request.onsuccess = () => resolve(request.result?.data ?? null)
    request.onerror = () => reject(request.error)
  })
}

// Set last sync timestamp
export async function setLastSync(key: string): Promise<void> {
  const db = await openDB()
  const meta: SyncMeta = { key, lastSyncedAt: new Date().toISOString() }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SYNC, 'readwrite')
    tx.objectStore(STORE_SYNC).put(meta)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Get last sync timestamp
export async function getLastSync(key: string): Promise<string | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SYNC, 'readonly')
    const request = tx.objectStore(STORE_SYNC).get(key)
    request.onsuccess = () => resolve(request.result?.lastSyncedAt ?? null)
    request.onerror = () => reject(request.error)
  })
}

// FEFO (First Expired, First Out) sorting for offline stock
export function sortFEFO<T extends { dateExpiration: string | Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.dateExpiration).getTime()
    const dateB = new Date(b.dateExpiration).getTime()
    return dateA - dateB
  })
}

// CMUP (Coût Moyen Unitaire Pondéré) calculation
export function calculateCMUP(
  existingQty: number,
  existingUnitCost: number,
  newQty: number,
  newUnitCost: number
): number {
  const totalValue = existingQty * existingUnitCost + newQty * newUnitCost
  const totalQty = existingQty + newQty
  return totalQty > 0 ? totalValue / totalQty : 0
}

// Register online/offline event listeners
export function registerConnectivityListeners(callbacks?: {
  onOnline?: () => void
  onOffline?: () => void
}): () => void {
  const handleOnline = () => {
    console.log('[MediHelm] Connexion rétablie — synchronisation...')
    processPendingMutations().then((result) => {
      console.log(`[MediHelm] Sync: ${result.succeeded}/${result.total} réussies`)
    })
    callbacks?.onOnline?.()
  }

  const handleOffline = () => {
    console.log('[MediHelm] Mode hors ligne activé')
    callbacks?.onOffline?.()
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

// Get online status
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}
