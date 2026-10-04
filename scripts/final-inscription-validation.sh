#!/bin/bash
# ============================================================
# MediHelm — Validation navigateur du parcours d'inscription ABMed
# (vrais clics Playwright pour le Select Radix)
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

agent-browser set viewport 1440 900 > /dev/null 2>&1
agent-browser open http://localhost:3000/inscription > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1
agent-browser wait 3000 > /dev/null 2>&1

echo "── 1. Mode registre actif par défaut ──"
agent-browser eval "JSON.stringify({
  registre: document.body.innerText.includes('Registre ABMed'),
  nouvelle: document.body.innerText.includes('Nouvelle officine'),
  description: document.body.innerText.includes('398 officines'),
  selectDept: !!document.querySelector('[role=combobox]'),
  rechercheLabel: document.body.innerText.includes(\"Nom de l'officine\")
})"

echo "── 2. Ouverture Select département (vrai clic) ──"
agent-browser find role combobox click 2>&1 | head -1
agent-browser wait 1000 > /dev/null 2>&1
agent-browser eval "document.querySelectorAll('[role=option]').length + ' options visibles'"

echo "── 3. Sélection Borgou ──"
agent-browser find role option click --name "Borgou" 2>&1 | head -1
agent-browser wait 1200 > /dev/null 2>&1
agent-browser eval "document.querySelector('[role=combobox]')?.textContent || 'VIDE'"

echo "── 4. Recherche « Beyerou » ──"
agent-browser find label "Nom de l'officine" fill "Beyerou" 2>&1 | head -1
agent-browser wait 2000 > /dev/null 2>&1
agent-browser eval "Array.from(document.querySelectorAll('.divide-y button')).map(b => b.innerText.split('\n')[0]).slice(0, 5).join(' | ') || 'AUCUN'"
agent-browser screenshot $OUT/06-inscription-recherche.png > /dev/null 2>&1

echo "── 5. Sélection de l'officine Beyerou ──"
agent-browser find role button click --name "Beyerou" 2>&1 | head -1
agent-browser wait 1500 > /dev/null 2>&1
agent-browser eval "
var fiche = document.body.innerText.includes('Officine agréée ABMed');
fiche ? 'FICHE PRÉSENTÉE : ' + (document.body.innerText.match(/Officine agréée ABMed[^\n]*/)[0] || '') + ' | ' + (document.body.innerText.match(/Autorisation[^\n]*/)?.[0] || 'pas d autorisation') : 'FICHE ABSENTE'"
agent-browser screenshot $OUT/07-inscription-officine-selectionnee.png > /dev/null 2>&1

echo "── 6. Mode nouvelle officine (formulaire ABMed complet) ──"
agent-browser find role button click --name "Nouvelle officine" 2>&1 | head -1
agent-browser wait 1200 > /dev/null 2>&1
agent-browser eval "JSON.stringify({
  titreNouvelle: document.body.innerText.includes('Votre officine n'),
  champZoneSanitaire: !!document.getElementById('zoneSanitaire'),
  champCommune: !!document.getElementById('commune'),
  champArrondissement: !!document.getElementById('arrondissement'),
  champTitulaire: !!document.getElementById('pharmacienTitulaire'),
  champResponsable: !!document.getElementById('pharmacienResponsable'),
  champOnpb: !!document.getElementById('numeroOnpb'),
  champQuitus: !!document.getElementById('referenceQuitus'),
  champDateValidite: !!document.getElementById('dateValiditeAbmed'),
  champAgrement: !!document.getElementById('numeroAgrement'),
  sectionReglementaire: document.body.innerText.includes('Informations réglementaires')
})"
agent-browser screenshot $OUT/08-inscription-nouvelle-officine.png > /dev/null 2>&1

echo ""
echo "── Captures ──"
ls -la $OUT/0[5-8]*.png 2>/dev/null | awk '{print $NF, "("$5" o)"}'
pkill -f "next dev" 2>/dev/null
echo "✅ Validation inscription terminée"
