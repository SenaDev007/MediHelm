"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Search,
  Users,
  Smartphone,
  MessageSquare,
  BarChart3,
  AlertTriangle,
  Clock,
  Phone,
} from "lucide-react";

interface AlertStep {
  time: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

const alertSteps: AlertStep[] = [
  {
    time: "T+0",
    icon: Bell,
    title: "DPMED émet l'alerte",
    description: "Rappel de lot, contrefaçon, AMM suspendue",
    color: "#E24B4A",
  },
  {
    time: "T+30s",
    icon: Search,
    title: "Identification pharmacies",
    description: "Lots en stock détectés automatiquement",
    color: "#1D9E75",
  },
  {
    time: "T+30s",
    icon: Users,
    title: "Identification patients",
    description: "Patients ayant reçu le lot (90 jours)",
    color: "#0F6E56",
  },
  {
    time: "T+1min",
    icon: Smartphone,
    title: "Push + SMS pharmaciens",
    description: "Notification immédiate aux pharmaciens concernés",
    color: "#378ADD",
  },
  {
    time: "T+1m30s",
    icon: MessageSquare,
    title: "Push + SMS patients",
    description: "Alerte directe aux patients impactés",
    color: "#EF9F27",
  },
  {
    time: "T+2min",
    icon: BarChart3,
    title: "Dashboard mis à jour",
    description: "Taux d'acquittement en temps réel",
    color: "#085041",
  },
];

const escalationSteps = [
  {
    time: "4h",
    action: "Rappel automatique",
    icon: AlertTriangle,
    color: "#EF9F27",
  },
  {
    time: "24h",
    action: "Escalade hiérarchique",
    icon: Clock,
    color: "#E24B4A",
  },
  {
    time: "72h",
    action: "Contact direct DPMED",
    icon: Phone,
    color: "#E24B4A",
  },
];

export function AlertProcess() {
  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-medium text-teal-800 mb-3">
            Alertes DPMED — De l&apos;Émission à la Notification en{" "}
            <span className="text-amber-500">&lt; 2 Minutes</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Un processus automatisé qui garantit une diffusion rapide et
            traçable de chaque alerte officielle
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-0.5 bg-teal-200" />

            <div className="space-y-6">
              {alertSteps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="relative flex items-start gap-4 sm:gap-6"
                >
                  {/* Circle marker */}
                  <div
                    className="relative z-10 flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-white shadow-md shrink-0"
                    style={{ backgroundColor: step.color + "15" }}
                  >
                    <step.icon
                      size={20}
                      style={{ color: step.color }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1 sm:pt-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded text-white"
                        style={{ backgroundColor: step.color }}
                      >
                        {step.time}
                      </span>
                      <h3 className="text-sm sm:text-base font-medium text-teal-800">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-400">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Escalation non-acquittées */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-base font-medium text-teal-800 text-center mb-5">
            Alertes non-acquittées — Procédure d&apos;escalade
          </h3>
          <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">
            {escalationSteps.map((step, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 rounded-xl border border-teal-200 text-center"
              >
                <div className="flex items-center justify-center mb-2">
                  <step.icon size={20} style={{ color: step.color }} />
                </div>
                <div
                  className="text-xl font-medium mb-1"
                  style={{ color: step.color }}
                >
                  {step.time}
                </div>
                <div className="text-xs text-gray-900">{step.action}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
