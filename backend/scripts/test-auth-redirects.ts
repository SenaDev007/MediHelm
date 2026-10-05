// ============================================================
// MediHelm — Test des redirections du middleware avec session
// (utilisateur connecté visitant les pages d'auth → SON espace)
// ============================================================

import { login, record, results, CookieJar, BASE } from './test-lib'

async function checkRedirect(jar: CookieJar, path: string): Promise<number | string> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { cookie: jar.header },
    redirect: 'manual',
  })
  if (res.status >= 300 && res.status < 400) {
    return res.headers.get('location') ?? '?'
  }
  return res.status
}

async function main() {
  console.log('═══ Redirections middleware avec session active ═══\n')

  // ─── Compte pharmacie (DIRECTEUR) ─────────────────────────────────────
  const pro = await login('admin@medihelm.bj', 'demo1234')
  if (pro.ok) {
    for (const page of ['/connexion', '/inscription', '/pro/connexion', '/patient/connexion', '/grossistes/connexion', '/institutions/connexion']) {
      const dest = await checkRedirect(pro.jar, page)
      record('PHARMACIE', `Connecté visitant ${page}`, dest === '/pro' ? 'PASS' : 'FAIL', `→ ${dest}`)
    }
    // Mauvais espace → retour vers SON espace
    for (const espace of ['/patient', '/institutions']) {
      const dest = await checkRedirect(pro.jar, espace)
      record('PHARMACIE', `Mauvais espace ${espace}`, dest === '/pro' ? 'PASS' : 'FAIL', `→ ${dest}`)
    }
    // /grossistes est volontairement accessible aux rôles pharmacie
    // (relation commerciale B2B : catalogue, commandes fournisseurs)
    const destG = await checkRedirect(pro.jar, '/grossistes')
    record('PHARMACIE', 'Espace grossistes (B2B — accès prévu)', destG === 200 ? 'PASS' : 'FAIL', `→ ${destG}`)
    // SON espace accessible
    const dest = await checkRedirect(pro.jar, '/pro')
    record('PHARMACIE', 'Son espace /pro accessible', dest === 200 ? 'PASS' : 'FAIL', `→ ${dest}`)
  }

  // ─── Compte grossiste ────────────────────────────────────────────────
  const gro = await login('grossiste@medihelm.bj', 'demo1234')
  if (gro.ok) {
    const dest = await checkRedirect(gro.jar, '/grossistes/connexion')
    record('GROSSISTE', 'Connecté visitant /grossistes/connexion', dest === '/grossistes' ? 'PASS' : 'FAIL', `→ ${dest}`)
    const dest2 = await checkRedirect(gro.jar, '/patient')
    record('GROSSISTE', 'Espace patient refusé → SON espace', dest2 === '/grossistes' ? 'PASS' : 'FAIL', `→ ${dest2}`)
    const dest3 = await checkRedirect(gro.jar, '/pro')
    record('GROSSISTE', 'Espace pro refusé → SON espace', dest3 === '/grossistes' ? 'PASS' : 'FAIL', `→ ${dest3}`)
  }

  // ─── Compte institution ──────────────────────────────────────────────
  const inst = await login('dpmed@medihelm.bj', 'demo1234')
  if (inst.ok) {
    const dest = await checkRedirect(inst.jar, '/institutions/connexion')
    record('INSTITUTION', 'Connecté visitant /institutions/connexion', dest === '/institutions' ? 'PASS' : 'FAIL', `→ ${dest}`)
    const dest2 = await checkRedirect(inst.jar, '/patient')
    record('INSTITUTION', 'Espace patient refusé → SON espace', dest2 === '/institutions' ? 'PASS' : 'FAIL', `→ ${dest2}`)
  }

  const pass = results.filter(r => r.status === 'PASS').length
  const fail = results.filter(r => r.status === 'FAIL').length
  console.log(`\n═══ Résultat : ${pass} PASS / ${fail} FAIL ═══`)
  if (fail > 0) process.exit(1)
}

main().catch(err => {
  console.error('Erreur du test :', err)
  process.exit(1)
})
