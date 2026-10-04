import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import OfflineBanner from "@/components/offline-banner";
import AuthProvider from "@/components/providers/session-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MediHelm — L'Écosystème Santé de Confiance au Bénin",
  description:
    "Le premier écosystème santé du Bénin — gestion de pharmacie, recherche de médicaments, alertes DPMED, conformité réglementaire. Pour pharmaciens et patients.",
  keywords: [
    "MediHelm",
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
    icon: "/logo-MediHelm-01.png",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "MediHelm — L'Écosystème Santé de Confiance",
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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1D9E75" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AuthProvider>
            <OfflineBanner />
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
