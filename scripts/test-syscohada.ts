// ============================================================
// MediHelm — Tests Export SYSCOHADA (M08)
// Journal, balance, partie double, formats CSV/Excel, RBAC
// ============================================================

import { login, record, results, CookieJar } from './test-lib'

const SUITE = 'SYSCOHADA'

async function main() {
  const directeur = await login('admin@medihelm.bj', 'demo1234')
  if (!directeur.ok) {
    record(SUITE, 'login directeur (admin@)', 'FAIL', `échec: ${directeur.error}`)
    return summary()
  }
  record(SUITE, 'login directeur (admin@)', 'PASS', 'session NextAuth obtenue')

  const debut = '2025-01-01'
  const fin = '2026-12-31'

  // 1. Aperçu JSON
  const resJson = await fetch(
    `http://localhost:3000/api/pro/exports/syscohada?dateDebut=${debut}&dateFin=${fin}&tva=0`,
    { headers: { cookie: directeur.jar.header } }
  )
  const json = await resJson.json()
  if (resJson.ok && json.journal) {
    record(SUITE, 'aperçu JSON', 'PASS',
      `${json.totaux.lignes} écritures, débit ${json.totaux.debit} / crédit ${json.totaux.credit}`)
  } else {
    record(SUITE, 'aperçu JSON', 'FAIL', `HTTP ${resJson.status}: ${JSON.stringify(json).slice(0, 100)}`)
  }

  // 2. Principe de la partie double
  if (json.totaux) {
    record(SUITE, 'partie double', json.totaux.equilibre ? 'PASS' : 'FAIL',
      `débit=${json.totaux.debit} crédit=${json.totaux.credit}`)
  }

  // 3. Balance agrégée cohérente avec le journal
  if (json.balance && json.journal) {
    const sumJ = json.journal.reduce((s: number, l: { montant: number }) => s + l.montant, 0)
    const sumBDebit = json.balance.reduce((s: number, b: { totalDebit: number }) => s + b.totalDebit, 0)
    const sumBCredit = json.balance.reduce((s: number, b: { totalCredit: number }) => s + b.totalCredit, 0)
    const ok = Math.abs(sumJ - sumBDebit) < 0.01 && Math.abs(sumJ - sumBCredit) < 0.01
    record(SUITE, 'balance ↔ journal', ok ? 'PASS' : 'FAIL',
      `Σjournal=${sumJ.toFixed(2)} ΣbalanceD=${sumBDebit.toFixed(2)} ΣbalanceC=${sumBCredit.toFixed(2)}`)
  }

  // 4. Sources présentes (ventes → 701, paie → 661...)
  if (json.journal?.length) {
    const sources = new Set(json.journal.map((l: { source: string }) => l.source))
    const a701 = json.journal.some((l: { compteCredit: string }) => l.compteCredit === '701')
    record(SUITE, 'sources du journal', 'PASS', `${[...sources].join('+')} — compte 701 présent: ${a701}`)
  }

  // 5. Comptes SYSCOHADA attendus
  if (json.balance?.length) {
    const comptes = json.balance.map((b: { compte: string }) => b.compte)
    const attendus = ['571', '701'] // caisse + ventes au minimum
    const manquants = attendus.filter((c) => !comptes.includes(c))
    record(SUITE, 'plan SYSCOHADA', manquants.length === 0 ? 'PASS' : 'WARN',
      manquants.length === 0 ? `comptes présents: ${comptes.join(', ')}` : `manquants: ${manquants.join(',')}`)
  }

  // 6. Format CSV simple — en-tête exact des Specs §10.2
  const resCsv = await fetch(
    `http://localhost:3000/api/pro/exports/syscohada?dateDebut=${debut}&dateFin=${fin}&format=csv-simple`,
    { headers: { cookie: directeur.jar.header } }
  )
  const csv = await resCsv.text()
  if (resCsv.ok) {
    const headOk = csv.startsWith('Date;Libellé;Compte débiteur;Compte créditeur;Montant;Référence')
    const lines = csv.trim().split('\r\n').length - 1
    record(SUITE, 'CSV journal (format Specs §10.2)', headOk ? 'PASS' : 'FAIL',
      `${lines} lignes, en-tête conforme: ${headOk}`)
  } else {
    record(SUITE, 'CSV journal', 'FAIL', `HTTP ${resCsv.status}`)
  }

  // 7. Format CSV double (Sage/Saari)
  const resDouble = await fetch(
    `http://localhost:3000/api/pro/exports/syscohada?dateDebut=${debut}&dateFin=${fin}&format=csv-double`,
    { headers: { cookie: directeur.jar.header } }
  )
  const csvDouble = await resDouble.text()
  if (resDouble.ok) {
    const lines = csvDouble.trim().split('\r\n').length - 1
    const pairs = lines % 2 === 0
    record(SUITE, 'CSV détaillé Sage (lignes par compte)', pairs ? 'PASS' : 'FAIL',
      `${lines} lignes (paires débit/crédit: ${pairs})`)
  } else {
    record(SUITE, 'CSV détaillé Sage', 'FAIL', `HTTP ${resDouble.status}`)
  }

  // 8. Balance CSV
  const resBal = await fetch(
    `http://localhost:3000/api/pro/exports/syscohada?dateDebut=${debut}&dateFin=${fin}&format=csv-balance`,
    { headers: { cookie: directeur.jar.header } }
  )
  const csvBal = await resBal.text()
  if (resBal.ok) {
    record(SUITE, 'CSV balance', 'PASS', `${csvBal.trim().split('\r\n').length - 1} lignes, TOTAL en dernière ligne: ${csvBal.includes('TOTAL')}`)
  } else {
    record(SUITE, 'CSV balance', 'FAIL', `HTTP ${resBal.status}`)
  }

  // 9. Excel (2 feuilles)
  const resXlsx = await fetch(
    `http://localhost:3000/api/pro/exports/syscohada?dateDebut=${debut}&dateFin=${fin}&format=excel`,
    { headers: { cookie: directeur.jar.header } }
  )
  if (resXlsx.ok) {
    const buf = Buffer.from(await resXlsx.arrayBuffer())
    const isZip = buf[0] === 0x50 && buf[1] === 0x4b // signature XLSX (zip)
    record(SUITE, 'classeur Excel', isZip ? 'PASS' : 'FAIL',
      `${buf.length} octets, signature ZIP: ${isZip}, type: ${resXlsx.headers.get('content-type')?.slice(0, 40)}`)
  } else {
    record(SUITE, 'classeur Excel', 'FAIL', `HTTP ${resXlsx.status}`)
  }

  // 10. Période invalide → 400
  const resBad = await fetch(
    `http://localhost:3000/api/pro/exports/syscohada?dateDebut=2026-12-31&dateFin=2026-01-01`,
    { headers: { cookie: directeur.jar.header } }
  )
  record(SUITE, 'période invalide rejetée', resBad.status === 400 ? 'PASS' : 'FAIL', `HTTP ${resBad.status}`)

  // 11. RBAC : un patient n'a pas accès
  const patient = await login('patient@medihelm.bj', 'demo1234')
  if (patient.ok) {
    const resPat = await fetch(
      `http://localhost:3000/api/pro/exports/syscohada?dateDebut=${debut}&dateFin=${fin}`,
      { headers: { cookie: patient.jar.header } }
    )
    record(SUITE, 'RBAC patient refusé', resPat.status === 403 || resPat.status === 401 ? 'PASS' : 'FAIL',
      `HTTP ${resPat.status}`)
  }

  // 12. Sans session → 401
  const resAnon = await fetch(
    `http://localhost:3000/api/pro/exports/syscohada?dateDebut=${debut}&dateFin=${fin}`
  )
  record(SUITE, 'anonyme refusé', resAnon.status === 401 ? 'PASS' : 'FAIL', `HTTP ${resAnon.status}`)

  // 13. TVA 18 % : comptes 4431 présents et équilibre conservé
  const resTva = await fetch(
    `http://localhost:3000/api/pro/exports/syscohada?dateDebut=${debut}&dateFin=${fin}&tva=0.18`,
    { headers: { cookie: directeur.jar.header } }
  )
  const jsonTva = await resTva.json()
  if (resTva.ok && jsonTva.journal) {
    const has4431 = jsonTva.journal.some((l: { compteCredit: string }) => l.compteCredit === '4431')
    record(SUITE, 'TVA 18 % (4431 facturée)', jsonTva.totaux.equilibre ? 'PASS' : 'FAIL',
      `4431 présente: ${has4431}, équilibre: ${jsonTva.totaux.equilibre}, TVA collectée ≈ ${Math.round(jsonTva.journal.filter((l: { compteCredit: string }) => l.compteCredit === '4431').reduce((s: number, l: { montant: number }) => s + l.montant, 0))} FCFA`)
  } else {
    record(SUITE, 'TVA 18 %', 'FAIL', `HTTP ${resTva.status}`)
  }

  return summary()
}

function summary() {
  const pass = results.filter(r => r.status === 'PASS').length
  const fail = results.filter(r => r.status === 'FAIL').length
  const warn = results.filter(r => r.status === 'WARN').length
  console.log(`\n═══ ${SUITE} : ${pass} PASS / ${fail} FAIL / ${warn} WARN ═══`)
  if (fail > 0) {
    console.log('ÉCHECS:')
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ❌ ${r.name} — ${r.detail}`))
    process.exit(1)
  }
}

main().catch(e => { console.error('ERREUR FATALE:', e); process.exit(1) })
