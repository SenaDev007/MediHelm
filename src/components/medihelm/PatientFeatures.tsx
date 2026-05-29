"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Search,
  MapPin,
  Clock,
  ShoppingCart,
  Truck,
  UserCircle,
  FileText,
  Bell,
  Gift,
  ArrowLeftRight,
  AlertTriangle,
  ShieldCheck,
  Syringe,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface PatientFeature {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: React.ElementType;
  isNew?: boolean;
}

const patientFeatures: PatientFeature[] = [
  {
    id: "fp01",
    code: "F-P01",
    title: "Recherche de médicaments",
    description: "Nom commercial, DCI, pathologie",
    icon: Search,
  },
  {
    id: "fp02",
    code: "F-P02",
    title: "Géolocalisation de pharmacies",
    description: "OpenStreetMap",
    icon: MapPin,
  },
  {
    id: "fp03",
    code: "F-P03",
    title: "Pharmacie de garde",
    description: "Temps réel",
    icon: Clock,
  },
  {
    id: "fp04",
    code: "F-P04",
    title: "Commande en ligne",
    description: "Fedapay",
    icon: ShoppingCart,
  },
  {
    id: "fp05",
    code: "F-P05",
    title: "Suivi de commande",
    description: "Temps réel",
    icon: Truck,
  },
  {
    id: "fp06",
    code: "F-P06",
    title: "Profil patient",
    description: "Carnet de santé simplifié",
    icon: UserCircle,
  },
  {
    id: "fp07",
    code: "F-P07",
    title: "Ordonnances",
    description: "Téléchargement, transmission",
    icon: FileText,
  },
  {
    id: "fp08",
    code: "F-P08",
    title: "Notifications",
    description: "Rappels, fin de traitement",
    icon: Bell,
  },
  {
    id: "fp09",
    code: "F-P09",
    title: "Programme de fidélité",
    description: "Points et récompenses",
    icon: Gift,
  },
  {
    id: "fp10",
    code: "F-P10",
    title: "Comparateur de prix & génériques",
    description: "Meilleurs prix, alternatives",
    icon: ArrowLeftRight,
  },
  {
    id: "fp11",
    code: "F-P11",
    title: "Alertes rappel de lot",
    description: "Notifications de sécurité",
    icon: AlertTriangle,
    isNew: true,
  },
  {
    id: "fp12",
    code: "F-P12",
    title: "Vérification authenticité",
    description: "Médicament authentique",
    icon: ShieldCheck,
    isNew: true,
  },
  {
    id: "fp13",
    code: "F-P13",
    title: "Carnet de vaccination numérique",
    description: "Suivi vaccinal complet",
    icon: Syringe,
    isNew: true,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function PatientFeatures() {
  return (
    <section className="py-16 sm:py-20 bg-teal-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-medium text-teal-800 mb-3">
            MédiHelm Patient — Le Compagnon Santé de Tous
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Un espace dédié aux patients pour accéder facilement aux services
            pharmaceutiques
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {patientFeatures.map((feature) => (
            <motion.div key={feature.id} variants={itemVariants}>
              <Card
                className={`h-full border transition-all duration-200 hover:shadow-md ${
                  feature.isNew
                    ? "border-amber-400 shadow-sm"
                    : "border-teal-200 hover:border-teal-400"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        feature.isNew ? "bg-amber-50" : "bg-teal-50"
                      }`}
                    >
                      <feature.icon
                        size={18}
                        className={
                          feature.isNew ? "text-amber-500" : "text-teal-400"
                        }
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            feature.isNew
                              ? "bg-amber-100 text-amber-600"
                              : "bg-teal-100 text-teal-600"
                          }`}
                        >
                          {feature.code}
                        </span>
                        {feature.isNew && (
                          <Badge className="bg-amber-400 text-gray-900 text-[9px] px-1.5 py-0 border-0">
                            NOUVEAU
                          </Badge>
                        )}
                      </div>
                      <h3
                        className={`text-sm font-medium ${
                          feature.isNew ? "text-amber-600" : "text-teal-600"
                        }`}
                      >
                        {feature.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Free note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-10 text-center"
        >
          <div className="inline-flex items-center gap-2 bg-teal-800 text-white px-6 py-3 rounded-xl shadow-lg">
            <span className="text-lg">✦</span>
            <span className="font-medium text-sm">
              L&apos;espace patient est 100% GRATUIT — stratégique et non
              négociable
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
