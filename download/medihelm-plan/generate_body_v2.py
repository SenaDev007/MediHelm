#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MediHelm — Plan d'Action Conformite v2.0
Based on exhaustive analysis of ALL 41 documents in the MédiHelm folder
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)

# ━━ Fonts ━━
FONT_DIR = '/usr/share/fonts/truetype'
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Black', f'{FONT_DIR}/noto-serif-sc/NotoSerifSC-Black.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Light', f'{FONT_DIR}/noto-serif-sc/NotoSerifSC-Light.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-SemiBold', f'{FONT_DIR}/noto-serif-sc/NotoSerifSC-SemiBold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', f'{FONT_DIR}/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans', f'{FONT_DIR}/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans-Bold', f'{FONT_DIR}/liberation/LiberationSans-Bold.ttf'))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold',
                    italic='NotoSerifSC', boldItalic='NotoSerifSC-Bold')

# ━━ Palette ━━
ACCENT       = colors.HexColor('#1e7693')
TEXT_PRIMARY  = colors.HexColor('#1a1a18')
TEXT_MUTED    = colors.HexColor('#7e7c74')
BG_PAGE       = colors.HexColor('#f2f2f1')
BG_SURFACE    = colors.HexColor('#efefee')
HEADER_FILL   = colors.HexColor('#4f4939')
COVER_BLOCK   = colors.HexColor('#635d4b')
BORDER        = colors.HexColor('#ccc5af')
SEM_SUCCESS   = colors.HexColor('#449960')
SEM_WARNING   = colors.HexColor('#95773c')
SEM_ERROR     = colors.HexColor('#a2534c')
SEM_INFO      = colors.HexColor('#4d77a0')
TEAL_BRAND    = colors.HexColor('#1D9E75')

# ━━ Styles ━━
W, H = A4
ML, MR, MT, MB = 22*mm, 22*mm, 20*mm, 20*mm
CW = W - ML - MR

sH1 = ParagraphStyle('H1', fontName='NotoSerifSC-Black', fontSize=20, leading=26,
                       textColor=ACCENT, spaceBefore=20, spaceAfter=10)
sH2 = ParagraphStyle('H2', fontName='NotoSerifSC-Bold', fontSize=15, leading=20,
                       textColor=HEADER_FILL, spaceBefore=16, spaceAfter=8)
sH3 = ParagraphStyle('H3', fontName='NotoSerifSC-SemiBold', fontSize=12, leading=17,
                       textColor=COVER_BLOCK, spaceBefore=10, spaceAfter=5)
sBody = ParagraphStyle('Body', fontName='NotoSerifSC', fontSize=10.5, leading=17,
                         textColor=TEXT_PRIMARY, spaceBefore=3, spaceAfter=6, alignment=TA_JUSTIFY)
sBodyS = ParagraphStyle('BodyS', fontName='NotoSerifSC', fontSize=9.5, leading=15,
                          textColor=TEXT_PRIMARY, spaceBefore=2, spaceAfter=4, alignment=TA_JUSTIFY)
sBullet = ParagraphStyle('Bullet', fontName='NotoSerifSC', fontSize=10.5, leading=16,
                            textColor=TEXT_PRIMARY, spaceBefore=2, spaceAfter=3,
                            leftIndent=18, bulletIndent=6)
sBulletS = ParagraphStyle('BulletS', fontName='NotoSerifSC', fontSize=9.5, leading=14,
                             textColor=TEXT_PRIMARY, spaceBefore=1, spaceAfter=2,
                             leftIndent=18, bulletIndent=6)
sMuted = ParagraphStyle('Muted', fontName='NotoSerifSC-Light', fontSize=9, leading=13,
                          textColor=TEXT_MUTED, spaceBefore=2, spaceAfter=4)
sTH = ParagraphStyle('TH', fontName='NotoSerifSC-Bold', fontSize=9, leading=12,
                       textColor=colors.white, alignment=TA_CENTER)
sTC = ParagraphStyle('TC', fontName='NotoSerifSC', fontSize=8.5, leading=12,
                       textColor=TEXT_PRIMARY, alignment=TA_LEFT)
sCallout = ParagraphStyle('Callout', fontName='NotoSerifSC-Bold', fontSize=10.5, leading=16,
                            textColor=SEM_ERROR, spaceBefore=6, spaceAfter=6, leftIndent=10)

def p(text, style=sBody):
    return Paragraph(text, style)

def bullet(text, style=sBullet):
    return Paragraph('- ' + text, style)

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceBefore=6, spaceAfter=6)

def make_table(headers, rows, col_widths=None):
    avail = CW
    if col_widths is None:
        n = len(headers)
        col_widths = [avail / n] * n
    else:
        total = sum(col_widths)
        col_widths = [w / total * avail for w in col_widths]
    data = [[Paragraph(h, sTH) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), sTC) for c in row])
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        bg = colors.white if i % 2 == 1 else BG_SURFACE
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

def phase_hdr(num, title, weeks):
    return [
        Spacer(1, 6),
        HRFlowable(width="100%", thickness=2, color=ACCENT, spaceBefore=4, spaceAfter=4),
        p(f'<b>PHASE {num} : {title}</b>', sH2),
        p(f'<i>Duree estimee : {weeks}</i>', sMuted),
        Spacer(1, 4),
    ]

# ━━ Build ━━
output_path = '/home/z/my-project/download/medihelm-plan/body_v2.pdf'
doc = SimpleDocTemplate(output_path, pagesize=A4,
    leftMargin=ML, rightMargin=MR, topMargin=MT, bottomMargin=MB,
    title='MediHelm Plan Action Conformite v2.0',
    author='YEHI OR Tech - Dawes',
    subject='Plan complet base sur 41 documents')

story = []

# ═══════════════════════════════════════
# TABLE DES MATIERES
# ═══════════════════════════════════════
story.append(p('<b>TABLE DES MATIERES</b>', sH1))
story.append(Spacer(1, 6))
toc = [
    ("1", "Resume Executif"),
    ("2", "Perimetre Documentaire Analyse"),
    ("3", "Incoherences Internes de la Documentation"),
    ("4", "Etat des Lieux : Code vs Documentation Complete"),
    ("5", "Analyse des Ecarts par Severite"),
    ("6", "Phase 0 : Monorepo 5 Apps + Fondations (S1-S8)"),
    ("7", "Phase 1 : Auth, RBAC et Securite (S9-S14)"),
    ("8", "Phase 2 : Mode Offline et POS (S15-S22)"),
    ("9", "Phase 3 : Modules Pro M01-M09 (S23-S34)"),
    ("10", "Phase 4 : Site Public + Module Scan (S35-S40)"),
    ("11", "Phase 5 : Portail Grossiste G01-G10 (S41-S46)"),
    ("12", "Phase 6 : Modules Institutionnels M16-M19 (S47-S52)"),
    ("13", "Phase 7 : Portails Institutionnel et Admin (S53-S56)"),
    ("14", "Phase 8 : Reseau Network (S57-S60)"),
    ("15", "Phase 9 : Analytics IA + ORION (S61-S63)"),
    ("16", "Phase 10 : Certification et Production (S64-S68)"),
    ("17", "Schema Prisma : Changements Requis"),
    ("18", "Incoherences a Resoudre dans la Documentation"),
    ("19", "Variables d'Environnement Completes"),
    ("20", "Risques et Mitigation"),
    ("21", "Calendrier Consolide"),
]
for num, title in toc:
    story.append(p(f'{num}. {title}', sBody))

story.append(PageBreak())

# ═══════════════════════════════════════
# 1. RESUME EXECUTIF
# ═══════════════════════════════════════
story.append(p('<b>1. RESUME EXECUTIF</b>', sH1))
story.append(hr())

story.append(p(
    "Ce document est la version 2.0 du plan d'action pour rendre le codebase MediHelm 100% conforme a sa documentation. "
    "Il se base sur l'analyse exhaustive de l'integralite des 41 fichiers du dossier MediHelm du repo GitHub : "
    "14 PDF (268 pages), 21 fichiers DOCX, 3 fichiers Markdown et 1 fichier cursorrules, representant au total "
    "plus de 878 000 caracteres de documentation technique et fonctionnelle."
))

story.append(p(
    "La premiere version de ce plan avait ete elaboree a partir des seuls fichiers CONTEXT.md, medihelm.md et "
    "medihelm.cursorrules. La lecture complete de la documentation revele un perimetre bien plus large que ce qui "
    "etait initialement evalue : le monorepo documente comprend 5 applications frontend distinctes (medihelm-api, "
    "medihelm-web, medihelm-public, medihelm-grossiste, medihelm-institutionnel) plus medihelm-admin, un module "
    "Scan GS1 DataMatrix entierement specifie, un portail grossiste avec 10 modules propres, et un portail "
    "admin plateforme dedie. Par ailleurs, des incoherences internes significatives ont ete identifiees dans "
    "la documentation elle-meme, notamment sur les noms et prix des plans tarifaires."
))

