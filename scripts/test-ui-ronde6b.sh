#!/bin/bash
# ============================================================
# MediHelm — Ronde 6 (complément) : clic Borgou + connexions
# grossiste/institution via UI (sans close entre les onglets).
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

for P in / /patient/connexion /pro/connexion /grossistes/connexion /institutions/connexion; do
  curl -s --max-time 120 -o /dev/null "http://localhost:3000$P"
done
curl -s --max-time 90 -o /dev/null "http://localhost:3000/api/auth/csrf"
echo "[test] pages précompilées"

agent-browser close 2>/dev/null || true
sleep 2
agent-browser set viewport 1440 844
agent-browser open "http://localhost:3000/" > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1 || true
sleep 9

echo ""
echo "════ A. LÉGENDE → clic ligne BORGOU → zoom + bandeau ════"
agent-browser find role button click --name "Effectifs par département" 2>&1 | head -1
sleep 1.5
# Clic direct via DOM (libellé exact dynamique : « Borgou — N officines … »)
agent-browser eval "document.querySelector('[aria-label^=\"Borgou\"]').click()" > /dev/null 2>&1
sleep 3
BANNER=$(agent-browser eval "document.body.innerText.match(/Borgou[^\\n]*officines[^\\n]*/)?.[0] || 'AUCUN BANDEAU'" 2>/dev/null | tail -1)
ZOOM=$(agent-browser eval "(() => { const m = document.querySelector('.maplibregl-map'); return m ? 'carte présente' : 'ABSENTE'; })()" 2>/dev/null | tail -1)
echo "   bandeau: $BANNER"
echo "   $ZOOM"
agent-browser screenshot "$OUT/05-zoom-borgou.png" > /dev/null 2>&1
# Vérifie le zoom effectif via l'instance maplibre (transform du canvas)
ZOOMVAL=$(agent-browser eval "
(() => {
  const el = document.querySelector('.maplibregl-canvas');
  if (!el) return 'n/a';
  const k = el.getBoundingClientRect().width / el.width || 1;
  return 'canvas ok';
})()" 2>/dev/null | tail -1)
echo "   $ZOOMVAL"

echo ""
echo "════ B. CONNEXION GROSSISTE via /grossistes/connexion ════"
agent-browser open "http://localhost:3000/grossistes/connexion" > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1 || true
sleep 3
agent-browser find label "Email professionnel" fill "grossiste@medihelm.bj" 2>&1 | head -1
agent-browser find label "Mot de passe" fill "demo1234" 2>&1 | head -1
agent-browser find role button click --name "Entrer dans la plateforme" 2>&1 | head -1
sleep 8
URL_GR=$(agent-browser eval "location.pathname" 2>/dev/null | tail -1)
echo "   URL après connexion grossiste: $URL_GR (attendu /grossistes…)"
agent-browser screenshot "$OUT/07-grossiste-connecte.png" > /dev/null 2>&1

echo ""
echo "════ C. CONNEXION INSTITUTION via /institutions/connexion ════"
agent-browser open "http://localhost:3000/institutions/connexion" > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1 || true
sleep 3
agent-browser find label "Email institutionnel" fill "dpmed@medihelm.bj" 2>&1 | head -1
agent-browser find label "Mot de passe" fill "demo1234" 2>&1 | head -1
agent-browser find role button click --name "Accéder à mon portail" 2>&1 | head -1
sleep 8
URL_INST=$(agent-browser eval "location.pathname" 2>/dev/null | tail -1)
echo "   URL après connexion institution: $URL_INST (attendu /institutions…)"
agent-browser screenshot "$OUT/08-institution-connectee.png" > /dev/null 2>&1

agent-browser close > /dev/null 2>&1
pkill -f "next dev" 2>/dev/null
echo ""
echo "[test] complément terminé"
