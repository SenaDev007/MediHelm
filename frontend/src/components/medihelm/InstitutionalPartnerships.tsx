"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Truck,
  Building,
  Bell,
  BarChart3,
  FileCheck,
  Clock,
  CheckCircle2,
  PackageSearch,
  FileBarChart,
  Link2,
  ShoppingBag,
  Database,
  ArrowLeftRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Partnership {
  title: string;
  org: string;
  accentColor: string;
  features: { icon: React.ElementType; text: string }[];
  guarantee?: string;
  price: string;
}

const partnerships: Partnership[] = [
  {
    title: "Institutions pharmaceutiques",
    org: "Alertes, pharmacovigilance et suivi",
    accentColor: "#1D9E75",
    features: [
      {
        icon: Bell,
        text: "Portail d'émission d'alertes (rappel de lot, contrefaçon, AMM suspendue)",
      },
      {
        icon: BarChart3,
        text: "Tableau de suivi des pharmacies notifiées et des acquittements",
      },
      {
        icon: FileCheck,
        text: "Réception de rapports de pharmacovigilance",
      },
    ],
    price: "Conditions sur demande",
  },
  {
    title: "Approvisionnement pharmaceutique",
    org: "Réceptions, lots et écarts",
    accentColor: "#0F6E56",
    features: [
      {
        icon: CheckCircle2,
        text: "Confirmation des réceptions",
      },
      {
        icon: ArrowLeftRight,
        text: "Rapprochement des bons de livraison et des réceptions",
      },
      {
        icon: PackageSearch,
        text: "Traçabilité des numéros de lot",
      },
      {
        icon: FileBarChart,
        text: "Rapports d'écarts",
      },
    ],
    price: "Conditions sur demande",
  },
  {
    title: "Grossistes et fournisseurs",
    org: "Commandes, catalogues et échanges de données",
    accentColor: "#EF9F27",
    features: [
      {
        icon: ShoppingBag,
        text: "Réception de commandes de pharmacies",
      },
      {
        icon: Database,
        text: "Gestion de catalogue",
      },
      {
        icon: BarChart3,
        text: "Échanges de données avec les pharmacies",
      },
      {
        icon: ArrowLeftRight,
        text: "Comparaison entre grossistes",
      },
    ],
    price: "Conditions sur demande",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function InstitutionalPartnerships() {
  return (
    <section id="partenariats" className="py-16 sm:py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-medium text-teal-800 mb-3">
            Échanges avec les acteurs du secteur
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Les modalités de collaboration et les services présentés ci-dessous
            restent à confirmer avec les organisations concernées
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {partnerships.map((p) => (
            <motion.div key={p.title} variants={itemVariants}>
              <Card
                className="h-full border-t-4"
                style={{ borderTopColor: p.accentColor }}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2.5 rounded-lg"
                      style={{ backgroundColor: p.accentColor + "15" }}
                    >
                      {p.title === "Institutions pharmaceutiques" ? (
                        <Shield size={22} style={{ color: p.accentColor }} />
                      ) : p.title === "Approvisionnement pharmaceutique" ? (
                        <Truck size={22} style={{ color: p.accentColor }} />
                      ) : (
                        <Building
                          size={22}
                          style={{ color: p.accentColor }}
                        />
                      )}
                    </div>
                    <div>
                      <CardTitle
                        className="text-lg font-medium"
                        style={{ color: p.accentColor }}
                      >
                        {p.title}
                      </CardTitle>
                      <p className="text-xs text-gray-400 mt-0.5">{p.org}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-3 mb-4">
                    {p.features.map((feature, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm text-gray-900"
                      >
                        <feature.icon
                          size={16}
                          className="shrink-0 mt-0.5"
                          style={{ color: p.accentColor }}
                        />
                        <span className="leading-relaxed">{feature.text}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="text-center pt-2">
                    <Badge
                      className="text-sm font-medium px-4 py-1.5 border-0"
                      style={{
                        backgroundColor: p.accentColor + "15",
                        color: p.accentColor,
                      }}
                    >
                      {p.price}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
