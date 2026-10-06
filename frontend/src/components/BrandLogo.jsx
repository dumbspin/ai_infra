import React from "react";

export default function BrandLogo({ className = "w-7 h-7", imageClassName = "" }) {
  return (
    <div 
      className={`relative rounded-lg bg-black border border-white/20 flex items-center justify-center overflow-hidden shadow-sm group-hover:border-[#b8ff22]/60 group-hover:shadow-[0_0_12px_rgba(184,255,34,0.35)] transition-all shrink-0 ${className}`}
    >
      <img 
        src="/logo.png" 
        alt="SDD-Infra Logo" 
        className={`w-full h-full object-cover select-none ${imageClassName}`} 
        loading="eager"
      />
    </div>
  );
}
