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
    time: "1",
    icon: Bell,
    title: "Réception de l'alerte",
    description: "Rappel de lot, contrefaçon ou AMM suspendue",
    color: "#E24B4A",
  },
  {
    time: "2",
    icon: Search,
    title: "Identification des pharmacies concernées",
    description: "Recherche des lots en stock",
    color: "#1D9E75",
  },
  {
    time: "3",
    icon: Users,
    title: "Évaluation des lots et des patients concernés",
    description: "Recherche des patients concernés sur la période définie",
    color: "#0F6E56",
  },
  {
    time: "4",
    icon: Smartphone,
    title: "Information des pharmacies",
    description: "Notification des pharmaciens concernés",
    color: "#378ADD",
  },
  {
    time: "5",
    icon: MessageSquare,
    title: "Information des patients",
    description: "Alerte aux patients concernés",
    color: "#EF9F27",
  },
  {
    time: "6",
    icon: BarChart3,
    title: "Suivi de l'alerte",
    description: "Suivi des acquittements des pharmacies",
    color: "#085041",
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
            Étapes de traitement d&apos;une alerte
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Le schéma présente un parcours envisagé : sources, délais, données
            mobilisées et responsabilités restent à confirmer
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
            Alertes non acquittées
          </h3>
          <div className="max-w-2xl mx-auto">
            <div className="p-4 bg-gray-50 rounded-xl border border-teal-200 text-center">
              <p className="text-sm text-gray-900">
                Une procédure d&apos;escalade est prévue pour les alertes non
                traitées : ses délais et responsables seront confirmés avec
                l&apos;institution concernée.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
