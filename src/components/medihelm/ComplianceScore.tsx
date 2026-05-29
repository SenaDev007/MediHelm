"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  FileCheck,
  Bell,
  FolderOpen,
  FlaskConical,
  Trash2,
  AlertTriangle,
} from "lucide-react";

interface ScoreItem {
  label: string;
  points: number;
  icon: React.ElementType;
  color: string;
}

const scoreItems: ScoreItem[] = [
  {
    label: "Registre stupéfiants à jour",
    points: 25,
    icon: FileCheck,
    color: "#1D9E75",
  },
  {
    label: "Alertes DPMED traitées < 24h",
    points: 25,
    icon: Bell,
    color: "#0F6E56",
  },
  {
    label: "Documents officiels valides",
    points: 20,
    icon: FolderOpen,
    color: "#378ADD",
  },
  {
    label: "Soumissions pharmacovigilance à temps",
    points: 15,
    icon: FlaskConical,
    color: "#EF9F27",
  },
  {
    label: "Destructions documentées",
    points: 15,
    icon: Trash2,
    color: "#888780",
  },
];

export function ComplianceScore() {
  const totalPoints = scoreItems.reduce((sum, item) => sum + item.points, 0);

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
            Score de Conformité DPMED — {totalPoints} Points
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Un score objectif et mesurable pour garantir votre conformité
            réglementaire
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {item.label}
                    </span>
                    <span
                      className="text-lg font-medium shrink-0 ml-2"
                      style={{ color: item.color }}
                    >
                      {item.points} pts
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(item.points / totalPoints) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                      className="h-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Total Score */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-teal-800 rounded-2xl p-6 text-center text-white mb-6"
          >
            <div
              className="text-5xl font-medium mb-1"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {totalPoints}
            </div>
            <div className="text-teal-200 text-sm">Points de conformité</div>
          </motion.div>

          {/* Alert threshold */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl"
          >
            <AlertTriangle size={18} className="text-red-brand shrink-0 mt-0.5" />
            <div>
              <span className="text-sm font-medium text-red-brand">
                Score &lt; 70
              </span>
              <span className="text-sm text-gray-900">
                {" "}
                = Alerte immédiate au directeur avec actions correctives
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
