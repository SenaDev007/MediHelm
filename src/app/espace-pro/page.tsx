"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Building2, LogIn, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/medihelm/Navbar";
import { ModulesShowcase } from "@/components/medihelm/ModulesShowcase";
import { PricingSection } from "@/components/medihelm/PricingSection";
import { Footer } from "@/components/medihelm/Footer";

const stats = [
  { value: "19", label: "Modules de gestion d'officine" },
  { value: "398", label: "Officines référencées ABMed" },
  { value: "12", label: "Départements couverts" },
];

const reassurance = [
  {
    icon: ShieldCheck,
    title: "Conformité réglementaire",
    text: "Traçabilité des lots, alertes DPMED, score de conformité et registres conformes aux exigences du secteur pharmaceutique béninois.",
  },
  {
    icon: TrendingUp,
    title: "Pilotage temps réel",
    text: "Caisse, ventes, stocks et indicateurs clés consolidés en direct — même hors connexion, avec synchronisation automatique.",
  },
  {
    icon: Building2,
    title: "Pensé pour l'officine",
    text: "De la première officine SEED au réseau NETWORK : commandes grossistes, gestion du personnel, comptabilité SYSCOHADA et tier payant.",
  },
];

export default function EspaceProPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">
        {/* ─── Hero MediHelm Pro ─── */}
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
                <Building2 className="size-4 text-amber-400" />
                <span className="text-sm font-medium text-teal-100">
                  MediHelm Pro — l&apos;espace des officines du Bénin
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white mb-6"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Pilotez votre <span className="text-teal-200">officine</span>{" "}
                en toute <span className="text-amber-400">confiance</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className="text-base sm:text-lg md:text-xl text-teal-200 max-w-3xl mx-auto mb-10 leading-relaxed"
              >
                Ventes, stocks, ordonnances, conformité et communication patient :
                les modules présentés pour la gestion complète d&apos;une pharmacie,
                réunis dans un seul espace sécurisé.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
              >
                <Link href="/inscription">
                  <Button
                    size="lg"
                    className="bg-white text-teal-800 hover:bg-teal-50 font-medium text-base px-8 h-12 shadow-lg"
                  >
                    Inscrire mon officine
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </Link>
                <Link href="/pro">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 hover:text-white font-medium text-base px-8 h-12 bg-transparent"
                  >
                    <LogIn className="mr-2 size-5" />
                    Se connecter à mon espace
                  </Button>
                </Link>
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

        {/* ─── Modules de gestion d'une pharmacie ─── */}
        <ModulesShowcase />

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
        <PricingSection />

        {/* ─── CTA final ─── */}
        <section className="py-16 sm:py-20 bg-teal-800">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2
              className="text-2xl sm:text-3xl font-bold text-white mb-4"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Prêt à digitaliser votre officine ?
            </h2>
            <p className="text-teal-200 mb-8 max-w-2xl mx-auto">
              Rejoignez les officines béninoises qui gèrent leurs ventes, leurs stocks
              et leur conformité avec MediHelm Pro. Votre officine est déjà au registre
              ABMed ? L&apos;inscription ne prend que quelques minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/inscription">
                <Button
                  size="lg"
                  className="bg-white text-teal-800 hover:bg-teal-50 font-medium text-base px-8 h-12 shadow-lg"
                >
                  Inscrire mon officine
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
              <Link href="/connexion">
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
