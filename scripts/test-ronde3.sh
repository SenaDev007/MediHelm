#!/bin/bash
# ============================================================
# MediHelm — Validation ronde 3 (v2) : clustering par département,
# couleurs gris/vert/ambre, spiderfy, landing pages.
# Serveur + agent-browser dans un même appel.
# ============================================================
cd /home/z/my-project || exit 1
export DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)

OUT=download/captures/ronde3
mkdir -p $OUT

pkill -f "next dev" 2>/dev/null; sleep 1
rm -rf .next
setsid nohup bunx next dev -p 3000 > dev.log 2>&1 < /dev/null &
echo "[test] serveur démarré, attente..."
READY=0
for i in $(seq 1 90); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 http://localhost:3000/patient/garde 2>/dev/null)
  if [ "$CODE" = "200" ]; then READY=1; echo "[test] prêt (tentative $i)"; break; fi
  sleep 3
done
[ "$READY" = "1" ] || { echo "[test] ÉCHEC démarrage"; tail -20 dev.log; exit 1; }

curl -s --max-time 180 "http://localhost:3000/api/patient/pharmacies-proches?radius=5000" -o /home/z/my-project/pharms.json
curl -s --max-time 60 -o /dev/null "http://localhost:3000/api/pharmacies?garde=semaine"
curl -s --max-time 60 -o /dev/null http://localhost:3000/
curl -s --max-time 60 -o /dev/null http://localhost:3000/espace-pro
echo "[test] APIs et pages précompilées"

echo ""
echo "════ 1. API — inscriteMediHelm ════"
python3 - <<'EOF'
import json
try:
    data = json.load(open('/home/z/my-project/pharms.json'))
    print(f"   pharmacies: {len(data)}")
    ins = [(p['nom'], p.get('departement')) for p in data if p.get('inscriteMediHelm')]
    print(f"   inscrites MediHelm (vert): {ins}")
except Exception as e:
    print(f"   ERREUR lecture API: {e}")
EOF

echo ""
echo "════ 2. CARTE GARDE — desktop 1440×844, vue nationale ════"
agent-browser close 2>/dev/null || true
sleep 1
agent-browser set viewport 1440 844
agent-browser set geo 6.3728 2.3484
agent-browser open http://localhost:3000/patient/garde
agent-browser wait --load networkidle 2>/dev/null || true
sleep 10
agent-browser screenshot $OUT/01-garde-national.png

COUNT_DEPT=$(agent-browser eval "document.querySelectorAll('[aria-label^=\"Département\"]').length" 2>/dev/null | tail -1)
echo "   badges départementaux: $COUNT_DEPT (attendu: 12)"
LEGEND=$(agent-browser eval "document.querySelector('[aria-label=\"Afficher la légende\"]') ? 'oui' : 'ABSENT'" 2>/dev/null | tail -1)
echo "   bouton légende: $LEGEND"

echo ""
echo "════ 3. Clic badge BORGOU → zoom département ════"
agent-browser eval "
(() => {
  const b = document.querySelector('[aria-label^=\"Département BORGOU\"]');
  if (!b) return 'badge BORGOU introuvable';
  const r = b.getBoundingClientRect();
  b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, clientX: r.x + r.width/2, clientY: r.y + r.height/2 }));
  return 'clic BORGOU dispatché';
})()" 2>/dev/null | tail -1
sleep 5
agent-browser screenshot $OUT/02-garde-borgou.png
CLUSTERS=$(agent-browser eval "document.querySelectorAll('[aria-label*=\"officines\"]').length" 2>/dev/null | tail -1)
BORGOU_BADGE=$(agent-browser eval "document.querySelector('[aria-label^=\"Département BORGOU\"]') ? 'encore badge' : 'dissous'" 2>/dev/null | tail -1)
echo "   badge BORGOU: $BORGOU_BADGE · clusters visibles: $CLUSTERS"

echo ""
echo "════ 4. Drill clusters → SPIDERFY (Borgou/Parakou) ════"
for i in 1 2 3 4 5 6; do
  RESULT=$(agent-browser eval "
(() => {
  const clusters = Array.from(document.querySelectorAll('[aria-label*=\"officines\"][aria-label*=\"afficher\"]'));
  if (!clusters.length) return 'plus de clusters';
  clusters.sort((a,b) => (parseInt(b.getAttribute('aria-label'))||0) - (parseInt(a.getAttribute('aria-label'))||0));
  const b = clusters[0];
  const r = b.getBoundingClientRect();
  b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, clientX: r.x + r.width/2, clientY: r.y + r.height/2 }));
  return 'clic: ' + b.getAttribute('aria-label').split(' — ')[0];
})()" 2>/dev/null | tail -1)
  sleep 3
  PINS=$(agent-browser eval "document.querySelectorAll('.medihelm-pin').length" 2>/dev/null | tail -1)
  echo "   itération $i → $RESULT · pins: $PINS"
done
agent-browser screenshot $OUT/03-garde-spiderfy.png
PINS=$(agent-browser eval "document.querySelectorAll('.medihelm-pin').length" 2>/dev/null | tail -1)
echo "   pins individuels après drill: $PINS"

