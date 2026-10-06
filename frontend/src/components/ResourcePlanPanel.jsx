import React, { useState } from "react";
import { Cpu, ChevronDown, ChevronRight, Copy, Check } from "lucide-react";

export default function ResourcePlanPanel({ resourcePlan }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(resourcePlan, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="ref-dark-card rounded-[28px] shadow-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 bg-[#141824] hover:bg-[#191e2e] border-b border-white/[0.06] flex items-center justify-between text-left transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-[#192234] border border-white/[0.08] flex items-center justify-center text-white shadow-sm">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-white uppercase tracking-wider font-sans">Candidate Resource Plan</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10 font-mono">
                {resourcePlan?.resources?.length || 0} units
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">ai_plan.json schema validation</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-slate-400">
          <span className="text-xs font-mono">{isOpen ? "Hide Plan" : "View Plan"}</span>
          {isOpen ? <ChevronDown className="w-4 h-4 text-[#b8ff22]" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 bg-[#0a0c10] relative">
          <button
            onClick={handleCopy}
            className="absolute top-7 right-7 px-3 py-1 bg-[#161c28] hover:bg-[#202838] text-slate-200 rounded-full border border-white/10 text-xs flex items-center space-x-1.5 transition-all shadow-md font-mono"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#b8ff22]" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
          <pre className="text-xs font-mono text-slate-200 overflow-x-auto p-4 bg-[#050608] rounded-2xl border border-white/[0.05] max-h-80 leading-5">
            {jsonString}
          </pre>
        </div>
      )}
    </div>
  );
}