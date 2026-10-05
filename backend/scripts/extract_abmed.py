#!/usr/bin/env python3
"""Extraction complète du registre ABMed des officines du Bénin."""
import json
import openpyxl

SRC = '/home/z/my-project/upload/officines_benin_registre_ABMed_2026-10-04.xlsx'
OUT = '/home/z/my-project/scripts/abmed_officines.json'

wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
ws = wb['Officines ABMed']

rows = list(ws.iter_rows(values_only=True))
header = list(rows[0])
print('COLONNES:', header)
print('TOTAL LIGNES DONNEES:', len(rows) - 1)

officines = []
for r in rows[1:]:
    if r[0] is None and r[1] is None:
        continue
    rec = {header[i]: (r[i] if i < len(r) else None) for i in range(len(header))}
    officines.append(rec)

# Statistiques
deps = {}
avec_gps = 0
zones = set()
communes = set()
for o in officines:
    d = o.get('Département') or '?'
    deps[d] = deps.get(d, 0) + 1
    if o.get('Longitude') is not None and o.get('Latitude') is not None:
        try:
            float(o['Longitude']); float(o['Latitude']); avec_gps += 1
        except (TypeError, ValueError):
            pass
    if o.get('Zone sanitaire'): zones.add(str(o['Zone sanitaire']))
    if o.get('Commune'): communes.add(str(o['Commune']))

print('\n=== PAR DEPARTEMENT ===')
for d in sorted(deps): print(f'  {d}: {deps[d]}')
print(f'\nTOTAL: {len(officines)} officines')
print(f'AVEC COORDONNEES GPS: {avec_gps}')
print(f'ZONES SANITAIRES: {len(zones)} distinctes')
print(f'COMMUNES: {len(communes)} distinctes')

# Recherche des 3 pharmacies de test
print('\n=== RECHERCHE PHARMACIES DE TEST ===')
for term in ['Bèyarou', 'Beyarou', 'Béyarou', 'Okedama', 'Okédama', 'Hubert Maga', 'Hubert']:
    matches = [o for o in officines if term.lower() in str(o.get('Officine / dénomination', '')).lower()]
    print(f'\n"{term}": {len(matches)} résultat(s)')
    for m in matches[:5]:
        print(f"  - [{m.get('N° ABMed')}] {m.get('Officine / dénomomination', m.get('Officine / dénomination'))} | {m.get('Département')} | {m.get('Commune')} | {m.get('Zone sanitaire')} | GPS: {m.get('Longitude')},{m.get('Latitude')} | Contact: {m.get('Contact officine')}")

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(officines, f, ensure_ascii=False, indent=1)
print(f'\nSauvegardé: {OUT} ({len(officines)} officines)')