echo ""
echo "════ 5. Couleurs des pins + fiche holographique ════"
REG=$(agent-browser eval "document.querySelectorAll('linearGradient[id^=\"mh-grad-registre\"]').length" 2>/dev/null | tail -1)
INS=$(agent-browser eval "document.querySelectorAll('linearGradient[id^=\"mh-grad-inscrite\"]').length" 2>/dev/null | tail -1)
GARDE=$(agent-browser eval "document.querySelectorAll('linearGradient[id^=\"mh-grad-garde\"]').length" 2>/dev/null | tail -1)
echo "   pins gris(registre): $REG · verts(inscrites): $INS · ambre(garde): $GARDE"
agent-browser eval "
(() => {
  const p = document.querySelector('.medihelm-pin');
  if (!p) return 'aucun pin';
  const r = p.getBoundingClientRect();
  p.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, clientX: r.x + r.width/2, clientY: r.y + r.height/2 }));
  return 'pin cliqué';
})()" 2>/dev/null | tail -1
sleep 2
agent-browser screenshot $OUT/04-garde-fiche.png
FICHE=$(agent-browser eval "document.querySelector('.medihelm-popup') ? 'ouverte' : 'ABSENTE'" 2>/dev/null | tail -1)
echo "   fiche holographique: $FICHE"

echo ""
echo "════ 6. PAGE GÉOLOCALISATION (pharmacies) ════"
agent-browser open http://localhost:3000/patient/pharmacies
agent-browser wait --load networkidle 2>/dev/null || true
sleep 10
agent-browser screenshot $OUT/05-pharmacies-national.png
COUNT_DEPT2=$(agent-browser eval "document.querySelectorAll('[aria-label^=\"Département\"]').length" 2>/dev/null | tail -1)
echo "   badges départementaux: $COUNT_DEPT2"
agent-browser eval "
(() => {
  const b = document.querySelector('[aria-label^=\"Département BORGOU\"]');
  if (!b) return 'badge introuvable';
  const r = b.getBoundingClientRect();
  b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, clientX: r.x + r.width/2, clientY: r.y + r.height/2 }));
  return 'clic BORGOU';
})()" 2>/dev/null | tail -1
sleep 5
INS2=$(agent-browser eval "document.querySelectorAll('linearGradient[id^=\"mh-grad-inscrite\"]').length" 2>/dev/null | tail -1)
echo "   pins verts (Beyerou/Okedama) dans le Borgou zoomé: $INS2"
agent-browser screenshot $OUT/06-pharmacies-borgou.png

echo ""
echo "════ 7. LANDING PRINCIPAL ════"
agent-browser open http://localhost:3000/
agent-browser wait --load networkidle 2>/dev/null || true
sleep 3
agent-browser screenshot $OUT/07-landing-principal.png
agent-browser eval "
(() => {
  const t = document.body.innerText;
  return JSON.stringify({
    'Hero': t.includes('Le numérique au service'),
    'Choisissez votre espace': t.includes('Choisissez votre espace'),
    'PatientFeatures conservé': t.includes('Services pharmaceutiques en ligne'),
    'Tableau de bord SUPPRIMÉ': !t.includes('Inventaire des médicaments'),
    'Cinq espaces SUPPRIMÉ': !t.includes('Cinq espaces'),
    'Modules SUPPRIMÉ (main)': !t.includes('Modules présentés pour la gestion'),
    'Formules tarifaires SUPPRIMÉ (main)': !t.includes('Formules et conditions tarifaires'),
    'Échanges acteurs SUPPRIMÉ': !t.includes('Échanges avec les acteurs'),
    'Indicateurs réglementaires SUPPRIMÉ': !t.includes('Indicateurs de suivi réglementaire'),
    'Technologies SUPPRIMÉ': !t.includes('Technologies utilisées'),
  });
})()" 2>/dev/null | tail -1

echo ""
echo "════ 8. LANDING MEDIHELM PRO (/espace-pro) ════"
agent-browser open http://localhost:3000/espace-pro
agent-browser wait --load networkidle 2>/dev/null || true
sleep 3
URL=$(agent-browser eval "location.pathname" 2>/dev/null | tail -1)
echo "   URL atteinte: $URL (pas de redirection connexion)"
agent-browser screenshot $OUT/08-espace-pro.png
agent-browser eval "
(() => {
  const t = document.body.innerText;
  return JSON.stringify({
    'Hero Pro': t.includes('Pilotez votre officine'),
    'Modules présentés': t.includes('Modules présentés pour la gestion'),
    'Formules tarifaires': t.includes('Formules et conditions tarifaires'),
    'CTA inscription': t.includes('Inscrire mon officine'),
  });
})()" 2>/dev/null | tail -1

echo ""
echo "════ 9. MOBILE 390×844 — garde ════"
agent-browser set viewport 390 844
agent-browser open http://localhost:3000/patient/garde
agent-browser wait --load networkidle 2>/dev/null || true
sleep 10
agent-browser screenshot $OUT/09-garde-mobile.png
COUNT_DEPT_M=$(agent-browser eval "document.querySelectorAll('[aria-label^=\"Département\"]').length" 2>/dev/null | tail -1)
echo "   badges départementaux (mobile): $COUNT_DEPT_M"

echo ""
echo "════ 10. TABLETTE 768×1024 — pharmacies ════"
agent-browser set viewport 768 1024
agent-browser open http://localhost:3000/patient/pharmacies
agent-browser wait --load networkidle 2>/dev/null || true
sleep 10
agent-browser screenshot $OUT/10-pharmacies-tablette.png
COUNT_DEPT_T=$(agent-browser eval "document.querySelectorAll('[aria-label^=\"Département\"]').length" 2>/dev/null | tail -1)
echo "   badges départementaux (tablette): $COUNT_DEPT_T"

echo ""
echo "[test] terminé — captures dans $OUT"
pkill -f "next dev" 2>/dev/null
echo "[test] serveur arrêté"
