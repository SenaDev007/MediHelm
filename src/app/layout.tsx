import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MédiHelm — L'Écosystème Santé de Confiance au Bénin",
  description:
    "Le premier écosystème santé du Bénin — gestion de pharmacie, recherche de médicaments, alertes DPMED, conformité réglementaire. Pour pharmaciens et patients.",
  keywords: [
    "MédiHelm",
    "pharmacie",
    "Bénin",
    "santé",
    "DPMED",
    "gestion pharmacie",
    "conformité réglementaire",
    "écosystème santé",
  ],
  authors: [{ name: "YEHI OR Tech" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "MédiHelm — L'Écosystème Santé de Confiance",
    description:
      "Pilotez votre santé avec confiance et précision. Gestion de pharmacie, alertes DPMED, conformité réglementaire.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
