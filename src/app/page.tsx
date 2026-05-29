"use client";

import { Navbar } from "@/components/medihelm/Navbar";
import { HeroSection } from "@/components/medihelm/HeroSection";
import { ProductSpaces } from "@/components/medihelm/ProductSpaces";
import { ModulesShowcase } from "@/components/medihelm/ModulesShowcase";
import { PatientFeatures } from "@/components/medihelm/PatientFeatures";
import { PricingSection } from "@/components/medihelm/PricingSection";
import { InstitutionalPartnerships } from "@/components/medihelm/InstitutionalPartnerships";
import { AlertProcess } from "@/components/medihelm/AlertProcess";
import { ComplianceScore } from "@/components/medihelm/ComplianceScore";
import { TechStack } from "@/components/medihelm/TechStack";
import { Footer } from "@/components/medihelm/Footer";
import { DashboardPro } from "@/components/medihelm/DashboardPro";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        {/* Quick Access Portals */}
        <section className="py-12 px-4 bg-white">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-[#085041] mb-2">Accès portails partenaires</h2>
            <p className="text-muted-foreground mb-8">Connectez-vous à votre espace dédié</p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/grossistes"
                className="flex items-center gap-3 px-6 py-4 bg-[#E1F5EE] hover:bg-[#9FE1CB] rounded-xl transition-colors group"
              >
                <div className="h-10 w-10 rounded-full bg-[#1D9E75] flex items-center justify-center">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-[#085041] group-hover:text-[#0F6E56]">Portail Grossistes</p>
                  <p className="text-xs text-muted-foreground">UbiPharm, Promopharma…</p>
                </div>
              </a>
            </div>
          </div>
        </section>
        <DashboardPro />
        <ProductSpaces />
        <ModulesShowcase />
        <PatientFeatures />
        <PricingSection />
        <InstitutionalPartnerships />
        <AlertProcess />
        <ComplianceScore />
        <TechStack />
      </main>
      <Footer />
    </div>
  );
}
