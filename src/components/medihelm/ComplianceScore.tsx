"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  FileCheck,
  Bell,
  FolderOpen,
  FlaskConical,
  Trash2,
} from "lucide-react";

interface ScoreItem {
  label: string;
  icon: React.ElementType;
  color: string;
}

const scoreItems: ScoreItem[] = [
  {
    label: "Tenue du registre des stupéfiants",
    icon: FileCheck,
    color: "#1D9E75",
  },
  {
    label: "Traitement des alertes reçues",
    icon: Bell,
    color: "#0F6E56",
  },
  {
    label: "Validité des documents officiels",
    icon: FolderOpen,
    color: "#378ADD",
  },
  {
    label: "Suivi des signalements de pharmacovigilance",
    icon: FlaskConical,
    color: "#EF9F27",
  },
  {
    label: "Documentation des destructions",
    icon: Trash2,
    color: "#888780",
  },
];

export function ComplianceScore() {
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
            Indicateurs de suivi réglementaire
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Indicateurs suivis dans l&apos;espace pharmacie. Les critères et leur
            pondération sont propres à la plateforme et ne constituent pas une
            certification officielle.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          {/* Score Items */}
          <div className="space-y-4 mb-8">
            {scoreItems.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="bg-white rounded-xl border border-teal-200 p-4 flex items-center gap-4"
              >
                <div
                  className="p-2.5 rounded-lg shrink-0"
                  style={{ backgroundColor: item.color + "15" }}
                >
                  <item.icon size={20} style={{ color: item.color }} />
                </div>
                <div className="flex-1 min-w-0 flex items-center">
                  <span className="text-sm font-medium text-gray-900">
                    {item.label}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Score global */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-teal-800 rounded-2xl p-6 text-center text-white mb-6"
          >
            <div
              className="text-3xl font-medium mb-1"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Score global
            </div>
            <div className="text-teal-200 text-sm">
              Calculé à partir de ces indicateurs et affiché dans l&apos;espace
              pharmacie après connexion.
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
