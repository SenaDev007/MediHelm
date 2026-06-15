"use client";

import React from "react";
import Image from "next/image";

interface LogoProps {
  variant?: "full" | "icon" | "wordmark";
  className?: string;
}

export function Logo({ variant = "full", className = "" }: LogoProps) {
  if (variant === "icon") {
    return (
      <div className={`flex items-center ${className}`}>
        <Image src="/logo-MediHelm-01.png" alt="MédiHelm" width={40} height={40} />
      </div>
    );
  }

  if (variant === "wordmark") {
    return (
      <div className={`flex items-center ${className}`}>
        <Image src="/logo-MediHelm.png" alt="MédiHelm" width={180} height={45} />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image src="/logo-MediHelm-01.png" alt="MédiHelm" width={36} height={36} />
      <div className="flex flex-col">
        <span
          className="text-lg tracking-tight leading-none"
          style={{ fontFamily: "Georgia, serif" }}
        >
          <span className="font-bold" style={{ color: "#1D9E75" }}>
            Médi
          </span>
          <span className="font-normal" style={{ color: "#085041" }}>
            Helm
          </span>
        </span>
        <span
          className="text-[8px] tracking-[0.2em] text-gray-400 mt-0.5"
          style={{ fontWeight: 500 }}
        >
          L&apos;ÉCOSYSTÈME SANTÉ DE CONFIANCE
        </span>
      </div>
    </div>
  );
}
