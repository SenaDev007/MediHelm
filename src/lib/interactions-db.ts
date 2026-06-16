// ============================================================
// MediHelm — Interactions médicamenteuses (base de données statique)
// Base de données des interactions médicamenteuses courantes
// Configurable et extensible — les données sont séparées de la logique
// Référence: MH-INTERACTIONS-DB-v1.0
// ============================================================

export interface InteractionData {
  niveau: string
  description: string
  recommandation: string
}

// Base de données statique des interactions médicamenteuses courantes
// Clé = DCI en minuscules, Valeur = Map des DCI cibles → données d'interaction
export const INTERACTIONS_DB: Record<string, Record<string, InteractionData>> = {
  'paracetamol': {
    'warfarine': { niveau: 'MODERE', description: 'Risque hémorragique augmenté à doses élevées de paracétamol (> 4g/j)', recommandation: "Surveiller l'INR. Limiter la dose de paracétamol." },
    'carbamazepine': { niveau: 'FAIBLE', description: "Diminution de l'efficacité du paracétamol par induction enzymatique", recommandation: 'Ajuster la dose si nécessaire.' },
  },
  'ibuprofene': {
    'aspirine': { niveau: 'ELEVE', description: "Risque ulcérogène majoré. Diminution de l'effet antiagrégant de l'aspirine.", recommandation: "Éviter l'association. Si nécessaire, prendre l'aspirine 30 min avant l'ibuprofène." },
    'methotrexate': { niveau: 'CRITIQUE', description: 'Augmentation de la toxicité du méthotrexate (diminution de l\'excrétion rénale).', recommandation: 'Contre-indication absolue à doses cytotoxiques. Éviter à doses rhumatologiques.' },
    'lithium': { niveau: 'ELEVE', description: 'Augmentation de la lithémie pouvant atteindre des valeurs toxiques.', recommandation: 'Surveiller la lithémie. Adaptation posologique si nécessaire.' },
    'antihypertenseurs': { niveau: 'MODERE', description: "Diminution de l'effet antihypertenseur.", recommandation: 'Surveiller la tension artérielle.' },
    'corticoïdes': { niveau: 'MODERE', description: "Risque ulcérogène majoré par addition des effets.", recommandation: 'Association déconseillée. Si nécessaire, protection gastrique.' },
  },
  'aspirine': {
    'methotrexate': { niveau: 'CRITIQUE', description: 'Augmentation de la toxicité du méthotrexate.', recommandation: 'Contre-indication.' },
    'warfarine': { niveau: 'CRITIQUE', description: 'Risque hémorragique majoré.', recommandation: "Contrôle fréquent de l'INR." },
    'ibuprofene': { niveau: 'ELEVE', description: 'Risque ulcérogène majoré.', recommandation: "Éviter l'association." },
    'corticoïdes': { niveau: 'MODERE', description: 'Risque ulcérogène majoré.', recommandation: 'Protection gastrique recommandée.' },
  },
  'metformine': {
    'produits de contraste iodes': { niveau: 'CRITIQUE', description: "Risque d'acidose lactique par insuffisance rénale aiguë.", recommandation: 'Arrêter la metformine 48h avant et 48h après l\'examen.' },
    'alcool': { niveau: 'MODERE', description: "Risque d'acidose lactique.", recommandation: "Éviter la consommation d'alcool." },
  },
  'omeprazole': {
    'clopidogrel': { niveau: 'ELEVE', description: "Diminution de l'efficacité du clopidogrel par inhibition du CYP2C19.", recommandation: 'Utiliser un anti-acide alternatif (pantoprazole) si nécessaire.' },
    'methotrexate': { niveau: 'ELEVE', description: 'Augmentation de la toxicité du méthotrexate.', recommandation: 'Surveillance renforcée.' },
    'digoxine': { niveau: 'MODERE', description: 'Augmentation de la digoxinémie.', recommandation: 'Surveiller la digoxinémie.' },
  },
  'ciprofloxacine': {
    'theophylline': { niveau: 'ELEVE', description: 'Augmentation de la théophyllinémie avec risque de convulsions.', recommandation: 'Surveiller la théophyllinémie et adapter la posologie.' },
    'antivitamine k': { niveau: 'MODERE', description: 'Risque hémorragique augmenté.', recommandation: "Contrôle plus fréquent de l'INR." },
    'antiacides': { niveau: 'MODERE', description: 'Diminution de l\'absorption de la ciprofloxacine.', recommandation: "Prendre à 2h d'intervalle." },
  },
  'amoxicilline': {
    'methotrexate': { niveau: 'ELEVE', description: 'Augmentation de la toxicité du méthotrexate.', recommandation: 'Surveillance renforcée.' },
    'allopurinol': { niveau: 'MODERE', description: "Risque accru d'éruptions cutanées.", recommandation: 'Surveillance clinique.' },
  },
  'azithromycine': {
    'warfarine': { niveau: 'MODERE', description: 'Risque hémorragique augmenté.', recommandation: "Contrôle de l'INR." },
    'digoxine': { niveau: 'MODERE', description: 'Augmentation de la digoxinémie.', recommandation: 'Surveiller la digoxinémie.' },
  },
  'prednisone': {
    'aspirine': { niveau: 'MODERE', description: 'Risque ulcérogène majoré.', recommandation: 'Protection gastrique.' },
    'ibuprofene': { niveau: 'MODERE', description: 'Risque ulcérogène majoré.', recommandation: 'Protection gastrique.' },
    'antidiabetiques': { niveau: 'MODERE', description: "Diminution de l'effet hypoglycémiant.", recommandation: 'Surveillance glycémique renforcée.' },
  },
  'diclofenac': {
    'lithium': { niveau: 'ELEVE', description: 'Augmentation de la lithémie.', recommandation: 'Surveillance de la lithémie.' },
    'methotrexate': { niveau: 'CRITIQUE', description: 'Augmentation de la toxicité du méthotrexate.', recommandation: 'Contre-indication.' },
  },
}

