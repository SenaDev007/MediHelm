// ============================================================
// MediHelm — Seed Base nationale DCI (fiches institutionnelles DPMED)
// 24 médicaments essentiels du Bénin — contenu de référence OMS/ENM.
// Usage : DATABASE_URL=<neon> npx tsx scripts/seed-fiches-dci.ts
// ============================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface Interaction {
  dci: string
  severite: 'CONTRE-indication' | 'MAJEURE' | 'MODEREE' | 'MINEURE'
  description: string
}

interface FicheSeed {
  dci: string
  classeTherapeutique: string
  mecanisme: string
  indications: string
  posologie: string
  contreIndications: string
  interactions: Interaction[]
  effetsIndesirables: string[]
  conservation: string
  source: string
}

const FICHES: FicheSeed[] = [
  {
    dci: 'Paracétamol',
    classeTherapeutique: 'Antalgiques-antipyrétiques',
    mecanisme: 'Inhibition centrale de la cyclo-oxygénase (COX-3) et action sur le système sérotoninergique descendant, sans effet anti-inflammatoire périphérique significatif.',
    indications: 'Traitement symptomatique des douleurs légères à modérées et de la fièvre, chez l’adulte et l’enfant.',
    posologie: 'Adulte : 500 mg à 1 g par prise, à renouveler si besoin après 4-6 h, maximum 3 g/24 h (4 g en pratique hospitalière). Enfant : 15 mg/kg par prise, 4 prises max/24 h, sans dépasser 60 mg/kg/jour.',
    contreIndications: 'Insuffisance hépatocellulaire sévère, hypersensibilité connue, alcoolisme chronique, déficit en G6PD (prudence).',
    interactions: [
      { dci: 'Warfarine', severite: 'MODEREE', description: 'Potentialisation de l’effet anticoagulant aux doses répétées de paracétamol (> 2 g/j prolongés) : surveiller l’INR.' },
      { dci: 'Isoniazide', severite: 'MAJEURE', description: 'Risque de toxicité hépatique accru : surveillance des transaminases.' },
      { dci: 'Alcool', severite: 'MODEREE', description: 'Majoration de l’hépatotoxicité.' },
    ],
    effetsIndesirables: ['Rares : réactions cutanées (éruption, urticaire)', 'Très rares : thrombopénie, agranulocytose', 'Hépatotoxicité en cas de surdosage (dose toxique dès 150 mg/kg)'],
    conservation: 'À conserver à température inférieure à 30 °C, à l’abri de l’humidité.',
    source: 'OMS Modèle List 2023 · ENM Bénin',
  },
  {
    dci: 'Ibuprofène',
    classeTherapeutique: 'Anti-inflammatoires non stéroïdiens (AINS)',
    mecanisme: 'Inhibition non sélective et réversible des cyclo-oxygénases COX-1 et COX-2, diminuant la synthèse des prostaglandines inflammatoires.',
    indications: 'Douleurs et fièvre ; poussées inflammatoires rhumatismales, dysménorrhées, douleurs dentaires.',
    posologie: 'Adulte : 200-400 mg par prise, 3 fois/jour au moment des repas, max 1 200 mg/jour (hors avis médical). Enfant > 20 kg : 20-30 mg/kg/jour en 3 prises.',
    contreIndications: 'Ulcère gastroduodénal évolutif, insuffisance rénale ou hépatique sévère, insuffisance cardiaque décompensée, grossesse à partir du 6e mois (AINS contre-indiqués au 3e trimestre), antécédent d’allergie aux AINS/asthme déclenché par les AINS.',
    interactions: [
      { dci: 'Acide acétylsalicylique', severite: 'MAJEURE', description: 'Risque hémorragique digestif majoré et antagonisme de l’effet antiagrégant plaquettaire.' },
      { dci: 'Warfarine', severite: 'MAJEURE', description: 'Majoration du risque hémorragique.' },
      { dci: 'Diurétiques de l’anse / IEC', severite: 'MODEREE', description: 'Réduction de l’effet diurétique/hypotenseur et risque d’insuffisance rénale aiguë.' },
      { dci: 'Lithium', severite: 'MODEREE', description: 'Diminution de la clairance rénale du lithium avec risque de surdosage.' },
    ],
    effetsIndesirables: ['Épigastralgies, nausées, ulcérations digestives', 'Rétention hydrosodée, œdèmes, HTA', 'Insuffisance rénale fonctionnelle', 'Risque cardiovasculaire thrombotique au long cours'],
    conservation: 'À conserver à température ambiante (≤ 30 °C), à l’abri de la lumière.',
    source: 'OMS Modèle List 2023 · ENM Bénin',
  },
  {
    dci: 'Amoxicilline',
    classeTherapeutique: 'Pénicillines',
    mecanisme: 'Inhibition de la transpeptidase (PLP) empêchant la synthèse du peptidoglycane pariétal bactérien — bactéricide sur germes sensibles.',
    indications: 'Infections ORL, respiratoires, digestives, urinaires et dentaires à germes sensibles ; traitement de première intention de l’angine à streptocoque A et de l’otite moyenne aiguë de l’enfant.',
    posologie: 'Adulte : 1-2 g/jour en 2-3 prises (jusqu’à 3 g/jour dans les infections sévères). Enfant : 50-100 mg/kg/jour en 2-3 prises.',
    contreIndications: 'Allergie aux bêtalactamines (pénicillines/céphalosporines), antécédent d’hépatite cholestatique liée à l’amoxicilline-clavulanate (pour l’association).',
    interactions: [
      { dci: 'Méthotrexate', severite: 'MAJEURE', description: 'Diminution de la clairance du méthotrexate : risque de toxicité hématologique.' },
      { dci: 'Allopurinol', severite: 'MODEREE', description: 'Augmentation de l’incidence des éruptions cutanées.' },
      { dci: 'Warfarine', severite: 'MODEREE', description: 'Variation de l’INR décrite : surveiller en début et fin de traitement.' },
    ],
    effetsIndesirables: ['Éruptions cutanées, urticaire', 'Troubles digestifs (nausées, diarrhée)', 'Candidose orale/vaginale (flore)', 'Rares : réactions anaphylactiques'],
    conservation: 'Suspension reconstituée : 7 jours au réfrigérateur (2-8 °C). Comprimés : ≤ 25 °C, sec.',
    source: 'OMS Modèle List 2023 · ENM Bénin',
  },
  {
    dci: 'Amoxicilline + Acide clavulanique',
    classeTherapeutique: 'Pénicillines + inhibiteur de bêtalactamases',
    mecanisme: 'L’acide clavulanique inactive les bêtalactamases, restaurant l’activité de l’amoxicilline sur les souches productrices.',
    indications: 'Infections résistantes à la seule amoxicilline : sinusites, pneumonies communautaires, infections cutanées, morsures.',
    posologie: 'Adulte : 875/125 mg × 2/jour ou 500/125 mg × 3/jour au début du repas. Enfant : 80-90 mg/kg/jour (amoxicilline) en 2-3 prises.',
    contreIndications: 'Allergie aux bêtalactamines ; antécédent d’hépatotoxicité à cette association.',
    interactions: [
      { dci: 'Méthotrexate', severite: 'MAJEURE', description: 'Surdosage possible du méthotrexate.' },
      { dci: 'Warfarine', severite: 'MODEREE', description: 'Surveillance de l’INR recommandée.' },
    ],
    effetsIndesirables: ['Diarrhée (fréquente, dont colite à Clostridioides difficile)', 'Éruptions cutanées', 'Hépatite cholestatique (rare, plus fréquente qu’amoxicilline seule)'],
    conservation: '≤ 25 °C au sec ; suspension reconstituée : réfrigérateur, jeter après 7 jours.',
    source: 'OMS Modèle List 2023 · ENM Bénin',
  },
  {
    dci: 'Artéméther + Luméfantrine',
    classeTherapeutique: 'Antipaludéiques (ACT — combinaisons à base d’artémisinine)',
    mecanisme: 'L’artéméther (dérivé de l’artémisinine) génère des radicaux libres toxiques pour les trophozoïtes ; la luméfantrine empêche la formation de l’hémozoïne. Effet schizonticide sanguin rapide.',
    indications: 'Traitement du paludisme simple à Plasmodium falciparum chez l’adulte et l’enfant > 5 kg.',
    posologie: 'Adulte ≥ 35 kg : 4 comprimés 80/480 mg à H0, H8, H24, H36, H48, H60 (24 comprimés au total). Enfant 5-14 kg : selon poids (C-ACT). Prise avec du lait ou un aliment gras (absorption de la luméfantrine). En cas de vomissement < 30 min : reprendre la dose.',
    contreIndications: 'Hypersensibilité aux dérivés de l’artémisinine ; prudence en 1er trimestre de grossesse (à utiliser si aucune alternative, le paludisme étant lui-même dangereux) ; insuffisance cardiaque / troubles du rythme / QT long (luméfantrine).',
    interactions: [
      { dci: 'Méfloquine', severite: 'MAJEURE', description: 'Risque de surdosage combiné et d’allongement du QT ; ne pas associer.' },
      { dci: 'Halofantrine', severite: 'CONTRE-indication', description: 'Allongement majeur du QT — association formellement déconseillée.' },
      { dci: 'Antirétroviraux inhibiteurs de protéase', severite: 'MODEREE', description: 'Risque d’allongement du QT et modification des concentrations.' },
      { dci: 'Rifampicine / Carbamazépine', severite: 'MAJEURE', description: 'Inducteurs enzymatiques réduisant fortement les concentrations d’artéméther-luméfantrine : perte d’efficacité.' },
    ],
    effetsIndesirables: ['Troubles digestifs (nausées, vomissements, douleurs abdominales)', 'Céphalées, vertiges, asthénie', 'Toux, anorexie', 'Rares : allongement du QT'],
    conservation: '≤ 30 °C, à l’abri de l’humidité — conditions tropicales compatibles (blisters ALU/PVC).',
    source: 'Politique Nationale de Lutte contre le Paludisme — Bénin 2021-2026',
  },
  {
    dci: 'Artésunate',
    classeTherapeutique: 'Antipaludéiques (artémisinines)',
    mecanisme: 'Dérivé hydrosoluble de l’artémisinine à action schizonticide très rapide via radicaux libres alkylants.',
    indications: 'PALUDISME GRAVE : traitement de première intention (IV/IM) chez l’adulte et l’enfant ; forme rectale en préparation du transfert en zone rurale. Également en association orale (ACT) dans le paludisme simple.',
    posologie: 'Paludisme grave : 2,4 mg/kg IV/IM à H0, H12, H24 puis 1×/jour. Relais obligatoire par une ACT complète après au moins 24 h d’artésunate parentéral et capacité à boire.',
    contreIndications: 'Hypersensibilité aux artémisinines ; prudence 1er trimestre grossesse (utiliser si nécessaire).',
    interactions: [
      { dci: 'Méfloquine', severite: 'MODEREE', description: 'Cinétique peu affectée mais surveiller la neurotolérance en association séquentielle.' },
      { dci: 'Rifampicine', severite: 'MAJEURE', description: 'Induction enzymatique : concentrations réduites.' },
    ],
    effetsIndesirables: ['Fièvre, céphalées', 'Neuropénie transitoire (traitement prolongé)', 'Réticulocytopénie transitoire', 'Anémie hémolytique retardée (rare, J7-J14 — surveiller l’hémoglobine)'],
    conservation: 'Poudre ≤ 30 °C ; solution reconstituée : utiliser immédiatement (stable ≤ 1 h).',
    source: 'OMS Guidelines for malaria 2023 · PNL Bénin',
  },
  {
    dci: 'Amodiaquine',
    classeTherapeutique: 'Antipaludéiques (amino-4-quinoléines)',
    mecanisme: 'Interférence avec la cristallisation de l’hème en hémozoïne au sein de la vacuole digestive du parasite.',
    indications: 'Paludisme simple, exclusivement EN ASSOCIATION avec l’artésunate (ASAQ) pour prévenir la résistance.',
    posologie: 'ASAQ poids-adapté : artésunate 4 mg/kg + amodiaquine 10 mg/kg 1×/jour × 3 jours.',
    contreIndications: 'Antécédent d’hépatotoxicité ou d’agranulocytose sous amodiaquine ; hypersensibilité aux 4-aminoquinoléines.',
    interactions: [
      { dci: 'Efavirenz', severite: 'MAJEURE', description: 'Hépatotoxicité additive majorée — surveiller les transaminases.' },
      { dci: 'Antirétroviraux (zidovudine)', severite: 'MODEREE', description: 'Risque de dépression médullaire additive.' },
    ],
    effetsIndesirables: ['Agranulocytose (rare mais grave)', 'Hépatotoxicité', 'Troubles digestifs', 'Pigmentation cutanée au traitement prolongé'],
    conservation: '≤ 30 °C au sec.',
    source: 'PNL Bénin — ASAQ 1re intention alternatif',
  },
  {
    dci: 'Sulfadoxine + Pyriméthamine',
    classeTherapeutique: 'Antipaludéiques (antifoliques)',
    mecanisme: 'Blocage séquentiel de la dihydroptéroïne synthétase (sulfamide) et de la dihydrofolate réductase (pyriméthamine).',
    indications: 'Prévention du paludisme chez la femme enceinte (TPI — traitement préventif intermittent, 2e-3e trimestres) dans les zones de sensibilité conservée ; traitement de la toxoplasmose congénitale (avec acide folinique).',
    posologie: 'TPI : au moins 3 doses mensuelles de SP à partir du 2e trimestre, chacune sous supervision (directement observée).',
    contreIndications: 'Prématurité/nouveau-né < 1 mois ; hypersensibilité aux sulfamides ; anémie mégaloblastique sévère.',
    interactions: [
      { dci: 'Triméthoprime + Sulfaméthoxazole', severite: 'MAJEURE', description: 'Cumul antifolique : risque d’anémie mégaloblastique et de réactions cutanées.' },
      { dci: 'Méthotrexate', severite: 'MAJEURE', description: 'Potentialisation de l’antifolate.' },
    ],
    effetsIndesirables: ['Éruptions cutanées incluant syndrome de Stevens-Johnson (rare)', 'Anémie mégaloblastique', 'Hépatotoxicité', 'Réactions anaphylactiques'],
    conservation: '≤ 30 °C au sec.',
    source: 'PNL Bénin — TPI femmes enceintes',
  },
  {
    dci: 'Métronidazole',
    classeTherapeutique: 'Imidazolés (antibactériens/antiparasitaires)',
    mecanisme: 'Réduction du groupement nitro par des enzymes bactériennes/parasitaires anaérobies générant des métabolites cytotoxiques cassant l’ADN cible.',
    indications: 'Amibiase, giardiase, trichomonose ; infections à anaérobies (abdominales, dentaires, gynécologiques) ; pseudomembraneuse (alternative).',
    posologie: 'Amibiase invasive : 1 500 mg/jour en 3 prises × 5-7 j. Giardiase : 2 g/jour en 1 prise × 3 j (ou 250 mg × 3/j × 5-7 j). Anaérobies : 500 mg × 3/jour ou 1 500 mg/j en perfusion lente.',
    contreIndications: 'Allergie aux imidazolés ; grossesse 1er trimestre (formes systémiques, sauf urgence) ; consommation d’alcool pendant et 48 h après (effet Antabuse).',
    interactions: [
      { dci: 'Alcool', severite: 'CONTRE-indication', description: 'Effet antabuse sévère : flush, vomissements, hypotension. Abstinence totale pendant et 48 h après.' },
      { dci: 'Warfarine', severite: 'MAJEURE', description: 'Majoration de l’effet anticoagulant (inhibition du métabolisme). Contrôle INR.' },
      { dci: 'Lithium', severite: 'MODEREE', description: 'Risque d’augmentation de la lithémie.' },
      { dci: 'Fluorouracile (5-FU)', severite: 'MAJEURE', description: 'Toxicité du 5-FU majorée.' },
    ],
    effetsIndesirables: ['Goût métallique', 'Nausées, glossite, urines foncées', 'Neuropathie périphérique au traitement prolongé', 'Encéphalopathie/rétinopathie (rares)'],
    conservation: '≤ 25 °C ; solution perfusion à l’abri de la lumière.',
    source: 'OMS Modèle List 2023 · ENM Bénin',
  },
  {
    dci: 'Ciprofloxacine',
    classeTherapeutique: 'Fluoroquinolones',
    mecanisme: 'Inhibition de l’ADN gyrase (topoisomérase II) et de la topoisomérase IV bactériennes — bactéricide concentration-dépendante.',
    indications: 'Infections urinaires compliquées, prostatite bactérienne, typhoïde (alternatif), diarrhée bactérienne sévère, infections ostéo-articulaires à bacilles Gram négatif. Réservée aux indications documentées (maîtrise de la résistance).',
    posologie: 'Adulte : 250-750 mg × 2/jour selon l’indication, 5-14 jours. Enfant : seulement indications restrictives (mucoviscidose, typhoïde, complication) 15-30 mg/kg/jour en 2 prises.',
    contreIndications: 'Antécédent de tendinopathie/rupture tendineuse aux fluoroquinolones ; myasthénie ; grossesse/allaitement (formes systémiques) ; enfant en croissance sauf indication stricte ; épilepsie non contrôlée (prudence).',
    interactions: [
      { dci: 'Sels d’aluminium/magnésium/calcium/fer', severite: 'MAJEURE', description: 'Chélation : réduire fortement l’absorption — espacer de 2 h avant / 4-6 h après.' },
      { dci: 'Théophylline', severite: 'MAJEURE', description: 'Inhibition de son métabolisme : risque convulsif et cardiaque.' },
      { dci: 'Tizanidine', severite: 'CONTRE-indication', description: 'Majoration marquée de la sédation et de l’hypotension.' },
      { dci: 'Corticoïdes systémiques', severite: 'MODEREE', description: 'Risque de tendinopathie majoré (surtout > 60 ans).' },
    ],
    effetsIndesirables: ['Tendinopathies et rupture du tendon d’Achille', 'Nausées, diarrhée', 'Céphalées, insomnie, convulsions (rares)', 'Allongement du QT', 'Photosensibilité', 'Neuropathie périphérique persistante'],
    conservation: '≤ 25 °C au sec, à l’abri de la lumière.',
    source: 'OMS Modèle List 2023 · ENM Bénin',
  },
  {
    dci: 'Azithromycine',
    classeTherapeutique: 'Macrolides',
    mecanisme: 'Liaison à la sous-unité 50S du ribosome bactérien, bloquant la synthèse protéique — bactériostatique, concentrations tissulaires élevées et longue demi-vie.',
    indications: 'Angines à streptocoque A (alternative pénicillines), sinusites, pneumonies atypiques, trachome, infections génitales à Chlamydia ; usage massif trachome (Bénin : districts endémiques).',
    posologie: 'Angine : 20 mg/kg en 1 prise/jour × 3 jours (enfant) ; adulte 500 mg × 3 j. Infections génitales : 1 g dose unique.',
    contreIndications: 'Hypersensibilité aux macrolides ; insuffisance hépatique sévère (prudence) ; troubles du rythme / QT long congénital.',
    interactions: [
      { dci: 'Artéméther + Luméfantrine', severite: 'MODEREE', description: 'Risque additif d’allongement du QT — surveiller ECG si nécessaire.' },
      { dci: 'Anticoagulants coumariniques', severite: 'MODEREE', description: 'Majoration de l’INR décrite avec les macrolides.' },
      { dci: 'Digoxine', severite: 'MODEREE', description: 'Élévation de la digoxinémie (effet sur la P-gp).' },
    ],
    effetsIndesirables: ['Diarrhée, nausées, douleurs abdominales', 'Allongement du QT', 'Hypoacousie transitoire (doses élevées)', 'Rares : réactions hépatiques, allergies cutanées'],
    conservation: '≤ 25 °C ; suspension reconstituée : ≤ 5 jours à température ambiante.',
    source: 'OMS Modèle List 2023 · ENM Bénin',
  },
  {
    dci: 'Céftriaxone',
    classeTherapeutique: 'Céphalosporines de 3e génération',
    mecanisme: 'Fixation aux PLP → inhibition de la synthèse pariétale ; large spectre Gram négatif, bonne diffusion méningée.',
    indications: 'Méningites bactériennes (1re intention avec dexaméthasone), pneumonies sévères, pyélonéphrites, septicémies, gonococcie (500 mg IM dose unique — résistance élevée au Bénin), fièvre typhoïde sévère.',
    posologie: 'Adulte : 1-2 g IV/IM × 1/jour (2 g × 2/j dans les méningites). Enfant : 50-100 mg/kg/jour (100 mg/kg dans les méningites, max 4 g).',
    contreIndications: 'Allergie aux céphalosporines ; prudence si allergie croisée aux pénicillines (10 %) ; nouveau-né ictérique ou devant recevoir du calcium IV (contre-indication absolue — précipitation).',
    interactions: [
      { dci: 'Calcium IV', severite: 'CONTRE-indication', description: 'Précipitation céftriaxone-calcium mortelle chez le nouveau-né : jamais de soluté calcique simultané.' },
      { dci: 'Vancomycine', severite: 'MODEREE', description: 'Risque de néphrotoxicité additive en administration prolongée.' },
    ],
    effetsIndesirables: ['Douleur au point d’injection IM', 'Troubles digestifs, diarrhée', 'Éruptions cutanées', 'Lithiase biliaire (traitement prolongé)', 'Cytolyses hépatiques transitoires'],
    conservation: 'Poudre ≤ 25 °C ; reconstitué : utiliser dans les 6 h (24 h au réfrigérateur) — ne jamais conserver la solution avec calcium.',
    source: 'OMS Modèle List 2023 · ENM Bénin',
  },
  {
    dci: 'Cétirizine',
    classeTherapeutique: 'Antihistaminiques H1 (2e génération)',
    mecanisme: 'Antagoniste sélectif périphérique des récepteurs H1, sans effet anticholinergique ni sédation marquée.',
    indications: 'Rhinite allergique, urticaire, prurit allergique ; conjonctivite allergique.',
    posologie: 'Adulte/enfant > 12 ans : 10 mg 1×/jour. Enfant 6-12 ans : 5-10 mg/jour ; 2-6 ans : 2,5 mg × 2/jour.',
    contreIndications: 'Insuffisance rénale sévère (adaptation) ; hypersensibilité ; allaitement (prudence).',
    interactions: [
      { dci: 'Alcool / dépresseurs du SNC', severite: 'MINEURE', description: 'Sédation légèrement potentialisée (faible aux doses usuelles).' },
      { dci: 'Théophylline', severite: 'MINEURE', description: 'Légère augmentation de la clairance de la cétirizine.' },
    ],
    effetsIndesirables: ['Somnolence légère (10 %)', 'Sécheresse buccale', 'Céphalées', 'Rares : réactions paradoxales chez l’enfant'],
    conservation: '≤ 25 °C au sec.',
    source: 'ENM Bénin — antihistaminiques',
  },
  {
    dci: 'Oméprazole',
    classeTherapeutique: 'Inhibiteurs de la pompe à protons (IPP)',
    mecanisme: 'Inhibition irréversible et spécifique de la H+/K+-ATPase gastrique — réduction profonde de l’acidité.',
    indications: 'Reflux gastro-œsophagien, ulcère gastroduodénal (éradication H. pylori en trithérapie), prévention des ulcères sous AINS, œsophagite peptique.',
    posologie: 'Adulte : 20 mg 1×/jour le matin à jeun (40 mg dans l’œsophagite sévère) ; traitement d’entretien à la dose minimale efficace.',
    contreIndications: 'Hypersensibilité ; association avec le nelfinavir (contre-indiqué) ; grossesse : à évaluer (données rassurantes globalement, utiliser si nécessaire).',
    interactions: [
      { dci: 'Clopidogrel', severite: 'MAJEURE', description: 'Réduction de l’activation du clopidogrel (CYP2C19) : risque cardiovasculaire accru — préférer le pantoprazole.' },
      { dci: 'Atazanavir / nelfinavir', severite: 'CONTRE-indication', description: 'Chute majeure des concentrations d’antiprotéases (pH gastrique élevé + CYP).' },
      { dci: 'Méthotrexate haute dose', severite: 'MAJEURE', description: 'Élimination réduite : toxicité majorée.' },
      { dci: 'Fer / vitamine B12 / calcium carbonate', severite: 'MINEURE', description: 'Absorption réduite par l’hypochlorhydrie au traitement prolongé.' },
    ],
    effetsIndesirables: ['Céphalées, diarrhée, flatulences', 'Hypomagnésémie (traitement > 3 mois)', 'Fractures ostéoporotiques (usage prolongé à forte dose)', 'Rare : lupus médicamenteux, colite à C. difficile'],
    conservation: '≤ 25 °C au sec, à l’abri de l’humidité (gastro-résistants).',
    source: 'OMS Modèle List 2023 · ENM Bénin',
  },
  {
    dci: 'Metformine',
    classeTherapeutique: 'Antidiabétiques oraux (biguanides)',
    mecanisme: 'Réduction de la production hépatique de glucose (activation AMPK), amélioration de la sensibilité périphérique à l’insuline — sans risque d’hypoglycémie en monothérapie.',
    indications: 'Diabète de type 2 : première intention avec mesures hygiéno-diététiques ; diabète gestationnel (2e intention après insuline selon contexte) ; syndrome des ovaires polykystiques.',
    posologie: 'Débuter à 500 mg × 1-2/jour au repas, augmenter progressivement jusqu’à 2 000-2 550 mg/jour (max 3 000 mg) pour limiter les troubles digestifs.',
    contreIndications: 'Insuffisance rénale (DFG < 30 mL/min/1,73 m²) ; acidose métabolique / acidocétose ; insuffisance cardiaque ou respiratoire décompensée ; alcoolisme ; arrêt 48 h avant un produit de contraste iodé (si DFG < 60) ; grossesse : insuline en 1re intention.',
    interactions: [
      { dci: 'Produits de contraste iodés', severite: 'MAJEURE', description: 'Risque d’acidose lactique : arrêter la metformine 48 h avant et reprendre 48 h après contrôle de la fonction rénale.' },
      { dci: 'Alcool', severite: 'MAJEURE', description: 'Majoration du risque d’acidose lactique.' },
      { dci: 'Diurétiques de l’anse / corticoïdes', severite: 'MODEREE', description: 'Dégradation de la fonction rénale → accumulation de metformine.' },
      { dci: 'Glucocorticoïdes', severite: 'MODEREE', description: 'Hyperglycémie antagoniste.' },
    ],
    effetsIndesirables: ['Diarrhée, nausées, métallique (début de traitement)', 'Carence en B12 au long cours', 'Acidose lactique (exceptionnelle, grave)'],
    conservation: '≤ 25 °C au sec.',
    source: 'Guide PCIMA · Standards diabète Bénin',
  },
  {
    dci: 'Glibenclamide',
    classeTherapeutique: 'Antidiabétiques oraux (sulfamides hypoglycémiants)',
    mecanisme: 'Stimulation de la sécrétion d’insuline par fermeture des canaux K-ATP des cellules β pancréatiques — risque hypoglycémique.',
    indications: 'Diabète de type 2 non contrôlé par les mesures hygiéno-diététiques seules (souvent en association à la metformine).',
    posologie: 'Commencer à 2,5-5 mg au petit-déjeuner, titrer par paliers ; max 15 mg/jour. Sujet âgé : éviter (hypoglycémies sévères, durée d’action longue).',
    contreIndications: 'Diabète de type 1, insuffisance rénale ou hépatique sévère, grossesse/allaitement (insuline), sujet âgé fragile ; porphyrie.',
    interactions: [
      { dci: 'Fluconazole / miconazole buccal', severite: 'MAJEURE', description: 'Inhibition du CYP2C9 : hypoglycémies sévères rapportées.' },
      { dci: 'Bêtabloquants', severite: 'MODEREE', description: 'Masquage des signes adrénergiques d’hypoglycémie.' },
      { dci: 'AINS / aspirine', severite: 'MODEREE', description: 'Potentialisation de l’effet hypoglycémiant par déplacement protéique.' },
      { dci: 'Corticoïdes', severite: 'MODEREE', description: 'Antagonisme glycémique.' },
    ],
    effetsIndesirables: ['Hypoglycémies (parfois sévères et prolongées)', 'Prise de poids', 'Troubles digestifs', 'Réactions cutanées'],
    conservation: '≤ 25 °C au sec.',
    source: 'Guide PCIMA · Standards diabète Bénin',
  },
  {
    dci: 'Amlodipine',
    classeTherapeutique: 'Antihypertenseurs (inhibiteurs calciques)',
    mecanisme: 'Blocage sélectif des canaux calciques voltage-dépendants (dihydropyridine) du muscle lisse vasculaire → vasodilatation artérielle.',
    indications: 'Hypertension artérielle ; angor stable (monothérapie ou association).',
    posologie: '5 mg 1×/jour (max 10 mg) ; sujet âgé/insuffisant hépatique : débuter à 2,5 mg.',
    contreIndications: 'Choc, collapsus ; sténose aortique serrée ; angor instable/insuffisance cardiaque décompensée (forme immédiate) ; grossesse : uniquement sur avis spécialisé.',
    interactions: [
      { dci: 'Simvastatine', severite: 'MAJEURE', description: 'Limitation de la dose de simvastatine à 20 mg/jour (risque rhabdomyolytique via CYP3A4).' },
      { dci: 'Clarithromycine', severite: 'MODEREE', description: 'Augmentation des concentrations d’amlodipine : hypotension.' },
      { dci: 'Itraconazole / kététoconazole', severite: 'MODEREE', description: 'Idem — inhibiteurs puissants du CYP3A4.' },
      { dci: 'Sildénafil', severite: 'MINEURE', description: 'Hypotension additif (prudence).' },
    ],
    effetsIndesirables: ['Œdèmes des chevilles (vasodilatation capillaire)', 'Flush, céphalées', 'Palpitations réflexes', 'Hyperplasie gingivale (rare)'],
    conservation: '≤ 25 °C au sec.',
    source: 'OMS Modèle List 2023 · ENM Bénin',
  },
  {
    dci: 'Hydrochlorothiazide',
    classeTherapeutique: 'Antihypertenseurs (diurétiques thiazidiques)',
    mecanisme: 'Inhibition du cotransporteur Na-Cl du segment distal → natriurèse et baisse de la volémie/resistance vasculaire progressive.',
    indications: 'Hypertension artérielle (1re-2e intention) ; insuffisance cardiaque (œdèmes).',
    posologie: 'HTA : 12,5-25 mg le matin (max 50 mg ; doses élevées moins efficaces et plus hypokaliémiantes).',
    contreIndications: 'Insuffisance rénale sévère (CrCl < 30), anurie ; hypokaliémie/hyponatrémie non corrigées ; allergie aux sulfamides ; encéphalopathie hépatique ; goutte non contrôlée ; grossesse (2e-3e trimestre : toxicité fœtale).',
    interactions: [
      { dci: 'Digoxine', severite: 'MAJEURE', description: 'Hypokaliémie induite → risque de toxicité digitalique : surveiller K+.' },
      { dci: 'Lithium', severite: 'MAJEURE', description: 'Diminution de l’excrétion du lithium : intoxication.' },
      { dci: 'AINS', severite: 'MODEREE', description: 'Atténuation de l’effet antihypertenseur et risque rénal.' },
      { dci: 'IEC / sartans', severite: 'MINEURE', description: 'Synergie antihypertensive (bénéfique) — surveiller créatinine/K+ à l’initiation.' },
    ],
    effetsIndesirables: ['Hypokaliémie, hyponatrémie, hyperuricémie', 'Hyperglycémie (léger) ', 'Érections perturbées', 'Photosensibilité', 'Hypotension orthostatique (1re dose)'],
    conservation: '≤ 25 °C au sec.',
    source: 'OMS Modèle List 2023 · ENM Bénin',
  },
  {
    dci: 'Enalapril',
    classeTherapeutique: 'IEC (inhibiteurs de l’enzyme de conversion)',
    mecanisme: 'Inhibition de l’ACE → baisse de l’angiotensine II et de l’aldostérone, augmentation des bradykinines : vasodilatation, réduction du remodelage cardiaque.',
    indications: 'Hypertension artérielle ; insuffisance cardiaque (avec rétention) ; néphroprotection du diabète de type 2 (protéinurie).',
    posologie: 'HTA : 10-20 mg × 1-2/jour (débuter 5 mg si traité par diurétique ou sujet âgé). IC : 2,5-20 mg/jour en 2 prises.',
    contreIndications: 'Angio-œdème (antécédent ou sous IEC) ; grossesse (toxicité fœtale — contre-indication absolue, contraception nécessaire) ; sténose bilatérale des artères rénales ; hyperkaliémie.',
    interactions: [
      { dci: 'Potassium / épargneurs de K+', severite: 'MAJEURE', description: 'Hyperkaliémie additive : surveiller la kaliémie.' },
      { dci: 'AINS (indométacine)', severite: 'MAJEURE', description: 'Réduction de l’effet antihypertenseur et risque d’insuffisance rénale aiguë (tri-thérapie avec diurétique).' },
      { dci: 'Lithium', severite: 'MAJEURE', description: 'Élévation de la lithémie.' },
      { dci: 'Diurétiques d’anse', severite: 'MODEREE', description: 'Hypotension de première dose / insuffisance rénale fonctionnelle : débuter à faible dose.' },
    ],
    effetsIndesirables: ['Toux sèche persistante (10-15 %, bradykinine)', 'Angio-œdème (rare, urgence)', 'Hypotension de première dose', 'Hyperkaliémie, élévation créatinine', 'Teratogénicité (arrêt dès la conception)'],
    conservation: '≤ 25 °C au sec.',
    source: 'OMS Modèle List 2023 · ENM Bénin',
  },
  {
    dci: 'Furosémide',
    classeTherapeutique: 'Diurétiques de l’anse',
    mecanisme: 'Blocage du cotransporteur Na-K-2Cl de la branche ascendante de l’anse de Henlé → diurèse rapide et puissante.',
    indications: 'Insuffisance cardiaque décompensée (œdème aigu du poumon) ; œdèmes rénaux/hépatiques ; urgences hypertensives (avec antihypertenseur) ; hypercalcémie.',
    posologie: 'OAP : 20-40 mg IV lente (doubler si pas de réponse) ; entretien oral 20-80 mg/jour adapté au poids et à la fonction rénale.',
    contreIndications: 'Anurie ; hypovolémie non corrigée ; hypokaliémie/hyponatrémie sévères ; allergie sulfamides ; encéphalopathie hépatique.',
    interactions: [
      { dci: 'Digoxine', severite: 'MAJEURE', description: 'Hypokaliémie → toxicité digitalique : surveiller K+ et ECG.' },
      { dci: 'Aminosides (gentamicine)', severite: 'MAJEURE', description: 'Ototoxicité/néphrotoxicité majorées (surtout IV).' },
      { dci: 'Lithium', severite: 'MAJEURE', description: 'Variations importantes de la lithémie (rétention à l’arrêt brutal).' },
      { dci: 'IEC', severite: 'MODEREE', description: 'Hypotension / IRA fonctionnelle à l’initiation.' },
    ],
    effetsIndesirables: ['Hypokaliémie, hyponatrémie, hypomagnésémie', 'Ototoxicité (IV rapide, fortes doses)', 'Déshydratation, hypotension', 'Hyperuricémie, hyperglycémie', 'Élévation créatinine/urée'],
    conservation: '≤ 25 °C ; solution injectable à l’abri de la lumière.',
    source: 'OMS Modèle List 2023 · ENM Bénin',
  },
  {
    dci: 'Salbutamol',
    classeTherapeutique: 'Bronchodilatateurs (bêta-2 mimétiques d’action rapide)',
    mecanisme: 'Stimulation sélective des récepteurs bêta-2 bronchiques → relaxation du muscle lisse (AMPc) en quelques minutes.',
    indications: 'Crise d’asthme aiguë ; bronchospasme réversible ; prévention de l’asthme d’effort (avant exposition).',
    posologie: 'Crise : 100-200 µg (2 bouffées) en inhalateur pressurisé, à répéter selon réponse ; nébulisation 2,5-5 mg dans les crises sévères. Enfant : espaceur systématique (chambre d’inhalation).',
    contreIndications: 'Hypersensibilité ; prudence : tachyarythmie sévère, cardiomyopathie obstructive, hypokaliémie non corrigée.',
    interactions: [
      { dci: 'Bêtabloquants non sélectifs (propranolol)', severite: 'CONTRE-indication', description: 'Antagonisme pharmacologique direct avec blocage bronchodilatateur.' },
      { dci: 'Diurétiques / corticoïdes', severite: 'MODEREE', description: 'Risque d’hypokaliémie additive aux fortes doses de salbutamol.' },
      { dci: 'IMAO / antidépresseurs tricycliques', severite: 'MODEREE', description: 'Risque de réaction cardiovasculaire (tension, arythmie).' },
    ],
    effetsIndesirables: ['Tremblements fins', 'Tachycardie, palpitations', 'Hypokaliémie (fortes doses)', 'Céphalées, nervosité', 'Paradoxale bronchospasme (très rare)'],
    conservation: 'Inhalateur : ≤ 30 °C, à l’abri du gel et de la chaleur directe ; l’appareil devant être propre et sec.',
    source: 'OMS Modèle List 2023 · ENM Bénin',
  },
  {
    dci: 'Prednisolone',
    classeTherapeutique: 'Corticoïdes systémiques',
    mecanisme: 'Liaison au récepteur glucocorticoïde → effets anti-inflammatoire, immunosuppresseur et métabolique (gluconéogenèse).',
    indications: 'Exacerbations d’asthme, réactions allergiques sévères, néphrose lipoïdique, maladies auto-immunes, palliation hématologique ; traitement adjuvant des méningites (dexaméthasone plutôt) et de la tuberculose péricardique.',
    posologie: 'Adaptée à l’indication : 0,5-1 mg/kg/jour (maladies inflammatoires) ; exacerbation d’asthme enfant : 1-2 mg/kg/jour × 3-5 jours ; toujours en prise matinale, décroissance progressive si > 10-14 jours.',
    contreIndications: 'Infection systémique non contrôlée (sauf indication vitale) ; ulcère gastroduodénal évolutif (prudence + IPP) ; psychose non contrôlée ; live vaccines (vaccins vivants contre-indiqués pendant la corticothérapie) ; diabète déséquilibré (prudence).',
    interactions: [
      { dci: 'Anti-inflammatoires non stéroïdiens', severite: 'MAJEURE', description: 'Risque ulcérogène digestif majoré.' },
      { dci: 'Diurétiques (hypokaliémiants)', severite: 'MAJEURE', description: 'Hypokaliémie additive.' },
      { dci: 'Antidiabétiques / insuline', severite: 'MAJEURE', description: 'Hyperglycémie cortisonique : renforcement du traitement antidiabétique requis.' },
      { dci: 'Rifampicine / phénobarbital / carbamazépine', severite: 'MAJEURE', description: 'Inducteurs enzymatiques → chute de l’efficacité cortisonique (adapter la dose).' },
      { dci: 'Itraconazole', severite: 'MODEREE', description: 'Élévation des concentrations de corticoïde.' },
    ],
    effetsIndesirables: ['Syndrome cushingoïde (visage arrondi, obésité trunculaire)', 'Ostéoporose (long cours)', 'Diabète cortisonique', 'Immunosuppression / infections', 'Retard de croissance (enfant)', 'Troubles du sommeil et psychiatriques', 'Atrophie cutanée'],
    conservation: '≤ 25 °C au sec.',
    source: 'OMS Modèle List 2023 · ENM Bénin',
  },
  {
    dci: 'Sels de réhydratation orale (SRO)',
    classeTherapeutique: 'Solutions de réhydratation',
    mecanisme: 'Cotransport intestinal sodium-glucose dépendant (résistant au choléra) permettant l’absorption d’eau et d’électrolytes malgré la diarrhée.',
    indications: 'Prévention et traitement de la déshydratation par diarrhée aiguë (enfant et adulte), y compris choléra.',
    posologie: 'Diarrhée sans déshydratation : 50-100 ml/kg sur 4 h (prévention). Déshydratation modérée : 75 ml/kg sur 4 h en SRO hypotonique OMS (245 mOsm/L, sodium 75). Réévaluer et poursuivre selon soif/perte ; poursuivre l’alimentation.',
    contreIndications: 'Déshydratation sévère avec choc (IV d’abord : Ringer Lactate) ; iléus/occlusion ; vomissements incoercibles (sonde NG) ; coma.',
    interactions: [
      { dci: 'Lopéramide', severite: 'MODEREE', description: 'Ne pas utiliser l’anti-diarrhéique à la place des SRO ; lopéramide contre-indiqué chez l’enfant < 5 ans et dans infections invasives.' },
    ],
    effetsIndesirables: ['Vomissements (fractionner les prises)', 'Hyperhydratation si surdosage massif (rare)'],
    conservation: 'Sachets ≤ 30 °C au sec ; solution reconstituée : 24 h max à température ambiante, jeter ensuite.',
    source: 'OMS SRO hypotonique 245 · PCIMA Bénin',
  },
  {
    dci: 'Sulfate ferreux + Acide folique',
    classeTherapeutique: 'Suppléments en fer et vitamines',
    mecanisme: 'Apport de fer pour l’hémoglobinogenèse et d’acide folique pour l’érythropoïèse — correction des carences.',
    indications: 'Anémie ferriprive ; supplémentation systématique de la femme enceinte (fer + acide folique) ; prévention des anomalies de fermeture du tube neural.',
    posologie: 'Femme enceinte : 60 mg fer élémentaire + 400 µg acide folique/jour dès le 1er trimestre (Bénin : 3 mois par trimestre selon PNAN). Anémie ferriprive : 120 mg fer élémentaire/jour fractionné 3 mois + 3 mois de replenishment des réserves.',
    contreIndications: 'Hémochromatose, thalassémies (sans carence), anémies non carencielles ; ulcère évolutif (prudence) ; transfusions répétées.',
    interactions: [
      { dci: 'Tétracyclines / fluoroquinolones', severite: 'MAJEURE', description: 'Chélation mutuelle : espacer de 2-4 h.' },
      { dci: 'Lévodopa / lévothyroxine / pénicillamine', severite: 'MODEREE', description: 'Réduction de l’absorption des deux partenaires — espacer.' },
      { dci: 'Oméprazole', severite: 'MODEREE', description: 'Réduction de l’absorption du fer (pH).' },
      { dci: 'Thé / café / calcium', severite: 'MINEURE', description: 'Chélation : éviter la prise simultanée (espacer 1-2 h).' },
    ],
    effetsIndesirables: ['Selles noires (bénin, informatif)', 'Constipation ou diarrhée', 'Épigastria, nausées (fractionner, prendre au repas)'],
    conservation: '≤ 30 °C au sec — le fer s’oxyde à l’humidité (blisters).',
    source: 'PNAN Bénin · OMS grossesse',
  },
  {
    dci: 'Rifampicine + Isoniazide + Pyrazinamide + Éthambutol',
    classeTherapeutique: 'Antituberculeux (combinaison à dose fixe)',
    mecanisme: 'Quadruple bactéricide : rifampicine (ADN-RNA polymérase), isoniazide (synthèse des acides mycoliques), pyrazinamide (action intracellulaire en milieu acide), éthambutol (paroi, bactériostatique initial résistant à la mutation).',
    indications: 'Phase intensive du traitement de la tuberculose pulmonaire et extrapulmonaire (2 mois) puis phase d’entretien rifampicine + isoniazide 4 mois ; traitement préventif de l’infection tuberculeuse latente (adapté).',
    posologie: 'Dose fixe combinée pondérale (Bénin : 30-37 kg : 2 cp ; 38-54 kg : 3 cp ; 55-70 kg : 4 cp ; > 70 kg : 5 cp) à jeun, en une prise quotidienne surveillée. Phase intensive = 2 mois. Toujours en prises combinées (éviter monothérapie → résistance).',
    contreIndications: 'Hépatite active/ictère ; hypersensibilité aux composants ; porphyrie ; éthambutol : névrite optique connue (contre-indiqué chez le jeune enfant incapable de signaler une baisse visuelle si surveillance impossible) ; grossesse : utilisable (bénéfice > risque).',
    interactions: [
      { dci: 'Antirétroviraux (nevirapine, inhibiteurs protéase non boostés)', severite: 'MAJEURE', description: 'La rifampicine (inducteur puissant du CYP3A4) effondre les concentrations d’ARV — coordonner le protocole VIH/TB avec le médecin référent.' },
      { dci: 'Warfarine / corticoïdes / contraceptifs oraux', severite: 'MAJEURE', description: 'Induction enzymatique majeure : perte d’efficacité — contraception non hormonale nécessaire.' },
      { dci: 'Antidiabétiques oraux (glibenclamide/metformine)', severite: 'MODEREE', description: 'Variation des concentrations : surveiller glycémie.' },
      { dci: 'Paracétamol (doses prolongées)', severite: 'MODEREE', description: 'Hépatotoxicité additive (alcool proscrit).' },
    ],
    effetsIndesirables: ['Hépatotoxicité (ALAT/ASAT — surveiller cliniquement ; urines foncées bénignes signe rifampicine)', 'Rash, prurit', 'Nausées/vomissements', 'Isoniazide : neuropathie périphérique (prévention pyridoxine B6 10-25 mg/j) ', 'Éthambutol : névrite optique rétrobulbaire (dépistage : vision des couleurs rouge-vert — arrêt si baisse)', 'Arthralgies (pyrazinamide, uricémie)'],
    conservation: '≤ 30 °C au sec, à l’abri de l’humidité ; les couleurs des comprimés ne doivent pas altérer.',
    source: 'Guide National Tuberculose Bénin (PNTL)',
  },
]

async function main() {
  let crees = 0
  let maj = 0
  for (const f of FICHES) {
    const data = {
      dci: f.dci,
      classeTherapeutique: f.classeTherapeutique,
      mecanisme: f.mecanisme,
      indications: f.indications,
      posologie: f.posologie,
      contreIndications: f.contreIndications,
      interactions: JSON.stringify(f.interactions),
      effetsIndesirables: JSON.stringify(f.effetsIndesirables),
      conservation: f.conservation,
      source: f.source,
    }
    const existante = await prisma.ficheDCI.findUnique({ where: { dci: f.dci } })
    if (existante) {
      await prisma.ficheDCI.update({ where: { dci: f.dci }, data })
      maj += 1
    } else {
      await prisma.ficheDCI.create({ data })
      crees += 1
    }
  }
  const total = await prisma.ficheDCI.count()
  console.log(`✔ Fiches DCI : ${crees} créées, ${maj} mises à jour — total en base : ${total}`)
  const parClasse = await prisma.ficheDCI.groupBy({ by: ['classeTherapeutique'], _count: true })
  parClasse.forEach((c) => console.log(`   ${c.classeTherapeutique}: ${c._count}`))
}

main()
  .catch((e) => { console.error('ERREUR:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
