#!/bin/bash
# ============================================================
# MediHelm — Ronde 6 : validation API des corrections de connexion
# (secret NextAuth résilient + null-safety pharmacie)
# Serveur + tests dans la même invocation.
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

# Warmup NextAuth (compilation lazy)
curl -s --max-time 90 -o /dev/null http://localhost:3000/api/auth/session
curl -s --max-time 90 -o /dev/null http://localhost:3000/api/auth/csrf
echo "[test] routes NextAuth précompilées"

# ─── Fonction : tente une connexion et rapporte le résultat ───
test_login() {
  local EMAIL="$1" PASS="$2" LABEL="$3"
  local JAR=$(mktemp)
  local CSRF=$(curl -s --max-time 30 -c "$JAR" http://localhost:3000/api/auth/csrf | python3 -c "import sys,json;print(json.load(sys.stdin).get('csrfToken',''))" 2>/dev/null)
  local RESP=$(curl -s --max-time 60 -b "$JAR" -c "$JAR" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "csrfToken=$CSRF" \
    --data-urlencode "email=$EMAIL" \
    --data-urlencode "password=$PASS" \
    --data-urlencode "json=true" \
    http://localhost:3000/api/auth/callback/credentials)
  local SESS=$(curl -s --max-time 30 -b "$JAR" http://localhost:3000/api/auth/session)
  local ROLE=$(echo "$SESS" | python3 -c "import sys,json;d=json.load(sys.stdin);print((d.get('user') or {}).get('roleName','AUCUN'))" 2>/dev/null)
  local NAME=$(echo "$SESS" | python3 -c "import sys,json;d=json.load(sys.stdin);print((d.get('user') or {}).get('name','') or 'AUCUN')" 2>/dev/null)
  if [ "$ROLE" != "AUCUN" ] && [ -n "$ROLE" ]; then
    echo "   ✅ $LABEL — session OK (role=$ROLE, name=$NAME)"
    rm -f "$JAR"; return 0
  else
    echo "   ❌ $LABEL — PAS DE SESSION (réponse callback: ${RESP:0:160})"
    rm -f "$JAR"; return 1
  fi
}

echo ""
echo "════ 1. Connexions des 4 espaces (comptes seed, mot de passe demo1234) ════"
FAILS=0
test_login "admin@medihelm.bj" "demo1234" "Pharmacie (admin@ — DIRECTEUR)" || FAILS=$((FAILS+1))
test_login "grossiste@medihelm.bj" "demo1234" "Grossiste (grossiste@ — GROSSISTE_PARTNER, pharmacie=NULL-safe)" || FAILS=$((FAILS+1))
test_login "dpmed@medihelm.bj" "demo1234" "Institution (dpmed@ — DPMED_ADMIN)" || FAILS=$((FAILS+1))

echo ""
echo "════ 2. Inscription patient PUIS connexion immédiate (repro du bug) ════"
TEST_EMAIL="login.ronde6.$(date +%s)@test.medihelm.bj"
TEST_PASS="MotDePasseRonde6!2026"
PHARM_ID=$(curl -s --max-time 60 "http://localhost:3000/api/pharmacies?public=signup" | python3 -c "import sys,json;d=json.load(sys.stdin);items=d if isinstance(d,list) else d.get('pharmacies',d.get('data',[]));print(items[0]['id'])" 2>/dev/null)
echo "   pharmacie d'inscription: ${PHARM_ID:0:12}…"
REG=$(curl -s --max-time 60 -X POST http://localhost:3000/api/patient/comptes \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"nom\":\"Validation\",\"prenom\":\"Login\",\"motDePasse\":\"$TEST_PASS\",\"telephone\":\"97000000\",\"pharmacieId\":\"$PHARM_ID\"}")
echo "   inscription: ${REG:0:100}"
test_login "$TEST_EMAIL" "$TEST_PASS" "Patient ($TEST_EMAIL — inscription puis connexion)" || FAILS=$((FAILS+1))

echo ""
echo "════ 3. Mauvais mot de passe → message d'erreur propre ════"
JAR=$(mktemp)
CSRF=$(curl -s -c "$JAR" http://localhost:3000/api/auth/csrf | python3 -c "import sys,json;print(json.load(sys.stdin).get('csrfToken',''))" 2>/dev/null)
RESP=$(curl -s -b "$JAR" -c "$JAR" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "email=$TEST_EMAIL" \
  --data-urlencode "password=MAUVAIS" \
  --data-urlencode "json=true" \
  http://localhost:3000/api/auth/callback/credentials)
echo "   callback (mauvais mdp): ${RESP:0:200}"
rm -f "$JAR"

echo ""
if [ "$FAILS" -gt 0 ]; then
  echo "════ RÉSULTAT: $FAILS échec(s) ════"
else
  echo "════ RÉSULTAT: 4/4 connexions OK ════"
fi
pkill -f "next dev" 2>/dev/null
exit $FAILS
