#!/bin/bash
# ============================================================
# MediHelm — Test du flux de connexion CONTRE LA PRODUCTION
# (medihelm.vercel.app) — reproduit exactement l'appel du
# navigateur : CSRF + POST callback/credentials (json=true).
# ============================================================
BASE="${1:-https://medihelm.vercel.app}"
EMAIL="${2:-admin@medihelm.bj}"
PASS="${3:-demo1234}"
JAR=$(mktemp)

echo "── Cible : $BASE ──"
echo "── Compte : $EMAIL ──"

echo ""
echo "1) GET /api/auth/csrf"
CSRF_JSON=$(curl -s --max-time 30 -c "$JAR" "$BASE/api/auth/csrf")
echo "   $CSRF_JSON"
CSRF=$(echo "$CSRF_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin).get('csrfToken',''))" 2>/dev/null)
echo "   token: ${CSRF:0:24}…"

echo ""
echo "2) POST /api/auth/callback/credentials (json=true)"
RESP=$(curl -s --max-time 40 -b "$JAR" -c "$JAR" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "email=$EMAIL" \
  --data-urlencode "password=$PASS" \
  --data-urlencode "json=true" \
  -w "\nHTTP_STATUS:%{http_code}" \
  "$BASE/api/auth/callback/credentials")
echo "   $RESP"

echo ""
echo "3) Cookie de session présent ?"
SESSION_COOKIE=$(rg "next-auth.session-token" "$JAR" 2>/dev/null | head -1)
if [ -n "$SESSION_COOKIE" ]; then
  echo "   ✅ next-auth.session-token DÉFINI"
else
  echo "   ❌ AUCUN cookie de session"
fi

echo ""
echo "4) GET /api/auth/session (avec le cookie)"
SESS=$(curl -s --max-time 30 -b "$JAR" "$BASE/api/auth/session")
echo "   ${SESS:0:300}"

rm -f "$JAR"
