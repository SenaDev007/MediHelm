"use client";

import { Navbar } from "@/components/medihelm/Navbar";
import { PatientLanding } from "@/components/medihelm/PatientLanding";
import { Footer } from "@/components/medihelm/Footer";

// ============================================================
// MediHelm — Landing PATIENT (page d'accueil publique).
//
// Une SEULE section : la carte nationale du Bénin (toutes les
// pharmacies géolocalisées) présentée à gauche, les informations
// clés et les accès « créer un compte / se connecter » à droite.
//
// L'interface patient complète (accueil, recherche médicament,
// pharmacies, garde, commandes, ordonnances, fidélité, …) n'est
// accessible qu'APRÈS connexion — le middleware redirige toute
// visite non authentifiée de /patient vers cette page.
// ============================================================
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar space="patient" />
      <main className="flex-1">
        <PatientLanding />
      </main>
      <Footer />
    </div>
  );
}