/**
 * Vérifie les interactions entre une liste de DCI
 * @param dcis - Liste des DCI à vérifier
 * @returns Liste des interactions trouvées, triées par niveau de risque
 */
export function checkInteractions(dcis: string[]): { dci1: string; dci2: string; niveau: string; description: string; recommandation: string }[] {
  const result: { dci1: string; dci2: string; niveau: string; description: string; recommandation: string }[] = []

  for (let i = 0; i < dcis.length; i++) {
    for (let j = i + 1; j < dcis.length; j++) {
      const dci1 = dcis[i].toLowerCase().trim()
      const dci2 = dcis[j].toLowerCase().trim()

      // Vérifier dci1 → dci2
      const interaction1 = INTERACTIONS_DB[dci1]?.[dci2]
      if (interaction1) {
        result.push({
          dci1: dcis[i],
          dci2: dcis[j],
          ...interaction1,
        })
        continue
      }

      // Vérifier dci2 → dci1
      const interaction2 = INTERACTIONS_DB[dci2]?.[dci1]
      if (interaction2) {
        result.push({
          dci1: dcis[i],
          dci2: dcis[j],
          ...interaction2,
        })
      }

      // Vérification partielle (si la DCI contient un mot-clé connu)
      for (const [key, interactions] of Object.entries(INTERACTIONS_DB)) {
        if (dci1.includes(key)) {
          for (const [target, data] of Object.entries(interactions)) {
            if (dci2.includes(target.toLowerCase())) {
              // Éviter les doublons
              const exists = result.some(
                (r) =>
                  (r.dci1.toLowerCase() === dcis[i].toLowerCase() && r.dci2.toLowerCase() === dcis[j].toLowerCase()) ||
                  (r.dci1.toLowerCase() === dcis[j].toLowerCase() && r.dci2.toLowerCase() === dcis[i].toLowerCase())
              )
              if (!exists) {
                result.push({
                  dci1: dcis[i],
                  dci2: dcis[j],
                  ...data,
                })
              }
            }
          }
        }
        if (dci2.includes(key)) {
          for (const [target, data] of Object.entries(interactions)) {
            if (dci1.includes(target.toLowerCase())) {
              const exists = result.some(
                (r) =>
                  (r.dci1.toLowerCase() === dcis[i].toLowerCase() && r.dci2.toLowerCase() === dcis[j].toLowerCase()) ||
                  (r.dci1.toLowerCase() === dcis[j].toLowerCase() && r.dci2.toLowerCase() === dcis[i].toLowerCase())
              )
              if (!exists) {
                result.push({
                  dci1: dcis[i],
                  dci2: dcis[j],
                  ...data,
                })
              }
            }
          }
        }
      }
    }
  }

  // Trier par niveau de risque (CRITIQUE en premier)
  const niveauOrder = { CRITIQUE: 0, ELEVE: 1, MODERE: 2, FAIBLE: 3 }
  result.sort((a, b) => (niveauOrder[a.niveau as keyof typeof niveauOrder] ?? 4) - (niveauOrder[b.niveau as keyof typeof niveauOrder] ?? 4))

  return result
}

/**
 * Détermine le niveau de risque global à partir d'une liste d'interactions
 * @param interactions - Liste des interactions
 * @returns Niveau de risque global
 */
export function getNiveauRisqueGlobal(interactions: { niveau: string }[]): string {
  if (interactions.some((i) => i.niveau === 'CRITIQUE')) return 'CRITIQUE'
  if (interactions.some((i) => i.niveau === 'ELEVE')) return 'ELEVE'
  if (interactions.some((i) => i.niveau === 'MODERE')) return 'MODERE'
  if (interactions.length > 0) return 'FAIBLE'
  return 'AUCUN'
}
