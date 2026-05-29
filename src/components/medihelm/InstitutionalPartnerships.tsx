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
    title: "DPMED",
    org: "Direction de la Pharmacie, du Médicament et des Examens de Diagnostic",
    accentColor: "#1D9E75",
    features: [
      {
        icon: Bell,
        text: "Portail d'émission d'alertes (rappel de lot, contrefaçon, AMM suspendue)",
      },
      {
        icon: BarChart3,
        text: "Tableau de bord temps réel (pharmacies notifiées, taux d'acquittement)",
      },
      {
        icon: FileCheck,
        text: "Réception rapports de pharmacovigilance",
      },
    ],
    guarantee: "< 2 minutes de diffusion à toutes les pharmacies concernées",
    price: "GRATUIT",
  },
  {
    title: "SoBAPS",
    org: "Société Béninoise des Approvisionnements Pharmaceutiques",
    accentColor: "#0F6E56",
    features: [
      {
        icon: CheckCircle2,
        text: "Confirmation de réception en temps réel",
      },
      {
        icon: ArrowLeftRight,
        text: "Réconciliation automatique (BL vs. reçu)",
      },
      {
        icon: PackageSearch,
        text: "Traçabilité des numéros de lot (UEMOA BPD)",
      },
      {
        icon: FileBarChart,
        text: "Rapports d'écarts",
      },
    ],
    price: "GRATUIT",
  },
  {
    title: "Grossistes",
    org: "UbiPharm / Promopharma",
    accentColor: "#EF9F27",
    features: [
      {
        icon: ShoppingBag,
        text: "Réception de commandes via API structurée",
      },
      {
        icon: Database,
        text: "Catalogue synchronisé quotidiennement",
      },
      {
        icon: BarChart3,
        text: "Données de demande agrégées (anonymisées)",
      },
      {
        icon: ArrowLeftRight,
        text: "Comparateur multi-grossistes",
      },
    ],
    price: "GRATUIT",
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
            Partenariats Institutionnels — Gratuit pour les Institutions
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            MédiHelm s&apos;intègre gratuitement avec les institutions clés du
            système pharmaceutique béninois
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
                      {p.title === "DPMED" ? (
                        <Shield size={22} style={{ color: p.accentColor }} />
                      ) : p.title === "SoBAPS" ? (
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

                  {p.guarantee && (
                    <div className="p-3 bg-teal-50 rounded-lg border border-teal-200 mb-4">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-teal-400" />
                        <span className="text-xs font-medium text-teal-800">
                          GARANTIE
                        </span>
                      </div>
                      <p className="text-sm text-teal-600 mt-1 font-medium">
                        {p.guarantee}
                      </p>
                    </div>
                  )}

                  <div className="text-center pt-2">
                    <Badge
                      className="text-sm font-medium px-4 py-1.5 border-0"
                      style={{
                        backgroundColor: p.accentColor + "15",
                        color: p.accentColor,
                      }}
                    >
                      Prix : {p.price}
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
