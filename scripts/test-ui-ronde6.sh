#!/bin/bash
# ============================================================
# MediHelm — Ronde 6 : validation UI (agent-browser)
#   1. Pages de connexion distinctes (patient/pro/grossiste/institution)
#      — formulaire à GAUCHE, image thématique à droite
#   2. Connexions réelles via les formulaires (routage par espace)
#   3. Cartes SANS badges circulaires — pins directs + légende départ.
# ============================================================
cd /home/z/my-project || exit 1
export DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)
export NEXTAUTH_SECRET=$(grep '^NEXTAUTH_SECRET=' .env | cut -d= -f2-)

OUT=download/captures-ronde6
mkdir -p $OUT

pkill -f "next dev" 2>/dev/null; sleep 1
setsid nohup bunx next dev -p 3000 > dev.log 2>&1 < /dev/null &
echo "[test] serveur démarré, attente..."
READY=0
for i in $(seq 1 60); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 http://localhost:3000/ 2>/dev/null)
  if [ "$CODE" = "200" ]; then READY=1; echo "[test] prêt (tentative $i)"; break; fi
  sleep 3
done
[ "$READY" = "1" ] || { echo "[test] ÉCHEC démarrage"; tail -20 dev.log; exit 1; }

# Warmup des pages (compilation lazy)
for P in / /patient/connexion /pro/connexion /grossistes/connexion /institutions/connexion; do
  curl -s --max-time 120 -o /dev/null "http://localhost:3000$P"
done
curl -s --max-time 90 -o /dev/null "http://localhost:3000/api/auth/session"
curl -s --max-time 90 -o /dev/null "http://localhost:3000/api/auth/csrf"
curl -s --max-time 120 "http://localhost:3000/api/patient/pharmacies-proches?radius=5000" -o /tmp/pharms.json
echo "[test] pages précompilées"

# Compte patient de test pour la connexion via UI
TEST_EMAIL="ui.ronde6.$(date +%s)@test.medihelm.bj"
TEST_PASS="MotDePasseRonde6!2026"
PHARM_ID=$(python3 -c "import json;d=json.load(open('/tmp/pharms.json'));print(d[0]['id'])" 2>/dev/null)
curl -s --max-time 60 -X POST http://localhost:3000/api/patient/comptes \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"nom\":\"Validation\",\"prenom\":\"Interface\",\"motDePasse\":\"$TEST_PASS\",\"telephone\":\"97000001\",\"pharmacieId\":\"$PHARM_ID\"}" -o /dev/null
echo "[test] patient de test: $TEST_EMAIL"

agent-browser close 2>/dev/null || true
sleep 1
agent-browser set viewport 1440 844

echo ""
echo "════ 1. DESIGNS des 4 pages de connexion (desktop 1440) ════"
for SPACE in patient pro grossistes institutions; do
  case $SPACE in
    patient) URL="/patient/connexion";;
    pro) URL="/pro/connexion";;
    grossistes) URL="/grossistes/connexion";;
    institutions) URL="/institutions/connexion";;
  esac
  agent-browser open "http://localhost:3000$URL" > /dev/null 2>&1
  agent-browser wait --load networkidle > /dev/null 2>&1 || true
  sleep 2.5
  agent-browser screenshot "$OUT/login-$SPACE.png" > /dev/null 2>&1
  RESULT=$(agent-browser eval "JSON.stringify({
    formLeft: (() => { const i = document.querySelector('input[type=email]'); if (!i) return null; const r = i.getBoundingClientRect(); return r.x < window.innerWidth * 0.5; })(),
    hasImage: !!document.querySelector('img[src*=\"/images/login/\"]'),
    titre: (document.querySelector('h1') || {}).textContent || 'AUCUN',
    bg: (document.querySelector('input[type=email]') || {}).closest('div')?.className?.slice(0, 0) || ''
  })" 2>/dev/null | tail -1)
  echo "   $SPACE: $RESULT"
done

