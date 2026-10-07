"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Building2,
  Heart,
  LayoutDashboard,
  LogIn,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/auth/user-avatar";
import { MapErrorBoundary } from "@/components/patient/map-error-boundary";
import type { PharmacyMapPoint } from "@/components/patient/pharmacy-map";

const PharmacyMap = dynamic(
  () => import("@/components/patient/pharmacy-map"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-teal-50/60 rounded-2xl">
        <div className="text-center">
          <MapPin className="h-10 w-10 text-primary mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-muted-foreground">
            Chargement de la carte nationale…
          </p>
        </div>
      </div>
    ),
  }
);

/** Informations clés du service patient — une seule section, l'essentiel. */
const keyPoints = [
  {
    icon: MapPin,
    title: "Toutes les pharmacies du Bénin",
    text: "Officines géolocalisées avec précision sur les 12 départements — explorez la carte, cliquez sur une officine pour sa fiche complète.",
  },
  {
    icon: ShieldCheck,
    title: "Pharmacies de garde en continu",
    text: "Les pharmacies de garde du jour sont mises en évidence, avec leurs horaires de vacation et leur numéro direct.",
  },
  {
    icon: Search,
    title: "Médicaments trouvés, prix comparés",
    text: "Recherchez un médicament, comparez les prix entre officines et vérifiez l'authenticité d'un produit scanné.",
  },
  {
    icon: Bell,
    title: "Rappels et alertes sanitaires",
    text: "Rappels de traitement, carnet de vaccination et alertes officielles de la DPMED directement dans votre espace.",
  },
];

/** Accès aux autres écosystèmes MediHelm — bandeau discret sous la section. */
const otherSpaces = [
  { icon: Building2, label: "MediHelm Pro", href: "/espace-pro", hint: "Pharmacies" },
  { icon: Truck, label: "MediHelm Grossistes", href: "/espace-grossiste", hint: "Distribution" },
  { icon: Package, label: "MediHelm Institutions", href: "/espace-institution", hint: "DPMED · SoBAPS · ABRP" },
];

