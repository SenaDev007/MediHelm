"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

const stats = [
  { value: "600+", label: "Pharmacies ciblées" },
  { value: "19", label: "Modules" },
  { value: "< 2 min", label: "Alertes DPMED" },
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
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white mb-6"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Pilotez votre santé avec{" "}
            <span className="text-teal-200">confiance</span> et{" "}
            <span className="text-amber-400">précision</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-base sm:text-lg md:text-xl text-teal-200 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            Le premier écosystème santé du Bénin — gestion de pharmacie,
            recherche de médicaments, alertes DPMED, conformité réglementaire
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link href="/pro">
              <Button
                size="lg"
                className="bg-white text-teal-800 hover:bg-teal-50 font-medium text-base px-8 h-12 shadow-lg"
              >
                <Building2 className="mr-2 size-5" />
                Découvrir MédiHelm Pro
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
            <Link href="/patient">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 hover:text-white font-medium text-base px-8 h-12 bg-transparent"
              >
                <Heart className="mr-2 size-5" />
                Espace Patient
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
