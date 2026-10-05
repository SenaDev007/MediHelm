"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const principles = [
  { title: "Quatre formules", desc: "Du démarrage au réseau d'officines" },
  { title: "Fonctionnalités par formule", desc: "Modules selon le plan choisi" },
  { title: "Facturation au choix", desc: "Mensuelle ou annuelle" },
  { title: "Prix en FCFA", desc: "Indiqués pour chaque formule" },
  { title: "Formule réseau", desc: "HELM NETWORK pour le multi-officines" },
];

interface Plan {
  name: string;
  target: string;
  monthly: number | null;
  annualMonthly: number | null;
  features: string[];
  popular?: boolean;
}

const plans: Plan[] = [
  {
    name: "HELM SEED",
    target: "Pour démarrer",
    monthly: 19900,
    annualMonthly: 17900,
    features: [
      "Gestion du stock",
      "Point de vente",
      "Gestion des patients",
      "Ordonnances",
      "Support par e-mail",
      "Jusqu'à 3 utilisateurs",
      "Jusqu'à 500 produits",
    ],
  },
  {
    name: "HELM BLOOM",
    target: "Pour la croissance",
    monthly: 34900,
    annualMonthly: 31400,
    features: [
      "Tout le plan Seed",
      "Gestion RH (congés, présences)",
      "Commandes fournisseurs",
      "Crédits patients",
      "Alertes DPMED",
      "Rapports financiers",
      "Support prioritaire",
      "Jusqu'à 10 utilisateurs",
      "Jusqu'à 2 000 produits",
    ],
    popular: true,
  },
  {
    name: "HELM CROWN",
    target: "Pour les officines à forte activité",
    monthly: 54900,
    annualMonthly: 49400,
    features: [
      "Tout le plan Bloom",
      "Pharmacovigilance avancée",
      "Conformité réglementaire",
      "Communications SMS",
      "Garde et planning",
      "Analyses d'activité",
      "Coffre numérique",
      "Support dédié",
      "Jusqu'à 25 utilisateurs",
      "Jusqu'à 10 000 produits",
    ],
  },
  {
    name: "HELM NETWORK",
    target: "Réseaux de pharmacies",
    monthly: null,
    annualMonthly: null,
    features: [
      "Tout le plan Crown",
      "Multi-pharmacies",
      "Tableau de bord promoteur",
      "Consolidation financière",
      "Transferts entre pharmacies",
      "Intégrations grossistes",
      "Accompagnement dédié",
      "Utilisateurs illimités",
      "Produits illimités",
    ],
  },
];

const addons = [
  { name: "SMS Standard", price: "Sur demande" },
  { name: "SMS Pro", price: "Sur demande" },
  { name: "SMS Illimité", price: "Sur demande" },
  { name: "Interface bilingue FR/EN", price: "Sur demande" },
  { name: "Domaine personnalisé", price: "Sur demande" },
  { name: "Accès API tiers", price: "Sur demande" },
];

const networkPricing = [
  { range: "2-3 pharmacies", discount: "Sur devis" },
  { range: "4-7 pharmacies", discount: "Sur devis" },
  { range: "8-15 pharmacies", discount: "Sur devis" },
  { range: "16 et plus", discount: "Sur devis" },
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
            Formules et conditions tarifaires
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Consultez les tarifs, options et conditions de chaque formule.
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
            Annuel
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
                      Formule conseillée
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
                          <div className="text-xs text-gray-500 font-medium mt-1">
                            {formatPrice(plan.annualMonthly! * 12)} facturés par an
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
                    {plan.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check
                          size={14}
                          className="text-teal-400 mt-0.5 shrink-0"
                        />
                        <span className="text-gray-900 text-xs">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <a href="mailto:contact@medihelm.com?subject=Demande%20de%20tarifs%20MediHelm">
                    <Button
                      className={`w-full font-medium text-sm ${
                        plan.popular
                          ? "bg-teal-400 hover:bg-teal-600 text-white"
                          : "bg-teal-800 hover:bg-teal-600 text-white"
                      }`}
                    >
                      Demander les tarifs
                      <ArrowRight size={14} className="ml-1" />
                    </Button>
                  </a>
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
            Calendrier de lancement
          </h3>
          <div className="max-w-2xl mx-auto">
            <div className="p-4 bg-white rounded-lg border border-teal-200 text-center">
              <div className="text-sm font-medium text-teal-800">
                Phases de lancement
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Les phases, leur calendrier et leurs conditions seront
                communiqués lors de la mise en service.
              </div>
            </div>
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
          <p className="text-sm text-gray-400">
            Les moyens de paiement acceptés sont communiqués lors de la
            souscription.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
