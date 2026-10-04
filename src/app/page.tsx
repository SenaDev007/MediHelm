"use client";

import { Navbar } from "@/components/medihelm/Navbar";
import { HeroSection } from "@/components/medihelm/HeroSection";
import { PatientFeatures } from "@/components/medihelm/PatientFeatures";
import { AlertProcess } from "@/components/medihelm/AlertProcess";
import { Footer } from "@/components/medihelm/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        {/* Quick Access Portals */}
        <section id="espaces" className="py-12 px-4 bg-white">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-[#085041] mb-2">Choisissez votre espace</h2>
            <p className="text-muted-foreground mb-8">Accédez à l&apos;espace correspondant à votre profil.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {/* Espace patient — mise en avant */}
              <div className="flex flex-col rounded-xl border-2 border-[#378ADD]/40 bg-blue-50/60 p-5 text-left group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-[#378ADD] flex items-center justify-center">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  </div>
                  <div>
                    <p className="font-semibold text-[#378ADD]">MediHelm Patient</p>
                    <p className="text-xs text-muted-foreground">Espace patient — gratuit</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  Créez votre compte gratuitement ou connectez-vous pour accéder
                  à votre espace personnel.
                </p>
                <div className="mt-auto flex flex-col gap-2">
                  <a
                    href="/patient/inscription"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#378ADD] hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Créer un compte
                  </a>
                  <a
                    href="/patient/connexion"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#378ADD]/40 hover:bg-blue-50 text-[#378ADD] rounded-lg transition-colors text-sm font-medium"
                  >
                    Se connecter
                  </a>
                </div>
              </div>
              <a
                href="/espace-pro"
                className="flex flex-col rounded-xl border border-[#9FE1CB]/60 bg-[#E1F5EE] hover:bg-[#9FE1CB] transition-colors group p-5 text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-[#1D9E75] flex items-center justify-center">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <div>
                    <p className="font-semibold text-[#085041] group-hover:text-[#0F6E56]">MediHelm Pro</p>
                    <p className="text-xs text-muted-foreground">Espace pharmacie — payant</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Modules de gestion d&apos;officine, conformité et tarifs.
                </p>
                <span className="mt-auto pt-4 text-sm font-medium text-[#1D9E75]">
                  Découvrir l&apos;espace →
                </span>
              </a>
              <a
                href="/espace-grossiste"
                className="flex flex-col rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors group p-5 text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-[#EF9F27] flex items-center justify-center">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-700">MediHelm Grossistes</p>
                    <p className="text-xs text-muted-foreground">Espace grossistes — payant</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Catalogues, commandes d&apos;officines, livraisons.
                </p>
                <span className="mt-auto pt-4 text-sm font-medium text-amber-600">
                  Découvrir l&apos;espace →
                </span>
              </a>
              <a
                href="/espace-institution"
                className="flex flex-col rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 transition-colors group p-5 text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-[#085041] flex items-center justify-center">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <div>
                    <p className="font-semibold text-[#085041] group-hover:text-teal-700">MediHelm Institutions</p>
                    <p className="text-xs text-muted-foreground">Espace institutionnel — gratuit</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Portails DPMED, SoBAPS, ABRP et partenaires.
                </p>
                <span className="mt-auto pt-4 text-sm font-medium text-[#085041]">
                  Découvrir l&apos;espace →
                </span>
              </a>
            </div>
          </div>
        </section>
        <PatientFeatures />
        <AlertProcess />
      </main>
      <Footer />
    </div>
  );
}
