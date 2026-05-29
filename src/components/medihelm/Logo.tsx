"use client";

import React from "react";

interface LogoProps {
  variant?: "full" | "icon" | "wordmark";
  className?: string;
}

export function Logo({ variant = "full", className = "" }: LogoProps) {
  if (variant === "icon") {
    return (
      <div className={`flex items-center ${className}`}>
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          <rect
            width="40"
            height="40"
            rx="8"
            fill="#1D9E75"
          />
          {/* Medical Cross */}
          <rect x="15" y="10" width="10" height="20" rx="2" fill="white" />
          <rect x="10" y="15" width="20" height="10" rx="2" fill="white" />
          {/* ECG Line overlay */}
          <path
            d="M6 22 L12 22 L14 16 L16 28 L18 14 L20 26 L22 18 L24 22 L34 22"
            stroke="#1D9E75"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.5"
          />
        </svg>
      </div>
    );
  }

  if (variant === "wordmark") {
    return (
      <div className={`flex items-center ${className}`}>
        <span
          className="text-xl tracking-tight"
          style={{ fontFamily: "Georgia, serif" }}
        >
          <span className="font-bold" style={{ color: "#1D9E75" }}>
            Médi
          </span>
          <span className="font-normal" style={{ color: "#085041" }}>
            Helm
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width="36"
        height="36"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <rect width="40" height="40" rx="8" fill="#1D9E75" />
        {/* Medical Cross */}
        <rect x="15" y="10" width="10" height="20" rx="2" fill="white" />
        <rect x="10" y="15" width="20" height="10" rx="2" fill="white" />
        {/* ECG Line overlay */}
        <path
          d="M6 22 L12 22 L14 16 L16 28 L18 14 L20 26 L22 18 L24 22 L34 22"
          stroke="#1D9E75"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.5"
        />
      </svg>
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
