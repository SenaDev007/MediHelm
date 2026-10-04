#!/bin/bash
# ============================================================
# MediHelm — Validation navigateur finale : carte + inscription
# ============================================================
cd /home/z/my-project || exit 1
export DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)
OUT=download/captures/abmed
mkdir -p $OUT

pkill -f "next dev" 2>/dev/null; sleep 1
setsid nohup bunx next dev -p 3000 > dev.log 2>&1 < /dev/null &
READY=0
for i in $(seq 1 40); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 http://localhost:3000/ 2>/dev/null)
  [ "$CODE" = "200" ] && READY=1 && break
  sleep 2
done
[ "$READY" != "1" ] && { echo "❌ serveur"; exit 2; }
echo "✅ serveur prêt"

agent-browser set viewport 1440 844 > /dev/null 2>&1

# ═══ 1. CARTE — sélection Beyerou puis SURVOL pin Okedama ═══
agent-browser open http://localhost:3000/patient/pharmacies > /dev/null 2>&1
agent-browser wait 3000 > /dev/null 2>&1
agent-browser eval "navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister()))).then(() => 'ok')" > /dev/null 2>&1
agent-browser reload > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1
agent-browser wait 5000 > /dev/null 2>&1

# Sélection Beyerou depuis la liste (flyTo Parakou)
agent-browser eval "
(async function(){
  await new Promise(r => setTimeout(r, 500));
  const cards = Array.from(document.querySelectorAll('[id^=pharmacy-]'));
  const card = cards.find(c => c.innerText.includes('Beyerou'));
  if (!card) return 'not-found';
  (card.querySelector('.cursor-pointer') || card.firstElementChild).dispatchEvent(new MouseEvent('click', {bubbles: true}));
  return 'selected';
})()" > /dev/null 2>&1
agent-browser wait 3000 > /dev/null 2>&1
agent-browser screenshot $OUT/02b-carte-parakou-selection.png > /dev/null 2>&1
echo "── capture 02b ok"

# Survol du pin Okedama (voisin visible)
echo "── SURVOL pin Okedama ──"
agent-browser find role button hover --name "Okedama" 2>&1 | head -1
agent-browser wait 1500 > /dev/null 2>&1
echo "── fiche survol (doit être complète, sans actions) ──"
agent-browser eval "var p = document.querySelector('.maplibregl-popup'); p ? p.innerText.slice(0, 400) : 'PAS DE POPUP'"
agent-browser screenshot $OUT/03c-fiche-hover-okedama.png > /dev/null 2>&1

# ═══ 2. INSCRIPTION — parcours complet registre ABMed ═══
agent-browser open http://localhost:3000/inscription > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1
agent-browser wait 3000 > /dev/null 2>&1
agent-browser screenshot $OUT/05-inscription-registre.png > /dev/null 2>&1
echo "── capture 05 ok"

# Le mode registre est actif par défaut — ouvre le select département
agent-browser eval "
(async function(){
  const cb = document.querySelector('[role=combobox]');
  if (!cb) return 'no-combobox';
  cb.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
  cb.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
  cb.click();
  return 'opened';
})()" > /dev/null 2>&1
agent-browser wait 800 > /dev/null 2>&1
# Choisit Borgou
agent-browser find role option click --name "Borgou" 2>&1 | head -1
agent-browser wait 1000 > /dev/null 2>&1

# Tape la recherche
agent-browser find label "Nom de l'officine" fill "Beyerou" 2>&1 | head -1
agent-browser wait 2000 > /dev/null 2>&1
echo "── résultats recherche ──"
agent-browser eval "Array.from(document.querySelectorAll('.divide-y button')).map(b => b.innerText.split('\n')[0]).slice(0, 5).join(' | ') || 'AUCUN'"
agent-browser screenshot $OUT/06-inscription-recherche.png > /dev/null 2>&1

# Sélectionne Beyerou
agent-browser find role button click --name "Beyerou" 2>&1 | head -1
agent-browser wait 1500 > /dev/null 2>&1
echo "── fiche officine sélectionnée ──"
agent-browser eval "document.body.innerText.includes('Officine agréée ABMed') ? (document.querySelector('.divide-y')?.previousElementSibling?.innerText || document.body.innerText.match(/Officine agréée ABMed[^\n]*/)?.[0] || 'sélectionnée') : 'FICHE ABSENTE'"
agent-browser screenshot $OUT/07-inscription-officine-selectionnee.png > /dev/null 2>&1

# Vérifie le bouton submit actif (compte non encore rempli — juste présent)
echo "── bouton création présent ──"
agent-browser eval "var b = Array.from(document.querySelectorAll('button[type=submit]')); b.length + ' bouton(s) submit — ' + (b[0]?.innerText || '')"

# ═══ 3. Mode nouvelle officine (aperçu formulaire ABMed) ═══
agent-browser find role button click --name "Nouvelle officine" 2>&1 | head -1
agent-browser wait 1000 > /dev/null 2>&1
echo "── formulaire nouvelle officine (champs ABMed) ──"
agent-browser eval "JSON.stringify({
  titre: document.body.innerText.includes('Nouvelle officine'),
  champZoneSanitaire: !!document.getElementById('zoneSanitaire'),
  champArrondissement: !!document.getElementById('arrondissement'),
  champCommune: !!document.getElementById('commune'),
  champTitulaire: !!document.getElementById('pharmacienTitulaire'),
  champOnpb: !!document.getElementById('numeroOnpb'),
  champQuitus: !!document.getElementById('referenceQuitus'),
  champDateValidite: !!document.getElementById('dateValiditeAbmed'),
  infoReglementaires: document.body.innerText.includes('Informations réglementaires')
})"
agent-browser screenshot $OUT/08-inscription-nouvelle-officine.png > /dev/null 2>&1

echo ""
echo "── Captures finales ──"
ls -la $OUT/*.png | awk '{print $NF, "("$5" octets)"}'

pkill -f "next dev" 2>/dev/null
echo "✅ Validation navigateur terminée"
