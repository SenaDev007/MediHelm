"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Globe,
  Server,
  Database,
  Cloud,
  CreditCard,
  Bell,
  ListOrdered,
  WifiOff,
  Map,
  Lock,
} from "lucide-react";

interface TechItem {
  category: string;
  technology: string;
  icon: React.ElementType;
  color: string;
}

const techItems: TechItem[] = [
  {
    category: "Frontend",
    technology: "Next.js 14",
    icon: Globe,
    color: "#1D9E75",
  },
  {
    category: "Backend",
    technology: "NestJS",
    icon: Server,
    color: "#0F6E56",
  },
  {
    category: "Base de données",
    technology: "PostgreSQL + Prisma + Supabase",
    icon: Database,
    color: "#378ADD",
  },
  {
    category: "Hébergement",
    technology: "Vercel",
    icon: Cloud,
    color: "#888780",
  },
  {
    category: "Paiements",
    technology: "Fedapay (Wave, MTN, Moov, Visa/MC)",
    icon: CreditCard,
    color: "#EF9F27",
  },
  {
    category: "Notifications",
    technology: "Firebase FCM + AfricasTalking",
    icon: Bell,
    color: "#E24B4A",
  },
  {
    category: "Queue",
    technology: "BullMQ + Redis",
    icon: ListOrdered,
    color: "#1D9E75",
  },
  {
    category: "Offline",
    technology: "SQLite local",
    icon: WifiOff,
    color: "#0F6E56",
  },
  {
    category: "Cartes",
    technology: "OpenStreetMap",
    icon: Map,
    color: "#378ADD",
  },
  {
    category: "Sécurité",
    technology: "mTLS, RSA-256, HMAC, RLS",
    icon: Lock,
    color: "#085041",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function TechStack() {
  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-medium text-teal-800 mb-3">
            Technologie Moderne & Fiable
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Une infrastructure robuste pour garantir performance, sécurité et
            disponibilité
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
        >
          {techItems.map((item) => (
            <motion.div key={item.category} variants={itemVariants}>
              <div className="p-4 bg-gray-50 rounded-xl border border-teal-200 hover:shadow-md transition-shadow duration-200 text-center h-full">
                <div
                  className="p-3 rounded-lg inline-flex mb-3"
                  style={{ backgroundColor: item.color + "15" }}
                >
                  <item.icon size={24} style={{ color: item.color }} />
                </div>
                <div className="text-xs font-medium text-gray-400 mb-1">
                  {item.category}
                </div>
                <div
                  className="text-sm font-medium"
                  style={{ color: item.color }}
                >
                  {item.technology}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
