import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1D9E75" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
