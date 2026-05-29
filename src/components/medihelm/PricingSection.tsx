"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const principles = [
  { title: "Transparence totale", desc: "Tous les prix sont publics" },
  { title: "Tous les modules dans tous les plans", desc: "Aucune fonctionnalité bloquée" },
  { title: "La conformité n'est pas un luxe", desc: "DPMED inclus dès SEED" },
  { title: "Valeur justifiable", desc: "Chaque centime défendable" },
  { title: "Prévisibilité", desc: "Pas de facturation surprise" },
];

interface Plan {
  name: string;
  target: string;
  monthly: number | null;
  annualMonthly: number | null;
  discount: string;
  modules: string;
  users: string;
  cashiers: string;
  patients: string;
  storage: string;
  apiGrossiste: string;
  conformite: string;
  analytics: string;
  support: string;
  onboarding: string;
  popular?: boolean;
}

const plans: Plan[] = [
  {
    name: "HELM SEED",
    target: "< 150 tx/mo",
    monthly: 19900,
    annualMonthly: 16900,
    discount: "-15%",
    modules: "19/19",
    users: "Jusqu'à 3",
    cashiers: "1",
    patients: "500",
    storage: "2 Go",
    apiGrossiste: "1 grossiste",
    conformite: "Base",
    analytics: "Hebdomadaire",
    support: "Email 72h",
    onboarding: "Tutoriels vidéo",
  },
  {
    name: "HELM GROW",
    target: "150–500 tx/mo",
    monthly: 34900,
    annualMonthly: 29500,
    discount: "-15%",
    modules: "19/19",
    users: "Jusqu'à 8",
    cashiers: "3",
    patients: "5 000",
    storage: "10 Go",
    apiGrossiste: "2 grossistes",
    conformite: "Complète",
    analytics: "Quotidien",
    support: "Email 24h + chat",
    onboarding: "Guidé en ligne",
    popular: true,
  },
  {
    name: "HELM LEAD",
    target: "500–1 200 tx/mo",
    monthly: 54900,
    annualMonthly: 46500,
    discount: "-15%",
    modules: "19/19",
    users: "Illimités",
    cashiers: "Illimités",
    patients: "Illimités",
    storage: "50 Go",
    apiGrossiste: "Illimités",
    conformite: "Certifiée + auto exports",
    analytics: "Quotidien + prédictions",
    support: "Prioritaire + téléphone",
    onboarding: "Assisté en personne",
  },
  {
    name: "HELM NETWORK",
    target: "Réseau 2+ pharmacies",
    monthly: null,
    annualMonthly: null,
    discount: "Personnalisé",
    modules: "19/19 + multi-site",
    users: "Illimités/site",
    cashiers: "Illimités/site",
    patients: "Illimités",
    storage: "100 Go+",
    apiGrossiste: "Illimités réseau",
    conformite: "Certifiée réseau",
    analytics: "Quotidien + réseau",
    support: "Dédié + SLA",
    onboarding: "Personnalisé",
  },
];

const addons = [
  { name: "SMS Standard (500/mo)", price: "4 900 FCFA/mo" },
  { name: "SMS Pro (2 000/mo)", price: "8 900 FCFA/mo" },
  { name: "SMS Illimité", price: "14 900 FCFA/mo" },
  { name: "Bilingue FR/EN", price: "3 000 FCFA/mo" },
  { name: "Domaine personnalisé", price: "2 500 FCFA/mo" },
  { name: "Accès API tiers", price: "9 900 FCFA/mo" },
];

const networkPricing = [
  { range: "2-3 pharmacies", discount: "-25%" },
  { range: "4-7 pharmacies", discount: "-35%" },
  { range: "8-15 pharmacies", discount: "-45%" },
  { range: "16+", discount: "Négocié (-45% à -55%)" },
];

const launchSequence = [
  { phase: "Closed Beta", period: "Mo 1-3", price: "Gratuit" },
  { phase: "Paid Beta", period: "Mo 4-6", price: "-30%" },
  { phase: "Plein Tarif", period: "Mo 7+", price: "Prix complet" },
];

const paymentMethods = [
  "Wave",
  "MTN Mobile Money",
  "Moov Money",
  "Visa/Mastercard",
  "Virement bancaire",
];