export function PatientLanding() {
  const [pharmacies, setPharmacies] = useState<PharmacyMapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();

  // Patient connecté → plus aucun bouton « Se connecter / Créer un compte » :
  // un unique accès vers son dashboard, avec son identité affichée.
  const isPatientAuthenticated =
    status === "authenticated" && session?.user?.roleName === "PATIENT";
  const fullName =
    `${session?.user?.prenom ?? ""} ${session?.user?.nom ?? ""}`.trim();

  // ─── Toutes les officines du Bénin (registre ABMed + inscrites MediHelm) ──
  useEffect(() => {
    let cancelled = false;
    fetch("/api/patient/pharmacies-proches?radius=5000")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled) return;
        setPharmacies(
          (data as Array<Record<string, unknown>>).map((p) => ({
            ...p,
            distance: undefined,
          })) as PharmacyMapPoint[]
        );
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const geolocated = pharmacies.filter((p) => p.latitude && p.longitude);
  const departements = new Set(geolocated.map((p) => p.departement ?? "")).size;

  return (
    <section className="pt-20 lg:pt-24 pb-10 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-teal-50 via-[#F1EFE8]/60 to-white">
      <div className="max-w-7xl mx-auto">
        {/* ─── Section unique : carte à gauche · informations clés à droite ─── */}
        <div className="grid lg:grid-cols-[1.08fr_1fr] gap-6 lg:gap-10 items-stretch">
          {/* Carte du Bénin — présentée à gauche (desktop), sous les infos (mobile) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:order-1 order-2"
          >
            <div
              id="carte-nationale"
              className="relative h-[380px] sm:h-[480px] lg:h-[640px] rounded-2xl overflow-hidden shadow-lg shadow-teal-900/10 ring-1 ring-teal-200/70 scroll-mt-24"
            >
              {pharmacies.length > 0 ? (
                <MapErrorBoundary subject="La carte nationale">
                  <PharmacyMap
                    pharmacies={pharmacies}
                    height="100%"
                    className="rounded-2xl border-0"
                  />
                </MapErrorBoundary>
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-teal-50/60">
                  <div className="text-center">
                    <MapPin className="h-10 w-10 text-primary mx-auto mb-3 animate-pulse" />
                    <p className="text-sm text-muted-foreground">
                      {loading
                        ? "Chargement des pharmacies du Bénin…"
                        : "Carte momentanément indisponible."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Informations clés + accès au compte patient */}
          <div className="lg:order-2 order-1 flex flex-col justify-center">
            {/* Badge gratuit */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="inline-flex items-center gap-2 rounded-full bg-amber-400/15 border border-amber-400/40 px-4 py-1.5 mb-5 w-fit"
            >
              <BadgeCheck className="size-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-700">
                Compte patient 100% gratuit
              </span>
            </motion.div>

            {/* Titre */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-[2.6rem] font-bold leading-tight text-[#085041] mb-4"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Vos médicaments, vos pharmacies,
              <br className="hidden sm:block" /> votre{" "}
              <span className="text-teal-400">espace santé</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="text-base sm:text-lg text-gray-600 leading-relaxed mb-6"
            >
              MediHelm met la carte sanitaire du Bénin dans votre poche :
              toutes les officines du territoire, celles de garde ce jour, vos
              commandes et vos rappels de traitement — au même endroit.
            </motion.p>

            {/* Informations clés */}
            <div className="space-y-4 mb-7">
              {keyPoints.map((point, i) => (
                <motion.div
                  key={point.title}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, delay: 0.24 + i * 0.08 }}
                  className="flex items-start gap-3.5"
                >
                  <div className="mt-0.5 h-9 w-9 shrink-0 rounded-xl bg-[#E1F5EE] border border-[#9FE1CB]/60 flex items-center justify-center">
                    <point.icon className="size-4.5 text-[#0F6E56]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 leading-snug">
                      {point.title}
                    </p>
                    <p className="text-[13px] text-gray-500 leading-relaxed mt-0.5">
                      {point.text}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Accès au compte : patient connecté → son dashboard ; anonyme → créer / se connecter */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mb-5"
            >
              {isPatientAuthenticated ? (
                <div className="space-y-3">
                  <Link href="/patient" className="block">
                    <Button
                      size="lg"
                      className="w-full bg-[#0F6E56] hover:bg-teal-700 text-white font-medium text-base h-12 shadow-lg shadow-teal-900/20"
                    >
                      <LayoutDashboard className="mr-2 size-5" />
                      Accéder à mon dashboard
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </Link>
                  <div className="flex items-center justify-center gap-2.5 text-[13px] text-gray-500">
                    <UserAvatar
                      prenom={session?.user?.prenom}
                      nom={session?.user?.nom}
                      size="sm"
                    />
                    <span>
                      Connecté en tant que{" "}
                      <strong className="text-gray-900 font-semibold">
                        {fullName || "patient"}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="inline-flex items-center gap-1 text-red-700/80 hover:text-red-700 hover:underline font-medium ml-1"
                    >
                      <LogIn className="size-3.5 rotate-180" />
                      Se déconnecter
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/patient/inscription" className="flex-1">
                    <Button
                      size="lg"
                      className="w-full bg-[#0F6E56] hover:bg-teal-700 text-white font-medium text-base h-12 shadow-lg shadow-teal-900/20"
                    >
                      <Heart className="mr-2 size-5" />
                      Créer mon compte gratuit
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </Link>
                  <Link href="/patient/connexion" className="flex-1">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full border-[#0F6E56]/40 text-[#0F6E56] hover:bg-[#E1F5EE] font-medium text-base h-12"
                    >
                      <LogIn className="mr-2 size-5" />
                      Se connecter
                    </Button>
                  </Link>
                </div>
              )}
            </motion.div>

            {/* Chiffres clés — dynamiques depuis la base */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-gray-500"
            >
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-[#1D9E75]" />
                <strong className="text-gray-900 font-semibold">
                  {loading ? "…" : geolocated.length}
                </strong>{" "}
                officines géolocalisées
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-[#1D9E75]" />
                <strong className="text-gray-900 font-semibold">
                  {loading ? "…" : departements || 12}
                </strong>{" "}
                départements couverts
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="size-3.5 text-amber-500" />
                <strong className="text-gray-900 font-semibold">0 FCFA</strong>{" "}
                — compte patient gratuit
              </span>
            </motion.div>
          </div>
        </div>

        {/* Bandeau discret — autres écosystèmes MediHelm */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-10 pt-6 border-t border-teal-100 flex flex-col sm:flex-row items-center justify-center gap-x-8 gap-y-3"
        >
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Vous n&apos;êtes pas patient ?
          </span>
          {otherSpaces.map((space) => (
            <Link
              key={space.href}
              href={space.href}
              className="group inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#0F6E56] transition-colors"
            >
              <space.icon className="size-4 text-gray-400 group-hover:text-[#1D9E75] transition-colors" />
              <span className="font-medium">{space.label}</span>
              <span className="text-xs text-gray-400">({space.hint})</span>
            </Link>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
