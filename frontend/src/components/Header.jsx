import React from "react";
import { Download, Box, Cloud, Layers } from "lucide-react";

const TARGETS = [
  { id: "docker", label: "Docker Local", icon: Box },
  { id: "aws_ecs", label: "AWS ECS", icon: Cloud },
  { id: "kubernetes", label: "Kubernetes", icon: Layers },
];

export default function Header({ 
  dockerOnline, 
  pipelineStatus, 
  selectedTarget = "docker", 
  onSelectTarget, 
  onExportBundle
}) {

  return (
    <header className="px-2 sm:px-4 pt-2 pb-2">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Left: Brand Identity with Asterisk / Star Icon matching Salesforce logo style */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 flex items-center justify-center text-white">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-white" stroke="none">
                <path d="M12 2L13.5 8.5L20 7L15.5 12L20 17L13.5 15.5L12 22L10.5 15.5L4 17L8.5 12L4 7L10.5 8.5L12 2Z" />
              </svg>
            </div>
            <span className="text-lg font-black tracking-tight text-white font-sans">
              sdd<span className="text-[#b8ff22]">.</span>infra
            </span>
          </div>
        </div>

        {/* Center: Floating White Pill Multi-Cloud Target Switcher */}
        <div className="flex items-center bg-white rounded-full p-1 shadow-lg shadow-black/20 border border-white/20 max-w-full overflow-x-auto">
          <div className="flex items-center space-x-1 shrink-0">
            {TARGETS.map((t) => {
              const Icon = t.icon;
              const isSelected = selectedTarget === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onSelectTarget && onSelectTarget(t.id)}
                  className={`text-xs px-3.5 sm:px-4 py-2 min-h-[38px] rounded-full font-bold transition-all duration-200 flex items-center space-x-1.5 shrink-0 ${
                    isSelected
                      ? "bg-[#b8ff22] text-black shadow-sm font-extrabold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{t.label}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-black ml-0.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Docker Live Pill, Export & Profile Icon */}
        <div className="flex items-center space-x-2.5">
          {/* Docker Status Pill */}
          <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono font-bold border ${
            dockerOnline 
              ? "bg-[#142318] border-green-500/30 text-green-400" 
              : "bg-[#281414] border-red-500/30 text-red-400"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dockerOnline ? "bg-[#b8ff22] animate-pulse" : "bg-red-400"}`} />
            <span>{dockerOnline ? "Docker Live" : "Docker Offline"}</span>
          </div>

          {/* Quick Action Export */}
          <button
            onClick={onExportBundle}
            className="w-8 h-8 rounded-full bg-[#171b26] hover:bg-[#222736] border border-white/[0.08] text-white flex items-center justify-center transition-all"
            title="Download IaC Deployment Package"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* User Avatar Circle */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 p-0.5 shadow-sm cursor-pointer">
            <div className="w-full h-full rounded-full bg-[#0c0e14] flex items-center justify-center text-white text-xs font-bold">
              ⚡
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}