story.append(p(
    "Le plan passe de 8 phases / 56 semaines a 10 phases / 68 semaines pour integrer ces decouvertes. "
    "Les phases 0 a 2 restent le socle non negociable (monorepo, securite, offline). Les phases 3 a 5 "
    "couvrent les modules metier Pro, le site public et le module Scan, et le portail grossiste. Les phases "
    "6 a 8 traitent les modules institutionnels, les portails institutionnel/admin, et le reseau Network. "
    "Les phases 9 et 10 completent avec Analytics IA/ORION et la certification finale."
))

story.append(Spacer(1, 8))
story.append(make_table(
    ["Indicateur", "Etat Actuel", "Objectif Final"],
    [
        ["Architecture", "Monolithe Next.js 16", "Monorepo Turborepo 6 apps"],
        ["Apps frontend", "1 (Next.js unique)", "5 (web + public + grossiste + institutionnel + admin)"],
        ["Backend", "112 API routes Next.js", "NestJS + Fastify (20+ modules)"],
        ["Auth", "NextAuth v4 (JWT sans verif.)", "Supabase Auth + JWT (15min/7j)"],
        ["Routes securisees", "6/112 (5%)", "100% des endpoints"],
        ["Validation entrees", "0/112 (0%)", "100% (Zod)"],
        ["Mode offline", "SW basique (assets)", "SQLite + sync + next-pwa"],
        ["Module Scan", "Absent", "GS1 DataMatrix complet"],
        ["Portail Grossiste", "5 pages basiques", "10 modules G01-G10"],
        ["Portail Admin", "Absent", "admin.medihelm.com complet"],
        ["Site Public", "Absent", "medihelm.com 8 modules"],
        ["Integrations paiement/SMS", "Simulees", "Reelles (Fedapay + AfricasTalking)"],
    ],
    [2, 3, 3]
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 2. PERIMETRE DOCUMENTAIRE
# ═══════════════════════════════════════
story.append(p('<b>2. PERIMETRE DOCUMENTAIRE ANALYSE</b>', sH1))
story.append(hr())

story.append(p(
    "L'analyse exhaustive du dossier MediHelm a revele un corpus documentaire bien plus riche que les 3 fichiers "
    "initialement lus. Les 41 fichiers couvrent le cahier des charges, les specifications techniques, les prompts "
    "Cursor pour le developpement, les dossiers de partenariat institutionnels, le schema Prisma complet, les "
    "guidelines de marque, la politique de pricing, et les CDC frontend pour chaque portail."
))

story.append(p('<b>2.1 Documents principaux</b>', sH3))
story.append(make_table(
    ["Document", "Reference", "Pages/Size", "Contenu cle"],
    [
        ["CDC v2.0", "MH-CDC-2025-v2.0", "32p / 48K", "Vision, 19 modules, pricing, roadmap, partenariats"],
        ["CDC v1.0", "MH-CDC-2025-v1.0", "28p / 31K", "Version originale 15 modules"],
        ["Specs v2.0", "MH-SPECS-2025-v2.0", "32p / 42K", "Architecture NestJS, M16-M19, DPMED, BullMQ"],
        ["Specs v1.0", "MH-SPECS-2025-v1.0", "32p / 47K", "Specs techniques initiales M01-M15"],
        ["Schema Prisma v1.0", "MH-PRISMA-2025-v1.0", "55p / 66K", "47 modeles, 29 enums, complet"],
        ["Monorepo Portails v1.0", "MH-MONO-2025-v1.0", "24p / 35K", "Architecture Turborepo, JWT partage"],
    ],
    [1.5, 1.5, 1, 3]
))

story.append(p('<b>2.2 Documents par portail</b>', sH3))
story.append(make_table(
    ["Portail", "CDC", "Cursor", "Specs", "Autres"],
    [
        ["Site Public", "16p CDC", "22p Cursor", "11p Specs", "Gemini + Partenariat"],
        ["Grossiste", "10p CDC", "7p Cursor", "-", "-"],
        ["Institutionnel", "9p CDC", "11p Cursor", "-", "-"],
        ["Scan", "12p CDC", "9p Cursor", "18p Specs", "-"],
    ],
    [1.5, 1.2, 1.2, 1.2, 1.9]
))

story.append(p('<b>2.3 Documents strategiques</b>', sH3))
story.append(make_table(
    ["Document", "Taille", "Contenu"],
    [
        ["Pricing v2.0", "28K", "Plans SEED/BLOOM/CROWN, projections, benchmark"],
        ["Pricing v2.1", "30K", "Onboarding, CGV, formation, lancement sequencé"],
        ["Dossier DPMED", "24K", "Lettre formelle, partenariat, annexes techniques"],
        ["Dossier SoBAPS", "10K", "Traçabilite livraisons, valeur audit FM/USAID"],
        ["Dossier Grossistes", "14K", "API commande, portail partenaire, co-marketing"],
        ["Brand Guidelines", "15K", "Logo teal #1D9E75, Georgia Serif, palette"],
        ["Prompts Gemini", "33K", "38 prompts images pour visuels"],
    ],
    [1.5, 0.8, 3.7]
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 3. INCOHERENCES INTERNES
# ═══════════════════════════════════════
story.append(p('<b>3. INCOHERENCES INTERNES DE LA DOCUMENTATION</b>', sH1))
story.append(hr())

story.append(p(
    "La lecture complete de la documentation revele des contradictions internes significatives qui doivent etre "
    "resolues avant de pouvoir implementer correctement. Ces incoherences proviennent principalement de l'evolution "
    "du projet entre les versions v1.0 et v2.0, et de la redaction des documents a des periodes differentes."
))

story.append(p('<b>3.1 Plans tarifaires contradictoires</b>', sH3))
story.append(p(
    "C'est l'incoherence la plus critique. Trois sources differentes donnent des noms et prix de plans differents. "
    "Le CONTEXT.md et medihelm.md utilisent HELM SEED (19 900 FCFA) / HELM GROW (34 900) / HELM LEAD (54 900). "
    "Le CDC v2.0 utilise STEM (12 900) / BLOOM (22 900) / CROWN (38 900). Le Pricing v2.0/v2.1 utilise "
    "HELM SEED / HELM BLOOM / HELM CROWN avec des prix encore differents. Il est imperatif de trancher "
    "definitivement sur les noms et les prix avant d'implementer le module d'abonnement."
))

story.append(make_table(
    ["Source", "Plan 1", "Plan 2", "Plan 3", "Plan 4"],
    [
        ["CONTEXT.md / medihelm.md", "SEED 19 900", "GROW 34 900", "LEAD 54 900", "NETWORK sur devis"],
        ["CDC v2.0 (p.26)", "STEM 12 900", "BLOOM 22 900", "CROWN 38 900", "NETWORK sur devis"],
        ["Pricing v2.0/v2.1", "SEED 19 900", "BLOOM 34 900", "CROWN 54 900", "NETWORK sur devis"],
        ["Schema Prisma actuel", "SEED (enum)", "-", "-", "-"],
    ],
    [1.8, 1.3, 1.3, 1.3, 1.3]
))

story.append(p(
    '<b>Recommandation :</b> Adopter la version Pricing v2.1 (la plus recente et la plus detaillee) comme reference '
    'unique : HELM SEED / HELM BLOOM / HELM CROWN / HELM NETWORK. Mettre a jour CONTEXT.md et medihelm.md en consequence.'
))

story.append(p('<b>3.2 Noms de plans dans le schema Prisma</b>', sH3))
story.append(p(
    "L'enum PlanType dans le schema Prisma actuel contient SEED (et non STEM comme dans le CDC v2.0). "
    "L'enum dans le Schema Prisma v1.0 documente utilise egalement SEED. Il faut reconcilier cet enum "
    "avec la decision sur les plans tarifaires et ajouter BLOOM/CROWN en remplacement de GROW/LEAD."
))

story.append(p('<b>3.3 Nombre de roles RBAC</b>', sH3))
story.append(p(
    "CONTEXT.md liste 12 roles (PLATFORM_ADMIN a GROSSISTE_PARTNER). Le Schema Prisma v1.0 documente "
    "des roles differents pour l'espace pharmacie : OWNER, DIRECTEUR, PHARMACIEN, CAISSIER, MAGASINIER, "
    "COMPTABLE, STAGIAIRE. Le portail grossiste a ses propres roles : GROSSISTE_ADMIN, COMMANDES, PREPARATEUR, "
    "LIVREUR, COMMERCIAL, COMPTABLE. Le code actuel a un enum RoleType avec 11 valeurs. La resolution "
    "necessite de combiner les roles pharmacie, institutionnels et grossiste dans un systeme unifie avec "
    "TenantType (PHARMACIE, GROSSISTE, INSTITUTION, PLATFORM) pour isoler les permissions."
))

story.append(p('<b>3.4 Architecture monorepo : 4 apps vs 5 apps vs 6 apps</b>', sH3))
story.append(p(
    "CONTEXT.md decrit 2 apps (api + web) + 3 packages. Le document Monorepo Portails v1.0 detaille "
    "4 apps frontend (medihelm-web, medihelm-public, medihelm-grossiste, medihelm-institutionnel) + "
    "1 API NestJS. Le CDC Institutionnel ajoute medihelm-admin comme 6e application. Le code actuel "
    "est un seul projet Next.js. La resolution : adopter l'architecture la plus complete du Monorepo "
    "Portails v1.0 avec l'ajout de medihelm-admin, soit 6 apps au total."
))

story.append(p('<b>3.5 Domaines Analytics IA : 7 vs 9</b>', sH3))
story.append(p(
    "medihelm.md liste 9 domaines (STOCK, VENTES, PATIENTELE, PERSONNEL, FINANCE, PEREMPTIONS, RESEAU, "
    "CONFORMITE, INTEGRATION_GROSSISTE). Le CDC v2.0 mentionne 7 domaines dans la section Analytics. "
    "Les Specs v2.0 ajoutent Conformite reglementaire et Performance integration grossiste comme nouveaux. "
    "Recommandation : adopter les 9 domaines de medihelm.md (la source la plus complete) et creer l'enum "
    "DomaineIA correspondant dans le schema Prisma."
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 4. ETAT DES LIEUX COMPLET
# ═══════════════════════════════════════
story.append(p('<b>4. ETAT DES LIEUX : CODE vs DOCUMENTATION COMPLETE</b>', sH1))
story.append(hr())

story.append(p('<b>4.1 Stack technique</b>', sH3))
story.append(make_table(
    ["Composant", "Documente", "Actuel", "Ecart"],
    [
        ["Frontend Web", "Next.js 14 (medihelm-web)", "Next.js 16 monolithe", "App unique, pas monorepo"],
        ["Frontend Public", "Next.js 14 (medihelm-public)", "Absent", "CRITIQUE : absent"],
        ["Frontend Grossiste", "Next.js 14 (medihelm-grossiste)", "5 pages basiques", "Incomplet"],
        ["Frontend Institutionnel", "Next.js 14 (medihelm-institutionnel)", "12 pages basiques", "Incomplet"],
        ["Frontend Admin", "Next.js 14 (medihelm-admin)", "Absent", "Absent"],
        ["Backend", "NestJS + Fastify (medihelm-api)", "API routes Next.js", "CRITIQUE : absent"],
        ["ORM", "Prisma 5+", "Prisma 6.11", "OK (version superieure)"],
        ["Auth", "Supabase Auth + JWT", "NextAuth v4 (JWT sans verif.)", "CRITIQUE"],
        ["DB offline", "SQLite via Prisma", "Aucun", "CRITIQUE"],
        ["Cache", "Redis Upstash", "Aucun", "Absent"],
        ["Queue", "BullMQ", "Aucun", "CRITIQUE"],
        ["PWA", "next-pwa", "SW basique", "CRITIQUE"],
        ["WebSocket", "NestJS Gateway + Socket.io", "Exemple non connecte", "Absent"],
        ["Module Scan", "ParseGS1 + ScanResolver", "Absent", "Absent"],
        ["SMS", "AfricasTalking", "Simule", "Non integre"],
        ["Paiement", "Fedapay SDK", "Simule", "Non integre"],
        ["Monitoring", "Sentry + Vercel Analytics", "Aucun", "Absent"],
        ["Branding", "Teal #1D9E75, Georgia Serif", "Non applique", "Ecart design"],
    ],
    [1.3, 1.7, 1.5, 2.5]
))

story.append(p('<b>4.2 Securite</b>', sH3))
story.append(p(
    "L'analyse de securite reste critique. Seulement 6 des 112 routes API verifient l'authentification. "
    "Le bearer token JWT est decode sans verification de signature. Aucune validation Zod n'est appliquee "
    "malgre la presence du package. Le RBAC n'est utilise que sur 5% des routes. Il n'y a pas de rate "
    "limiting, pas de mTLS, et les identifiants de base de donnee sont en clair dans les scripts. Les "
    "webhooks HMAC-SHA256 sont correctement implementes mais c'est la seule mesure de securite en place."
))

story.append(p('<b>4.3 Schema Prisma</b>', sH3))
story.append(p(
    "Le schema Prisma actuel contient 77 modeles et 31 enums. Le Schema Prisma v1.0 documente en contient "
    "47 modeles et 29 enums. L'ecart de 30 modeles supplementaires dans le code actuel provient de l'ajout "
    "de modeles non documentes (ScorePharmacie, RapportAnalytics, Reseau, OfficineReseau, TransfertStock, "
    "Abonnement, Facture, etc.). Certains de ces modeles seront necessaires, d'autres devront etre reconcilies "
    "avec les modeles documentes pour eviter les doublons ou les incoherences."
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 5. ANALYSE DES ECARTS PAR SEVERITE
# ═══════════════════════════════════════
story.append(p('<b>5. ANALYSE DES ECARTS PAR SEVERITE</b>', sH1))
story.append(hr())

story.append(p('<b>5.1 Ecarts Critiques (Bloquants production)</b>', sH3))
for title, desc in [
    ("Absence NestJS", "Backend complet dans API routes Next.js. Pas de guards, interceptors, middleware, WebSocket Gateway."),
    ("95% routes sans auth", "106/112 routes sans authentification. Donnees de toutes pharmacies accessibles."),
    ("JWT sans verification signature", "Bearer token decode avec atob(). Forge de tokens possible."),
    ("Zero validation d'entrees", "Zod installe mais jamais utilise. Risques injection et corruption."),
    ("Pas de mode offline", "POS ne peut pas fonctionner hors connexion. Bloqueur absolu au Benin."),
    ("Pas de BullMQ/Redis", "SLA alertes DPMED < 2 min impossible sans queue dediee."),
    ("Pas de WebSocket reel", "Notifications temps reel impossibles. SSE insuffisant."),
    ("Site Public absent", "medihelme.com entierement documente mais pas de code. Hub central manquant."),
    ("Portail Admin absent", "admin.medihelm.com pour PLATFORM_ADMIN n'existe pas."),
    ("Module Scan absent", "ParseGS1, ScanResolver, useBarcodeInput tous documentes mais non implementes."),
]:
    story.append(p(f'<b><font color="#a2534c">{title}</font></b>', sH3))
    story.append(p(desc, sBodyS))

story.append(p('<b>5.2 Ecarts Eleves (Impact majeur)</b>', sH3))
for title, desc in [
    ("RBAC non applique", "Systeme complet dans rbac.ts mais 5% d'utilisation seulement."),
    ("Portail Grossiste basique", "5 pages vs 10 modules G01-G10 documentes."),
    ("Portails Institutionnels basiques", "Pages existantes mais flux metier non connectes."),
    ("Fedapay/AfricasTalking simules", "Paiements et SMS non fonctionnels."),
    ("Pas de rate limiting", "Aucune protection force brute."),
    ("Pas de mTLS", "Connexions institutions non securisees."),
    ("Clefs API en clair", "Identifiants Neon DB dans le code source."),
    ("Brand Guidelines non appliques", "Palette teal #1D9E75 et Georgia Serif non utilises."),
]:
    story.append(p(f'<b><font color="#95773c">{title}</font></b>', sH3))
    story.append(p(desc, sBodyS))

story.append(p('<b>5.3 Ecarts Moyens</b>', sH3))
for title, desc in [
    ("Champs Prisma manquants", "Vente.reference, synchedAt, montantAssur, Pharmacie.slug, modeGardeActif, planExpireAt, Utilisateur.supabaseUid, DomaineIA enum."),
    ("Enums divergents", "PlanType (SEED vs STEM), StatutVente (sans AVOIR), ModePaiement (sans ASSURANCE/CREDIT), StatutCommandePatient (en anglais)."),
    ("Pas de FEFO/CMUP", "Decrement stock FEFO et calcul CMUP non implementes."),
    ("Pas de cron Analytics", "Rapports Analytics IA non generes automatiquement."),
    ("Pas de Docker/CI-CD", "Aucun Dockerfile, pipeline, ou script de deploiement."),
    ("Incoherences pricing docs", "3 versions differentes des noms et prix de plans."),
]:
    story.append(p(f'<b><font color="#4d77a0">{title}</font></b>', sH3))
    story.append(p(desc, sBodyS))

story.append(PageBreak())

# ═══════════════════════════════════════
# 6. PHASE 0
# ═══════════════════════════════════════
story.extend(phase_hdr(0, "MONOREPO 5 APPS + FONDATIONS", "Semaines 1-8 (8 semaines)"))

story.append(p(
    "Cette phase restructure le monolithe Next.js en monorepo Turborepo avec 6 applications distinctes, "
    "conformement au document Monorepo Portails v1.0. L'architecture cible comprend : medihelm-api (NestJS), "
    "medihelm-web (pharmacie Pro), medihelm-public (site public), medihelm-grossiste (portail grossiste), "
    "medihelm-institutionnel (portails DPMED/SoBAPS/ABRP), et medihelm-admin (admin plateforme). Les packages "
    "partages types, auth et ui sont crees pour mutualiser le code. Le schema Prisma est mis a jour avec "
    "les champs manquants et les enums corriges. La connexion inter-projets est configuree via JWT partage "
    "et CORS dynamique."
))

story.append(p('<b>6.1 Architecture cible du monorepo</b>', sH3))
story.append(p(
    "Le monorepo utilise pnpm workspaces avec Turborepo pour la gestion du build. Chaque application "
    "frontend est un projet Next.js 14+ independant avec son propre port de developpement : medihelm-web "
    "sur :3000, medihelm-public sur :3001, medihelm-grossiste sur :3002, medihelm-institutionnel sur :3003, "
    "medihelm-admin sur :3004. L'API NestJS tourne sur :4000. Le package types contient les enums et "
    "interfaces partages (RoleType, TenantType, PlanType, JWTPayload, APIResponse). Le package auth "
    "fournit les fonctions decodeJWT, isTokenExpired, getStoredToken, getRedirectUrl. Le package ui "
    "regroupe les composants React partages. La page /portails sur medihelm-public sert de hub central "
    "avec 4 PortalCards redirigeant vers chaque espace."
))

story.append(p('<b>6.2 Livrables</b>', sH3))
for item in [
    "Monorepo Turborepo fonctionnel avec pnpm workspaces et turbo.json",
    "medihelm-api/ : NestJS + Fastify + Prisma + health check",
    "medihelm-web/ : Frontend pharmacie Pro migre (toutes les pages (pro) existantes)",
    "medihelm-public/ : Site public vide avec page /portails et /connexion",
    "medihelm-grossiste/ : Frontend grossiste vide avec structure de base",
    "medihelm-institutionnel/ : Frontend institutionnel vide avec structure de base",
    "medihelm-admin/ : Frontend admin vide avec structure de base",
    "packages/types/ : Enums + interfaces partages (RoleType, TenantType, JWTPayload, etc.)",
    "packages/auth/ : Fonctions JWT partagees (decodeJWT, getStoredToken, getRedirectUrl)",
    "packages/ui/ : Composants React partages (MhButton, MhCard, MhInput, MhBadge, MhSearchBar)",
    "Schema Prisma mis a jour avec tous les champs manquants et enums corriges",
    "JWT partage : token unique emis par api.medihelm.com, utilise par tous les frontends",
    "CORS dynamique NestJS pour accepter les origines des 5 frontends",
    "Page /portails sur medihelm-public avec 4 PortalCards",
]:
    story.append(bullet(item, sBulletS))

story.append(p('<b>6.3 Etapes</b>', sH3))
story.append(make_table(
    ["Semaine", "Action"],
    [
        ["S1", "Initialiser monorepo Turborepo + pnpm workspaces. Structure apps/ et packages/."],
        ["S1-S2", "Creer medihelm-api/ (NestJS + Fastify + Prisma + health check). Configurer CORS dynamique."],
        ["S2-S4", "Migrer frontend Next.js dans medihelm-web/. Mettre a jour imports. Verifier toutes les pages."],
        ["S3-S4", "Creer packages/types/ : extraire RoleType, TenantType, PlanType, JWTPayload, APIResponse, etc."],
        ["S4-S5", "Creer packages/auth/ : decodeJWT, getStoredToken, getRedirectUrl, isTokenExpired."],
        ["S5", "Creer packages/ui/ : MhButton, MhCard, MhInput, MhBadge, MhSearchBar avec palette teal #1D9E75."],
        ["S5-S6", "Creer medihelm-public/ avec page /portails (4 PortalCards) et /connexion (LoginForm partage)."],
        ["S6-S7", "Creer medihelm-grossiste/, medihelm-institutionnel/, medihelm-admin/ (squelette + auth)."],
        ["S7-S8", "Mettre a jour schema Prisma (champs manquants, enums corriges). Generer migration. Tests E2E monorepo."],
    ],
    [1, 6]
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 7. PHASE 1
# ═══════════════════════════════════════
story.extend(phase_hdr(1, "AUTH, RBAC ET SECURITE", "Semaines 9-14 (6 semaines)"))

story.append(p(
    "Mise en place de l'authentification Supabase Auth, du RBAC complet avec TenantType, de la validation "
    "Zod systematique, et du rate limiting. Le JWTPayload contient sub, pharmacieId, grossisteId, role, "
    "tenantType (PHARMACIE, GROSSISTE, INSTITUTION, PLATFORM) pour diriger chaque utilisateur vers le bon "
    "portail et appliquer les permissions correctes."
))

story.append(p('<b>7.1 Livrables</b>', sH3))
for item in [
    "Supabase Auth avec JWT (access 15 min, refresh 7 jours) emis par api.medihelm.com",
    "JWTPayload unifie : {sub, pharmacieId, grossisteId, role, tenantType, permissions}",
    "NestJS AuthGuard + RolesGuard + TenantGuard + InstitutionGuard sur 100% des endpoints",
    "Decorateur @Roles() avec matrice RBAC par TenantType (pharmacie, grossiste, institution, platform)",
    "TenantMiddleware : SET app.current_tenant avant chaque requete Prisma",
    "ZodValidationPipe NestJS : schemas Zod pour chaque endpoint (body, query, params)",
    "Rate limiting : 5 tentatives/15min/IP sur /auth/login, 100 req/min/IP ailleurs",
    "Chiffrement clefs API en base (AES-256-GCM)",
    "Suppression identifiants en clair du code source",
    "Audit logging systematique via AuditLog",
]:
    story.append(bullet(item, sBulletS))

story.append(p('<b>7.2 Etapes</b>', sH3))
story.append(make_table(
    ["Semaine", "Action"],
    [
        ["S9", "Installer @supabase/supabase-js. Creer AuthModule NestJS. Remplacer decodeBearerToken vulnerable."],
        ["S9-S10", "Implementer AuthGuard avec verification JWT Supabase. JWTPayload avec tenantType."],
        ["S10-S11", "Implementer RolesGuard + TenantGuard + InstitutionGuard. Decorateur @Roles(). Appliquer partout."],
        ["S11-S12", "Creer ZodValidationPipe. Ecrire schemas Zod pour chaque endpoint. Appliquer systematiquement."],
        ["S12-S13", "Rate limiting + chiffrement clefs API + nettoyage code source."],
        ["S13-S14", "Audit logging systematique. Tests conformite RBAC par role et TenantType."],
    ],
    [1, 6]
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 8. PHASE 2
# ═══════════════════════════════════════
story.extend(phase_hdr(2, "MODE OFFLINE ET POS", "Semaines 15-22 (8 semaines)"))

story.append(p(
    "Implementation du mode offline critique pour le Benin : SQLite local via Prisma pour les tables "
    "critiques, synchronisation offline/online avec file d'attente IndexedDB, endpoint POST /ventes/sync "
    "idempotent, et PWA complete avec next-pwa. Le POS doit survivre aux coupures internet et electriques, "
    "et aucune vente ne doit etre perdue."
))

story.append(p('<b>8.1 Livrables</b>', sH3))
for item in [
    "SQLite local : medicaments, lots, patients (lecture) ; ventes, lignes_vente, paiements (ecriture)",
    "SyncService : detection offline/online, file IndexedDB, retry automatique, resolution conflits",
    "Endpoint POST /ventes/sync batch idempotent (base sur Vente.reference unique)",
    "Champs synchedAt (null = offline) et reference (unique) sur Vente",
    "next-pwa complet : service worker avancé, manifest, installation Android",
    "Indicateur visuel permanent de connexion (OfflineBanner)",
    "FEFO dans le POS offline : tri lots par dateExpiration asc",
    "Tests resistance : 100 ventes offline, sync sans perte, coupure electrique",
]:
    story.append(bullet(item, sBulletS))

story.append(p('<b>8.2 Etapes</b>', sH3))
story.append(make_table(
    ["Semaine", "Action"],
    [
        ["S15-S16", "SQLite local via Prisma. Schema offline et repositories lecture/ecriture."],
        ["S16-S17", "SyncService : file IndexedDB, retry automatique, resolution conflits."],
        ["S17-S18", "Endpoint POST /ventes/sync NestJS. Idempotence via Vente.reference."],
        ["S18-S19", "Integrer next-pwa dans medihelm-web/. Service worker strategique."],
        ["S19-S20", "OfflineBanner + useOnlineStatus hook. Indicateur visuel permanent."],
        ["S20-S21", "FEFO dans POS offline. Calcul CMUP a la reception de lot."],
        ["S21-S22", "Tests resistance (100 ventes offline, coupure electrique). Validation zero perte."],
    ],
    [1, 6]
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 9. PHASE 3
# ═══════════════════════════════════════
story.extend(phase_hdr(3, "MODULES PRO M01-M09", "Semaines 23-34 (12 semaines)"))

story.append(p(
    "Migration des 9 modules metier fondamentaux vers le backend NestJS avec services, controleurs, DTOs "
    "et tests. Les routes API Next.js existantes sont remplacees par les endpoints NestJS. Le frontend "
    "medihelm-web est mis a jour pour appeler api.medihelm.com/v1. L'accent est mis sur le respect des "
    "regles metier documentees : FEFO, CMUP, multitenancy, RBAC, FCFA, WAT, CNSS Benin, SYSCOHADA."
))

story.append(make_table(
    ["Module", "Nom", "Semaines", "Points critiques"],
    [
        ["M01", "Gestion du Stock", "S23-S25", "FEFO, CMUP, alertes peremption, stock min/secu, reception SoBAPS"],
        ["M02", "Point de Vente (POS)", "S25-S28", "Multi-caissier, offline, ordonnances, reçus PDF, scan code-barres"],
        ["M03", "Commandes Fournisseurs", "S28-S30", "Bons commande, reception, retours, API grossiste automatique"],
        ["M04", "Gestion Fournisseurs", "S30-S31", "Referentiel, conditions, score fiabilite"],
        ["M05", "Gestion Patients", "S31-S32", "Dossier, historique, fidelite, credit, alertes rappel lot"],
        ["M06", "Ordonnances", "S32-S33", "Numerisation, validation, stupefiants, interactions medicamenteuses"],
        ["M07", "Personnel (RH)", "S33-S34", "Planning, conges, pointage, paie CNSS 3.6%/15.4% + IRPP Benin"],
        ["M08", "Finance", "S33-S34", "Caisse journaliere, resultat, TVA, export SYSCOHADA revise"],
        ["M09", "Pharmacie de Garde", "S34", "Planning, diffusion, rapport, alertes patients, badge OUVERTE/FERMEE"],
    ],
    [0.7, 2, 1, 4.3]
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 10. PHASE 4
# ═══════════════════════════════════════
story.extend(phase_hdr(4, "SITE PUBLIC + MODULE SCAN", "Semaines 35-40 (6 semaines)"))

story.append(p(
    "Implementation du site public medihelm.com (medihelm-public/) avec 8 modules documentes et du module "
    "Scan GS1 DataMatrix. Le site public est le hub central de la plateforme : landing page, recherche "
    "medicaments, pharmacies de garde, commande pre-pharmacie, verification authenticite, et espace patient. "
    "Le module Scan supporte les formats EAN-13, DataMatrix GS1, QR Code et Code 128 avec le ParseGS1Service "
    "et le ScanResolverService documentes."
))

story.append(p('<b>10.1 Site Public - 8 Modules</b>', sH3))
for item in [
    "P01 Landing Page : Hero + SearchBar + carte pharmacies + FAQ + CTA pharmacien",
    "P02 Recherche Medicaments : Resultats geolocalises + carte Leaflet + filtres DCI/generique/disponibilite",
    "P03 Fiche Pharmacie : Horaires, services, garde, contact, avis, /pharmacies/:slug",
    "P04 Pharmacie de Garde : Temps reel, planning hebdomadaire, SOS urgence, badge OUVERTE/FERMEE",
    "P05 Commande Pre-pharmacie : Panier, file attente virtuelle, paiement Fedapay, commission 1.5%",
    "P06 Verification Medicament : Scan code-barres/QR, 3 statuts (Conforme/Alerte/Non reference)",
    "P07 Espace Patient : Profil, historique, fidelite, carnets vaccination, alertes rappel lot",
    "P08 Page /portails : 4 PortalCards (Pharmacien, Grossiste, Institutionnel, Admin)",
]:
    story.append(bullet(item, sBulletS))

story.append(p('<b>10.2 Module Scan - Architecture</b>', sH3))
story.append(p(
    "Le module Scan est documente dans 3 fichiers (CDC, Cursor, Specs) totalisant 39 pages. L'architecture "
    "repose sur le ParseGS1Service qui extrait les donnees des codes DataMatrix GS1 (AI 01=GTIN, AI 17=Expiration, "
    "AI 10=Lot, AI 21=Serie) et le ScanResolverService qui resout en 5 etapes : parseGS1, findMedicament, "
    "checkAlertes, checkPeremption, determineAction. Le hook useBarcodeInput gere les lecteurs USB, "
    "et le composant BarcodeScanner utilise la camera Android. L'objectif de performance est une reponse "
    "inferieure a 300ms p95 avec cache Redis pour les medicaments frequents. En mode offline, le "
    "ScanOfflineService interroge la base SQLite locale."
))

story.append(p('<b>10.3 Etapes</b>', sH3))
story.append(make_table(
    ["Semaine", "Action"],
    [
        ["S35", "Medihelm-public : Landing page P01 + SearchBar + carte Leaflet + FAQ"],
        ["S35-S36", "P02 Recherche + P03 Fiche Pharmacie + P04 Garde temps reel"],
        ["S36-S37", "P05 Commande pre-pharmacie + integration Fedapay reelle + P06 Verification"],
        ["S37-S38", "P07 Espace Patient + P08 Page /portails. Auth patient JWT optionnel."],
        ["S38-S39", "Module Scan : ParseGS1Service + ScanResolverService + POST /scan endpoint"],
        ["S39-S40", "Scan frontend : useBarcodeInput + BarcodeScanner + POS integration + offline scan"],
    ],
    [1, 6]
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 11. PHASE 5
# ═══════════════════════════════════════
story.extend(phase_hdr(5, "PORTAIL GROSSISTE G01-G10", "Semaines 41-46 (6 semaines)"))

story.append(p(
    "Implementation du portail grossiste (medihelm-grossiste/) avec les 10 modules documentes dans le "
    "CDC Grossiste Frontend v1.0 et le Cursor Prompt Grossiste v1.0. Un grossiste est un tenant isole "
    "(GrossisteTenant) avec ses propres roles : GROSSISTE_ADMIN, COMMANDES, PREPARATEUR, LIVREUR, "
    "COMMERCIAL, COMPTABLE. Les officines et grossistes ne se voient jamais directement en base. "
    "Le portail recoit les commandes des officines MediHelm Pro, gere les stocks d'entrepot, organise "
    "le picking FEFO, planifie les livraisons et publie les catalogues de prix."
))

story.append(make_table(
    ["Module", "Nom", "Fonctionnalites cles"],
    [
        ["G01", "Catalogue et Tarification", "Produits, statuts (DISPONIBLE/RUPTURE/EN_COMMANDE/SOUS_SURVEILLANCE), tarification multi-niveaux, UG"],
        ["G02", "Lots Entrepot", "CRUD lots, filtres statut/peremption, scan code-barres, PV destruction"],
        ["G03", "Commandes Entrantes", "Sources: MEDIHELM_PRO/SAISIE_MANUELLE/APP_COMMERCIAL, confirmation partielle, reliquats"],
        ["G04", "Picking et Preparation", "FEFO, scan confirmation, alerte quarantaine, mobile-first"],
        ["G05", "Livraisons", "Planning drag-and-drop, interface livreur mobile, signature electronique, offline IndexedDB"],
        ["G06", "Clients et Officines", "DataTable, encours/plafond credit, relation officine-grossiste"],
        ["G07", "Employes", "RH grossiste, roles specifiques, planning"],
        ["G08", "Catalogue Prix Public", "Passerelle vers officines MediHelm Pro, synchronisation WebSocket"],
        ["G09", "Finance et Facturation", "CA, creances, export SYSCOHADA"],
        ["G10", "Analytics et Reporting", "KPIs grossiste, performances commerciales"],
    ],
    [0.6, 1.8, 5.6]
))

story.append(p('<b>11.2 Etapes</b>', sH3))
story.append(make_table(
    ["Semaine", "Action"],
    [
        ["S41", "G01 Catalogue + G02 Lots Entrepot. Structure tenant isole GrossisteTenant."],
        ["S41-S42", "G03 Commandes Entrantes + WebSocket commande:nouvelle."],
        ["S42-S43", "G04 Picking (mobile-first, FEFO, scan) + G05 Livraisons (offline, signature)."],
        ["S43-S44", "G06 Clients Officines + G07 Employes + G08 Catalogue Prix Public."],
        ["S44-S45", "G09 Finance + G10 Analytics. Export SYSCOHADA grossiste."],
        ["S45-S46", "Integration API commande automatique UbiPharm/Promopharma. Webhook confirmation. Tests."],
    ],
    [1, 6]
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 12. PHASE 6
# ═══════════════════════════════════════
story.extend(phase_hdr(6, "MODULES INSTITUTIONNELS M16-M19", "Semaines 47-52 (6 semaines)"))

story.append(p(
    "Les modules M16 a M19 sont les differenciateurs absolus de MediHelm. Le flux d'alerte DPMED est "
    "l'operation la plus critique avec un SLA de moins de 2 minutes. La queue BullMQ dediee "
    "'alertes-dpmed' (priorite 1, 20 workers, 5 retries avec backoff exponentiel) est implementee avec "
    "une instance Redis separee (REDIS_ALERTES_URL). Le module Conformite calcule un score sur 100 "
    "avec 5 composantes documentees."
))

story.append(p('<b>12.1 Performance alertes DPMED</b>', sH3))
story.append(make_table(
    ["Etape", "Temps max", "Detail"],
    [
        ["Mise en queue BullMQ", "< 100 ms", "Priorite 1, delai 0"],
        ["Identification pharmacies", "< 10 s", "Lots en stock actif correspondants"],
        ["Identification patients", "< 10 s", "Achats 90 derniers jours"],
        ["Envoi push Firebase FCM", "< 30 s", "Batch 500 tokens max"],
        ["Envoi SMS AfricasTalking", "< 60 s", "Bulk SMS national"],
        ["Total garanti", "< 2 min", "De bout en bout, 600 pharmacies + 10 000 patients"],
    ],
    [2, 1, 4]
))

story.append(p('<b>12.2 Score Conformite (M19)</b>', sH3))
story.append(make_table(
    ["Composante", "Points", "Critere"],
    [
        ["Registre stupefiants", "25 pts", "Registre sans trou, complet et a jour"],
        ["Alertes DPMED traitees", "25 pts", "Acquittement dans les 24 heures"],
        ["Documents valides", "20 pts", "Licences et diplomes non expires"],
        ["Pharmacovigilance", "15 pts", "Signalements EI soumis dans les delais"],
        ["Destructions", "15 pts", "PV de destructions a jour"],
    ],
    [2, 1, 4]
))

story.append(p('<b>12.3 Etapes</b>', sH3))
story.append(make_table(
    ["Semaine", "Action"],
    [
        ["S47-S48", "M16 Pharmacovigilance : signalement EI, pseudonymisation, surveillance, fiches DCI."],
        ["S48-S49", "M18 Alertes DPMED : webhook, RSA-256, queue BullMQ, diffusion push FCM + SMS."],
        ["S49-S50", "Diffusion multi-canal : Firebase FCM batch, AfricasTalking bulk, WebSocket portail DPMED."],
        ["S50-S51", "M19 Conformite : score 100 pts, exports legaux, certification DPMED, badge conformite."],
        ["S51-S52", "Tests performance SLA < 2 min. Tests securite institutionnels (webhook sans cert, signature invalide, IP non whitelistee)."],
    ],
    [1, 6]
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 13. PHASE 7
# ═══════════════════════════════════════
story.extend(phase_hdr(7, "PORTAILS INSTITUTIONNEL ET ADMIN", "Semaines 53-56 (4 semaines)"))

story.append(p(
    "Implementation des portails institutionnel (medihelm-institutionnel/) et admin (medihelm-admin/) "
    "conformement aux CDC et Cursor Prompt Institutionnel v1.0. Le portail institutionnel dessert "
    "DPMED, SoBAPS et ABRP sur institutionnel.medihelm.com. Le portail admin dessert PLATFORM_ADMIN "
    "sur admin.medihelm.com. L'acces institutionnel est gratuit. Les donnees individuelles d'officine "
    "ne sont jamais transmises : uniquement des agregats anonymises."
))

story.append(p('<b>13.1 Portail Institutionnel</b>', sH3))
for item in [
    "DPMED : Dashboard conformite, alertes RW, signalements EI (lecture+export), registres stupefiants (lecture), surveillance medicaments RW, fiches DCI RW",
    "SoBAPS : Dashboard livraisons, confirmations reception, officines partenaires, produits MEG surveilles (lecture)",
    "ABRP : Dashboard reglementaire, documents, score conformite par officine, certifications MediHelm",
]:
    story.append(bullet(item, sBulletS))

story.append(p('<b>13.2 Portail Admin (admin.medihelm.com)</b>', sH3))
for item in [
    "Gestion officines : CRUD, plans (SEED/BLOOM/CROWN/NETWORK), suspension, reinitialisation MDP",
    "Gestion grossistes : CRUD GrossisteTenant, plans STARTER/BUSINESS/ENTERPRISE",
    "Comptes et utilisateurs : tous les utilisateurs plateforme",
    "Plans et facturation : suivi abonnements et paiements",
    "ORION Global : supervision cron jobs et taches planifiees",
    "Logs et audit : tableau chronologique, filtres, export CSV",
    "Alertes DPMED Admin : gestion et supervision des alertes",
    "Infrastructure : sante API, polling 30s, monitoring",
]:
    story.append(bullet(item, sBulletS))

story.append(p('<b>13.3 Etapes</b>', sH3))
story.append(make_table(
    ["Semaine", "Action"],
    [
        ["S53", "Portail institutionnel : routes DPMED/SOBAPS/ABRP, sidebar par role, helpers isDPMED/isSoBAPS/isABRP."],
        ["S53-S54", "DPMED Dashboard + Alertes (formulaire emission, signature, diffusion, acquittement)."],
        ["S54", "DPMED Pharmacovigilance + Registres + Surveillance + SoBAPS Livraisons + ABRP."],
        ["S54-S55", "Portail admin : CRUD officines, grossistes, utilisateurs, plans, ORION, audit, infrastructure."],
        ["S55-S56", "Integration mTLS pour connexions serveur-institution. IP Whitelist webhooks. Tests E2E."],
    ],
    [1, 6]
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 14. PHASE 8
# ═══════════════════════════════════════
story.extend(phase_hdr(8, "RESEAU NETWORK", "Semaines 57-60 (4 semaines)"))

story.append(p(
    "MediHelm Network est le portail pour les promoteurs multi-officines. Le JWT du promoteur contient "
    "{pharmacies: ['uuid1', 'uuid2', ...]} pour l'acces multi-tenant. Le plan HELM NETWORK est sur devis "
    "pour les reseaux de 2+ officines. Cette phase implemente le dashboard reseau, la gestion des officines, "
    "les transferts de stock inter-officines, et le personnel reseau consolide."
))

story.append(p('<b>14.1 Livrables</b>', sH3))
for item in [
    "Dashboard reseau : KPIs consolides sur toutes les officines du reseau",
    "Gestion officines : ajout/suppression, transferts de stock inter-officines",
    "Stock reseau : vue globale, alertes peremption, suggestions de transferts",
    "Personnel reseau : planning consolide, conges, paie multi-officines",
    "JWT promoteur : {pharmacies: ['uuid1', 'uuid2', ...], tenantType: 'PHARMACIE', role: 'PROMOTEUR'}",
]:
    story.append(bullet(item, sBulletS))

story.append(PageBreak())

# ═══════════════════════════════════════
# 15. PHASE 9
# ═══════════════════════════════════════
story.extend(phase_hdr(9, "ANALYTICS IA + ORION", "Semaines 61-63 (3 semaines)"))

story.append(p(
    "Le module Analytics IA genere des rapports quotidiens a 05h00 WAT via un cron BullMQ sur les 9 domaines : "
    "STOCK, VENTES, PATIENTELE, PERSONNEL, FINANCE, PEREMPTIONS, RESEAU, CONFORMITE, INTEGRATION_GROSSISTE. "
    "Chaque domaine a un score 0-100 (vert 75+, ambre 50-74, rouge < 50). L'algorithme de prediction de rupture "
    "calcule la conso moyenne journaliere sur 30 jours et estime les jours avant rupture. ORION est l'assistant "
    "AI qui genere des briefings et actions recommandees."
))

story.append(p('<b>15.1 Algorithme prediction rupture (STOCK)</b>', sH3))
story.append(p(
    "consoMoyJour = totalVentes30j / 30 ; joursAvantRupture = stockDisponible / consoMoyJour ; "
    "qteRecommandee = (consoMoyJour * delaiLivraisonFournisseur) + stockSecurite. "
    "L'endpoint POST /analytics/relancer permet de regenerer manuellement avec un cooldown de 30 minutes."
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 16. PHASE 10
# ═══════════════════════════════════════
story.extend(phase_hdr(10, "CERTIFICATION ET PRODUCTION", "Semaines 64-68 (5 semaines)"))

story.append(p(
    "Phase finale dediee aux tests de bout en bout, a la verification de conformite complete, et a la "
    "mise en production progressive suivant le sequencement documente : Beta gratuite (mois 1-3, 5 officines "
    "pilotes), Beta payante (mois 4-6, -30%), Plein tarif (mois 7+). La certification implique la verification "
    "de chaque regle absolue, chaque endpoint critique, et chaque flux metier documente."
))

story.append(p('<b>16.1 Checklist conformite</b>', sH3))
for item in [
    "Chaque requete Prisma filtre par pharmacieId (multitenancy strict)",
    "TenantMiddleware injecte SET app.current_tenant avant chaque requete",
    "RLS PostgreSQL actif sur toutes les tables metier",
    "Webhooks institutionnels valides par HMAC-SHA256",
    "Alertes DPMED validees par RSA-256 avant mise en queue",
    "mTLS pour connexions serveur-institutions",
    "Zero donnee individuelle officine vers portails institutionnels",
    "Mode offline fonctionnel : POS et Stock hors connexion",
    "Champ synchedAt fonctionnel, FEFO implemente, CMUP calcule",
    "Score conformite sur 100 pts avec 5 composantes",
    "SLA alertes DPMED < 2 minutes en condition reelle",
    "Brand Guidelines applique (teal #1D9E75, Georgia Serif)",
    "Docker, CI/CD, Sentry, monitoring en place",
]:
    story.append(bullet(item, sBulletS))

story.append(p('<b>16.2 Plan de lancement</b>', sH3))
story.append(make_table(
    ["Phase", "Periode", "Prix", "Objectif"],
    [
        ["Beta gratuite", "Mois 1-3", "Gratuit", "5 officines pilotes Cotonou/Parakou"],
        ["Beta payante", "Mois 4-6", "-30%", "20-30 officines, iteration feedback"],
        ["Plein tarif", "Mois 7+", "Plein tarif", "100+ officines, partenariats actifs"],
    ],
    [1.2, 1, 1.5, 3.3]
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 17. SCHEMA PRISMA
# ═══════════════════════════════════════
story.append(p('<b>17. SCHEMA PRISMA : CHANGEMENTS REQUIS</b>', sH1))
story.append(hr())

story.append(p('<b>17.1 Champs a ajouter</b>', sH3))
story.append(make_table(
    ["Modele", "Champ", "Type", "Contrainte", "Justification"],
    [
        ["Vente", "reference", "String", "@unique", "Idempotence sync offline"],
        ["Vente", "synchedAt", "DateTime?", "-", "Null = offline, date = sync"],
        ["Vente", "montantAssur", "Float", "@default(0)", "Montant assurance/tiers payant"],
        ["Vente", "commandePatId", "String?", "-", "Lien commande patient en ligne"],
        ["Pharmacie", "slug", "String", "@unique", "URL slug pages publiques"],
        ["Pharmacie", "modeGardeActif", "Boolean", "@default(false)", "Garde active"],
        ["Pharmacie", "planExpireAt", "DateTime?", "-", "Expiration plan tarifaire"],
        ["Utilisateur", "supabaseUid", "String", "@unique", "ID Supabase Auth"],
    ],
    [1.2, 1.2, 0.8, 0.8, 3]
))

story.append(p('<b>17.2 Enums a modifier</b>', sH3))
story.append(make_table(
    ["Enum", "Changement", "Detail"],
    [
        ["PlanType", "SEED + BLOOM + CROWN + NETWORK", "Remplacer GROW/LEAD par BLOOM/CROWN (Pricing v2.1)"],
        ["StatutVente", "Ajouter AVOIR + PARTIELLEMENT_PAYEE", "Retours et credit patient"],
        ["ModePaiement", "Ajouter ASSURANCE + CREDIT", "Tiers payant et credit patient"],
        ["StatutCommandePatient", "Passer en francais", "RECUE, EN_PREPARATION, PRETE, RECUPEREE, ANNULEE"],
        ["Nouveau : DomaineIA", "Creer l'enum 9 valeurs", "STOCK, VENTES, PATIENTELE, PERSONNEL, FINANCE, PEREMPTIONS, RESEAU, CONFORMITE, INTEGRATION_GROSSISTE"],
        ["Nouveau : TenantType", "Creer l'enum", "PHARMACIE, GROSSISTE, INSTITUTION, PLATFORM"],
        ["Nouveau : ContexteScan", "Creer l'enum", "VENTE, RECEPTION, INVENTAIRE, PATIENT"],
    ],
    [1.5, 2, 3.5]
))

story.append(p('<b>17.3 Modeles Scan a ajouter</b>', sH3))
story.append(make_table(
    ["Modele", "Champs cles"],
    [
        ["ScanLog", "rawCode, contexte (ContexteScan), pharmacieId, utilisateurId, resultat, medicamentId?, lotId?, tempsReponse"],
        ["ScanCache", "codeBarres, gtin, medicamentId, pharmacieId, donnees (Json), expireAt, TTL"],
    ],
    [1.5, 5.5]
))

story.append(p('<b>17.4 Modeles Grossiste a ajouter</b>', sH3))
story.append(make_table(
    ["Modele", "Champs cles"],
    [
        ["GrossisteTenant", "id, nom, slug, adresse, plan (STARTER/BUSINESS/ENTERPRISE), actif"],
        ["ProduitGrossiste", "grossisteId, dci, nomCommercial, gtin, codeBarres, statut (DISPONIBLE/RUPTURE/EN_COMMANDE/SOUS_SURVEILLANCE)"],
        ["LotGrossiste", "produitId, numeroLot, quantite, dateExpiration, emplacement, statut"],
        ["TarifGrossiste", "produitId, niveau (OFFICINE/RESEAU/SPECIAL), prixUnitaire, ugQuantite, ugGratuite"],
        ["CommandeGrossiste", "grossisteId, pharmacieId, lignes, statut, source (MEDIHELM_PRO/SAISIE_MANUELLE)"],
        ["BonPicking", "commandeId, prepareurId, lignes, statut, scanConfirme"],
        ["LivraisonGrossiste", "commandeId, livreurId, planning, statut, signatureElectronique"],
    ],
    [1.5, 5.5]
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 18. INCOHERENCES A RESOUDRE
# ═══════════════════════════════════════
story.append(p('<b>18. INCOHERENCES A RESOUDRE DANS LA DOCUMENTATION</b>', sH1))
story.append(hr())

story.append(p(
    "Avant d'implementer, les incoherences suivantes doivent etre tranchees par le fondateur (Dawes). "
    "Chaque decision impacte le schema Prisma, le module d'abonnement, et le frontend."
))

story.append(make_table(
    ["Incoherence", "Option A", "Option B", "Recommandation"],
    [
        ["Noms plans tarifaires", "SEED/GROW/LEAD\n(CONTEXT.md)", "SEED/BLOOM/CROWN\n(Pricing v2.1)", "Option B\n(Pricing v2.1 = plus recent)"],
        ["Prix plans", "19 900/34 900/54 900\n(CONTEXT.md)", "12 900/22 900/38 900\n(CDC v2.0)", "A decider\n(trancher avec Pricing v2.1)"],
        ["Roles pharmacie", "OWNER absent\n(CONTEXT.md)", "OWNER present\n(Schema Prisma v1.0)", "Ajouter OWNER\n(compte proprietaire)"],
        ["Apps monorepo", "2 apps\n(CONTEXT.md)", "5-6 apps\n(Monorepo Portails)", "6 apps\n(document le plus complet)"],
        ["Analytics domaines", "9\n(medihelm.md)", "7\n(CDC v2.0)", "9 domaines\n(source la plus complete)"],
        ["Enum PlanType code", "SEED\n(code actuel)", "STEM\n(CDC v2.0)", "SEED + BLOOM + CROWN\n(Pricing v2.1)"],
    ],
    [1.3, 1.5, 1.5, 1.7]
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 19. VARIABLES D'ENVIRONNEMENT
# ═══════════════════════════════════════
story.append(p('<b>19. VARIABLES D\'ENVIRONNEMENT COMPLETES</b>', sH1))
story.append(hr())

story.append(p(
    "La documentation reference 40+ variables d'environnement avec des noms officiels. Actuellement seules "
    "12 sont utilisees dans le code. Voici les variables manquantes organisees par categorie et par phase "
    "d'implementation."
))

story.append(p('<b>19.1 Variables critiques (Phases 0-1)</b>', sH3))
story.append(make_table(
    ["Variable", "Usage", "Phase"],
    [
        ["SUPABASE_URL", "Connexion Supabase Auth", "Phase 1"],
        ["SUPABASE_ANON_KEY", "Cle publique Supabase", "Phase 1"],
        ["SUPABASE_SERVICE_KEY", "Cle service Supabase", "Phase 1"],
        ["JWT_SECRET", "Secret JWT access (15 min)", "Phase 1"],
        ["JWT_REFRESH_SECRET", "Secret JWT refresh (7 jours)", "Phase 1"],
        ["REDIS_URL", "Redis Upstash (sessions, cache)", "Phase 1"],
        ["NEXT_PUBLIC_API_URL", "URL API NestJS pour frontends", "Phase 0"],
        ["CORS_ORIGINS", "Origines autorisees (5 frontends)", "Phase 0"],
    ],
    [2, 3, 1]
))

story.append(p('<b>19.2 Variables integrations (Phases 4-6)</b>', sH3))
story.append(make_table(
    ["Variable", "Usage", "Phase"],
    [
        ["FEDAPAY_API_KEY", "API Fedapay (paiements)", "Phase 4"],
        ["FEDAPAY_WEBHOOK_SECRET", "Webhook Fedapay", "Phase 4"],
        ["RESEND_API_KEY", "Emails via Resend", "Phase 4"],
        ["AFRICAS_TALKING_KEY", "SMS AfricasTalking", "Phase 6"],
        ["AFRICAS_TALKING_USERNAME", "Username AfricasTalking", "Phase 6"],
        ["FIREBASE_SERVER_KEY", "Push Firebase FCM", "Phase 6"],
        ["DPMED_WEBHOOK_SECRET", "Webhook DPMED", "Phase 6"],
        ["DPMED_PUBLIC_KEY", "Cle RSA DPMED", "Phase 6"],
        ["DPMED_API_URL", "URL API DPMED", "Phase 6"],
        ["DPMED_IP_WHITELIST", "IPs autorisees DPMED", "Phase 6"],
        ["SOBAPS_API_URL", "URL API SoBAPS", "Phase 7"],
        ["SOBAPS_WEBHOOK_SECRET", "Webhook SoBAPS", "Phase 7"],
        ["SOBAPS_IP_WHITELIST", "IPs autorisees SoBAPS", "Phase 7"],
        ["UBIPHARM_API_URL", "URL API UbiPharm", "Phase 5"],
        ["UBIPHARM_API_KEY", "Cle API UbiPharm", "Phase 5"],
        ["UBIPHARM_WEBHOOK_SECRET", "Webhook UbiPharm", "Phase 5"],
        ["UBIPHARM_IP_WHITELIST", "IPs autorisees UbiPharm", "Phase 5"],
        ["PROMOPHARMA_API_URL", "URL API Promopharma", "Phase 5"],
        ["PROMOPHARMA_API_KEY", "Cle API Promopharma", "Phase 5"],
        ["PROMOPHARMA_WEBHOOK_SECRET", "Webhook Promopharma", "Phase 5"],
        ["PROMOPHARMA_IP_WHITELIST", "IPs autorisees Promopharma", "Phase 5"],
        ["MTLS_CERT_PATH", "Certificat mTLS", "Phase 7"],
        ["MTLS_KEY_PATH", "Cle privee mTLS", "Phase 7"],
        ["MTLS_CA_PATH", "CA mTLS", "Phase 7"],
        ["REDIS_ALERTES_URL", "Redis alertes DPMED", "Phase 6"],
        ["SENTRY_DSN", "Monitoring Sentry", "Phase 10"],
        ["INSTITUTIONNEL_SUBDOMAIN", "Sous-domaine institutionnel", "Phase 7"],
    ],
    [2.2, 2.5, 1.3]
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 20. RISQUES ET MITIGATION
# ═══════════════════════════════════════
story.append(p('<b>20. RISQUES ET MITIGATION</b>', sH1))
story.append(hr())

story.append(make_table(
    ["Risque", "Prob.", "Impact", "Mitigation"],
    [
        ["Migration monorepo casse le frontend", "Moyen", "Eleve",
         "Migrer incrementalement avec feature flags. Ancien build operationnel pendant transition."],
        ["Supabase Auth incompatible NextAuth", "Moyen", "Eleve",
         "Adapter NextAuth-Supabase. Script migration utilisateurs existants."],
        ["Offline sync perdu des ventes", "Eleve", "Critique",
         "Tests exhaustifs scenarios conflit. Mecanisme rollback. Surveillance sync errors en prod."],
        ["SLA alertes DPMED non respecte", "Moyen", "Critique",
         "Load test 100+ pharmacies. Queue Redis dediee. Monitoring temps bout en bout."],
        ["APIs grossistes indisponibles", "Eleve", "Moyen",
         "Mode degrade catalogue local. Retry automatique. Cache catalogues Redis."],
        ["Incoherences docs non resolues", "Eleve", "Eleve",
         "Trancher avec Dawes avant chaque phase. Documentation unique comme reference."],
        ["Perimetre trop large (6 apps)", "Eleve", "Eleve",
         "Prioriser phases 0-2. Phases 4-7 repoussables. Equipe minimale 3 devs."],
        ["Brand teal non accepte par utilisateurs", "Faible", "Moyen",
         "Tester avec officines pilotes. Ajuster si necessaire."],
        ["Donnees perdues migration Prisma", "Faible", "Critique",
         "Backup complet avant migration. Test sur base de test. Rollback automatique."],
        ["DPMED refuse partenariat", "Moyen", "Eleve",
         "Modules M16-M19 fonctionnent en standalone. Partenariat active la valeur reelle."],
    ],
    [1.8, 0.7, 0.7, 3.8]
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 21. CALENDRIER CONSOLIDE
# ═══════════════════════════════════════
story.append(p('<b>21. CALENDRIER CONSOLIDE</b>', sH1))
story.append(hr())

story.append(make_table(
    ["Phase", "Semaines", "Duree", "Livrable principal"],
    [
        ["Phase 0", "S1-S8", "8 sem.", "Monorepo 6 apps + NestJS + schema Prisma corrige + /portails"],
        ["Phase 1", "S9-S14", "6 sem.", "Auth Supabase + RBAC 100% + Zod + rate limiting + TenantType"],
        ["Phase 2", "S15-S22", "8 sem.", "Mode offline SQLite + sync + PWA + FEFO + CMUP"],
        ["Phase 3", "S23-S34", "12 sem.", "Modules Pro M01-M09 complets dans NestJS"],
        ["Phase 4", "S35-S40", "6 sem.", "Site Public 8 modules + Module Scan GS1 DataMatrix"],
        ["Phase 5", "S41-S46", "6 sem.", "Portail Grossiste G01-G10 + API UbiPharm/Promopharma"],
        ["Phase 6", "S47-S52", "6 sem.", "Pharmacovigilance + Alertes DPMED < 2min + Conformite"],
        ["Phase 7", "S53-S56", "4 sem.", "Portails Institutionnel + Admin + mTLS"],
        ["Phase 8", "S57-S60", "4 sem.", "Reseau Network + JWT multi-tenant"],
        ["Phase 9", "S61-S63", "3 sem.", "Analytics IA 9 domaines + ORION + cron BullMQ"],
        ["Phase 10", "S64-S68", "5 sem.", "Certification + Docker + CI/CD + beta 5 officines"],
        ["TOTAL", "S1-S68", "68 sem.", "Plateforme 100% conforme aux 41 documents"],
    ],
    [1, 1, 1, 4]
))

story.append(Spacer(1, 16))
story.append(p(
    "Ce calendrier represente l'estimation la plus realiste pour atteindre une conformite complete avec "
    "l'integralite de la documentation MediHelm. Les phases 0 a 2 (22 semaines) constituent le socle "
    "non negociable : architecture monorepo, securite, et mode offline. Les phases 3 a 5 implementent "
    "les modules metier Pro, le site public, le module Scan et le portail grossiste. Les phases 6 a 8 "
    "traitent les modules institutionnels, les portails institutionnel/admin et le reseau Network. "
    "Les phases 9 et 10 completent avec Analytics IA et la certification finale. En cas de contrainte "
    "de temps ou de ressources, les phases peuvent etre partiellement parallelisees, mais les dependances "
    "doivent etre respectees pour garantir la coherence du systeme."
))

# ━━ Build ━━
doc.build(story)
print(f"Body PDF v2 generated: {output_path}")
