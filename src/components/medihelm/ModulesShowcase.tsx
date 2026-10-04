"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Package,
  Calculator,
  ShoppingCart,
  Truck,
  Users,
  FileText,
  UserCog,
  Wallet,
  Clock,
  ShieldCheck,
  RotateCcw,
  Megaphone,
  FolderOpen,
  LayoutDashboard,
  Brain,
  Microscope,
  Link2,
  Bell,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Module {
  id: string;
  number: string;
  title: string;
  description: string;
  icon: React.ElementType;
  isNew?: boolean;
}

const coreModules: Module[] = [
  {
    id: "m01",
    number: "M01",
    title: "Gestion des stocks",
    description: "Lots, dates de péremption et niveaux de stock",
    icon: Package,
  },
  {
    id: "m02",
    number: "M02",
    title: "Caisse",
    description: "Encaissements et reçus",
    icon: Calculator,
  },
  {
    id: "m03",
    number: "M03",
    title: "Commandes",
    description: "Commandes fournisseurs et réception",
    icon: ShoppingCart,
  },
  {
    id: "m04",
    number: "M04",
    title: "Fournisseurs",
    description: "Fiches et informations fournisseurs",
    icon: Truck,
  },
  {
    id: "m05",
    number: "M05",
    title: "Patients",
    description: "Dossiers et historique",
    icon: Users,
  },
  {
    id: "m06",
    number: "M06",
    title: "Ordonnances",
    description: "Gestion des ordonnances",
    icon: FileText,
  },
  {
    id: "m07",
    number: "M07",
    title: "Ressources humaines",
    description: "Planning et suivi des présences",
    icon: UserCog,
  },
  {
    id: "m08",
    number: "M08",
    title: "Gestion financière",
    description: "Suivi comptable et financier",
    icon: Wallet,
  },
  {
    id: "m09",
    number: "M09",
    title: "Pharmacie de garde",
    description: "Planning et informations de garde",
    icon: Clock,
  },
  {
    id: "m10",
    number: "M10",
    title: "Médicaments remboursables",
    description: "Prise en charge et tiers payant",
    icon: ShieldCheck,
  },
  {
    id: "m11",
    number: "M11",
    title: "Retours et destructions",
    description: "Suivi des retours et produits périmés",
    icon: RotateCcw,
  },
  {
    id: "m12",
    number: "M12",
    title: "Communication pharmacie-patient",
    description: "Messages et rappels",
    icon: Megaphone,
  },
  {
    id: "m13",
    number: "M13",
    title: "Gestion documentaire",
    description: "Classement des documents",
    icon: FolderOpen,
  },
  {
    id: "m14",
    number: "M14",
    title: "Tableau de bord opérationnel",
    description: "Indicateurs d'activité",
    icon: LayoutDashboard,
  },
  {
    id: "m15",
    number: "M15",
    title: "Analyses",
    description: "Rapports et analyses",
    icon: Brain,
  },
];

const newModules: Module[] = [
  {
    id: "m16",
    number: "M16",
    title: "Contrôle qualité et pharmacovigilance",
    description: "Suivi qualité et signalements",
    icon: Microscope,
    isNew: true,
  },
  {
    id: "m17",
    number: "M17",
    title: "Échanges avec grossistes et fournisseurs",
    description: "Connexions et données de catalogue",
    icon: Link2,
    isNew: true,
  },
  {
    id: "m18",
    number: "M18",
    title: "Alertes et rappels de lots",
    description: "Gestion des alertes",
    icon: Bell,
    isNew: true,
  },
  {
    id: "m19",
    number: "M19",
    title: "Conformité réglementaire",
    description: "Documents et exports",
    icon: Scale,
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

function ModuleCard({ module }: { module: Module }) {
  return (
    <motion.div variants={itemVariants}>
      <div
        className={`relative h-full p-4 rounded-xl border bg-white transition-all duration-200 hover:shadow-md ${
          module.isNew
            ? "border-amber-400 shadow-sm ring-1 ring-amber-400/20"
            : "border-teal-200 hover:border-teal-400"
        }`}
      >
        {module.isNew && (
          <Badge className="absolute -top-2.5 right-3 bg-amber-400 text-gray-900 text-[10px] font-medium px-2 py-0.5 border-0 shadow-sm">
            Complémentaires
          </Badge>
        )}
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              module.isNew ? "bg-amber-50" : "bg-teal-50"
            }`}
          >
            <module.icon
              size={18}
              className={module.isNew ? "text-amber-500" : "text-teal-400"}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  module.isNew
                    ? "bg-amber-100 text-amber-600"
                    : "bg-teal-100 text-teal-600"
                }`}
              >
                {module.number}
              </span>
              <h3
                className={`text-sm font-medium leading-tight ${
                  module.isNew ? "text-amber-600" : "text-teal-600"
                }`}
              >
                {module.title}
              </h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              {module.description}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ModulesShowcase() {
  return (
    <section id="fonctionnalites" className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-medium text-teal-800 mb-3">
            Modules présentés pour la gestion d&apos;une pharmacie
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Parcourez les domaines couverts par les modules MediHelm
          </p>
        </motion.div>

        {/* Core Modules */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px bg-teal-200 flex-1" />
            <span className="text-sm font-medium text-teal-600 px-3">
              Modules Core v1.0
            </span>
            <div className="h-px bg-teal-200 flex-1" />
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {coreModules.map((mod) => (
              <ModuleCard key={mod.id} module={mod} />
            ))}
          </motion.div>
        </div>

        {/* New v2.0 Modules */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px bg-amber-400 flex-1" />
            <span className="text-sm font-medium text-amber-500 px-3">
              Autres modules présentés
            </span>
            <div className="h-px bg-amber-400 flex-1" />
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {newModules.map((mod) => (
              <ModuleCard key={mod.id} module={mod} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
