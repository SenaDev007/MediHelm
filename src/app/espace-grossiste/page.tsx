"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Boxes,
  Building2,
  ClipboardList,
  CreditCard,
  Landmark,
  Link2,
  ListChecks,
  LogIn,
  PackageSearch,
  Percent,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/medihelm/Navbar";
import { Footer } from "@/components/medihelm/Footer";

const stats = [
  { value: "8+", label: "Modules de distribution" },
  { value: "398", label: "Officines clientes potentielles" },
  { value: "24h", label: "Synchronisation des commandes" },
];

const modules = [
  {
    icon: PackageSearch,
    code: "G01",
    title: "Catalogue & Tarification",
    text: "Gestion complète des produits, prix multi-niveaux et tarifs spécifiques par officine cliente. Dates de validité pour vos promotions et catalogues publiés en un clic.",
  },
  {
    icon: ClipboardList,
    code: "G03",
    title: "Commandes entrantes",
    text: "Réception des commandes d'officines en temps réel, workflow de validation, suivi des statuts et litiges — de la réception à la facturation.",
  },
  {
    icon: ListChecks,
    code: "G04",
    title: "Picking & préparation",
    text: "Bons de picking détaillés, suivi de préparation article par article et contrôle des quantités avant expédition pour réduire les erreurs de livraison.",
  },
  {
    icon: Truck,
    code: "G05",
    title: "Livraisons",
    text: "Interface livreur mobile, bordereaux de livraison, confirmations de réception et suivi des tournées — chaque livraison est tracée de bout en bout.",
  },
  {
    icon: Building2,
    code: "G06",
    title: "Clients officines",
    text: "Fiches clients enrichies, encours, conditions commerciales et historique d'achats pour chacune de vos officines partenaires.",
  },
  {
    icon: Percent,
    code: "G08",
    title: "Catalogue prix public",
    text: "Publication de vos catalogues et grilles tarifaires directement vers les espaces MediHelm Pro de vos clientes et clients.",
  },
  {
    icon: CreditCard,
    code: "G09",
    title: "Finance & facturation",
    text: "Facturation, suivi des règlements, exports comptables SYSCOHADA et tableaux de bord financiers consolidés.",
  },
  {
    icon: Link2,
    code: "API",
    title: "Intégrations & webhooks",
    text: "Connexion sécurisée aux flux UbiPharm et Promopharma : commandes automatiques, mises à jour de statuts et échanges signés HMAC.",
  },
];

const reassurance = [
  {
    icon: Boxes,
    title: "Traçabilité totale",
    text: "Chaque commande, préparation et livraison est journalisée. Les numéros de lots suivent le flux complet, de votre entrepôt jusqu'à l'officine.",
  },
  {
    icon: Landmark,
    title: "Connecté au secteur",
    text: "MediHelm Grossiste s'articule avec MediHelm Pro : vos catalogues arrivent directement dans les outils de gestion des officines du réseau.",
  },
  {
    icon: Percent,
    title: "Conditions partenaires",
    text: "Formules payantes adaptées à votre volume de distribution, avec accompagnement au démarrage et support dédié de nos équipes.",
  },
];

