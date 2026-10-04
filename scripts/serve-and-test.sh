#!/bin/bash
# ============================================================
# MediHelm — Wrapper: démarre le serveur dev + exécute un script de test
# Usage: bash scripts/serve-and-test.sh scripts/test-patient.ts
# ============================================================
TEST_SCRIPT="$1"
cd /home/z/my-project || exit 1
export DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)

# Nettoie tout reste
pkill -f "next dev" 2>/dev/null; sleep 1

# Démarre le serveur
setsid nohup bunx next dev -p 3000 > dev.log 2>&1 < /dev/null &
SERVER_PID=$!
echo "[serve-and-test] Serveur PID=$SERVER_PID — attente de démarrage..."

# Attend que le serveur réponde (max ~120s)
READY=0
for i in $(seq 1 40); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 http://localhost:3000/ 2>/dev/null)
  if [ "$CODE" = "200" ]; then READY=1; break; fi
  sleep 2
done

if [ "$READY" != "1" ]; then
  echo "[serve-and-test] ❌ Le serveur n'a pas démarré — log:"
  tail -30 dev.log
  pkill -f "next dev" 2>/dev/null
  exit 2
fi
echo "[serve-and-test] ✅ Serveur prêt — exécution de $TEST_SCRIPT"

# Warmup des routes NextAuth (compilation lazy en dev : évite les échecs
# de login quand le premier appel CSRF/callback prend plusieurs secondes)
curl -s -o /dev/null --max-time 60 http://localhost:3000/api/auth/session
curl -s -o /dev/null --max-time 60 http://localhost:3000/api/auth/csrf

# Exécute les tests
bun run "$TEST_SCRIPT"
RESULT=$?

# Arrête le serveur proprement
pkill -f "next dev" 2>/dev/null
echo "[serve-and-test] Terminé (exit=$RESULT)"
exit $RESULT
