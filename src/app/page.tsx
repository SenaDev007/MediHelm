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

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
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
