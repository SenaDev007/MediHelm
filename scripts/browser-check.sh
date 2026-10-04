#!/bin/bash
# ============================================================
# MediHelm — Vérification navigateur d'un espace
# Usage: bash scripts/browser-check.sh <email> <password> <page1> [page2] ...
# Démarre le serveur, se connecte, visite chaque page,
# capture une capture d'écran + un snapshot condensé.
# ============================================================
EMAIL="$1"; PASSWORD="$2"; shift 2
PAGES=("$@")

cd /home/z/my-project || exit 1
export DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)

# Nettoie et démarre le serveur
pkill -f "next dev" 2>/dev/null; sleep 1
setsid nohup bunx next dev -p 3000 > dev.log 2>&1 < /dev/null &
sleep 10
READY=0
for i in $(seq 1 30); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:3000/ 2>/dev/null)
  if [ "$CODE" = "200" ]; then READY=1; break; fi
  sleep 2
done
[ "$READY" != "1" ] && { echo "❌ serveur non démarré"; exit 2; }
echo "✅ serveur prêt"

# Connexion
agent-browser open http://localhost:3000/connexion > /dev/null 2>&1
agent-browser wait 2500 > /dev/null 2>&1
SNAP=$(agent-browser snapshot -i -c 2>/dev/null | head -8)
EMAIL_REF=$(echo "$SNAP" | grep -o 'textbox "Email"[^]]*ref=e[0-9]*' | grep -o 'e[0-9]*$')
PASS_REF=$(echo "$SNAP" | grep -o 'textbox "Mot de passe"[^]]*ref=e[0-9]*' | grep -o 'e[0-9]*$')
BTN_REF=$(echo "$SNAP" | grep -o 'button "Se connecter"[^]]*ref=e[0-9]*' | grep -o 'e[0-9]*$')
agent-browser fill @"$EMAIL_REF" "$EMAIL" > /dev/null 2>&1
agent-browser fill @"$PASS_REF" "$PASSWORD" > /dev/null 2>&1
agent-browser wait 800 > /dev/null 2>&1
agent-browser click @"$BTN_REF" > /dev/null 2>&1
agent-browser wait 6000 > /dev/null 2>&1
URL=$(agent-browser get url 2>/dev/null)
echo "🌐 après login: $URL"

# Visite chaque page
SHOT_DIR=/home/z/my-project/download/captures
mkdir -p "$SHOT_DIR"
for PAGE in "${PAGES[@]}"; do
  SAFE=$(echo "$PAGE" | tr '/' '_')
  agent-browser open "http://localhost:3000$PAGE" > /dev/null 2>&1
  agent-browser wait 4000 > /dev/null 2>&1
  agent-browser wait --load networkidle --timeout 15000 > /dev/null 2>&1
  FINAL_URL=$(agent-browser get url 2>/dev/null)
  TITLE=$(agent-browser get title 2>/dev/null)
  agent-browser screenshot "$SHOT_DIR${SAFE}.png" > /dev/null 2>&1
  ERRORS=$(agent-browser errors 2>/dev/null | head -3)
  echo "📄 $PAGE → $FINAL_URL | $TITLE"
  [ -n "$ERRORS" ] && echo "   ⚠️ erreurs: $ERRORS"
  # éléments interactifs clés (première ligne du snapshot compact)
  agent-browser snapshot -c 2>/dev/null | head -12 | sed 's/^/   /'
done

agent-browser close > /dev/null 2>&1
pkill -f "next dev" 2>/dev/null
echo "✅ vérification terminée — captures dans $SHOT_DIR"
