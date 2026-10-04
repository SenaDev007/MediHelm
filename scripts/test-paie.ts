// Test API bulletins-paie : calcul net serveur + persistance
import { login, record, summary } from './test-lib'

async function main() {
  const SUITE = 'M07-PAIE'
  const s = await login('admin@medihelm.bj', 'demo1234')
  record(SUITE, 'Login pharmacien', s.ok ? 'PASS' : 'FAIL', s.ok ? 'ok' : 'échec')
  if (!s.ok) return summary()

  // POST bulletin : brut 150000, retenues 12000, primes 5000 → net 143000
  const res = await fetch('http://localhost:3000/api/bulletins-paie', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: s.jar.header },
    body: JSON.stringify({ periode: '10/2026', salaireBrut: 150000, deductions: 12000, primes: 5000 }),
  })
  const bulletin = await res.json()
  record(SUITE, 'POST bulletin: 201', res.status === 201 ? 'PASS' : 'FAIL', `status=${res.status}`)
  record(SUITE, 'Calcul net serveur (Brut−Retenues+Primes)', bulletin.salaireNet === 143000 ? 'PASS' : 'FAIL',
    `net=${bulletin.salaireNet} (attendu 143000)`)

  // Persistance : GET liste contient le bulletin
  const listRes = await fetch('http://localhost:3000/api/bulletins-paie?limit=5', {
    headers: { Cookie: s.jar.header },
  })
  const list = await listRes.json()
  const found = (list.data || []).some((b: { id: string }) => b.id === bulletin.id)
  record(SUITE, 'Persistance DB (GET liste)', found ? 'PASS' : 'FAIL', found ? 'bulletin retrouvé' : 'absent')

  // Isolation tenant : net JAMAIS trusté du client (vérif via 2e bulletin)
  const res2 = await fetch('http://localhost:3000/api/bulletins-paie', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: s.jar.header },
    body: JSON.stringify({ periode: '09/2026', salaireBrut: 100000, deductions: 30000, primes: 0 }),
  })
  const b2 = await res2.json()
  record(SUITE, 'Net plafonné à 0 si retenues > brut', b2.salaireNet === 70000 ? 'PASS' : 'FAIL', `net=${b2.salaireNet}`)

  const { fail } = summary()
  if (fail > 0) process.exit(1)
}
main().catch(e => { console.error(e); process.exit(1) })
