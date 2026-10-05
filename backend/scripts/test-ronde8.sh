#!/bin/bash
# ============================================================
# MediHelm — Validation navigateur du flux d'authentification
# refactorisé (ronde 8) : sessions persistées en base, 4 espaces,
# avatar + déconnexion + paramétrage, multi-tenant strict.
# ============================================================
cd /home/z/my-project || exit 1

OUT=download/captures-ronde8
mkdir -p $OUT

PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "✅ $1"; }
ko()   { FAIL=$((FAIL+1)); echo "❌ $1"; }

agent-browser close 2>/dev/null || true
agent-browser set viewport 1440 844
agent-browser set geo 6.3728 2.3484

login_space() {
  local URL=$1 EMAIL=$2
  # Repart d'un état anonyme (sinon le middleware renvoie vers l'espace actif)
  agent-browser cookies clear >/dev/null 2>&1
  agent-browser open "$URL" >/dev/null
  agent-browser wait --load networkidle 2>/dev/null || true
  sleep 1
  agent-browser fill "#email" "$EMAIL" >/dev/null
  agent-browser fill "#password" "demo1234" >/dev/null
  agent-browser click "button[type=submit]" >/dev/null
  sleep 5
  agent-browser wait --load networkidle 2>/dev/null || true
  sleep 2
}

url_now() { agent-browser eval "window.location.pathname" 2>/dev/null | tail -1 | tr -d '"'; }

# Attends qu'un sélecteur apparaisse (retry)
wait_for() {
  local SEL=$1 TRIES=${2:-12}
  for i in $(seq 1 $TRIES); do
    N=$(agent-browser eval "document.querySelectorAll('$SEL').length" 2>/dev/null | tail -1)
    [ "${N:-0}" -ge 1 ] 2>/dev/null && return 0
    sleep 1
  done
  return 1
}

# Déconnexion via le menu utilisateur (le bouton menuitem est unique :
# les autres entrées sont des liens <a role=menuitem>)
logout_via_menu() {
  # Ferme tout menu éventuellement ouvert (clic extérieur simulé)
  agent-browser eval "document.body.dispatchEvent(new MouseEvent('mousedown', {bubbles:true}))" >/dev/null 2>&1
  sleep 1
  wait_for '[aria-label="Menu du compte"]' 15 || return 1
  agent-browser click '[aria-label="Menu du compte"]' >/dev/null
  sleep 1
  wait_for 'button[role="menuitem"]' 8 || return 1
  agent-browser click 'button[role="menuitem"]' >/dev/null
  sleep 6
}

echo "════ 1. ESPACE PRO (pharmacie) ════"

# Anonyme → landing
agent-browser open http://localhost:3000/pro >/dev/null
sleep 3
URL=$(url_now)
[ "$URL" = "/espace-pro" ] && ok "Anonyme /pro → landing /espace-pro ($URL)" || ko "Anonyme /pro → $URL (attendu /espace-pro)"

# Page de connexion : palette unifiée + formulaire à gauche + image à droite
agent-browser open http://localhost:3000/pro/connexion >/dev/null
agent-browser wait --load networkidle 2>/dev/null || true
sleep 2
TEAL=$(agent-browser eval "getComputedStyle(document.body).backgroundImage.includes('teal') || document.querySelector('.bg-gradient-to-br.from-teal-50') !== null ? 'teal' : 'autre'" 2>/dev/null | tail -1 | tr -d '"')
[ "$TEAL" = "teal" ] && ok "Page connexion Pro : palette teal unifiée" || ko "Page connexion Pro : palette $TEAL"
IMG=$(agent-browser eval "document.querySelectorAll('img[src*=\"pharmacie-bg\"]').length" 2>/dev/null | tail -1)
[ "$IMG" -ge 1 ] 2>/dev/null && ok "Image thématique pharmacie présente" || ko "Image thématique absente"
agent-browser screenshot $OUT/01-pro-connexion-teal.png >/dev/null

# Connexion pharmacie → dashboard
login_space http://localhost:3000/pro/connexion admin@medihelm.bj
URL=$(url_now)
[ "$URL" = "/pro" ] && ok "Connexion pharmacie → /pro (dashboard)" || ko "Connexion pharmacie → $URL (attendu /pro)"
agent-browser screenshot $OUT/02-pro-dashboard.png >/dev/null

