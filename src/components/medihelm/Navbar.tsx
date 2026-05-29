"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";

const navLinks = [
  { label: "Fonctionnalités", href: "#fonctionnalites" },
  { label: "Tarifs", href: "#tarifs" },
  { label: "Espaces", href: "#espaces" },
  { label: "Partenariats", href: "#partenariats" },
  { label: "Contact", href: "#contact" },
];

const spaceLinks = [
  { label: "MédiHelm Pro", href: "/pro", description: "Espace pharmacie", color: "text-teal-400" },
  { label: "MédiHelm Patient", href: "/patient", description: "Espace patient (gratuit)", color: "text-blue-brand" },
  { label: "MédiHelm Grossistes", href: "/grossistes", description: "Portail grossistes", color: "text-amber-400" },
  { label: "MédiHelm Institutions", href: "/institutions", description: "Portail DPMED/SoBAPS", color: "text-teal-800" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showSpaces, setShowSpaces] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-teal-200"
          : "bg-white/80 backdrop-blur-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/">
            <Logo variant="full" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm font-medium text-gray-900 hover:text-teal-400 transition-colors rounded-md hover:bg-teal-50"
              >
                {link.label}
              </a>
            ))}

            {/* Espaces Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSpaces(!showSpaces)}
                onBlur={() => setTimeout(() => setShowSpaces(false), 200)}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-teal-400 hover:text-teal-600 transition-colors rounded-md hover:bg-teal-50"
              >
                Espaces
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showSpaces ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showSpaces && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-lg border border-teal-200 overflow-hidden z-50"
                  >
                    {spaceLinks.map((space) => (
                      <Link
                        key={space.href}
                        href={space.href}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-teal-50 transition-colors"
                        onClick={() => setShowSpaces(false)}
                      >
                        <div className="mt-0.5">
                          <span className={`font-semibold text-sm ${space.color}`}>{space.label}</span>
                          <p className="text-xs text-muted-foreground">{space.description}</p>
                        </div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Link href="/patient">
              <Button variant="outline" className="border-teal-400 text-teal-400 hover:bg-teal-50 font-medium text-sm">
                Espace Patient
              </Button>
            </Link>
            <Link href="/pro">
              <Button className="bg-teal-400 hover:bg-teal-600 text-white font-medium text-sm">
                Essai gratuit 30 jours
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-gray-900 hover:text-teal-400 hover:bg-teal-50 transition-colors"
              aria-label="Menu de navigation"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white border-b border-teal-200 overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2.5 text-sm font-medium text-gray-900 hover:text-teal-400 hover:bg-teal-50 rounded-md transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="border-t border-teal-100 pt-2 mt-2">
                <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Espaces</p>
                {spaceLinks.map((space) => (
                  <Link
                    key={space.href}
                    href={space.href}
                    onClick={() => setIsOpen(false)}
                    className={`block px-3 py-2.5 text-sm font-medium ${space.color} hover:bg-teal-50 rounded-md transition-colors`}
                  >
                    {space.label}
                  </Link>
                ))}
              </div>
              <div className="pt-3 pb-1 space-y-2">
                <Link href="/patient" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full border-teal-400 text-teal-400 font-medium text-sm">
                    Espace Patient
                  </Button>
                </Link>
                <Link href="/pro" onClick={() => setIsOpen(false)}>
                  <Button className="w-full bg-teal-400 hover:bg-teal-600 text-white font-medium text-sm">
                    Essai gratuit 30 jours
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
