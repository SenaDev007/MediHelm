// ============================================================
// MediHelm — Test du flux d'authentification refactorisé
// (sessions persistées en base, tous espaces, multi-tenant)
// ============================================================

import { PrismaClient } from '@prisma/client'
import { login, record, results, CookieJar, BASE } from './test-lib'

const prisma = new PrismaClient()

async function api(jar: CookieJar, path: string): Promise<{ status: number; body: string }> {
  const res = await fetch(`${BASE}${path}`, { headers: { cookie: jar.header } })
  const body = await res.text().catch(() => '')
  return { status: res.status, body }
}

async function getSessionUser(jar: CookieJar): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${BASE}/api/auth/session`, { headers: { cookie: jar.header } })
  if (!res.ok) return null
  const data = (await res.json()) as { user?: Record<string, unknown> }
  return data?.user && (data.user as Record<string, unknown>).id ? data.user : null
}

async function signout(jar: CookieJar): Promise<void> {
  // CSRF + signout
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { headers: { cookie: jar.header } })
  jar.addFromResponse(csrfRes)
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string }
  await fetch(`${BASE}/api/auth/signout`, {
    method: 'POST',
    headers: { cookie: jar.header, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken, callbackUrl: `${BASE}/`, json: 'true' }),
  })
}

async function main() {
  console.log('═══ Test du flux d\'authentification persisté en base ═══\n')

  // ─── 1. Espace PRO (pharmacie) ────────────────────────────────────────
  const pro = await login('admin@medihelm.bj', 'demo1234')
  record('PRO', 'Connexion pharmacie', pro.ok ? 'PASS' : 'FAIL', pro.ok ? 'session établie' : pro.error ?? 'échec')

  if (pro.ok) {
    // Session user avec identité complète
    const user = await getSessionUser(pro.jar)
    record('PRO', 'Session enrichie (nom, rôle, pharmacie)',
      user?.roleName && user?.pharmacieNom ? 'PASS' : 'FAIL',
      `${user?.prenom ?? '?'} ${user?.nom ?? '?'} — ${user?.roleName} — ${user?.pharmacieNom}`)

    // Ligne de session en base
    const dbSession = await prisma.sessionUtilisateur.findFirst({
      where: { utilisateur: { email: 'admin@medihelm.bj' }, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    record('PRO', 'Session PERSISTÉE en base (SessionUtilisateur)',
      dbSession ? 'PASS' : 'FAIL',
      dbSession ? `jeton=${dbSession.jeton.slice(0, 12)}… expire=${dbSession.expiresAt.toISOString()}` : 'aucune ligne')

    // API accessible avec la session
    const apiOk = await api(pro.jar, '/api/pharmacies?pharmacieId=none')
    record('PRO', 'API accessible avec session valide', apiOk.status !== 401 ? 'PASS' : 'FAIL', `HTTP ${apiOk.status}`)

    // Déconnexion → révocation en base
    await signout(pro.jar)
    const revoked = await prisma.sessionUtilisateur.findFirst({
      where: { utilisateur: { email: 'admin@medihelm.bj' }, revokedAt: { not: null } },
      orderBy: { revokedAt: 'desc' },
    })
    record('PRO', 'Déconnexion → session RÉVOQUÉE en base',
      revoked ? 'PASS' : 'FAIL',
      revoked ? `révoquée à ${revoked.revokedAt?.toISOString()}` : 'pas de révocation')

    // L'API doit refuser le cookie révoqué (validation base stricte)
    const apiAfter = await api(pro.jar, '/api/pharmacies?pharmacieId=none')
    record('PRO', 'API REFUSE le cookie après déconnexion (validation base)',
      apiAfter.status === 401 ? 'PASS' : 'FAIL', `HTTP ${apiAfter.status}`)

    // /api/auth/session ne doit plus exposer d'utilisateur
    const userAfter = await getSessionUser(pro.jar)
    record('PRO', 'Session client vidée après déconnexion',
      userAfter === null ? 'PASS' : 'FAIL', userAfter ? 'utilisateur encore exposé' : 'plus d\'utilisateur')
  }

  // ─── 2. Espace GROSSISTE (tenant strict) ─────────────────────────────
  const gro = await login('grossiste@medihelm.bj', 'demo1234')
  record('GROSSISTE', 'Connexion grossiste', gro.ok ? 'PASS' : 'FAIL', gro.ok ? 'session établie' : gro.error ?? 'échec')

  if (gro.ok) {
    const groUser = await getSessionUser(gro.jar)
    const grossisteId = groUser?.grossisteId as string | undefined
    const grossisteNom = groUser?.grossisteNom as string | undefined
    record('GROSSISTE', 'Session avec tenant grossiste (id + nom)',
      grossisteId && grossisteNom ? 'PASS' : 'FAIL',
      `${grossisteNom ?? '?'} (${grossisteId?.slice(0, 8) ?? '?'}…)`)

    const dbSession = await prisma.sessionUtilisateur.findFirst({
      where: { utilisateur: { email: 'grossiste@medihelm.bj' }, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    record('GROSSISTE', 'Session persistée en base',
      dbSession ? 'PASS' : 'FAIL', dbSession ? `rôle=${dbSession.roleSnapshot}` : 'aucune ligne')

    // Dashboard de SON grossiste → 200
    const own = await api(gro.jar, `/api/grossistes/dashboard?grossisteId=${grossisteId}`)
    record('GROSSISTE', 'Dashboard de SON grossiste accessible', own.status === 200 ? 'PASS' : 'FAIL', `HTTP ${own.status}`)

    // Dashboard d'un AUTRE grossiste → 403 (isolation tenant)
    const autre = await prisma.grossiste.findFirst({
      where: { id: { not: grossisteId } },
      select: { id: true, nom: true },
    })
    if (autre) {
      const cross = await api(gro.jar, `/api/grossistes/dashboard?grossisteId=${autre.id}`)
      record('GROSSISTE', `Isolation tenant : ${autre.nom} REFUSÉ`,
        cross.status === 403 ? 'PASS' : 'FAIL', `HTTP ${cross.status}`)
    }

    await signout(gro.jar)
  }

  // ─── 3. Espace INSTITUTION ───────────────────────────────────────────
  const inst = await login('dpmed@medihelm.bj', 'demo1234')
  record('INSTITUTION', 'Connexion DPMED', inst.ok ? 'PASS' : 'FAIL', inst.ok ? 'session établie' : inst.error ?? 'échec')

  if (inst.ok) {
    const instUser = await getSessionUser(inst.jar)
    record('INSTITUTION', 'Session enrichie (rôle institutionnel)',
      instUser?.roleName === 'DPMED_ADMIN' ? 'PASS' : 'FAIL', `rôle=${instUser?.roleName ?? '?'}`)

    const dbSession = await prisma.sessionUtilisateur.findFirst({
      where: { utilisateur: { email: 'dpmed@medihelm.bj' }, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    record('INSTITUTION', 'Session persistée en base',
      dbSession ? 'PASS' : 'FAIL', dbSession ? `rôle=${dbSession.roleSnapshot}` : 'aucune ligne')

    await signout(inst.jar)
  }

  // ─── 4. Mauvais identifiants ─────────────────────────────────────────
  const bad = await login('admin@medihelm.bj', 'mauvais')
  record('SÉCURITÉ', 'Mauvais mot de passe refusé', !bad.ok ? 'PASS' : 'FAIL', bad.ok ? 'connexion acceptée !' : 'refusé')

  // ─── Résumé ──────────────────────────────────────────────────────────
  const pass = results.filter(r => r.status === 'PASS').length
  const fail = results.filter(r => r.status === 'FAIL').length
  console.log(`\n═══ Résultat : ${pass} PASS / ${fail} FAIL ═══`)
  await prisma.$disconnect()
  if (fail > 0) process.exit(1)
}

main().catch(async err => {
  console.error('Erreur du test :', err)
  await prisma.$disconnect()
  process.exit(1)
})
