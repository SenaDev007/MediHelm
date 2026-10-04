"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Handshake,
  Landmark,
  LogIn,
  MapPinned,
  Megaphone,
  Microscope,
  PackageCheck,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/medihelm/Navbar";
import { Footer } from "@/components/medihelm/Footer";

const stats = [
  { value: "6", label: "Portails institutionnels" },
  { value: "398", label: "Officines observées" },
  { value: "12", label: "Départements couverts" },
];

const portails = [
  {
    icon: Megaphone,
    sigle: "DPMED",
    title: "Direction de la Pharmacie, du Médicament et des Explorations Diagnostiques",
    features: [
      "Diffusion d'alertes sanitaires nationales vers les officines",
      "Pharmacovigilance et suivi des acquittements en temps réel",
      "Fiches DCI et tableau de conformité des officines",
      "Cartographie nationale de couverture",
    ],
  },
  {
    icon: PackageCheck,
    sigle: "SoBAPS",
    title: "Société Béninoise d'Approvisionnement en Produits Pharmaceutiques et Sanitaires",
    features: [
      "Confirmation des réceptions des officines",
      "Suivi des livraisons et des écarts constatés",
      "Carte des officines approvisionnées",
      "Tableau de bord d'activité consolidé",
    ],
  },
  {
    icon: MapPinned,
    sigle: "ABRP",
    title: "Agence Béninoise de Régulation Pharmaceutique",
    features: [
      "Tableau de bord agrégé et anonymisé",
      "Carte d'approvisionnement par département",
      "Indicateurs de disponibilité des médicaments",
      "Exports pour vos analyses internes",
    ],
  },
  {
    icon: Stethoscope,
    sigle: "Ordre",
    title: "Ordre National des Pharmaciens du Bénin",
    features: [
      "Agrégats anonymisés sur l'exercice professionnel",
      "Vue consolidée du registre des officines",
      "Données pour l'appui à la réglementation",
      "Recommandation officielle aux membres",
    ],
  },
];

const partnership = [
  {
    icon: Handshake,
    title: "Un partenariat, pas une vente",
    text: "Les portails institutionnels MediHelm sont proposés entièrement gratuitement aux institutions partenaires. Nous construisons avec vous des outils utiles au secteur, financés par les espaces professionnels payants.",
  },
  {
    icon: ShieldCheck,
    title: "Données protégées",
    text: "Les tableaux de bord institutionnels reposent sur des agrégats anonymisés. Chaque institution n'accède qu'aux périmètres qui lui correspondent, avec des rôles dédiés et des échanges signés.",
  },
  {
    icon: Users,
    title: "Au service de la santé publique",
    text: "Alertes sanitaires diffusées en quelques minutes, conformité des officines observable et disponibilité des médicaments cartographiée : le partenariat renforce la chaîne pharmaceutique nationale.",
  },
];