echo ""
echo "════ 2. CONNEXION RÉELLE via formulaire patient ════"
agent-browser open "http://localhost:3000/patient/connexion" > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1 || true
sleep 2
agent-browser find label "Adresse email" fill "$TEST_EMAIL" 2>&1 | head -1
agent-browser find label "Mot de passe" fill "$TEST_PASS" 2>&1 | head -1
agent-browser find role button click --name "Accéder à mon espace patient" 2>&1 | head -1
sleep 6
agent-browser wait --load networkidle > /dev/null 2>&1 || true
sleep 3
URL_NOW=$(agent-browser eval "location.pathname" 2>/dev/null | tail -1)
GREET=$(agent-browser eval "document.body.innerText.match(/Bonjour[^\\n]*/)?.[0] || 'AUCUNE SALUTATION'" 2>/dev/null | tail -1)
echo "   URL après connexion: $URL_NOW (attendu /patient)"
echo "   salutation: $GREET"
agent-browser screenshot "$OUT/02-patient-connecte.png" > /dev/null 2>&1

echo ""
echo "════ 3. CARTE LANDING PATIENT — pins directs, ZÉRO badge ════"
agent-browser open "http://localhost:3000/" > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1 || true
sleep 9
agent-browser screenshot "$OUT/03-landing-carte-pins.png" > /dev/null 2>&1
MAP_CHECK=$(agent-browser eval "JSON.stringify({
  pins: document.querySelectorAll('.maplibregl-marker').length,
  badgesDept: document.querySelectorAll('[aria-label^=\"Département\"]').length,
  clusters: document.querySelectorAll('button[aria-label*=\"officines\"]').length,
  legendBtn: !!document.querySelector('[aria-label=\"Effectifs par département\"]'),
  legendCouleurs: !!document.querySelector('[aria-label=\"Afficher la légende\"]')
})" 2>/dev/null | tail -1)
echo "   $MAP_CHECK"
echo "   (attendu: pins≈345, badgesDept=0, legendBtn=true)"

echo ""
echo "════ 4. LÉGENDE DÉPARTEMENTALE — ouverture + lignes + total ════"
agent-browser find role button click --name "Effectifs par département" 2>&1 | head -1
sleep 1.5
LEGEND=$(agent-browser eval "JSON.stringify({
  lignes: document.querySelectorAll('[aria-label*=\"officines\"][aria-label$=\"zoomer\"]').length,
  borgou: document.querySelector('[aria-label^=\"Borgou\"]')?.getAttribute('aria-label') || 'ABSENT',
  total: Array.from(document.querySelectorAll('span')).find(s => /^Total$/.test(s.textContent))?.parentElement?.innerText || 'ABSENT'
})" 2>/dev/null | tail -1)
echo "   $LEGEND"
agent-browser screenshot "$OUT/04-legende-departementale.png" > /dev/null 2>&1

echo ""
echo "════ 5. CLIC ligne Borgou → zoom + bandeau ════"
agent-browser find role button click --name "Borgou — 27 officines" 2>&1 | head -1 || \
agent-browser eval "document.querySelector('[aria-label^=\"Borgou\"]').click()" > /dev/null 2>&1
sleep 2.5
BANNER=$(agent-browser eval "document.body.innerText.match(/Borgou[^\\n]*officines[^\\n]*/)?.[0] || 'AUCUN BANDEAU'" 2>/dev/null | tail -1)
echo "   bandeau: $BANNER"
agent-browser screenshot "$OUT/05-zoom-borgou.png" > /dev/null 2>&1

echo ""
echo "════ 6. CONNEXION PRO (admin@) via /pro/connexion ════"
agent-browser close > /dev/null 2>&1
agent-browser open "http://localhost:3000/pro/connexion" > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1 || true
sleep 2
agent-browser find label "Email professionnel" fill "admin@medihelm.bj" 2>&1 | head -1
agent-browser find label "Mot de passe" fill "demo1234" 2>&1 | head -1
agent-browser find role button click --name "Ouvrir mon espace pharmacie" 2>&1 | head -1
sleep 7
URL_PRO=$(agent-browser eval "location.pathname" 2>/dev/null | tail -1)
echo "   URL après connexion pro: $URL_PRO (attendu /pro ou /pro/…)"
agent-browser screenshot "$OUT/06-pro-connecte.png" > /dev/null 2>&1