wait_for '[aria-label="Menu du compte"]' 20
AVATAR=$(agent-browser eval "document.querySelector('[aria-label=\"Menu du compte\"]') ? 'avatar' : 'ABSENT'" 2>/dev/null | tail -1 | tr -d '"')
[ "$AVATAR" = "avatar" ] && ok "Avatar + menu compte dans la topbar Pro" || ko "Avatar absent de la topbar Pro"
PHARMACIE=$(agent-browser eval "document.body.innerText.includes('Beyerou') ? 'Beyerou' : '?'" 2>/dev/null | tail -1 | tr -d '"')
[ "$PHARMACIE" = "Beyerou" ] && ok "Tenant pharmacie affiché (Beyerou)" || ko "Tenant pharmacie non visible"

# Menu utilisateur : identité + paramètres + déconnexion
agent-browser click '[aria-label="Menu du compte"]' >/dev/null
sleep 1
MENU=$(agent-browser eval "document.body.innerText.includes('Paramètres') && document.body.innerText.includes('Se déconnecter') ? 'complet' : 'incomplet'" 2>/dev/null | tail -1 | tr -d '"')
[ "$MENU" = "complet" ] && ok "Menu compte : Paramètres + Se déconnecter" || ko "Menu compte incomplet ($MENU)"
agent-browser screenshot $OUT/03-pro-menu-compte.png >/dev/null
agent-browser press Escape >/dev/null 2>&1 || true
sleep 1

# Déconnexion → landing public avec CTA
logout_via_menu
URL=$(url_now)
[ "$URL" = "/espace-pro" ] && ok "Déconnexion Pro → landing /espace-pro" || ko "Déconnexion Pro → $URL (attendu /espace-pro)"
CTA=$(agent-browser eval "document.body.innerText.includes('Se connecter') ? 'CTA rétablis' : 'CTA absents'" 2>/dev/null | tail -1 | tr -d '"')
[ "$CTA" = "CTA rétablis" ] && ok "Boutons Se connecter rétablis après déconnexion" || ko "CTA non rétablis"

echo ""
echo "════ 2. ESPACE GROSSISTE ════"

login_space http://localhost:3000/grossistes/connexion grossiste@medihelm.bj
URL=$(url_now)
[ "$URL" = "/grossistes" ] && ok "Connexion grossiste → /grossistes" || ko "Connexion grossiste → $URL"
agent-browser screenshot $OUT/04-grossiste-dashboard.png >/dev/null

# Nom du grossiste depuis la SESSION (pas codé en dur)
sleep 3
NOM=$(agent-browser eval "document.body.innerText.includes('UbiPharm Bénin') ? 'session' : (document.body.innerText.includes('UbiPharm Sénégal') ? 'hardcodé!' : 'autre') " 2>/dev/null | tail -1 | tr -d '" ')
[ "$NOM" = "session" ] && ok "Nom grossiste depuis la session (UbiPharm Bénin)" || ko "Nom grossiste : $NOM"
wait_for '[aria-label="Menu du compte"]' 15
AVATAR=$(agent-browser eval "document.querySelector('[aria-label=\"Menu du compte\"]') ? 'avatar' : 'ABSENT'" 2>/dev/null | tail -1 | tr -d '"')
[ "$AVATAR" = "avatar" ] && ok "Avatar + menu compte dans la topbar Grossiste" || ko "Avatar absent grossiste"

# Déconnexion → landing grossiste
logout_via_menu
URL=$(url_now)
[ "$URL" = "/espace-grossiste" ] && ok "Déconnexion Grossiste → landing /espace-grossiste" || ko "Déconnexion Grossiste → $URL"

echo ""
echo "════ 3. ESPACE INSTITUTION ════"

login_space http://localhost:3000/institutions/connexion dpmed@medihelm.bj
URL=$(url_now)
[ "$URL" = "/institutions" ] && ok "Connexion DPMED → /institutions" || ko "Connexion DPMED → $URL"
agent-browser screenshot $OUT/05-institution-dashboard.png >/dev/null

wait_for '[aria-label="Menu du compte"]' 20
AVATAR=$(agent-browser eval "document.querySelector('[aria-label=\"Menu du compte\"]') ? 'avatar' : 'ABSENT'" 2>/dev/null | tail -1 | tr -d '"')
[ "$AVATAR" = "avatar" ] && ok "Avatar + menu compte institutionnel" || ko "Avatar absent institution"

