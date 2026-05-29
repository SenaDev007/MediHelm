"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Building2,
  Heart,
  Network,
  BarChart3,
  Landmark,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const spaces = [
  {
    icon: Building2,
    title: "MédiHelm Pro",
    subtitle: "Pharmacien",
    accentColor: "#1D9E75",
    accentBorder: "border-t-teal-400",
    bgColor: "bg-teal-50/50",
    description:
      "Gestion complète de votre officine : stock, caisse, ordonnances, conformité DPMED",
    href: "/pro",
  },
  {
    icon: Heart,
    title: "MédiHelm Patient",
    subtitle: "Patient",
    accentColor: "#378ADD",
    accentBorder: "border-t-blue-brand",
    bgColor: "bg-blue-50/30",
    description:
      "Recherche de médicaments, géolocalisation, commandes, alertes de rappel de lot — 100% GRATUIT",
    href: "/patient",
  },
  {
    icon: Network,
    title: "MédiHelm Grossistes",
    subtitle: "Grossistes & Fournisseurs",
    accentColor: "#EF9F27",
    accentBorder: "border-t-amber-400",
    bgColor: "bg-amber-50/30",
    description:
      "Portail grossistes : commandes, catalogue, statistiques de vente",
    href: "/grossistes",
  },
  {
    icon: BarChart3,
    title: "MédiHelm Analytics",
    subtitle: "Tableaux de bord IA",
    accentColor: "#EF9F27",
    accentBorder: "border-t-amber-400",
    bgColor: "bg-amber-50/30",
    description:
      "Prédictions IA, KPIs en temps réel, scores de conformité réglementaire",
    href: "/pro/analytics",
  },
  {
    icon: Landmark,
    title: "MédiHelm Institutionnel",
    subtitle: "DPMED, SoBAPS, ABRP",
    accentColor: "#085041",
    accentBorder: "border-t-teal-800",
    bgColor: "bg-teal-50/50",
    description:
      "Portail d'alertes, pharmacovigilance, traçabilité des livraisons",
    href: "/institutions",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function ProductSpaces() {
  return (
    <section id="espaces" className="py-16 sm:py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-medium text-teal-800 mb-3">
            5 Espaces, Un Écosystème
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Une plateforme complète qui connecte tous les acteurs de la santé
            pharmaceutique au Bénin
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {spaces.map((space) => (
            <motion.div key={space.title} variants={itemVariants}>
              <Link href={space.href}>
                <Card
                  className={`h-full border-t-4 ${space.accentBorder} ${space.bgColor} hover:shadow-lg transition-shadow duration-300 cursor-pointer group`}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-1">
                      <div
                        className="p-2.5 rounded-lg"
                        style={{ backgroundColor: space.accentColor + "20" }}
                      >
                        <space.icon
                          size={22}
                          style={{ color: space.accentColor }}
                        />
                      </div>
                      <div>
                        <CardTitle
                          className="text-base font-medium group-hover:underline"
                          style={{ color: space.accentColor }}
                        >
                          {space.title}
                        </CardTitle>
                        <CardDescription className="text-xs text-gray-400">
                          {space.subtitle}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-900 leading-relaxed">
                      {space.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