export default function EspaceGrossistePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar space="grossiste" />
      <main className="flex-1">
        {/* ─── Hero MediHelm Grossiste ─── */}
        <section className="relative overflow-hidden bg-teal-800 pt-16">
          {/* Fond ECG */}
          <div className="absolute inset-0 overflow-hidden opacity-10">
            <svg
              className="absolute bottom-20 left-0 w-full h-32"
              viewBox="0 0 1200 120"
              preserveAspectRatio="none"
            >
              <path
                d="M0 80 L100 80 L120 80 L140 40 L160 100 L180 20 L200 90 L220 60 L240 80 L400 80 L420 80 L440 40 L460 100 L480 20 L500 90 L520 60 L540 80 L700 80 L720 80 L740 40 L760 100 L780 20 L800 90 L820 60 L840 80 L1000 80 L1020 80 L1040 40 L1060 100 L1080 20 L1100 90 L1120 60 L1140 80 L1200 80"
                stroke="white"
                strokeWidth="2"
                fill="none"
                className="ecg-line-loop"
              />
            </svg>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-teal-800 via-teal-800/95 to-teal-800" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
            <div className="text-center max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full border border-teal-400/40 bg-teal-900/40 px-4 py-1.5 mb-6"
              >
                <Boxes className="size-4 text-amber-400" />
                <span className="text-sm font-medium text-teal-100">
                  MediHelm Grossiste — l&apos;espace des grossistes-répartiteurs
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white mb-6"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Distribuez plus vite, <span className="text-teal-200">livrez</span>{" "}
                sans <span className="text-amber-400">accroc</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className="text-base sm:text-lg md:text-xl text-teal-200 max-w-3xl mx-auto mb-10 leading-relaxed"
              >
                Catalogues, commandes d&apos;officines, picking, livraisons et
                facturation : MediHelm Grossiste structure toute votre chaîne
                de distribution pharmaceutique, connectée au réseau MediHelm
                du Bénin.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
              >
                <Link href="/connexion?callbackUrl=%2Fgrossistes">
                  <Button
                    size="lg"
                    className="bg-white text-teal-800 hover:bg-teal-50 font-medium text-base px-8 h-12 shadow-lg"
                  >
                    Accéder à mon espace
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </Link>
                <a href="mailto:contact@medihelm.com?subject=MediHelm%20Grossiste%20—%20Devenir%20partenaire">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 hover:text-white font-medium text-base px-8 h-12 bg-transparent"
                  >
                    <LogIn className="mr-2 size-5" />
                    Devenir partenaire grossiste
                  </Button>
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.45 }}
                className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto"
              >
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                    className="text-center"
                  >
                    <p className="text-2xl sm:text-4xl font-bold text-amber-400" style={{ fontFamily: "Georgia, serif" }}>
                      {stat.value}
                    </p>
                    <p className="text-[11px] sm:text-sm text-teal-200 mt-1 leading-snug">{stat.label}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ─── Modules de distribution ─── */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-10 sm:mb-14">
              <h2
                className="text-2xl sm:text-3xl font-bold text-[#085041] mb-3"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Les modules présentés pour la distribution pharmaceutique
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                De la publication de vos catalogues à la facturation, chaque
                étape de votre activité de grossiste-répartiteur dispose de son
                outil dédié.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {modules.map((mod, index) => (
                <motion.div
                  key={mod.code}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: (index % 4) * 0.08 }}
                  className="rounded-2xl border border-teal-100 bg-gray-50 p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl bg-[#E1F5EE] flex items-center justify-center">
                      <mod.icon className="size-5 text-[#1D9E75]" />
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-teal-600 bg-teal-50 border border-teal-100 rounded px-1.5 py-0.5">
                      {mod.code}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#085041] mb-2">{mod.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{mod.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Réassurance ─── */}
        <section className="py-16 sm:py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6">
              {reassurance.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm"
                >
                  <div className="h-11 w-11 rounded-xl bg-[#E1F5EE] flex items-center justify-center mb-4">
                    <item.icon className="size-6 text-[#1D9E75]" />
                  </div>
                  <h3 className="text-base font-semibold text-[#085041] mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Formules et conditions tarifaires ─── */}
        <section id="tarifs" className="py-16 sm:py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2
              className="text-2xl sm:text-3xl font-bold text-[#085041] mb-3"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Formules et conditions tarifaires
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              MediHelm Grossiste est un service payant. Vos formules sont
              construites avec nos équipes selon votre volume de distribution,
              le nombre d&apos;utilisateurs et les intégrations dont vous avez
              besoin.
            </p>
            <div className="rounded-2xl border border-teal-100 bg-gray-50 p-8 sm:p-10 shadow-sm">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-1.5 mb-6">
                <CreditCard className="size-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">Formules payantes sur devis</span>
              </div>
              <ul className="text-left max-w-xl mx-auto space-y-3 mb-8">
                {[
                  "Abonnement mensuel adapté au volume de commandes traitées",
                  "Intégrations webhooks UbiPharm et Promopharma incluses",
                  "Formation des équipes picking et livraison à la souscription",
                  "Support dédié et accompagnement commercial continu",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                    <span className="mt-1 h-4 w-4 shrink-0 rounded-full bg-[#E1F5EE] flex items-center justify-center">
                      <svg className="h-3 w-3 text-[#1D9E75]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
              <a href="mailto:contact@medihelm.com?subject=MediHelm%20Grossiste%20—%20Demande%20de%20formule">
                <Button
                  size="lg"
                  className="bg-[#1D9E75] hover:bg-[#167a5c] text-white font-medium text-base px-8 h-12"
                >
                  Demander ma formule
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </a>
              <p className="text-xs text-muted-foreground mt-4">
                Nos équipes vous répondent sous 48 h ouvrées avec une proposition
                détaillée.
              </p>
            </div>
          </div>
        </section>

        {/* ─── CTA final ─── */}
        <section className="py-16 sm:py-20 bg-teal-800">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2
              className="text-2xl sm:text-3xl font-bold text-white mb-4"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Prêt à structurer votre distribution ?
            </h2>
            <p className="text-teal-200 mb-8 max-w-2xl mx-auto">
              Rejoignez les grossistes-répartiteurs qui pilotent leurs commandes,
              leurs préparations et leurs livraisons avec MediHelm Grossiste —
              connecté aux officines du réseau MediHelm Pro.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="mailto:contact@medihelm.com?subject=MediHelm%20Grossiste%20—%20Devenir%20partenaire">
                <Button
                  size="lg"
                  className="bg-white text-teal-800 hover:bg-teal-50 font-medium text-base px-8 h-12 shadow-lg"
                >
                  Devenir partenaire
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </a>
              <Link href="/connexion?callbackUrl=%2Fgrossistes">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 hover:text-white font-medium text-base px-8 h-12 bg-transparent"
                >
                  <LogIn className="mr-2 size-5" />
                  J&apos;ai déjà un compte
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
