"use client";

import React from "react";
import Link from "next/link";
import { Mail, MapPin, ExternalLink } from "lucide-react";
import { Logo } from "./Logo";

const spaceLinks = [
  { label: "MediHelm Pro", href: "/espace-pro", desc: "Espace pharmacie" },
  { label: "MediHelm Patient", href: "/patient", desc: "Espace patient" },
  { label: "MediHelm Grossistes", href: "/grossistes", desc: "Espace grossistes et fournisseurs" },
  { label: "MediHelm Institutions", href: "/institutions", desc: "Espace institutionnel" },
];

const legalLabels = [
  "Mentions légales",
  "Politique de confidentialité",
  "Informations relatives à la protection des données",
];

export function Footer() {
  return (
    <footer id="contact" className="bg-teal-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <Logo variant="full" className="mb-4 [&_span]:!text-white [&_div_span:last-child]:!text-teal-200" />
            <p className="text-sm text-teal-200 leading-relaxed">
              Outils numériques pour les acteurs de la santé au Bénin :
              pharmaciens, patients, grossistes et institutions.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-medium text-white mb-4">Nos espaces</h3>
            <ul className="space-y-2.5">
              {spaceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-teal-200 hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    {link.label}
                    <ExternalLink size={12} />
                  </Link>
                  <p className="text-xs text-teal-200/60 ml-0">{link.desc}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-medium text-white mb-4">Légal</h3>
            <ul className="space-y-2.5">
              {legalLabels.map((label) => (
                <li key={label}>
                  <span className="text-sm text-teal-200/80">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-medium text-white mb-4">Contact</h3>
            <div className="space-y-3">
              <a
                href="mailto:contact@medihelm.com"
                className="flex items-center gap-2.5 text-sm text-teal-200 hover:text-white transition-colors"
              >
                <Mail size={16} />
                contact@medihelm.com
              </a>
              <div className="flex items-center gap-2.5 text-sm text-teal-200">
                <MapPin size={16} className="shrink-0" />
                Cotonou, Bénin
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-teal-600">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-teal-200">
            <p>
              YEHI OR Tech — Cotonou, Bénin © {new Date().getFullYear()}
            </p>
            <p>Tous droits réservés</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
