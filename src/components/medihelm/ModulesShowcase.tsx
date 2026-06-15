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
    title: "Gestion des Stocks",
    description: "Lots, expirations, alertes, CMUP",
    icon: Package,
  },
  {
    id: "m02",
    number: "M02",
    title: "Caisse (POS)",
    description: "Encaissement, ordonnances, reçus, multi-caissier",
    icon: Calculator,
  },
  {
    id: "m03",
    number: "M03",
    title: "Gestion des Commandes",
    description: "Commandes fournisseurs, réception, retours",
    icon: ShoppingCart,
  },
  {
    id: "m04",
    number: "M04",
    title: "Gestion Fournisseurs",
    description: "Référencement, conditions, évaluation",
    icon: Truck,
  },
  {
    id: "m05",
    number: "M05",
    title: "Gestion Patients",
    description: "Dossier, historique, fidélité, crédit",
    icon: Users,
  },
  {
    id: "m06",
    number: "M06",
    title: "Gestion Ordonnances",
    description: "Numérisation, validation, stupéfiants",
    icon: FileText,
  },
  {
    id: "m07",
    number: "M07",
    title: "Gestion RH",
    description: "Planning, congés, présences, paie",
    icon: UserCog,
  },
  {
    id: "m08",
    number: "M08",
    title: "Gestion Financière",
    description: "Comptabilité, trésorerie, rapports, SYSCOHADA",
    icon: Wallet,
  },
  {
    id: "m09",
    number: "M09",
    title: "Pharmacie de Garde",
    description: "Planning, diffusion, rapport de garde",
    icon: Clock,
  },
  {
    id: "m10",
    number: "M10",
    title: "Médicaments Remboursables",
    description: "CNSS, RAMU, tiers payant",
    icon: ShieldCheck,
  },
  {
    id: "m11",
    number: "M11",
    title: "Retours & Destructions",
    description: "Après-vente, périmés, PV, déclaration DPMED",
    icon: RotateCcw,
  },
  {
    id: "m12",
    number: "M12",
    title: "Communication Pharmacie-Patient",
    description: "Push, SMS, campagnes, rappels",
    icon: Megaphone,
  },
  {
    id: "m13",
    number: "M13",
    title: "Gestion Documentaire",
    description: "Licences, diplômes, contrats, coffre",
    icon: FolderOpen,
  },
  {
    id: "m14",
    number: "M14",
    title: "Tableau de Bord Opérationnel",
    description: "KPIs, alertes temps réel",
    icon: LayoutDashboard,
  },
  {
    id: "m15",
    number: "M15",
    title: "Analytics IA",
    description: "Prédictions, scores, rapports",
    icon: Brain,
  },
];

const newModules: Module[] = [
  {
    id: "m16",
    number: "M16",
    title: "Contrôle Qualité & Pharmacovigilance",
    description: "Veille qualité, alertes LNCQ, signalements EI",
    icon: Microscope,
    isNew: true,
  },
  {
    id: "m17",
    number: "M17",
    title: "Intégration Grossistes & SoBAPS",
    description: "API UbiPharm, Promopharma, SoBAPS",
    icon: Link2,
    isNew: true,
  },
  {
    id: "m18",
    number: "M18",
    title: "Alertes DPMED & Rappels de Lots",
    description: "Canal officiel national de diffusion",
    icon: Bell,
    isNew: true,
  },
  {
    id: "m19",
    number: "M19",
    title: "Conformité Réglementaire",
    description: "Certification DPMED, exports légaux",
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
            NOUVEAU v2.0
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
            19 Modules pour Couvrir Tout le Cycle Pharmaceutique
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            De la gestion quotidienne à la conformité réglementaire, chaque
            aspect de votre pharmacie est couvert
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
              Modules NOUVEAU v2.0
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