export default function EspaceInstitutionPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar space="institution" />
      <main className="flex-1">
        {/* ─── Hero MediHelm Institution ─── */}
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
                <Landmark className="size-4 text-amber-400" />
                <span className="text-sm font-medium text-teal-100">
                  MediHelm Institution — les portails des institutions de santé
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white mb-6"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Une observation <span className="text-teal-200">fine</span> du
                circuit du <span className="text-amber-400">médicament</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className="text-base sm:text-lg md:text-xl text-teal-200 max-w-3xl mx-auto mb-6 leading-relaxed"
              >
                DPMED, SoBAPS, ABRP, Ordre des pharmaciens : MediHelm met à
                disposition des institutions partenaires des portails dédiés —
                alertes sanitaires, conformité, approvisionnement et agrégats
                anonymisés à l&apos;échelle nationale.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="inline-flex items-center gap-2 rounded-full bg-amber-400/15 border border-amber-400/40 px-5 py-2 mb-10"
              >
                <BadgeCheck className="size-5 text-amber-400" />
                <span className="text-sm font-semibold text-amber-200">
                  Accès gratuit pour les institutions partenaires
                </span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
              >
                <Link href="/connexion?callbackUrl=%2Finstitutions">
                  <Button
                    size="lg"
                    className="bg-white text-teal-800 hover:bg-teal-50 font-medium text-base px-8 h-12 shadow-lg"
                  >
                    Accéder à mon portail
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </Link>
                <a href="#contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 hover:text-white font-medium text-base px-8 h-12 bg-transparent"
                  >
                    <Microscope className="mr-2 size-5" />
                    Devenir institution partenaire
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

        {/* ─── Portails institutionnels ─── */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-10 sm:mb-14">
              <h2
                className="text-2xl sm:text-3xl font-bold text-[#085041] mb-3"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Les portails présentés pour chaque institution
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Chaque institution partenaire dispose de son portail dédié, avec
                des rôles d&apos;accès propres et des données calibrées pour sa
                mission.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {portails.map((p, index) => (
                <motion.div
                  key={p.sigle}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: (index % 2) * 0.1 }}
                  className="rounded-2xl border border-teal-100 bg-gray-50 p-6 shadow-sm"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="h-12 w-12 shrink-0 rounded-xl bg-[#085041] flex items-center justify-center">
                      <p.icon className="size-6 text-amber-300" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold tracking-wider text-teal-600 bg-teal-50 border border-teal-100 rounded px-1.5 py-0.5">
                        {p.sigle}
                      </span>
                      <h3 className="text-sm font-semibold text-[#085041] mt-1.5 leading-snug">
                        {p.title}
                      </h3>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full bg-[#E1F5EE] flex items-center justify-center">
                          <svg className="h-2.5 w-2.5 text-[#1D9E75]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <span className="leading-relaxed">{f}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Partenariat ─── */}
        <section className="py-16 sm:py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6">
              {partnership.map((item) => (
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

        {/* ─── Conditions d'accès ─── */}
        <section id="conditions" className="py-16 sm:py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2
              className="text-2xl sm:text-3xl font-bold text-[#085041] mb-3"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Formules et conditions d&apos;accès
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              MediHelm Institution est gratuit pour les institutions avec
              lesquelles nous établissons un partenariat. L&apos;accès est ouvert
              après convention et création des comptes de vos équipes.
            </p>
            <div className="rounded-2xl border border-teal-100 bg-gray-50 p-8 sm:p-10 shadow-sm">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#E1F5EE] border border-[#9FE1CB] px-4 py-1.5 mb-6">
                <Handshake className="size-4 text-[#1D9E75]" />
                <span className="text-sm font-semibold text-[#085041]">Gratuit — dans le cadre du partenariat</span>
              </div>
              <ul className="text-left max-w-xl mx-auto space-y-3 mb-8">
                {[
                  "Accès illimité au portail de votre institution",
                  "Comptes nominatifs pour les membres de vos équipes",
                  "Configuration et formation assurées par MediHelm",
                  "Support dédié et échanges signés sécurisés",
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
              <a href="mailto:contact@medihelm.com?subject=MediHelm%20Institution%20—%20Demande%20de%20partenariat">
                <Button
                  size="lg"
                  className="bg-[#085041] hover:bg-[#0a6a54] text-white font-medium text-base px-8 h-12"
                >
                  <Building2 className="mr-2 size-4" />
                  Discuter d&apos;un partenariat
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </a>
              <p className="text-xs text-muted-foreground mt-4">
                Nous revenons vers vous sous 48 h ouvrées pour cadrer votre
                portail.
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
              Renforçons ensemble la chaîne pharmaceutique
            </h2>
            <p className="text-teal-200 mb-8 max-w-2xl mx-auto">
              Vos équipes disposent déjà d&apos;un compte institutionnel ?
              Connectez-vous pour accéder à votre portail. Sinon, parlons de
              votre partenariat.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/connexion?callbackUrl=%2Finstitutions">
                <Button
                  size="lg"
                  className="bg-white text-teal-800 hover:bg-teal-50 font-medium text-base px-8 h-12 shadow-lg"
                >
                  Accéder à mon portail
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
              <a href="mailto:contact@medihelm.com?subject=MediHelm%20Institution%20—%20Devenir%20partenaire">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 hover:text-white font-medium text-base px-8 h-12 bg-transparent"
                >
                  <LogIn className="mr-2 size-5" />
                  Devenir partenaire
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
