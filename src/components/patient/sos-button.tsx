'use client'

import { motion } from 'framer-motion'
import { Phone } from 'lucide-react'

interface SosButtonProps {
  phoneNumber: string
  pharmacieNom: string
}

export function SosButton({ phoneNumber, pharmacieNom }: SosButtonProps) {
  return (
    <motion.a
      href={`tel:${phoneNumber}`}
      className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-destructive text-white font-bold text-lg shadow-lg"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      animate={{
        boxShadow: [
          '0 0 0 0 rgba(226, 75, 74, 0.4)',
          '0 0 0 12px rgba(226, 75, 74, 0)',
          '0 0 0 0 rgba(226, 75, 74, 0)',
        ],
      }}
      transition={{
        boxShadow: { duration: 2, repeat: Infinity },
      }}
    >
      <Phone className="h-6 w-6" />
      SOS — Appeler {pharmacieNom}
    </motion.a>
  )
}