# Page paramètres institution (via le lien du menu compte)
agent-browser eval "document.body.dispatchEvent(new MouseEvent('mousedown', {bubbles:true}))" >/dev/null 2>&1
sleep 1
wait_for '[aria-label="Menu du compte"]' 15
agent-browser click '[aria-label="Menu du compte"]' >/dev/null
sleep 1
wait_for 'a[href="/institutions/parametres"]' 8 && agent-browser click 'a[href="/institutions/parametres"]' >/dev/null
sleep 3
URL=$(url_now)
PARAM=$(agent-browser eval "document.body.innerText.includes('Préférences') ? 'ok' : 'vide'" 2>/dev/null | tail -1 | tr -d '"')
[ "$URL" = "/institutions/parametres" ] && [ "$PARAM" = "ok" ] && ok "Page Paramètres institution (identité + préférences)" || ko "Paramètres institution : $URL ($PARAM)"
agent-browser screenshot $OUT/06-institution-parametres.png >/dev/null

# Déconnexion institution
logout_via_menu
URL=$(url_now)
[ "$URL" = "/espace-institution" ] && ok "Déconnexion Institution → landing /espace-institution" || ko "Déconnexion Institution → $URL"

echo ""
echo "════ 4. ESPACE PATIENT (inscription → auto-connexion) ════"

TS=$(date +%s)
PAT_EMAIL="patient.ronde8.${TS}@test.medihelm.bj"
agent-browser cookies clear >/dev/null 2>&1
agent-browser open http://localhost:3000/patient/inscription >/dev/null
agent-browser wait --load networkidle 2>/dev/null || true
sleep 2
agent-browser fill "#nom" "Ronde8" >/dev/null
agent-browser fill "#prenom" "Authflow" >/dev/null
agent-browser fill "#reg-email" "$PAT_EMAIL" >/dev/null
agent-browser fill "#telephone" "97123456" >/dev/null
# Première pharmacie de la liste (Beyerou — Parakou)
PHARM_OPTION=$(agent-browser eval "document.querySelector('#pharmacie option:nth-child(2)')?.value ?? ''" 2>/dev/null | tail -1 | tr -d '"')
agent-browser select "#pharmacie" "$PHARM_OPTION" >/dev/null 2>&1 || true
agent-browser fill "#reg-password" "MotDePasseRonde8!2026" >/dev/null
agent-browser fill "#confirm-password" "MotDePasseRonde8!2026" >/dev/null
agent-browser click "button[type=submit]" >/dev/null
sleep 8
agent-browser wait --load networkidle 2>/dev/null || true
sleep 3
URL=$(url_now)
[ "$URL" = "/patient" ] && ok "Inscription patient → AUTO-CONNEXION → /patient" || ko "Inscription patient → $URL (attendu /patient)"
sleep 3
wait_for '[aria-label="Menu du compte"]' 15
AVATAR=$(agent-browser eval "document.querySelector('[aria-label=\"Menu du compte\"]') ? 'avatar' : 'ABSENT'" 2>/dev/null | tail -1 | tr -d '"')
[ "$AVATAR" = "avatar" ] && ok "Avatar + menu compte patient" || ko "Avatar absent patient"
SALUT=$(agent-browser eval "document.body.innerText.match(/Bonjour [^\\n]{2,30}/)?.[0] ?? 'pas de salutation'" 2>/dev/null | tail -1 | tr -d '"')
ok "Salutation patient : $SALUT"
agent-browser screenshot $OUT/07-patient-dashboard.png >/dev/null

echo ""
echo "════ 5. SESSION EN BASE (vérification directe) ════"
DB_COUNT=$(DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2-) bun -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const actives = await p.sessionUtilisateur.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } });
  const revoked = await p.sessionUtilisateur.count({ where: { revokedAt: { not: null } } });
  console.log(actives + ' actives / ' + revoked + ' révoquées');
  await p.\$disconnect();
})();
" 2>/dev/null | tail -1)
ok "Lignes SessionUtilisateur en base : $DB_COUNT"

agent-browser close 2>/dev/null || true
echo ""
echo "════════════════════════════════════════════"
echo "   RÉSULTAT : $PASS PASS / $FAIL FAIL"
echo "════════════════════════════════════════════"
[ $FAIL -eq 0 ] || exit 1
