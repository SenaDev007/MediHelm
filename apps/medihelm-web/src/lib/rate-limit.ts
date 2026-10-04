// ============================================================
// MediHelm — Rate Limiting System
// Token bucket / sliding window rate limiter using an
// in-memory store with IP-based tracking and periodic cleanup.
// For production, replace with Redis-based rate limiting.
// ============================================================

interface RateLimitEntry {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  maxRequests: number
  /** Window duration in milliseconds */
  windowMs: number
}

export const RATE_LIMITS = {
  // Auth endpoints: 5 attempts per 15 minutes per IP
  AUTH_LOGIN: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
  AUTH_REGISTER: { maxRequests: 3, windowMs: 60 * 60 * 1000 },
  AUTH_RESET: { maxRequests: 3, windowMs: 60 * 60 * 1000 },

  // General API: 100 requests per minute per IP
  API_GENERAL: { maxRequests: 100, windowMs: 60 * 1000 },

  // Mutation endpoints: 30 requests per minute per IP
  API_MUTATION: { maxRequests: 30, windowMs: 60 * 1000 },

  // Search/recherche: 20 requests per minute per IP
  SEARCH: { maxRequests: 20, windowMs: 60 * 1000 },

  // File uploads: 10 per hour
  UPLOAD: { maxRequests: 10, windowMs: 60 * 60 * 1000 },

  // Fedapay payments: 5 per minute
  PAYMENT: { maxRequests: 5, windowMs: 60 * 1000 },
} as const

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const entry = store.get(identifier)

  if (!entry || now > entry.resetTime) {
    // New window
    const resetTime = now + config.windowMs
    store.set(identifier, { count: 1, resetTime })
    return { allowed: true, remaining: config.maxRequests - 1, resetTime }
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime }
  }

  entry.count++
  return { allowed: true, remaining: config.maxRequests - entry.count, resetTime: entry.resetTime }
}

/**
 * Extract client IP from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  return 'unknown'
}

/**
 * Rate limit middleware helper for API routes
 * Returns null if allowed, or a Response if rate limited
 */
export function rateLimit(request: Request, config: RateLimitConfig): Response | null {
  const ip = getClientIp(request)
  const result = checkRateLimit(`${ip}`, config)

  if (!result.allowed) {
    return Response.json(
      {
        error: 'Trop de requêtes. Veuillez réessayer plus tard.',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
        },
      }
    )
  }

  return null
}
