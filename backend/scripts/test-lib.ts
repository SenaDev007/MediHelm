// ============================================================
// MediHelm — Librairie de test (harness)
// Login NextAuth + helpers HTTP + vérification persistance Prisma
// ============================================================

export const BASE = 'http://localhost:3000'

export interface TestResult {
  suite: string
  name: string
  status: 'PASS' | 'FAIL' | 'WARN'
  detail: string
}

export const results: TestResult[] = []

/** IP simulée unique par exécution (isole le rate-limit par IP) */
const RUN_IP = `10.42.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`

export function record(suite: string, name: string, status: TestResult['status'], detail: string) {
  results.push({ suite, name, status, detail })
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️'
  console.log(`${icon} [${suite}] ${name} — ${detail.slice(0, 150)}`)
}

/** Classeurs de cookies simples */
export class CookieJar {
  private cookies = new Map<string, string>()

  addFromResponse(res: Response) {
    const raw = res.headers.getSetCookie?.() ?? []
    for (const line of raw) {
      const [pair] = line.split(';')
      const idx = pair.indexOf('=')
      if (idx > 0) this.cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim())
    }
  }

  get header(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
  }
}

/** Connexion NextAuth par credentials — renvoie le jar avec le cookie de session */
export async function login(email: string, password: string): Promise<{ jar: CookieJar; ok: boolean; error?: string }> {
  const jar = new CookieJar()
  // 1. CSRF
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { headers: { 'x-forwarded-for': RUN_IP } })
  jar.addFromResponse(csrfRes)
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string }
  // 2. Callback credentials
  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: `${BASE}/`,
    json: 'true',
  })
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: jar.header, 'x-forwarded-for': RUN_IP },
    body,
    redirect: 'manual',
  })
  jar.addFromResponse(res)
  // 3. Vérifie la session
  const sessionRes = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: jar.header, 'x-forwarded-for': RUN_IP } })
  const session = (await sessionRes.json()) as { user?: { id?: string; role?: string } } | null
  const ok = !!session?.user?.id
  return { jar, ok, error: ok ? undefined : 'session vide' }
}

/** Requête API avec cookies */
export async function api(
  jar: CookieJar | null,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  opts?: { xff?: string }
): Promise<{ status: number; json: any; text: string }> {
  const headers: Record<string, string> = {
    Cookie: jar?.header ?? '',
    'x-forwarded-for': opts?.xff ?? RUN_IP,
  }
  let payload: string | undefined
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload, redirect: 'manual' })
  const text = await res.text()
  let json: any = null
  try { json = JSON.parse(text) } catch { /* pas du JSON */ }
  return { status: res.status, json, text }
}

/** Test de page (middleware routing) */
export async function page(
  jar: CookieJar | null,
  path: string
): Promise<{ status: number; location?: string; html: string }> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Cookie: jar?.header ?? '', 'x-forwarded-for': RUN_IP },
    redirect: 'manual',
  })
  const html = await res.text()
  return { status: res.status, location: res.headers.get('location') ?? undefined, html }
}

/** Résumé final */
export function summary() {
  const pass = results.filter(r => r.status === 'PASS').length
  const fail = results.filter(r => r.status === 'FAIL').length
  const warn = results.filter(r => r.status === 'WARN').length
  console.log(`\n========== RÉSUMÉ ==========`)
  console.log(`PASS: ${pass} | FAIL: ${fail} | WARN: ${warn} | TOTAL: ${results.length}`)
  if (fail > 0) {
    console.log(`\n--- ÉCHECS ---`)
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ❌ [${r.suite}] ${r.name}: ${r.detail.slice(0, 200)}`))
  }
  return { pass, fail, warn, total: results.length, results }
}