echo ""
echo "════ 7. CONNEXION GROSSISTE via /grossistes/connexion ════"
agent-browser close > /dev/null 2>&1
agent-browser open "http://localhost:3000/grossistes/connexion" > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1 || true
sleep 2
agent-browser find label "Email professionnel" fill "grossiste@medihelm.bj" 2>&1 | head -1
agent-browser find label "Mot de passe" fill "demo1234" 2>&1 | head -1
agent-browser find role button click --name "Entrer dans la plateforme" 2>&1 | head -1
sleep 7
URL_GR=$(agent-browser eval "location.pathname" 2>/dev/null | tail -1)
echo "   URL après connexion grossiste: $URL_GR (attendu /grossistes ou /grossistes/…)"
agent-browser screenshot "$OUT/07-grossiste-connecte.png" > /dev/null 2>&1

echo ""
echo "════ 8. CONNEXION INSTITUTION via /institutions/connexion ════"
agent-browser close > /dev/null 2>&1
agent-browser open "http://localhost:3000/institutions/connexion" > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1 || true
sleep 2
agent-browser find label "Email institutionnel" fill "dpmed@medihelm.bj" 2>&1 | head -1
agent-browser find label "Mot de passe" fill "demo1234" 2>&1 | head -1
agent-browser find role button click --name "Accéder à mon portail" 2>&1 | head -1
sleep 7
URL_INST=$(agent-browser eval "location.pathname" 2>/dev/null | tail -1)
echo "   URL après connexion institution: $URL_INST (attendu /institutions ou /institutions/…)"
agent-browser screenshot "$OUT/08-institution-connectee.png" > /dev/null 2>&1

echo ""
echo "════ 9. CARTE DE GARDE (patient connecté) — zéro badge + gardes ════"
agent-browser close > /dev/null 2>&1
agent-browser open "http://localhost:3000/patient/connexion" > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1 || true
sleep 2
agent-browser find label "Adresse email" fill "$TEST_EMAIL" 2>&1 | head -1
agent-browser find label "Mot de passe" fill "$TEST_PASS" 2>&1 | head -1
agent-browser find role button click --name "Accéder à mon espace patient" 2>&1 | head -1
sleep 6
agent-browser open "http://localhost:3000/patient/garde" > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1 || true
sleep 10
agent-browser screenshot "$OUT/09-garde-carte-pins.png" > /dev/null 2>&1
GARDE_CHECK=$(agent-browser eval "JSON.stringify({
  pins: document.querySelectorAll('.maplibregl-marker').length,
  badgesDept: document.querySelectorAll('[aria-label^=\"Département\"]').length,
  legendBtn: !!document.querySelector('[aria-label=\"Effectifs par département\"]')
})" 2>/dev/null | tail -1)
echo "   $GARDE_CHECK"

echo ""
echo "════ 10. MOBILE 390×844 — landing patient + login ════"
agent-browser close > /dev/null 2>&1
agent-browser set viewport 390 844
agent-browser open "http://localhost:3000/" > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1 || true
sleep 8
agent-browser screenshot "$OUT/10-mobile-landing.png" > /dev/null 2>&1
agent-browser open "http://localhost:3000/patient/connexion" > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1 || true
sleep 2.5
agent-browser screenshot "$OUT/11-mobile-login-patient.png" > /dev/null 2>&1
MOBILE_FORM=$(agent-browser eval "JSON.stringify({
  formVisible: !!document.querySelector('input[type=email]'),
  formWidth: document.querySelector('input[type=email]')?.getBoundingClientRect()?.width || 0
})" 2>/dev/null | tail -1)
echo "   mobile login: $MOBILE_FORM"

agent-browser close > /dev/null 2>&1
pkill -f "next dev" 2>/dev/null
echo ""
echo "[test] terminé — captures dans download/captures-ronde6/"
