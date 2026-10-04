#!/bin/bash
# ============================================================
# MediHelm — Vérification complète en UN appel (serveur fragile) :
# page finance pro → onglet SYSCOHADA → aperçu → KPI/journal/balance
# ============================================================
cd /home/z/my-project || exit 1
export DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)

pkill -f "next dev" 2>/dev/null; sleep 2
setsid nohup bunx next dev -p 3000 > dev.log 2>&1 < /dev/null &

for i in $(seq 1 45); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 http://localhost:3000/ 2>/dev/null)
  [ "$CODE" = "200" ] && break
  sleep 2
done

# Warmup complet (routes NextAuth + pages + API SYSCOHADA avec session)
curl -s -o /dev/null --max-time 90 http://localhost:3000/api/auth/session
curl -s -o /dev/null --max-time 90 http://localhost:3000/api/auth/csrf
curl -s -o /dev/null --max-time 120 http://localhost:3000/api/auth/providers

login() {
  agent-browser open http://localhost:3000/connexion > /dev/null 2>&1
  sleep 4
  local SNAP=$(agent-browser snapshot -i 2>/dev/null)
  local E=$(echo "$SNAP" | rg 'textbox "Email"' | rg -o 'ref=(e[0-9]+)' | rg -o 'e[0-9]+')
  local P=$(echo "$SNAP" | rg 'textbox "Mot de passe"' | rg -o 'ref=(e[0-9]+)' | rg -o 'e[0-9]+')
  local B=$(echo "$SNAP" | rg 'button "Se connecter"' | rg -o 'ref=(e[0-9]+)' | rg -o 'e[0-9]+')
  agent-browser fill @$E "$1" > /dev/null 2>&1
  agent-browser fill @$P "demo1234" > /dev/null 2>&1
  sleep 1
  agent-browser click @$B > /dev/null 2>&1
  sleep 6
}

echo "=== Login admin pharmacie ==="
login "admin@medihelm.bj"
agent-browser get url 2>&1 | tail -1

echo "=== Page finance ==="
agent-browser open http://localhost:3000/pro/finance > /dev/null 2>&1
sleep 9
# Désinstalle le SW pour éviter le cache offline pendant le test
agent-browser eval "navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister()))).then(() => 'SW off')" > /dev/null 2>&1
agent-browser reload > /dev/null 2>&1
sleep 9

echo "=== Onglet SYSCOHADA ==="
TAB=$(agent-browser snapshot -i 2>/dev/null | rg 'tab "Export SYSCOHADA"' | rg -o 'ref=(e[0-9]+)' | rg -o 'e[0-9]+')
agent-browser click @$TAB > /dev/null 2>&1
sleep 3

echo "=== Élargit la période (année complète) puis génère ==="
agent-browser eval "(() => { const inputs = Array.from(document.querySelectorAll('input[type=date]')); const debut = inputs[0], fin = inputs[1]; const set = (el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }; set(debut, '2025-01-01'); set(fin, '2026-12-31'); return 'période 2025-01-01 → 2026-12-31'; })()" 2>&1 | tail -1
sleep 1
GEN=$(agent-browser snapshot -i 2>/dev/null | rg 'Générer l.aperçu' | rg -o 'ref=(e[0-9]+)' | rg -o 'e[0-9]+')
agent-browser click @$GEN > /dev/null 2>&1
sleep 10

echo "=== Vérification DOM ==="
agent-browser eval "JSON.stringify((() => { const t = document.body.innerText; return { kpiEcritures: (t.match(/Écritures\s*\n?\s*([0-9]+)/) || [])[1] ?? null, totalDebit: (t.match(/Total débit\s*\n?\s*([0-9\s]+) FCFA/) || [])[1] ?? null, partieDoubleEquilibre: t.includes('Équilibré'), apercuJournal: t.includes('Aperçu du journal'), balanceVisible: t.includes('Balance des comptes'), boutonsCsv: ['Journal CSV', 'Journal détaillé', 'Balance CSV', 'Classeur Excel'].every(b => t.includes(b)) }; })())" 2>&1 | tail -1

agent-browser screenshot download/captures/pro-finance-syscohada-final.png > /dev/null 2>&1
echo "capture: download/captures/pro-finance-syscohada-final.png"

pkill -f "next dev" 2>/dev/null
echo "[fin]"