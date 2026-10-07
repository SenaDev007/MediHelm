// ============================================================
// MediHelm — Service Worker v3.0 (Offline Mode)
//
// v3 — CORRECTIF CRITIQUE de stratégie de cache :
//   • NAVIGATIONS (pages HTML) : NETWORK-FIRST. Une application
//     Next.js référence des chunks /_next/static/ horodatés par
//     déploiement Vercel (?dpl=…) — servir un HTML périmé depuis
//     le cache provoquait des crashs « Une erreur est survenue »
//     après chaque redéploiement (mélange HTML ancien / chunks
//     récents). Le HTML est désormais TOUJOURS frais en ligne ;
//     le cache ne sert qu'au fallback hors-ligne.
//   • CHUNKS /_next/static/ : cache-first (immuables, hashés par
//     contenu — ne changent jamais pour une URL donnée).
//   • TUILES de fond de carte (CARTO CDN) : cache-first (immuables).
//   • API : network-first avec repli cache (inchangé).
//   • Versions de cache passées en -v3 : les caches -v2 pollués
//     (HTML figés d'anciens déploiements) sont PURGÉS chez tous
//     les clients existants à l'activation.
// ============================================================

const CACHE_NAME = 'medihelm-v3'
const STATIC_CACHE = 'medihelm-static-v3'
const PAGE_CACHE = 'medihelm-pages-v3'
const API_CACHE = 'medihelm-api-v3'
const OFFLINE_QUEUE = 'medihelm-offline-queue'

// Static assets to pre-cache — uniquement des fichiers IMMUABLES.
// (Jamais de HTML ici : voir commentaire d'en-tête.)
const PRE_CACHE_URLS = [
  '/offline.html',
  '/logo-MediHelm.png',
  '/manifest.json',
]

// Install event — pre-cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      // add() individuel + catch : une URL absente ne doit JAMAIS
      // faire échouer l'installation (sinon le SW ne se met jamais
      // à jour et le bug de cache perdure chez le client).
      await Promise.all(
        PRE_CACHE_URLS.map((u) => cache.add(u).catch(() => {}))
      )
    })
  )
  self.skipWaiting()
})

// Activate event — clean old caches (v1, v2, …)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (key) =>
              key !== CACHE_NAME &&
              key !== STATIC_CACHE &&
              key !== PAGE_CACHE &&
              key !== API_CACHE &&
              key !== OFFLINE_QUEUE
          )
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

  // Requêtes d'autres origines (tiles CARTO exceptées) : laisser le
  // navigateur gérer (HTTP cache standard) — le SW ne s'en mêle plus.
  if (url.origin !== self.location.origin) {
    if (/(basemaps\.cartocdn\.com|tile\.openstreetmap\.org)/.test(url.hostname)) {
      event.respondWith(cacheFirstWithNetwork(request))
    }
    return
  }

  // API requests — Network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request))
    return
  }

  // ─── NAVIGATIONS (pages HTML) — network-first OBLIGATOIRE ─────
  // request.mode === 'navigate' : chargements de documents. C'est
  // le correctif central : le HTML servi est toujours celui du
  // déploiement courant ; ses références de chunks sont donc
  // toujours résolubles.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirstForPages(request))
    return
  }

  // ─── Assets IMMUABLES — cache-first (sans risque) ─────────────
  // Chunks Next.js (hashés par contenu, paramètre ?dpl= stable par
  // URL), style de carte auto-hébergé, images optimisées.
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/_next/image') ||
    url.pathname.startsWith('/map/') ||
    /^\/(logo-|favicon|manifest|icons?\/|sw\.js|offline\.html)/.test(url.pathname)
  ) {
    event.respondWith(cacheFirstWithNetwork(request))
    return
  }

  // Tout le reste (même origine) — network-first avec repli cache,
  // puis offline.html en dernier recours.
  event.respondWith(networkFirstForPages(request))
})

// Network-first for page navigations — frais en ligne, cache hors-ligne
async function networkFirstForPages(request) {
  try {
    const response = await fetch(request)
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(PAGE_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return (
      (await caches.match('/offline.html')) ||
      new Response('MediHelm est hors ligne.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    )
  }
}

// Cache-first strategy (for immutable static assets)
async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok && response.type === 'basic') {
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
