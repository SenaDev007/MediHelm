#!/usr/bin/env python3
"""Prépare les données ABMed pour le seed Prisma.

Corrections appliquées :
- Inversion latitude/longitude (le registre ABMed publie les colonnes
  inversées pour 341/345 officines — validation : Bénin lon∈[0.5,4.0], lat∈[6.0,12.5])
- Nettoyage des chaînes (trim)
- Champs mappés vers le schéma Pharmacie
"""
import json

SRC = '/home/z/my-project/scripts/abmed_officines.json'
OUT = '/home/z/my-project/prisma/data/officines-abmed.json'

def clean_str(v):
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None

def slugify(value):
    import unicodedata
    s = unicodedata.normalize('NFD', value).encode('ascii', 'ignore').decode()
    s = s.lower()
    out = []
    prev_dash = False
    for ch in s:
        if ch.isalnum():
            out.append(ch)
            prev_dash = False
        elif not prev_dash:
            out.append('-')
            prev_dash = True
    return ''.join(out).strip('-') or 'officine'

officines = json.load(open(SRC, encoding='utf-8'))

records = []
swapped = 0
no_gps = 0
for o in officines:
    num = clean_str(o.get('N° ABMed'))
    nom = clean_str(o.get('Officine / dénomination'))
    if not num or not nom:
        continue

    lon = o.get('Longitude')
    lat = o.get('Latitude')
    lat_f, lon_f = None, None
    if lon is not None and lat is not None:
        try:
            lon_f, lat_f = float(lon), float(lat)
            # Bénin : lon [0.5, 4.0], lat [6.0, 12.5] — sinon inversion
            if not (0.5 <= lon_f <= 4.0 and 6.0 <= lat_f <= 12.5):
                if 0.5 <= lat_f <= 4.0 and 6.0 <= lon_f <= 12.5:
                    lon_f, lat_f = lat_f, lon_f  # swap
                    swapped += 1
                else:
                    # Coordonnées hors zone → on les ignore
                    lat_f, lon_f = None, None
        except (TypeError, ValueError):
            lat_f, lon_f = None, None
    if lat_f is None:
        no_gps += 1

    dept = clean_str(o.get('Département')) or ''
    commune = clean_str(o.get('Commune')) or ''
    localisation = clean_str(o.get('Localisation / adresse publiée'))

    rec = {
        'numeroAbmed': num,
        'slug': f"{slugify(nom)}-{num.lower()}",
        'nom': nom,
        # adresse publiée : localisation ABMed, sinon commune/département
        'adresse': localisation or f"{commune}, {dept}".strip(', '),
        'ville': commune or dept,
        'telephone': clean_str(o.get('Contact officine')) or clean_str(o.get('Contact pharmacien responsable')) or 'Non publié',
        'email': (clean_str(o.get('Courriel officine')) or clean_str(o.get('Courriel pharmacien responsable')) or '').lower() or None,
        'numeroAgrement': f"ABMED-{num}",  # traçable + unique ; réf. réelle dans referenceAutorisation
        'latitude': lat_f,
        'longitude': lon_f,
        'departement': dept or None,
        'zoneSanitaire': clean_str(o.get('Zone sanitaire')),
        'commune': commune or None,
        'arrondissement': clean_str(o.get('Arrondissement')),
        'localisation': localisation,
        'pharmacienTitulaire': clean_str(o.get('Pharmacien titulaire')),
        'pharmacienResponsable': clean_str(o.get('Pharmacien responsable')),
        'contactPharmacien': clean_str(o.get('Contact pharmacien responsable')),
        'courrielPharmacien': (clean_str(o.get('Courriel pharmacien responsable')) or '').lower() or None,
        'referenceAutorisation': clean_str(o.get('Référence autorisation ouverture')),
        'dateValiditeAbmed': clean_str(o.get('Date début validité')),
        'referenceQuitus': clean_str(o.get('Référence quitus')),
        'numeroOnpb': clean_str(o.get('N° ONPB')),
        'statutAbmed': clean_str(o.get('Lecture du statut')),
        'suspensionAbmed': clean_str(o.get('Suspension (champ ABMed)')),
        'pageRegistre': o.get('Page du registre'),
        'sourceUrlAbmed': clean_str(o.get('Source ABMed')),
        'sourceRegistre': 'ABMED',
    }
    records.append(rec)

# Vérifications d'intégrité
nums = [r['numeroAbmed'] for r in records]
assert len(nums) == len(set(nums)), 'numeroAbmed en double !'
slugs = [r['slug'] for r in records]
assert len(slugs) == len(set(slugs)), 'slug en double !'
agrements = [r['numeroAgrement'] for r in records]
assert len(agrements) == len(set(agrements)), 'numeroAgrement en double !'

import os
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(records, f, ensure_ascii=False, indent=1)

with_gps = sum(1 for r in records if r['latitude'] is not None)
print(f"✅ {len(records)} officines ABMed préparées")
print(f"   Coordonnées GPS : {with_gps} officines ({no_gps} sans GPS)")
print(f"   Inversions lat/lon corrigées : {swapped}")
print(f"   Fichier : {OUT}")

# Les 3 pharmacies de test
for num in ['P108', 'P114', 'P100']:
    r = next(x for x in records if x['numeroAbmed'] == num)
    print(f"   TEST [{num}] {r['nom']} — {r['commune']}/{r['departement']} — GPS {r['latitude']},{r['longitude']} — tél {r['telephone']}")
