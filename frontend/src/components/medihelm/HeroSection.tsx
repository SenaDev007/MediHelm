"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Heart, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

const stats = [
  { value: "398", label: "Officines au registre ABMed" },
  { value: "12", label: "Départements couverts" },
  { value: "0", label: "FCFA — compte patient gratuit" },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-teal-800 pt-16">
      {/* Background ECG Animation */}
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
        <svg
          className="absolute top-32 left-0 w-full h-24"
          viewBox="0 0 1200 80"
          preserveAspectRatio="none"
        >
          <path
            d="M0 50 L200 50 L220 50 L240 30 L260 70 L280 10 L300 60 L320 40 L340 50 L600 50 L620 50 L640 30 L660 70 L680 10 L700 60 L720 40 L740 50 L1200 50"
            stroke="white"
            strokeWidth="1.5"
            fill="none"
            className="ecg-line-loop"
            style={{ animationDelay: "2s" }}
          />
        </svg>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-teal-800 via-teal-800/95 to-teal-800" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
        <div className="text-center max-w-4xl mx-auto">
          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white mb-4"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Vos médicaments, vos pharmacies,
            votre <span className="text-teal-200">espace santé</span>
          </motion.h1>

          {/* Badge gratuit */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 rounded-full bg-amber-400/15 border border-amber-400/40 px-4 py-1.5 mb-6"
          >
            <BadgeCheck className="size-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-200">
              Compte patient 100% gratuit
            </span>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-base sm:text-lg md:text-xl text-teal-200 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            Recherchez vos médicaments, trouvez les pharmacies autour de vous,
            suivez la pharmacie de garde et commandez en ligne. Créez votre
            compte patient gratuitement et accédez à votre espace personnel.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link href="/patient/inscription">
              <Button
                size="lg"
                className="bg-white text-teal-800 hover:bg-teal-50 font-medium text-base px-8 h-12 shadow-lg"
              >
                <Heart className="mr-2 size-5" />
                Créer mon compte gratuit
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
            <Link href="/patient/connexion">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 hover:text-white font-medium text-base px-8 h-12 bg-transparent"
              >
                <LogIn className="mr-2 size-5" />
                Se connecter
              </Button>
            </Link>
          </motion.div>

          {/* Animated Stats */}
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
                className="text-center p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
              >
                <div
                  className="text-2xl sm:text-3xl md:text-4xl font-medium text-white mb-1"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-teal-200 font-medium">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="relative">
        <svg
          viewBox="0 0 1200 80"
          preserveAspectRatio="none"
          className="w-full h-12 sm:h-16"
        >
          <path
            d="M0 0 L1200 0 L1200 40 C800 80 400 80 0 40 Z"
            fill="#F1EFE8"
          />
        </svg>
      </div>
    </section>
  );
}
