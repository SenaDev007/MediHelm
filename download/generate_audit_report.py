#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MédiHelm — Rapport d'Audit de Conformité
Généré automatiquement à partir de l'audit complet du codebase
"""

import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ━━ Fonts ━━
pdfmetrics.registerFont(TTFont('NotoSansSC', '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'))
pdfmetrics.registerFont(TTFont('NotoSerifSC', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))

# ━━ Color Palette (auto-generated) ━━
ACCENT       = colors.HexColor('#2e95b8')
TEXT_PRIMARY  = colors.HexColor('#21201d')
TEXT_MUTED    = colors.HexColor('#8a877d')
BG_SURFACE   = colors.HexColor('#e1e0da')
BG_PAGE      = colors.HexColor('#f5f4f2')
TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD     = BG_SURFACE

# Status colors
COLOR_OK = colors.HexColor('#16a34a')
COLOR_WARN = colors.HexColor('#d97706')
COLOR_CRIT = colors.HexColor('#dc2626')
COLOR_INFO = colors.HexColor('#2563eb')

# ━━ Output ━━
OUTPUT_PATH = '/home/z/my-project/download/MediHelm_Rapport_Audit_Conformite.pdf'

# ━━ Styles ━━
styles = getSampleStyleSheet()

style_title = ParagraphStyle(
    'CustomTitle', parent=styles['Title'],
    fontName='NotoSansSC', fontSize=24, leading=30,
    textColor=ACCENT, spaceAfter=6*mm, alignment=TA_LEFT
)
style_h1 = ParagraphStyle(
    'CustomH1', parent=styles['Heading1'],
    fontName='NotoSansSC', fontSize=18, leading=24,
    textColor=ACCENT, spaceBefore=8*mm, spaceAfter=4*mm,
    borderWidth=0, borderPadding=0
)
style_h2 = ParagraphStyle(
    'CustomH2', parent=styles['Heading2'],
    fontName='NotoSansSC', fontSize=14, leading=18,
    textColor=TEXT_PRIMARY, spaceBefore=5*mm, spaceAfter=3*mm
)
style_h3 = ParagraphStyle(
    'CustomH3', parent=styles['Heading3'],
    fontName='NotoSansSC', fontSize=12, leading=16,
    textColor=TEXT_PRIMARY, spaceBefore=4*mm, spaceAfter=2*mm
)
style_body = ParagraphStyle(
    'CustomBody', parent=styles['Normal'],
    fontName='NotoSansSC', fontSize=10, leading=15,
    textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY,
    spaceAfter=2*mm
)
style_body_small = ParagraphStyle(
    'CustomBodySmall', parent=style_body,
    fontSize=9, leading=13
)
style_caption = ParagraphStyle(
    'CustomCaption', parent=styles['Normal'],
    fontName='NotoSansSC', fontSize=8, leading=11,
    textColor=TEXT_MUTED, alignment=TA_CENTER,
    spaceAfter=3*mm
)
style_cell = ParagraphStyle(
    'CellText', parent=styles['Normal'],
    fontName='NotoSansSC', fontSize=8.5, leading=11,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT
)
style_cell_center = ParagraphStyle(
    'CellCenter', parent=style_cell,
    alignment=TA_CENTER
)
style_cell_header = ParagraphStyle(
    'CellHeader', parent=style_cell,
    textColor=colors.white, fontName='NotoSansSC',
    fontSize=8.5, leading=11, alignment=TA_CENTER
)

# ━━ Helper functions ━━

def make_table(headers, rows, col_widths=None):
    """Create a styled table with headers and rows."""
    page_w = A4[0] - 40*mm
    if col_widths is None:
        n = len(headers)
        col_widths = [page_w / n] * n
    
    header_paras = [Paragraph(h, style_cell_header) for h in headers]
    data = [header_paras]
    for row in rows:
        data.append([Paragraph(str(c), style_cell) for c in row])
    
    t = Table(data, colWidths=col_widths, repeatRows=1)
    
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 0 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    
    t.setStyle(TableStyle(style_cmds))
    return t


def status_tag(status):
    """Return a colored status tag."""
    mapping = {
        'OK': (COLOR_OK, 'CONFORME'),
        'PARTIAL': (COLOR_WARN, 'PARTIEL'),
        'STUB': (COLOR_CRIT, 'STUB'),
        'MISSING': (COLOR_CRIT, 'ABSENT'),
        'REAL': (COLOR_OK, 'REEL'),
        'PLACEHOLDER': (COLOR_WARN, 'PLACEHOLDER'),
    }
    c, label = mapping.get(status, (TEXT_MUTED, status))
    return f'<font color="#{c.hexval()[2:]}">{label}</font>'


def pct_bar(pct):
    """Return a percentage bar string."""
    if pct >= 80:
        color = COLOR_OK
    elif pct >= 40:
        color = COLOR_WARN
    else:
        color = COLOR_CRIT
    filled = int(pct / 10)
    bar = '|' * filled + '.' * (10 - filled)
    return f'<font color="#{color.hexval()[2:]}">{bar}</font> {pct}%'


def add_footer(canvas, doc):
    """Add footer to each page."""
    canvas.saveState()
    canvas.setFont('NotoSansSC', 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(20*mm, 10*mm, 'MediHelm - Rapport d\'Audit de Conformite')
    canvas.drawRightString(A4[0] - 20*mm, 10*mm, f'Page {doc.page}')
    canvas.restoreState()

# ━━ Build document ━━

doc = SimpleDocTemplate(
    OUTPUT_PATH,
    pagesize=A4,
    leftMargin=20*mm, rightMargin=20*mm,
    topMargin=20*mm, bottomMargin=20*mm,
    title='MediHelm - Rapport d\'Audit de Conformite',
    author='Z.ai - YEHI OR Tech',
    subject='Audit de conformite du codebase MediHelm par rapport aux specifications CDC v2.0 et Specs v2.0'
)

story = []

# ━━ COVER ━━
story.append(Spacer(1, 30*mm))
story.append(HRFlowable(width='100%', thickness=2, color=ACCENT, spaceAfter=5*mm))
story.append(Paragraph('MEDIHELM', ParagraphStyle(
    'CoverTitle', parent=style_title, fontSize=36, leading=44, textColor=ACCENT
)))
story.append(Paragraph("L'Infrastructure Pharmaceutique Numerique du Benin", ParagraphStyle(
    'CoverSub', parent=style_body, fontSize=14, leading=18, textColor=TEXT_MUTED
)))
story.append(Spacer(1, 10*mm))
story.append(Paragraph('RAPPORT D\'AUDIT DE CONFORMITE', ParagraphStyle(
    'CoverMain', parent=style_title, fontSize=22, leading=28, textColor=TEXT_PRIMARY
)))
story.append(Spacer(1, 5*mm))
story.append(HRFlowable(width='100%', thickness=1, color=ACCENT, spaceAfter=5*mm))
story.append(Spacer(1, 5*mm))
story.append(Paragraph(
    'Revision complete du codebase par rapport aux specifications fonctionnelles (CDC v2.0) '
    'et techniques (Specs v2.0). Analyse de conformite couvrant le site public, l\'espace patient, '
    'MediHelm Pro, la plateforme grossistes et les portails institutionnels.',
    style_body
))
story.append(Spacer(1, 10*mm))

cover_info = [
    ['Reference', 'MH-AUDIT-2025-001'],
    ['Date', '15 Juin 2026'],
    ['Documents de reference', 'MH-CDC-2025-v2.0 / MH-SPECS-2025-v2.0'],
    ['Maitre d\'ouvrage', 'YEHI OR Tech - Cotonou, Benin'],
    ['Responsable produit', 'Dawes - Fondateur & Lead Developer'],
    ['Classification', 'Confidentiel'],
]
cover_table = Table(cover_info, colWidths=[50*mm, 120*mm])
cover_table.setStyle(TableStyle([
    ('FONTNAME', (0, 0), (-1, -1), 'NotoSansSC'),
    ('FONTSIZE', (0, 0), (-1, -1), 10),
    ('TEXTCOLOR', (0, 0), (0, -1), TEXT_MUTED),
    ('TEXTCOLOR', (1, 0), (1, -1), TEXT_PRIMARY),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('LINEBELOW', (0, 0), (-1, -2), 0.5, BG_SURFACE),
]))
story.append(cover_table)

story.append(PageBreak())

# ━━ TABLE OF CONTENTS ━━
story.append(Paragraph('TABLE DES MATIERES', style_h1))
story.append(Spacer(1, 3*mm))

toc_items = [
    '1. Resume executif et score global de conformite',
    '2. Architecture et infrastructure de base',
    '3. Site public et espace Patient',
    '4. Espace pharmacie - MediHelm Pro',
    '5. Plateforme Grossistes',
    '6. Portails Institutionnels (DPMED, SoBAPS, ABRP)',
    '7. Base de donnees et schema Prisma',
    '8. Authentification et RBAC',
    '9. Securite et conformite technique',
    '10. Problemes critiques identifie',
    '11. Plan d\'action prioritaire',
]
for item in toc_items:
    story.append(Paragraph(item, ParagraphStyle(
        'TOCItem', parent=style_body, fontSize=11, leading=18,
        leftIndent=10*mm, spaceAfter=1*mm
    )))

story.append(PageBreak())

# ━━ 1. RESUME EXECUTIF ━━
story.append(Paragraph('1. Resume executif et score global de conformite', style_h1))

story.append(Paragraph(
    'Ce rapport presente les resultats de l\'audit de conformite complet du projet MediHelm, '
    'compare aux specifications definies dans le Cahier des Charges v2.0 (MH-CDC-2025-v2.0) et les '
    'Specifications Techniques v2.0 (MH-SPECS-2025-v2.0). L\'audit couvre l\'ensemble du codebase : '
    'plus de 55 pages Next.js, 70+ routes API, 47 modeles Prisma, et une cinquantaine de composants React. '
    'L\'objectif est de determiner le niveau d\'operationnalite reel de la plateforme et d\'identifier les ecarts '
    'critiques necessitant une action corrective immediate.',
    style_body
))

story.append(Paragraph('1.1 Score global par espace', style_h2))

score_data = [
    ['Site public (Landing)', '100%', '1/1 page reelle', 'Conforme'],
    ['Espace Patient', '28%', '5/18 pages reelles', 'Non conforme'],
    ['Espace Pro (Pharmacie)', '20%', '5/25 pages reelles', 'Non conforme'],
    ['Plateforme Grossistes', '33%', '2/6 pages reelles', 'Non conforme'],
    ['Portails Institutionnels', '15%', '2/13 pages reelles', 'Non conforme'],
    ['API Routes (core)', '35%', '11/31 implementees', 'Non conforme'],
    ['API Routes (institution)', '0%', '0/20 implementees', 'Non conforme'],
    ['API Routes (grossiste)', '0%', '0/8 implementees', 'Non conforme'],
    ['API Routes (patient)', '10%', '1/10 implementees', 'Non conforme'],
    ['Schema Prisma / BDD', '90%', '47 modeles / 29 enums', 'Partiellement conforme'],
    ['Authentification', '75%', 'NextAuth + JWT + bcrypt', 'Partiellement conforme'],
    ['RBAC', '50%', 'Matrice definie, non appliquee', 'Non conforme'],
    ['Securite (webhooks, mTLS)', '5%', 'Stubs uniquement', 'Non conforme'],
]

score_rows = [[r[0], pct_bar(int(r[1].replace('%',''))), r[2], status_tag('OK' if int(r[1].replace('%',''))>=80 else 'PARTIAL' if int(r[1].replace('%',''))>=40 else 'STUB')] for r in score_data]

story.append(make_table(
    ['Composant', 'Conformite', 'Detail', 'Statut'],
    score_rows,
    col_widths=[45*mm, 40*mm, 55*mm, 30*mm]
))

story.append(Spacer(1, 5*mm))
story.append(Paragraph(
    '<b>Conclusion :</b> Le projet MediHelm n\'est pas operationnel a 100%. Le score global de conformite '
    'est estime a environ <b>25%</b>. L\'infrastructure de base (schema Prisma, authentification, middleware, '
    'composants UI) est solide, mais la majorite des pages et routes API sont des stubs ou placeholders. '
    'Les composants React sont construits mais souvent deconnectes de toute source de donnees reelle. '
    'Le systeme RBAC est defini mais n\'est applique sur aucune route API. La securite institutionnelle '
    '(HMAC-SHA256, RSA-256, mTLS, BullMQ) est entierement absente du code.',
    style_body
))

# ━━ 2. ARCHITECTURE ━━
story.append(Paragraph('2. Architecture et infrastructure de base', style_h1))

story.append(Paragraph('2.1 Stack technique implementee vs specifiee', style_h2))

arch_data = [
    ['Frontend', 'Next.js 14 (specs)', 'Next.js 16 App Router', status_tag('OK')],
    ['Backend', 'NestJS + Fastify (specs)', 'Next.js API Routes', status_tag('PARTIAL')],
    ['ORM', 'Prisma 5+ (specs)', 'Prisma 6.11', status_tag('OK')],
    ['Base de donnees', 'Supabase PostgreSQL (specs)', 'Neon PostgreSQL', status_tag('PARTIAL')],
    ['Auth', 'Supabase Auth (specs)', 'NextAuth v4 + JWT', status_tag('PARTIAL')],
    ['Cache offline', 'SQLite via Prisma (specs)', 'Non implemente', status_tag('MISSING')],
    ['Queue', 'BullMQ (specs)', 'Non implemente', status_tag('MISSING')],
    ['Cache Redis', 'Upstash Redis (specs)', 'Non implemente', status_tag('MISSING')],
    ['Storage', 'Supabase Storage (specs)', 'Upload local uniquement', status_tag('PARTIAL')],
    ['SMS', 'AfricasTalking (specs)', 'Non implemente', status_tag('MISSING')],
    ['Email', 'Resend (specs)', 'Non implemente', status_tag('MISSING')],
    ['Cartes', 'OpenStreetMap + Leaflet (specs)', 'Mapbox GL JS', status_tag('PARTIAL')],
    ['Paiements', 'Fedapay (specs)', 'Integration Fedapay presente', status_tag('OK')],
    ['PWA', 'next-pwa (specs)', 'manifest + sw.js presents, offline non fonctionnel', status_tag('PARTIAL')],
]

story.append(make_table(
    ['Couche', 'Specification', 'Implementation', 'Statut'],
    arch_data,
    col_widths=[30*mm, 42*mm, 65*mm, 33*mm]
))

story.append(Spacer(1, 3*mm))
story.append(Paragraph(
    'L\'ecart le plus significatif est l\'architecture monorepo specifiee (NestJS backend separe + Next.js frontend) '
    'qui a ete remplacee par une architecture Next.js fullstack. Ce choix est acceptable et meme avantageux pour '
    'un projet de cette envergure avec un seul developpeur, mais il implique que certains patterns NestJS '
    '(guards, interceptors, modules) n\'ont pas d\'equivalent direct. L\'absence de BullMQ pour la queue '
    'd\'alertes DPMED est un ecart critique car le delai garanti de moins de 2 minutes ne peut etre respecte '
    'sans systeme de queue dedie.',
    style_body
))

# ━━ 3. SITE PUBLIC & PATIENT ━━
story.append(Paragraph('3. Site public et espace Patient', style_h1))

story.append(Paragraph('3.1 Site public (Landing page)', style_h2))
story.append(Paragraph(
    'Le site public est le seul composant conforme a 100%. La landing page comprend 11 sections : '
    'Navbar, Hero, Quick Access Portals (Pro/Patient/Grossistes/Institutions), DashboardPro demo, '
    'ProductSpaces, ModulesShowcase, PatientFeatures, PricingSection, InstitutionalPartnerships, '
    'AlertProcess, ComplianceScore, TechStack et Footer. Le contenu est statique mais complet et '
    'conforme au CDC v2.0 en termes de presentation de la plateforme et de ses fonctionnalites. '
    'Les liens vers les differents espaces sont fonctionnels. Le pricing affiche les bons tarifs FCFA. '
    'Les 6 partenaires institutionnels sont correctement references (DPMED, SoBAPS, LNCQ, ABRP, UbiPharm, Promopharma).',
    style_body
))

story.append(Paragraph('3.2 Espace Patient - Pages implementees', style_h2))

patient_pages = [
    ['patient/ (Dashboard)', 'REEL', 'Banniere alertes DPMED, widget garde, actions rapides', 'Commandes actives vides, rappels statiques'],
    ['patient/pharmacies', 'REEL', 'Geolocalisation, carte/liste, filtre rayon, Haversine', 'Pas de recherche par ville, pas de stock temps reel'],
    ['patient/garde', 'REEL', 'Liste garde du jour + semaine, carte Mapbox, SOS', 'Souscription notifications fake'],
    ['patient/recherche', 'REEL', 'Recherche medicaments, filtres, autocomplete', 'API retourne [] (stub), pas de pagination'],
    ['patient/layout', 'REEL', 'Header sticky, menu lateral, bottom nav, transitions', 'Pas de garde auth, badge notif statique'],
    ['patient/rappels', 'PLACEHOLDER', '---', 'CRUD rappels, scheduling, push'],
    ['patient/ordonnances', 'PLACEHOLDER', '---', 'Upload, OCR, extraction lignes'],
    ['patient/suivi', 'PLACEHOLDER', '---', 'Suivi commandes avec timeline'],
    ['patient/verifier', 'PLACEHOLDER', '---', 'Verification lot/QR, authenticite'],
    ['patient/vaccinations', 'PLACEHOLDER', '---', 'Carnet vaccination, QR'],
    ['patient/commande', 'PLACEHOLDER', '---', 'Panier, checkout, Fedapay'],
    ['patient/fidelite', 'PLACEHOLDER', '---', 'Points, historique, recompenses'],
    ['patient/comparateur', 'PLACEHOLDER', '---', 'Comparaison prix inter-pharmacies'],
    ['patient/profil', 'PLACEHOLDER', '---', 'Edition profil, preferences'],
    ['patient/urgence', 'PLACEHOLDER', '---', 'Carte urgence, SOS'],
    ['patient/notifications', 'PLACEHOLDER', '---', 'Centre notifications'],
    ['patient/connexion', 'PLACEHOLDER', '---', 'Formulaire login NextAuth'],
    ['patient/inscription', 'PLACEHOLDER', '---', 'Formulaire inscription'],
]

story.append(make_table(
    ['Page', 'Statut', 'Fonctionnalites', 'Manquants'],
    [[r[0], status_tag(r[1]), r[2], r[3]] for r in patient_pages],
    col_widths=[38*mm, 20*mm, 55*mm, 57*mm]
))

story.append(Spacer(1, 3*mm))

story.append(Paragraph('3.3 Espace Patient - API Routes', style_h2))

patient_api = [
    ['patient/pharmacies-proches', 'REEL', 'Haversine, geoloc, filtre garde, medicament'],
    ['patient/recherche', 'STUB', 'Retourne [] - devrait requeter db.medicament'],
    ['patient/verifier', 'STUB', 'Retourne [] / 501'],
    ['patient/rappels', 'STUB', 'Retourne [] / 501'],
    ['patient/commandes', 'STUB', 'Retourne [] / 501'],
    ['patient/ordonnances', 'STUB', 'Retourne [] / 501'],
    ['patient/fidelite', 'STUB', 'Retourne [] / 501'],
    ['patient/vaccinations', 'STUB', 'Retourne [] / 501'],
    ['patient/notifications', 'STUB', 'Retourne [] / 501'],
    ['patient/comptes', 'STUB', 'Retourne [] / 501'],
]

story.append(make_table(
    ['Route API', 'Statut', 'Detail'],
    [[r[0], status_tag(r[1]), r[2]] for r in patient_api],
    col_widths=[50*mm, 20*mm, 100*mm]
))

story.append(Spacer(1, 3*mm))
story.append(Paragraph(
    '<b>Probleme critique :</b> La route /api/patient/recherche est un stub qui retourne un tableau vide, '
    'alors que la page de recherche a une UI complete et fonctionnelle. La recherche de medicaments, '
    'fonctionnalite cle du site public, ne retourne aucune donnee. La route /api/medicaments existe et '
    'fonctionne correctement - il faut connecter la recherche patient a cette route ou partager la logique.',
    style_body
))

story.append(Paragraph(
    '<b>Bug de donnees :</b> Dans /api/patient/pharmacies-proches, le champ medicamentDispo est defini comme '
    '!!medicamentId (toujours vrai si un medicament est specifie), au lieu de verifier reellement le stock '
    'du medicament dans la pharmacie concernee. Cela fausse les resultats de disponibilite.',
    style_body
))

# ━━ 4. ESPACE PRO ━━
story.append(Paragraph('4. Espace pharmacie - MediHelm Pro', style_h1))

story.append(Paragraph(
    'L\'espace MediHelm Pro est le coeur operationnel de la plateforme pour les pharmacies d\'officine. '
    'Selon le CDC v2.0, il doit comporter 19 modules (M01 a M19) couvrant la gestion complete de la pharmacie, '
    'de la pharmacovigilance et de la conformite reglementaire. L\'audit revele que seuls 5 modules sur 25 pages '
    'sont reellement implementes, soit un taux de conformite de 20%.',
    style_body
))

story.append(Paragraph('4.1 Pages implementees (5/25)', style_h2))

pro_real = [
    ['Dashboard (/pro)', '610 lignes', 'KPIs (CA, ventes, alertes stock, credits), jauge conformite, alertes DPMED, '
     'ordonnances en attente, conges en attente, graphique ventes 7j (Recharts), top produits, alertes peremption, '
     'actions rapides, skeletons de chargement'],
    ['Stock (/pro/stock)', '1388 lignes', 'Liste medicaments avec recherche/filtre/tri/pagination, dialogue ajout '
     'medicament, dialogue ajout lot, dialogue mouvement stock, fiche detail, badges alerte stock'],
    ['Ventes (/pro/ventes)', '1286 lignes', 'Liste ventes, creation vente, recherche medicament, panier, '
     'ajout patient en ligne, filtres avances'],
    ['Caisse (/pro/caisse)', '1387 lignes', 'Interface POS, ouverture/fermeture session, recherche medicament, '
     'panier, modes paiement multiples (especes, Wave, MTN, Moov), soumission vente'],
    ['Patients (/pro/patients)', '1624 lignes', 'Liste patients, ajout/edition, toggle actif, gestion credits, '
     'onglets (info/ordonnances/historique)'],
]

story.append(make_table(
    ['Page', 'Taille', 'Fonctionnalites implementees'],
    pro_real,
    col_widths=[35*mm, 20*mm, 115*mm]
))

story.append(Paragraph('4.2 Pages placeholders (20/25)', style_h2))

pro_placeholder = [
    ['Ordonnances', 'M06', 'CRUD, upload image, validation, stupéfiants, interactions'],
    ['Commandes', 'M03', 'Bons de commande, reception, retours, API grossiste'],
    ['Fournisseurs', 'M04', 'Referentiel, conditions, score fiabilite, evaluations'],
    ['Personnel', 'M07', 'RH, planning, conges, pointage, paie CNSS/IRPP'],
    ['Finance', 'M08', 'Caisse journaliere, resultat, TVA, export SYSCOHADA'],
    ['Garde', 'M09', 'Planning, diffusion, rapport, alertes patients'],
    ['Remboursables', 'M10', 'CNSS, RAMU, tiers payant, facturation'],
    ['Retours', 'M11', 'SAV, PV destruction, declaration DPMED'],
    ['Communication', 'M12', 'Push, SMS, campagnes, rappels, alertes DPMED relayees'],
    ['Documents', 'M13', 'Licences, diplomes, coffre-fort, alertes expiration'],
    ['Abonnement', 'M08', 'Plans, billing, Fedapay'],
    ['Analytics', 'M15', 'Predictions IA, scores sante, rapports automatiques'],
    ['Conformite', 'M19', 'Score conformite, exports legaux, certification DPMED'],
    ['Qualite', 'M16', 'Veille qualite, alertes LNCQ, signalement EI'],
    ['Audit', '---', 'Logs audit, journal evenements'],
    ['Stupéfiants', 'M06', 'Registre stupéfiants, regulations'],
    ['Parametres', '---', 'Parametres pharmacie, gestion utilisateurs'],
    ['Alertes', 'M18', 'Alertes DPMED, acquittement, alertes operationnelles'],
    ['Reseau', 'Promoteur', 'Gestion reseau multi-officines'],
    ['Credits', 'M05', 'Credits patients, suivi paiements'],
]

story.append(make_table(
    ['Page', 'Module', 'Fonctionnalites attendues (specifiees)'],
    pro_placeholder,
    col_widths=[30*mm, 18*mm, 122*mm]
))

story.append(Spacer(1, 3*mm))
story.append(Paragraph(
    '<b>Note importante :</b> Toutes les 20 pages placeholders sont identiques : 8 lignes chacune, '
    'affichant uniquement un titre et "Module en cours de developpement". Cependant, les routes API '
    'correspondantes existent pour la plupart (bien que souvent en stub), et les composants UI sont '
    'prets a etre integres. L\'ecart est donc principalement un manque d\'integration page-API-composant, '
    'pas un manque d\'infrastructure.',
    style_body
))

# ━━ 5. PLATEFORME GROSSISTES ━━
story.append(Paragraph('5. Plateforme Grossistes', style_h1))

story.append(Paragraph(
    'La plateforme grossistes doit permettre aux grossistes repartiteurs (UbiPharm, Promopharma) de '
    'gerer leur catalogue, recevoir des commandes des pharmacies, suivre les livraisons, et permettre '
    'aux pharmacies de passer des commandes et comparer les prix entre grossistes. Selon le CDC v2.0, '
    'le module M17 (Integration SoBAPS et grossistes) doit fournir des API pour les commandes, '
    'les webhooks de confirmation, et la comparaison inter-grossistes.',
    style_body
))

grossiste_pages = [
    ['Dashboard (/grossistes)', 'REEL', 'KPIs, graphiques Recharts, commandes recentes, top pharmacies', 'Donnees vides (API stub), pas de filtres dates'],
    ['Layout (/grossistes)', 'REEL', 'Sidebar + topbar', 'Nom grossiste hardcode, notifications statiques'],
    ['Catalogue', 'PLACEHOLDER', '---', 'CRUD produits, recherche, prix, disponibilite'],
    ['Commandes', 'PLACEHOLDER', '---', 'Gestion commandes, statuts, filtrage'],
    ['Parametres', 'PLACEHOLDER', '---', 'Cles API, webhooks, profil grossiste'],
    ['Statistiques', 'PLACEHOLDER', '---', 'Analytics avancees, performance produits'],
]

story.append(make_table(
    ['Page', 'Statut', 'Implemente', 'Manquant'],
    [[r[0], status_tag(r[1]), r[2], r[3]] for r in grossiste_pages],
    col_widths=[35*mm, 22*mm, 55*mm, 58*mm]
))

story.append(Paragraph('5.1 API Grossistes - Toutes en stub', style_h2))
story.append(Paragraph(
    'Les 8 routes API grossistes sont toutes des stubs identiques retournant un tableau vide (GET) ou '
    '501 Not Implemented (POST). Cela inclut les routes critiques : /api/grossistes/dashboard, '
    '/api/grossistes/[id]/catalogue, /api/grossistes/[id]/commandes, /api/grossistes/compare, et '
    '/api/portail/grossiste/commandes. Aucune donnee reelle ne peut etre affichee sur le dashboard, '
    'et aucune commande ne peut etre passee entre pharmacies et grossistes.',
    style_body
))

story.append(Paragraph(
    'Les composants ProductRow et OrderCard sont implementes et prets a l\'emploi, mais ne sont '
    'integres dans aucune page. Le flux de commande pharmacie-vers-grossiste, qui est au coeur du module M17, '
    'est entierement absent de l\'implementation.',
    style_body
))

# ━━ 6. PORTAILS INSTITUTIONNELS ━━
story.append(Paragraph('6. Portails Institutionnels (DPMED, SoBAPS, ABRP)', style_h1))

story.append(Paragraph(
    'Les portails institutionnels sont les differenciateurs absolus de MediHelm selon le CDC v2.0. '
    'Le module M18 (Alertes DPMED) prevoit un canal officiel de diffusion nationale avec un delai '
    'garanti inferieur a 2 minutes. Le module M16 (Pharmacovigilance) gere les signalements d\'effets '
    'indesirables. Le module M19 (Conformite) gere les scores de conformite et les certifications DPMED. '
    'Les portails SoBAPS et ABRP fournissent des vues agregees anonymisees pour les institutions de tutelle.',
    style_body
))

story.append(Paragraph('6.1 Etat des pages institutionnelles', style_h2))

inst_pages = [
    ['Landing (/institutions)', 'REEL', 'Role selector, cartes partenaires, hero, stats'],
    ['Layout', 'REEL', 'Sidebar, topbar, role-switching, mobile'],
    ['DPMED Dashboard', 'PLACEHOLDER', 'KPIs, alertes, conformite'],
    ['DPMED Carte couverture', 'PLACEHOLDER', 'Carte avec CoverageMap'],
    ['DPMED Conformite', 'PLACEHOLDER', 'ComplianceOverview'],
    ['DPMED Pharmacovigilance', 'PLACEHOLDER', 'Signalements EI'],
    ['DPMED Alertes', 'PLACEHOLDER', 'Liste, filtrage, statuts'],
    ['DPMED Nouvelle alerte', 'PLACEHOLDER', 'AlertForm'],
    ['DPMED Detail alerte', 'PLACEHOLDER', 'DiffusionTracker'],
    ['SoBAPS Dashboard', 'PLACEHOLDER', 'Livraisons, KPIs'],
    ['SoBAPS Carte officines', 'PLACEHOLDER', 'CoverageMap mode SoBAPS'],
    ['ABRP Dashboard', 'PLACEHOLDER', 'Analytics anonymisees'],
    ['ABRP Carte approvisionnement', 'PLACEHOLDER', 'BeninSupplyMap'],
]

story.append(make_table(
    ['Page', 'Statut', 'Fonctionnalites attendues'],
    [[r[0], status_tag(r[1]), r[2]] for r in inst_pages],
    col_widths=[48*mm, 22*mm, 100*mm]
))

story.append(Paragraph('6.2 Composants institutionnels - UI construite mais deconnectee', style_h2))

story.append(Paragraph(
    'Un point positif considerable : les 7 composants institutionnels sont entierement construits et '
    'fonctionnels d\'un point de vue UI. Le AlertForm permet la creation d\'alertes avec selection de type, '
    'niveau d\'urgence, DCI, numeros de lot, et signature numerique. Le DiffusionTracker affiche le suivi '
    'de diffusion par canal avec calcul des delais. Le CoverageMap et le BeninSupplyMap offrent des cartes '
    'interactives Mapbox avec clustering. Le ComplianceOverview presente un tableau de scores de conformite '
    'avec filtres et export.',
    style_body
))

story.append(Paragraph(
    '<b>Probleme critique :</b> Ces composants sont construits mais aucun n\'est importe dans les pages '
    'correspondantes, qui sont toutes des placeholders. De plus, les routes API qu\'ils appellent sont '
    'toutes des stubs. Le DiffusionTracker appelle /api/alertes/dpmed/${id} qui n\'existe pas (mauvaise URL). '
    'L\'AlertForm en mode edition appelle PUT /api/alertes/dpmed/${id} qui n\'existe pas non plus.',
    style_body
))

story.append(Paragraph('6.3 Flux critique DPMED - Analyse de conformite', style_h2))

dpmed_flow = [
    ['Reception webhook DPMED', '/api/webhooks/dpmed', 'STUB', 'Retourne 501, aucune validation'],
    ['Verification IP whitelist', '---', 'ABSENT', 'Non implemente'],
    ['Verification signature RSA-256', '---', 'ABSENT', 'Non implemente'],
    ['Creation AlerteDPMED en base', '---', 'ABSENT', 'Aucune logique de creation'],
    ['Enqueue BullMQ priorite 1', '---', 'ABSENT', 'BullMQ non installe'],
    ['Identification pharmacies concernees', '---', 'ABSENT', 'Aucune logique'],
    ['Diffusion push Firebase FCM', '---', 'ABSENT', 'Firebase non configure'],
    ['Diffusion SMS AfricasTalking', '---', 'ABSENT', 'AfricasTalking non installe'],
    ['Notification portail WebSocket', '---', 'ABSENT', 'WebSocket non integre'],
    ['Delai garanti < 2 min', '---', 'ABSENT', 'Impossible sans queue'],
]

story.append(make_table(
    ['Etape du flux', 'Route/API', 'Statut', 'Detail'],
    [[r[0], r[1], status_tag(r[2]), r[3]] for r in dpmed_flow],
    col_widths=[42*mm, 38*mm, 20*mm, 70*mm]
))

story.append(Spacer(1, 3*mm))
story.append(Paragraph(
    'Le flux critique DPMED, qui constitue le differentiateur principal de MediHelm, est entierement absent '
    'de l\'implementation. Aucune des 10 etapes specifiees n\'est fonctionnelle. Le delai garanti de moins de '
    '2 minutes ne peut etre respecte sans BullMQ et les mecanismes de diffusion push/SMS. C\'est l\'ecart '
    'le plus critique entre la specification et l\'implementation actuelle.',
    style_body
))

# ━━ 7. BASE DE DONNEES ━━
story.append(Paragraph('7. Base de donnees et schema Prisma', style_h1))

story.append(Paragraph(
    'Le schema Prisma est le composant le plus conforme a la specification. Avec 47 modeles et 29 enums, '
    'il couvre l\'ensemble des entites specifiees dans le MH-SCHEMA-2025-v1.0. La base de donnees PostgreSQL '
    'est hebergee sur Neon avec le bon configuration SSL. Les donnees de seed couvrent 5 pharmacies, '
    '8 utilisateurs, 15 medicaments, 8 patients, et des donnees de test pour la plupart des entites.',
    style_body
))

story.append(Paragraph('7.1 Conformite du schema par domaine', style_h2))

schema_data = [
    ['Plateforme & Auth', 'Pharmacie, Utilisateur, UtilisateurTenant, Promoteur', '4/4', status_tag('OK')],
    ['Stock', 'Medicament, Lot, AlerteStock, MouvementStock', '4/4', status_tag('OK')],
    ['Ventes & POS', 'Caisse, SessionCaisse, Vente, LigneVente, Paiement', '5/5', status_tag('OK')],
    ['Patients', 'Patient, Ordonnance, LigneOrdonnance, Vaccination', '4/4', status_tag('OK')],
    ['Fournisseurs', 'Fournisseur, CommandeFournisseur, LigneCommande', '3/3', status_tag('OK')],
    ['RH', 'Employe, Cone (typo), Presence, BulletinPaie', '4/4', status_tag('PARTIAL')],
    ['Finance', 'Abonnement, Credit, EcritureComptable, PharmacieTierPayant, Organisme', '5/5', status_tag('OK')],
    ['Garde & Comms', 'PlanningGarde, CampagneSms, AlerteOperationnelle', '3/3', status_tag('OK')],
    ['Documents', 'Document, ScoreConformite', '2/2', status_tag('OK')],
    ['Commandes Patient', 'CommandePatient, LigneCommandePatient', '2/2', status_tag('OK')],
    ['Integration Grossiste', 'OrdonnanceGrossiste, LigneOrdonnanceGrossiste, ReceptionGrossiste', '3/3', status_tag('OK')],
    ['Schema Grossiste', 'Grossiste, ProduitGrossiste, CommandeGrossiste, LigneCommandeGrossiste, WebhookConfig', '5/5', status_tag('OK')],
    ['ORION (IA)', 'PredictionIA, RapportAnalytique', '2/2', status_tag('OK')],
    ['Institutionnel', 'AlerteDPMED, DiffusionAlerte, MedicamentSurveillance, SignalementEI', '4/4', status_tag('OK')],
    ['Global', 'AuditLog, Notification', '2/2', status_tag('OK')],
]

story.append(make_table(
    ['Domaine', 'Modeles', 'Ratio', 'Statut'],
    schema_data,
    col_widths=[30*mm, 75*mm, 20*mm, 45*mm]
))

story.append(Spacer(1, 3*mm))
story.append(Paragraph(
    '<b>Problemes identifies :</b> (1) Le modele Cone est une typo pour Conge - cela devrait etre corrige. '
    '(2) Le fichier notifications.ts reference les champs patientId et canal qui ne figurent pas dans le modele '
    'Prisma Notification. (3) Il n\'y a pas de repertoire de migrations Prisma - le schema utilise prisma db push '
    'au lieu de prisma migrate dev, ce qui signifie qu\'il n\'y a pas d\'historique de migrations. (4) Le role '
    'OWNER existe dans le schema Prisma mais pas dans la matrice RBAC de rbac.ts (ou il est appele ADMIN).',
    style_body
))

# ━━ 8. AUTH & RBAC ━━
story.append(Paragraph('8. Authentification et RBAC', style_h1))

story.append(Paragraph(
    'L\'infrastructure d\'authentification est globalement solide mais presente des lacunes critiques dans '
    'l\'application du controle d\'acces. NextAuth v4 est configure avec le provider Credentials, la strategie JWT, '
    'et le hachage bcrypt (cost factor 12). Le middleware protege correctement les routes /pro/*, /institutions/* '
    'et /grossistes/* avec des redirections basees sur le role. Cependant, l\'audit revele un probleme majeur : '
    'le systeme RBAC est entierement defini mais n\'est applique sur aucune route API.',
    style_body
))

story.append(Paragraph('8.1 Matrice RBAC - Definie mais non appliquee', style_h2))

story.append(Paragraph(
    'Le fichier rbac.ts definit une matrice complete de 11 roles x 19 modules x 3 actions (read/write/delete). '
    'Les fonctions checkPermission(), withAuth(), et requireAuth() sont implementees et fonctionnelles. '
    'Cependant, <b>aucune des 31 routes API auditees n\'utilise withAuth() ou requireAuth()</b>. Cela signifie '
    'que toute route API est accessible sans authentification, et qu\'un caissier peut theoriquement supprimer '
    'du stock, ou un magasinier creer des ventes - violations directes de la politique RBAC specifiee.',
    style_body
))

rbac_issues = [
    ['RBAC non applique sur les API', 'CRITIQUE', '0/31 routes utilisent withAuth/requireAuth'],
    ['pharmacieId optionnel', 'CRITIQUE', 'medicaments, lots, mouvements, ordonnances - fuite inter-pharmacie'],
    ['ventes/[id] sans pharmacieId', 'CRITIQUE', 'Tout utilisateur peut acceder a toute vente par ID'],
    ['Pas de verification session patient', 'HAUT', 'Espace patient sans authentification'],
    ['Decode JWT sans verification signature', 'MOYEN', 'decodeBearerToken() ne verifie pas la signature'],
    ['Role OWNER vs ADMIN', 'MOYEN', 'Inconsistance entre schema Prisma (OWNER) et rbac.ts (ADMIN)'],
]

story.append(make_table(
    ['Probleme', 'Severite', 'Detail'],
    [[r[0], status_tag('STUB' if r[1]=='CRITIQUE' else 'PARTIAL' if r[1]=='HAUT' else 'PLACEHOLDER'), r[2]] for r in rbac_issues],
    col_widths=[50*mm, 22*mm, 98*mm]
))

# ━━ 9. SECURITE ━━
story.append(Paragraph('9. Securite et conformite technique', style_h1))

story.append(Paragraph(
    'La securite institutionnelle specifiee dans les Specs v2.0 est quasi entierement absente du code. '
    'Les webhooks doivent etre valides par HMAC-SHA256, les alertes DPMED par RSA-256, les connexions '
    'serveur-institutions par mTLS, et les IP doivent etre sur liste blanche. Aucune de ces mesures n\'est '
    'implementee. Le fichier webhook-security.ts existe et contient une implementation HMAC-SHA256, mais '
    'aucune route webhook ne l\'utilise.',
    style_body
))

security_data = [
    ['HMAC-SHA256 webhooks', 'Specs v2.0', 'webhook-security.ts existe mais non utilise', status_tag('PARTIAL')],
    ['RSA-256 alertes DPMED', 'Specs v2.0', 'Non implemente', status_tag('MISSING')],
    ['mTLS institutions', 'Specs v2.0', 'Non implemente', status_tag('MISSING')],
    ['IP whitelist', 'Specs v2.0', 'Non implemente', status_tag('MISSING')],
    ['RLS PostgreSQL', 'CONTEXT.md', 'Non active (Neon)', status_tag('MISSING')],
    ['Mass assignment protection', 'Bonnes pratiques', '1 seule route (pharmacies) avec allowlist', status_tag('PARTIAL')],
    ['Transaction DB ($transaction)', 'Bonnes pratiques', 'Aucune route utilise de transaction', status_tag('MISSING')],
    ['Rate limiting', 'Bonnes pratiques', 'Non implemente', status_tag('MISSING')],
]

story.append(make_table(
    ['Mesure de securite', 'Source', 'Etat', 'Statut'],
    security_data,
    col_widths=[42*mm, 28*mm, 68*mm, 32*mm]
))

# ━━ 10. PROBLEMES CRITIQUES ━━
story.append(Paragraph('10. Problemes critiques identifies', style_h1))

critical_issues = [
    ['P01', 'RBAC non applique sur les API', 
     'Aucune route API n\'utilise le systeme RBAC. Les 11 roles et la matrice 19 modules x 3 actions '
     'sont definis dans rbac.ts mais withAuth() et requireAuth() ne sont appeles nulle part. '
     'Impact : un utilisateur non authentifie peut acceder a toutes les donnees, et un caissier peut '
     'effectuer des operations reservees au directeur.'],
    ['P02', 'Multitenancy non renforce', 
     'Le filtrage par pharmacieId est optionnel sur plusieurs routes critiques (medicaments, lots, '
     'mouvements, ordonnances). La route /api/ventes/[id] ne verifie pas l\'appartenance de la vente '
     'a la pharmacie de l\'utilisateur. Impact : fuite de donnees inter-pharmacies possible.'],
    ['P03', 'Recherche patient non fonctionnelle', 
     '/api/patient/recherche retourne toujours []. La page de recherche medicament a une UI complete '
     'mais aucune donnee n\'est retournee. C\'est la fonctionnalite principale du site public pour les patients.'],
    ['P04', 'Flux DPMED entierement absent', 
     'Les 10 etapes du flux critique DPMED (webhook, verification RSA, queue BullMQ, identification '
     'pharmacies, diffusion push/SMS) sont absentes. Le differentiateur principal de MediHelm n\'est '
     'pas operationnel.'],
    ['P05', '80% des pages Pro sont des placeholders', 
     '20 pages sur 25 dans l\'espace Pro affichent uniquement "Module en cours de developpement". '
     'Les modules critiques (ordonnances, commandes, conformite, alertes) ne sont pas fonctionnels.'],
    ['P06', 'Toutes les API institutionnelles et grossistes sont des stubs', 
     '28 routes API (20 institutionnelles + 8 grossistes) retournent des tableaux vides ou 501. '
     'Aucune fonctionnalite institutionnelle ou grossiste ne fonctionne.'],
    ['P07', 'medicamentDispo fausse dans pharmacies-proches', 
     'Le champ medicamentDispo est calcule comme !!medicamentId au lieu de verifier le stock reel. '
     'Toutes les pharmacies apparaissent comme ayant le medicament disponible.'],
    ['P08', 'Mode offline non implemente', 
     'Le CDC specifie que le POS et le stock doivent fonctionner sans connexion. SQLite local, '
     'synchedAt, et la synchronisation offline sont entierement absents.'],
]

for issue in critical_issues:
    story.append(Paragraph(f'<b>{issue[0]} - {issue[1]}</b>', style_h3))
    story.append(Paragraph(issue[2], style_body))

# ━━ 11. PLAN D'ACTION ━━
story.append(Paragraph('11. Plan d\'action prioritaire', style_h1))

story.append(Paragraph(
    'Le plan d\'action ci-dessous est organise par priorite decroissante, en se concentrant sur les '
    'actions a fort impact qui debloquent le maximum de fonctionnalites avec le minimum d\'effort. '
    'L\'objectif est d\'atteindre un niveau d\'operationnalite suffisant pour une demonstration '
    'fonctionnelle dans les plus brefs delais.',
    style_body
))

action_data = [
    ['1', 'CRITIQUE', 'Appliquer requireAuth + requirePharmacieAccess sur les 13 routes API reelles',
     'Securise l\'ensemble de l\'API existante. Import de withAuth depuis rbac.ts + ajout du wrapper '
     'sur chaque handler. Estimation : 2-3 jours.'],
    ['2', 'CRITIQUE', 'Rendre pharmacieId obligatoire sur toutes routes pharmacie',
     'medicaments, lots, mouvements, alertes, ordonnances doivent exiger pharmacieId. Ajout verification '
     'sur ventes/[id]. Estimation : 1 jour.'],
    ['3', 'CRITIQUE', 'Connecter /api/patient/recherche a db.medicament',
     'Deleguer la recherche a la logique existante de /api/medicaments. Debloque la fonctionnalite cle '
     'du site public. Estimation : 0.5 jour.'],
    ['4', 'HAUT', 'Implementer les 5 pages Pro critiques (ordonnances, commandes, alertes, conformite, qualite)',
     'Les routes API existent deja pour la plupart. Creer les pages avec CRUD, tableaux, filtres, en '
     's\'inspirant des pages Stock/Ventes/Patients. Estimation : 5-7 jours.'],
    ['5', 'HAUT', 'Integrer les composants institutionnels dans les pages placeholders',
     'AlertForm dans dpmed/alertes/nouvelle, ComplianceOverview dans dpmed/conformite, CoverageMap dans '
     'dpmed/carte, DiffusionTracker dans dpmed/alertes/[id]. Quick win majeur. Estimation : 1-2 jours.'],
    ['6', 'HAUT', 'Implementer les routes API institutionnelles avec Prisma',
     'Priorite : /api/institutions/dpmed/alertes (CRUD alertes + diffusion), /api/portail/dpmed/dashboard '
     '(agregation KPIs), /api/institutions/conformite/scores. Estimation : 3-4 jours.'],
    ['7', 'HAUT', 'Implementer les routes API grossistes avec Prisma',
     '/api/grossistes/dashboard, /api/grossistes/[id]/catalogue, /api/grossistes/[id]/commandes. '
     'Permet le flux commande pharmacie-grossiste. Estimation : 3-4 jours.'],
    ['8', 'MOYEN', 'Implementer connexion/inscription patient',
     'Formulaire login/register, NextAuth Credentials pour patients, creation Patient en base. Prerequis '
     'pour commandes, rappels, fidelite. Estimation : 1-2 jours.'],
    ['9', 'MOYEN', 'Implementer le webhook DPMED (validation HMAC + creation alerte)',
     'Valider HMAC-SHA256, creer AlerteDPMED + DiffusionAlerte en base. Pas de BullMQ dans un premier '
     'temps - diffusion synchrone. Estimation : 2 jours.'],
    ['10', 'MOYEN', 'Corriger le bug medicamentDispo dans pharmacies-proches',
     'Requeter le stock reel du medicament dans chaque pharmacie au lieu de !!medicamentId. '
     'Estimation : 0.5 jour.'],
    ['11', 'BAS', 'Ajouter $transaction() aux operations multi-requetes',
     'ventes POST, mouvements POST, commandes POST. Garantit la coherence des donnees. '
     'Estimation : 1 jour.'],
    ['12', 'BAS', 'Implementer mode offline POS/Stock',
     'SQLite local, Service Worker, synchedAt, synchronisation. Complexe mais specifie comme critique '
     'dans le CDC. Estimation : 5-7 jours.'],
]

story.append(make_table(
    ['Priorite', 'Niveau', 'Action', 'Detail et estimation'],
    [[r[0], status_tag('STUB' if r[1]=='CRITIQUE' else 'PARTIAL' if r[1]=='HAUT' else 'PLACEHOLDER'), r[2], r[3]] for r in action_data],
    col_widths=[14*mm, 18*mm, 60*mm, 78*mm]
))

story.append(Spacer(1, 5*mm))
story.append(Paragraph(
    'En suivant ce plan d\'action, le projet peut atteindre un niveau d\'operationnalite d\'environ 60-70% '
    'en 3-4 semaines de developpement intensif, en se concentrant sur les actions critiques et a haut impact. '
    'Les actions de niveau moyen et bas peuvent etre realisees par la suite pour atteindre une conformite '
    'proche de 100%.',
    style_body
))

# ━━ BUILD ━━
doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
print(f'PDF genere avec succes : {OUTPUT_PATH}')
