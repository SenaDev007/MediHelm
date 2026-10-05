#!/bin/bash
# ============================================================
# MediHelm — Validation carte garde + géolocalisation v2 (round 2)
# Serveur + agent-browser dans un même appel, géoloc Cotonou.
# ============================================================
cd /home/z/my-project || exit 1
export DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)

OUT=download/captures/garde-v2
mkdir -p $OUT

pkill -f "next dev" 2>/dev/null; sleep 1
setsid nohup bunx next dev -p 3000 > dev.log 2>&1 < /dev/null &
echo "[test] serveur démarré, attente..."
READY=0
for i in $(seq 1 60); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 http://localhost:3000/patient/garde 2>/dev/null)
  if [ "$CODE" = "200" ]; then READY=1; echo "[test] prêt"; break; fi
  sleep 3
done
[ "$READY" = "1" ] || { echo "[test] ÉCHEC démarrage"; tail -20 dev.log; exit 1; }

# Précompilation des routes API (chaude)
curl -s -o /dev/null --max-time 120 "http://localhost:3000/api/patient/pharmacies-proches?radius=5000"
curl -s -o /dev/null --max-time 60 "http://localhost:3000/api/pharmacies?garde=semaine"
echo "[test] APIs précompilées"

# ─── DESKTOP 1440×844 + géoloc Cotonou ──────────────────────
agent-browser set viewport 1440 844
agent-browser set geo 6.3728 2.3484
agent-browser open http://localhost:3000/patient/garde
agent-browser wait --load networkidle 2>/dev/null || true
sleep 6
agent-browser screenshot $OUT/01-garde-desktop-national.png

PINS=$(agent-browser get count ".medihelm-pin" --json 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('data',{}).get('count','?'))" 2>/dev/null || echo "?")
BADGES=$(agent-browser get count ".medihelm-pin span" --json 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('data',{}).get('count','?'))" 2>/dev/null || echo "?")
echo "[test] pins rendus: $PINS · badges nominatifs: $BADGES"

# Survol d'un pin garde (ambre) : fiche holographique AU-DESSUS, stable
agent-browser find role button hover --name "Pharmacie Beyerou" 2>/dev/null || true
sleep 1
agent-browser screenshot $OUT/02-garde-hover-fiche.png
POPUP=$(agent-browser get count ".maplibregl-popup" --json 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('data',{}).get('count','?'))" 2>/dev/null || echo "?")
echo "[test] popup survol présente: $POPUP"

# Clic sur le pin : fiche persistante avec actions + Itinéraire
agent-browser find role button click --name "Pharmacie Beyerou" 2>/dev/null || true
sleep 2
agent-browser screenshot $OUT/04-garde-clic-fiche.png
POPUP=$(agent-browser get count ".maplibregl-popup" --json 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('data',{}).get('count','?'))" 2>/dev/null || echo "?")
echo "[test] popup clic persistante: $POPUP"

# Bouton « Plus proche » → itinéraire OSRM + panneau marche/moto/voiture
agent-browser find role button click --name "Plus proche" 2>/dev/null || true
sleep 7
agent-browser screenshot $OUT/05-garde-itineraire.png
ROUTE=$(agent-browser get count "#mh-route" --json 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('data',{}).get('count','?'))" 2>/dev/null || echo "?")
echo "[test] couche itinéraire: $ROUTE"

# Mode marche
agent-browser find role button click --name "Marche" 2>/dev/null || true
sleep 1
agent-browser screenshot $OUT/06-garde-itineraire-marche.png

# « Y aller » : mode navigation
agent-browser find role button click --name "Y aller" 2>/dev/null || true
sleep 2
agent-browser screenshot $OUT/07-garde-en-route.png

# Panneau planning desktop
agent-browser find role button click --name "Planning" 2>/dev/null || true
sleep 2
agent-browser screenshot $OUT/08-garde-planning-desktop.png

# ─── MOBILE 390×724 ───────────────────────────────────────────
agent-browser set viewport 390 724
agent-browser set geo 6.3728 2.3484
agent-browser open http://localhost:3000/patient/garde
agent-browser wait --load networkidle 2>/dev/null || true
sleep 6
agent-browser screenshot $OUT/09-garde-mobile-peek.png

# Sheet half : clic sur le header du sheet
agent-browser find text "de garde" click 2>/dev/null || true
sleep 2
agent-browser screenshot $OUT/10-garde-mobile-half.png

# Page géolocalisation mobile
agent-browser open http://localhost:3000/patient/pharmacies
agent-browser wait --load networkidle 2>/dev/null || true
sleep 6
agent-browser screenshot $OUT/11-pharmacies-mobile.png

# ─── TABLETTE 820×1124 ────────────────────────────────────────
agent-browser set viewport 820 1124
agent-browser open http://localhost:3000/patient/garde
agent-browser wait --load networkidle 2>/dev/null || true
sleep 6
agent-browser screenshot $OUT/12-garde-tablette.png

agent-browser open http://localhost:3000/patient/pharmacies
agent-browser wait --load networkidle 2>/dev/null || true
sleep 6
agent-browser screenshot $OUT/13-pharmacies-tablette.png

# ─── DESKTOP géolocalisation ──────────────────────────────────
agent-browser set viewport 1440 844
agent-browser open http://localhost:3000/patient/pharmacies
agent-browser wait --load networkidle 2>/dev/null || true
sleep 6
agent-browser screenshot $OUT/14-pharmacies-desktop.png

# Zoom national → clusters avec survol département
agent-browser mouse move 720 420 2>/dev/null || true
agent-browser screenshot $OUT/15-pharmacies-desktop-zoom.png

echo "=== Erreurs console ==="
agent-browser errors 2>/dev/null | head -10 || true
echo "=== Réseau: erreurs API ==="
agent-browser network requests --filter "pharmacies-proches" 2>/dev/null | head -5 || true

echo "[test] captures dans $OUT/"
pkill -f "next dev" 2>/dev/null
echo "[test] terminé"
