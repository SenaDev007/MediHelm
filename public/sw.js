// ============================================================
// MediHelm — Service Worker v2.0 (Offline Mode)
// Features: Cache-first for static assets, Network-first for API,
// Background sync, Offline queue for mutations
// ============================================================

const CACHE_NAME = 'medihelm-v2'
const STATIC_CACHE = 'medihelm-static-v2'
const API_CACHE = 'medihelm-api-v2'
const OFFLINE_QUEUE = 'medihelm-offline-queue'

// Static assets to pre-cache
const PRE_CACHE_URLS = [
  '/',
  '/connexion',
  '/offline.html',
  '/logo-MediHelm.png',
  '/manifest.json',
]

// Install event — pre-cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRE_CACHE_URLS))
  )
  self.skipWaiting()
})

// Activate event — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Fetch event — routing strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests for caching (mutations handled by queue)
  if (request.method !== 'GET') {
    // Queue mutation requests when offline
    if (!navigator.onLine) {
      event.respondWith(queueRequest(request))
      return
    }
    return
  }

  // API requests — Network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request))
    return
  }

  // Static assets — Cache-first
  event.respondWith(cacheFirstWithNetwork(request))
})

// Cache-first strategy (for static assets)
async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return caches.match('/offline.html')
  }
}

// Network-first strategy (for API)
async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(API_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// Queue mutation request for later sync
async function queueRequest(request) {
  const body = await request.clone().text()
  const queueItem = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body,
    timestamp: Date.now(),
    id: crypto.randomUUID(),
  }

  // Store in IndexedDB-like storage (use Cache API as workaround)
  const cache = await caches.open(OFFLINE_QUEUE)
  const response = new Response(JSON.stringify(queueItem), {
    headers: { 'Content-Type': 'application/json' },
  })
  await cache.put(new Request(`offline-queue:${queueItem.id}`), response)

  // Return accepted response
  return new Response(
    JSON.stringify({
      queued: true,
      id: queueItem.id,
      message: 'Requête mise en file — sera synchronisée quand la connexion sera rétablie.',
    }),
    { status: 202, headers: { 'Content-Type': 'application/json' } }
  )
}

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'medihelm-sync') {
    event.waitUntil(processOfflineQueue())
  }
})

// Process queued requests when back online
async function processOfflineQueue() {
  const cache = await caches.open(OFFLINE_QUEUE)
  const keys = await cache.keys()

  for (const key of keys) {
    const match = key.url.match(/offline-queue:(.+)$/)
    if (!match) continue

    const response = await cache.match(key)
    if (!response) continue

    const item = await response.json()

    try {
      const fetchResponse = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      })

      if (fetchResponse.ok) {
        await cache.delete(key)
        // Notify clients of successful sync
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SYNC_SUCCESS',
              id: item.id,
              url: item.url,
            })
          })
        })
      }
    } catch {
      // Still offline, keep in queue
    }
  }
}

// Message handler for manual sync trigger
self.addEventListener('message', (event) => {
  if (event.data?.type === 'TRIGGER_SYNC') {
    self.registration.sync.register('medihelm-sync')
  }
})