function formatPrice(price: number): string {
  return price.toLocaleString("fr-FR") + " FCFA";
}

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="tarifs" className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-medium text-teal-800 mb-3">
            Tarifs Transparents — Tous les Modules dans Tous les Plans
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Pas de surprise, pas de fonctionnalité cachée. La conformité DPMED
            est incluse dès le premier plan.
          </p>
        </motion.div>

        {/* 5 Principles */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10"
        >
          {principles.map((p, i) => (
            <div
              key={i}
              className="text-center p-3 bg-teal-50 rounded-lg border border-teal-200"
            >
              <div className="text-xs font-medium text-teal-800 mb-0.5">
                {p.title}
              </div>
              <div className="text-[11px] text-gray-400">{p.desc}</div>
            </div>
          ))}
        </motion.div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span
            className={`text-sm font-medium ${
              !isAnnual ? "text-teal-800" : "text-gray-400"
            }`}
          >
            Mensuel
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              isAnnual ? "bg-teal-400" : "bg-gray-300"
            }`}
            aria-label="Basculer entre mensuel et annuel"
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                isAnnual ? "translate-x-6" : "translate-x-0.5"
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium ${
              isAnnual ? "text-teal-800" : "text-gray-400"
            }`}
          >
            Annuel{" "}
            <span className="text-amber-500 text-xs font-medium">-15%</span>
          </span>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-12">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card
                className={`h-full relative ${
                  plan.popular
                    ? "border-2 border-teal-400 shadow-lg ring-1 ring-teal-400/20"
                    : "border border-teal-200"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-teal-400 text-white px-3 py-1 border-0 shadow-sm gap-1">
                      <Star size={12} />
                      Le plus populaire
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2 pt-6">
                  <div className="text-center">
                    <CardTitle className="text-lg font-medium text-teal-800">
                      {plan.name}
                    </CardTitle>
                    <p className="text-xs text-gray-400 mt-1">{plan.target}</p>
                  </div>
                  <div className="text-center mt-3">
                    {plan.monthly !== null ? (
                      <>
                        <div className="text-2xl sm:text-3xl font-medium text-teal-800">
                          {formatPrice(
                            isAnnual ? plan.annualMonthly! : plan.monthly
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">/mois</div>
                        {isAnnual && (
                          <div className="text-xs text-amber-500 font-medium mt-1">
                            {plan.discount} —{" "}
                            {formatPrice(plan.annualMonthly! * 12)}/an
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-2xl font-medium text-teal-800">
                        Sur devis
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-2 pb-6">
                  <div className="space-y-2.5 mb-5">
                    {[
                      { label: "Modules", value: plan.modules },
                      { label: "Utilisateurs", value: plan.users },
                      { label: "Caissiers simultanés", value: plan.cashiers },
                      { label: "Patients enregistrés", value: plan.patients },
                      { label: "Stockage", value: plan.storage },
                      { label: "API Grossiste", value: plan.apiGrossiste },
                      { label: "Conformité DPMED", value: plan.conformite },
                      { label: "Analytics IA", value: plan.analytics },
                      { label: "Support", value: plan.support },
                      { label: "Onboarding", value: plan.onboarding },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check
                          size={14}
                          className="text-teal-400 mt-0.5 shrink-0"
                        />
                        <span className="text-gray-900 text-xs">
                          <span className="font-medium">{item.label}:</span>{" "}
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button
                    className={`w-full font-medium text-sm ${
                      plan.popular
                        ? "bg-teal-400 hover:bg-teal-600 text-white"
                        : "bg-teal-800 hover:bg-teal-600 text-white"
                    }`}
                  >
                    Essai gratuit 30 jours
                    <ArrowRight size={14} className="ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Add-ons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <h3 className="text-lg font-medium text-teal-800 text-center mb-5">
            Options complémentaires
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {addons.map((addon) => (
              <div
                key={addon.name}
                className="p-3 bg-gray-50 rounded-lg border border-teal-200 text-center"
              >
                <div className="text-xs font-medium text-teal-600 mb-1">
                  {addon.name}
                </div>
                <div className="text-sm font-medium text-teal-800">
                  {addon.price}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Network Pricing */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <h3 className="text-lg font-medium text-teal-800 text-center mb-5">
            Tarification réseau
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {networkPricing.map((item) => (
              <div
                key={item.range}
                className="p-3 bg-teal-50 rounded-lg border border-teal-200 text-center"
              >
                <div className="text-xs text-gray-400 mb-1">{item.range}</div>
                <div className="text-lg font-medium text-teal-800">
                  {item.discount}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Launch Sequence */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <h3 className="text-lg font-medium text-teal-800 text-center mb-5">
            Séquençage de lancement
          </h3>
          <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">
            {launchSequence.map((phase) => (
              <div
                key={phase.phase}
                className="p-4 bg-white rounded-lg border border-teal-200 text-center"
              >
                <div className="text-sm font-medium text-teal-800">
                  {phase.phase}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {phase.period}
                </div>
                <div className="text-base font-medium text-amber-500 mt-1">
                  {phase.price}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Payment Methods */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h3 className="text-lg font-medium text-teal-800 mb-4">
            Moyens de paiement
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {paymentMethods.map((method) => (
              <Badge
                key={method}
                variant="outline"
                className="text-xs border-teal-200 text-teal-600 px-3 py-1"
              >
                {method}
              </Badge>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
