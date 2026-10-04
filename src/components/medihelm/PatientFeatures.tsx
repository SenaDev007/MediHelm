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
    description: "Par nom, DCI, pathologie ou code ATC",
    icon: Search,
  },
  {
    id: "fp02",
    code: "F-P02",
    title: "Pharmacies à proximité",
    description: "Localisation des officines recensées",
    icon: MapPin,
  },
  {
    id: "fp03",
    code: "F-P03",
    title: "Pharmacie de garde",
    description: "Informations de garde disponibles",
    icon: Clock,
  },
  {
    id: "fp04",
    code: "F-P04",
    title: "Commande en ligne",
    description: "Commande auprès d'une pharmacie",
    icon: ShoppingCart,
  },
  {
    id: "fp05",
    code: "F-P05",
    title: "Suivi de commande",
    description: "Suivi de l'état de commande",
    icon: Truck,
  },
  {
    id: "fp06",
    code: "F-P06",
    title: "Profil patient",
    description: "Informations enregistrées par le patient",
    icon: UserCircle,
  },
  {
    id: "fp07",
    code: "F-P07",
    title: "Ordonnances",
    description: "Ajout et transmission d'ordonnances",
    icon: FileText,
  },
  {
    id: "fp08",
    code: "F-P08",
    title: "Notifications",
    description: "Rappels configurables",
    icon: Bell,
  },
  {
    id: "fp09",
    code: "F-P09",
    title: "Programme de fidélité",
    description: "Informations du programme",
    icon: Gift,
  },
  {
    id: "fp10",
    code: "F-P10",
    title: "Prix et génériques",
    description: "Informations comparatives",
    icon: ArrowLeftRight,
  },
  {
    id: "fp11",
    code: "F-P11",
    title: "Alertes de rappel de lot",
    description: "Informations de rappel",
    icon: AlertTriangle,
    isNew: true,
  },
  {
    id: "fp12",
    code: "F-P12",
    title: "Authenticité des médicaments",
    description: "Fonction de vérification",
    icon: ShieldCheck,
    isNew: true,
  },
  {
    id: "fp13",
    code: "F-P13",
    title: "Carnet de vaccination",
    description: "Suivi des vaccinations enregistrées",
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
            MediHelm Patient — Services pharmaceutiques en ligne
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Consultez les outils proposés dans l&apos;espace patient
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
              Espace patient : créez votre compte pour accéder aux services
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
