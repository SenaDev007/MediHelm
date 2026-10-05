#!/bin/bash
# ============================================================
# MediHelm — Parcours inscription complet en un seul appel
# (le serveur ne survit pas entre les appels bash)
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
echo "✅ serveur prêt — API registre:"
curl -s "http://localhost:3000/api/pharmacies?registre=abmed&departement=BORGOU&q=Beyerou" | head -c 200
echo ""

agent-browser set viewport 1440 900 > /dev/null 2>&1
agent-browser open http://localhost:3000/inscription > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1
agent-browser wait 4000 > /dev/null 2>&1

echo ""
echo "── 1. Ouverture Select + sélection Borgou ──"
agent-browser eval "
(async function(){
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const trigger = document.querySelector('[data-slot=select-trigger]');
  if (!trigger) return 'no-trigger';
  trigger.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, clientX: 300, clientY: 600}));
  await wait(700);
  const opts = Array.from(document.querySelectorAll('[role=option]'));
  if (!opts.length) return 'pas d options';
  const borgou = opts.find(o => o.textContent.includes('Borgou'));
  if (!borgou) return 'borgou-absent';
  borgou.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0}));
  await wait(500);
  if (trigger.textContent.includes('Sélectionner')) {
    borgou.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
    await wait(500);
  }
  return 'dept=' + trigger.textContent;
})()"

echo "── 2. Saisie recherche « Beyerou » (React controlled) ──"
agent-browser eval "
(async function(){
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const input = document.getElementById('queryRecherche');
  if (!input) return 'input-absent';
  if (input.disabled) return 'input-desactive (dept non sélectionné?)';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, 'Banikanni');
  input.dispatchEvent(new Event('input', {bubbles: true}));
  await wait(1800);
  return 'valeur=' + input.value;
})()"

echo "── 3. Résultats (Banikanni, sans compte) ──"
agent-browser eval "Array.from(document.querySelectorAll('.divide-y button')).map(b => b.innerText.split('\n')[0] + ' — ' + (b.innerText.split('\n')[1] || '')).slice(0, 4).join(' || ') || 'AUCUN'"
agent-browser screenshot $OUT/06-inscription-recherche.png > /dev/null 2>&1

echo "── 4. Sélection officine Beyerou ──"
agent-browser eval "
(async function(){
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const boutons = Array.from(document.querySelectorAll('.divide-y button'));
  const beyerou = boutons.find(b => b.innerText.includes('Banikanni'));
  if (!beyerou) return 'beyerou-absent';
  beyerou.click();
  await wait(1500);
  const t = document.body.innerText;
  return JSON.stringify({
    fiche: t.includes('Officine agréée ABMed'),
    numero: (t.match(/Officine agréée ABMed · P[0-9]+/) || [''])[0],
    titulaire: t.includes('Titulaire : SEDJAME'),
    autorisation: (t.match(/Autorisation : [^\n]{0,60}/) || [''])[0],
    badges: t.includes('ZS Parakou') && t.includes('BORGOU')
  });
})()"
agent-browser screenshot $OUT/07-inscription-officine-selectionnee.png > /dev/null 2>&1

echo "── 5. Mode nouvelle officine (champs ABMed) ──"
agent-browser eval "
(async function(){
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const boutons = Array.from(document.querySelectorAll('button'));
  const nouvelle = boutons.find(b => b.innerText.trim().startsWith('Nouvelle officine'));
  if (!nouvelle) return 'bouton-absent';
  nouvelle.click();
  await wait(1200);
  return 'mode-switch';
})()"
agent-browser eval "JSON.stringify({
  titreNouvelle: document.body.innerText.includes('pas encore au registre'),
  zoneSanitaire: !!document.getElementById('zoneSanitaire'),
  commune: !!document.getElementById('commune'),
  arrondissement: !!document.getElementById('arrondissement'),
  titulaire: !!document.getElementById('pharmacienTitulaire'),
  responsable: !!document.getElementById('pharmacienResponsable'),
  onpb: !!document.getElementById('numeroOnpb'),
  quitus: !!document.getElementById('referenceQuitus'),
  dateValidite: !!document.getElementById('dateValiditeAbmed'),
  agrement: !!document.getElementById('numeroAgrement'),
  sectionReglementaire: document.body.innerText.includes('Informations réglementaires')
})"
agent-browser screenshot $OUT/08-inscription-nouvelle-officine.png > /dev/null 2>&1

echo ""
echo "── Captures ──"
ls -la $OUT/0[5-8]*.png 2>/dev/null | awk '{print $NF, "("$5" o)"}'
pkill -f "next dev" 2>/dev/null
echo "✅ Parcours inscription terminé"
