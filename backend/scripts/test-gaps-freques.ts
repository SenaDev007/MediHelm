// ============================================================
// MediHelm — Tests des nouveaux gaps implémentés (revérification)
// 1. Rate limit login : 5 échecs → verrou 15 min (échecs uniquement)
// 2. Scan public (F-P12) : sans compte, contexte PATIENT
// 3. Vérification lot publique (F-P12)
// 4. Rétro-compat scan authentifié
// ============================================================
import { BASE, CookieJar, login, record, summary } from './test-lib'

async function main() {
  const SUITE = 'GAPS'

  // ─── 1. RATE LIMIT LOGIN (brute force) ───
  console.log('\n═══ 1. RATE LIMIT LOGIN ═══')
  const ip = `10.99.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`
  const attempt = async (email: string) => {
    const jar = new CookieJar()
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { headers: { 'x-forwarded-for': ip } })
    jar.addFromResponse(csrfRes)
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string }
    const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: jar.header, 'x-forwarded-for': ip },
      body: new URLSearchParams({ csrfToken, email, password: 'mauvais-mot-de-passe', callbackUrl: `${BASE}/`, json: 'true' }),
      redirect: 'manual',
    })
    const text = await res.text()
    return { status: res.status, text }
  }

  let refusNormaux = 0
  for (let i = 1; i <= 5; i++) {
    const r = await attempt('bruteforce@test.bj')
    if (r.status === 401 || r.status === 200) refusNormaux++
  }
  record(SUITE, 'LOGIN brute-force: 5 échecs traités (401 NextAuth)', refusNormaux === 5 ? 'PASS' : 'WARN',
    `${refusNormaux}/5 réponses reçues`)

  const r6 = await attempt('bruteforce@test.bj')
  const bodyDecoded = decodeURIComponent(r6.text)
  const verrou = bodyDecoded.includes('Trop de tentatives')
  record(SUITE, 'LOGIN brute-force: 6e tentative VERROUILLÉE', verrou ? 'PASS' : 'FAIL',
    verrou ? 'message "Trop de tentatives" présent' : `pas de verrou (status=${r6.status}, body=${r6.text.slice(0, 120)})`)

  // Un autre email depuis la même IP n'est pas verrouillé (clé = IP+email)
  const autre = await attempt('jamais-vu@test.bj')
  const autreDecoded = decodeURIComponent(autre.text)
  record(SUITE, 'LOGIN: verrou par IP+email (autre email non impacté)', autreDecoded.includes('Trop de tentatives') ? 'FAIL' : 'PASS',
    autreDecoded.includes('Trop de tentatives') ? 'verrou fuit vers autre email' : 'identifiants invalides classiques')

  // Login valide ne doit pas être consommé par les échecs d'un autre email
  const okSession = await login('admin@medihelm.bj', 'demo1234')
  record(SUITE, 'LOGIN valide fonctionnel (comptage échecs uniquement)', okSession.ok ? 'PASS' : 'FAIL',
    okSession.ok ? 'session ouverte' : okSession.error || 'échec')

  // ─── 2. SCAN PUBLIC (F-P12) ───
  console.log('\n═══ 2. SCAN PUBLIC SANS COMPTE ═══')
  const scanAnon = await fetch(`${BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ code: '3400930000000', contexte: 'PATIENT' }),
  })
  record(SUITE, 'SCAN anonyme: public (pas de 401)', scanAnon.status !== 401 ? 'PASS' : 'FAIL', `status=${scanAnon.status}`)
  if (scanAnon.ok) {
    const data = await scanAnon.json()
    record(SUITE, 'SCAN anonyme: réponse structurée', typeof data.status === 'string' ? 'PASS' : 'FAIL', `status=${data.status}`)
  }

  const scanVente = await fetch(`${BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ code: '3400930000000', contexte: 'VENTE' }),
  })
  record(SUITE, 'SCAN anonyme contexte VENTE: forcé en PATIENT (pas 401/403)',
    scanVente.status !== 401 && scanVente.status !== 403 ? 'PASS' : 'FAIL', `status=${scanVente.status}`)

  // ─── 3. VÉRIFICATION LOT PUBLIQUE (F-P12) ───
  console.log('\n═══ 3. VÉRIFICATION LOT PUBLIQUE ═══')
  const verif = await fetch(`${BASE}/api/patient/verifier`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ numeroLot: 'LOT-AMOX-001' }),
  })
  record(SUITE, 'VERIF lot anonyme: public (pas de 401)', verif.status !== 401 ? 'PASS' : 'FAIL', `status=${verif.status}`)
  if (verif.ok) {
    const data = await verif.json()
    record(SUITE, 'VERIF lot anonyme: structure valide', 'valide' in data ? 'PASS' : 'FAIL', JSON.stringify(data).slice(0, 100))
  }

  // ─── 4. RÉTRO-COMPAT: scan authentifié ───
  console.log('\n═══ 4. SCAN AUTHENTIFIÉ (rétro-compat) ═══')
  const session = await login('pharmacien@medihelm.bj', 'demo1234')
  if (session.ok) {
    const scanAuth = await fetch(`${BASE}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: session.jar.header },
      body: JSON.stringify({ code: '3400930000000', contexte: 'VENTE' }),
    })
    record(SUITE, 'SCAN authentifié: 200 (portée tenant)', scanAuth.status === 200 ? 'PASS' : 'FAIL', `status=${scanAuth.status}`)
  } else {
    record(SUITE, 'SCAN authentifié', 'WARN', 'login pharmacien indisponible')
  }

  const { fail } = summary()
  if (fail > 0) process.exit(1)
}

main().catch(e => { console.error('❌', e); process.exit(1) })
