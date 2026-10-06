import React from "react";
import { Link } from "react-router-dom";
import { SlidersHorizontal, Sparkles, ArrowUpRight, Check, Zap, ShieldCheck, ArrowLeft } from "lucide-react";

export default function TelemetryHUD({ 
  telemetry = {}, 
  pipelineStatus, 
  onSynthesize, 
  onDeploy,
  isRunning,
  containers = [],
  violations = [],
  driftResult = {},
  declaredServicesCount = 3,
  targetUnitsCount = 5,
  runHistory = []
}) {
  const modelName = telemetry.model || "liquid/lfm-2.5-2.6b:free";
  const inferTime = telemetry.inference_time_ms ? `${telemetry.inference_time_ms} ms` : "1,840 ms";
  const liveCount = containers.length > 0 ? (containers.length < 10 ? `0${containers.length}` : `${containers.length}`) : "00";
  const isViolated = violations.length > 0;
  const isDrifted = driftResult?.drift_detected;

  // Real computation from persistent run history
  const totalRuns = runHistory?.length || 0;
  const passedRuns = totalRuns > 0 ? runHistory.filter(r => r.status === "passed" || r.status === "deployed").length : 0;
  const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 100;
  const statusDisplay = isViolated 
    ? `${violations.length} Violations` 
    : (totalRuns > 0 ? `${passRate}% Pass Rate` : "100% Compliant");

  return (
    <div className="space-y-6">
      {/* Hero Title & Primary Action Strip matching reference image header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div className="flex items-center space-x-3.5">
          <Link
            to="/"
            className="group w-9 h-9 rounded-full bg-[#151822] hover:bg-[#1e2332] border border-white/[0.08] text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-sm hover:scale-105 active:scale-95"
            title="Back to Landing Page"
            aria-label="Back to Landing Page"
          >
            <ArrowLeft className="w-4 h-4 text-[#b8ff22] group-hover:-translate-x-0.5 transition-transform" />
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-sans">
            Infrastructure
          </h1>
        </div>

        <div className="flex items-center space-x-2.5">
          <button 
            onClick={() => {
              const el = document.getElementById("section-opa");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="w-9 h-9 rounded-full bg-[#151822] hover:bg-[#1e2330] border border-white/[0.08] flex items-center justify-center text-slate-300 transition-colors"
            title="Configure Security Guardrails"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          
          {/* Top Button: Option 1 - Synthesis Only (Dry-Run: Stages 1-4) */}
          <button
            onClick={onSynthesize}
            disabled={isRunning}
            className="flex items-center space-x-2 px-5 py-2 rounded-full bg-[#151822] hover:bg-[#1f2433] border border-white/[0.08] text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            title="Synthesizes candidate plan & verifies OPA without deploying live containers"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#b8ff22]" />
            <span>{isRunning ? "Synthesizing..." : "Synthesize Infrastructure (Dry-Run)"}</span>
          </button>
        </div>
      </div>

      {/* Top 4 Dark Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Containers Running (Unambiguous Live Unit Count) */}
        <div className="ref-dark-card rounded-[28px] p-5 flex flex-col justify-between min-h-[190px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400 block font-sans">Containers Running</span>
              <span className="text-[10px] font-mono text-slate-500 font-bold">{declaredServicesCount} Svcs • {targetUnitsCount} Target</span>
            </div>
            <div className="text-3xl font-black text-white tracking-tight mt-2 font-sans">
              {liveCount} <span className="text-lg font-bold text-[#b8ff22]">Live</span>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pb-1">
              <span>Spec</span>
              <span>AI</span>
              <span className="text-[#b8ff22] font-bold">HCL</span>
              <span>Deploy</span>
            </div>
            <div className="w-full h-1 bg-[#1c212d] rounded-full overflow-hidden flex">
              <div className="w-1/4 h-full bg-[#2a3142]" />
              <div className="w-1/4 h-full bg-[#2a3142]" />
              <div className="w-1/4 h-full bg-[#b8ff22]" />
              <div className="w-1/4 h-full bg-[#1c212d]" />
            </div>

            <div className="flex items-center -space-x-2 pt-1">
              {containers.length > 0 ? (
                containers.slice(0, 4).map((c, i) => (
                  <div 
                    key={i} 
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 border-2 border-[#12151e] flex items-center justify-center text-[9px] font-black text-black shadow-sm uppercase font-mono"
                    title={`${c.resource}: ${c.image}`}
                  >
                    {c.resource.substring(0, 2)}
                  </div>
                ))
              ) : (
                <>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 border-2 border-[#12151e] flex items-center justify-center text-[10px] font-bold text-black shadow-sm" title="Frontend (Nginx)">FE</div>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 border-2 border-[#12151e] flex items-center justify-center text-[10px] font-bold text-black shadow-sm" title="Backend (NodeJS)">BE</div>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 border-2 border-[#12151e] flex items-center justify-center text-[10px] font-bold text-black shadow-sm" title="Database (PostgreSQL)">DB</div>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 border-2 border-[#12151e] flex items-center justify-center text-[10px] font-bold text-black shadow-sm" title="OPA Guardrail">OP</div>
                </>
              )}
              {containers.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-[#1e2433] border-2 border-[#12151e] flex items-center justify-center text-[9px] font-bold text-slate-300">
                  +{containers.length - 4}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Synthesis Latency */}
        <div className="ref-dark-card rounded-[28px] p-5 flex flex-col justify-between min-h-[190px]">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block font-sans">Synthesis Latency</span>
            <div className="text-3xl font-black text-white tracking-tight mt-2 font-sans">
              {inferTime}
            </div>
          </div>

          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pb-1">
              <span>Tokenize</span>
              <span className="text-[#b8ff22] font-bold">Inference</span>
              <span>Render</span>
            </div>
            <div className="w-full h-1 bg-[#1c212d] rounded-full overflow-hidden flex">
              <div className="w-1/3 h-full bg-[#2a3142]" />
              <div className="w-1/3 h-full bg-[#b8ff22]" />
              <div className="w-1/3 h-full bg-[#1c212d]" />
            </div>

            <div className="flex items-center -space-x-2 pt-1">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 border-2 border-[#12151e] flex items-center justify-center text-[10px] font-bold text-white shadow-sm" title="Liquid LFM-2.5">
                AI
              </div>
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 border-2 border-[#12151e] flex items-center justify-center text-[10px] font-bold text-white shadow-sm" title="Docker Engine">
                DK
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Total Engine Cost */}
        <div className="ref-dark-card rounded-[28px] p-5 flex flex-col justify-between min-h-[190px]">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block font-sans">Synthesis Cost</span>
            <div className="text-3xl font-black text-white tracking-tight mt-2 font-sans">
              ₹0.00 <span className="text-base font-medium text-slate-400">/ $0.00</span>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pb-1">
              <span>Free Tier</span>
              <span className="text-[#b8ff22] font-bold">100% Zero-Cost</span>
            </div>
            <div className="w-full h-1 bg-[#1c212d] rounded-full overflow-hidden flex">
              <div className="w-full h-full bg-[#b8ff22]" />
            </div>

            <div className="flex items-center -space-x-2 pt-1">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-400 to-lime-500 border-2 border-[#12151e] flex items-center justify-center text-[10px] font-bold text-black shadow-sm" title="Zero USD">
                $0
              </div>
              <div className="w-7 h-7 rounded-full bg-[#1e2433] border-2 border-[#12151e] flex items-center justify-center text-[9px] font-bold text-slate-300">
                ✓
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Standout Instant Deployment Card */}
        <div className="ref-dark-card rounded-[28px] p-5 flex flex-col justify-between min-h-[190px] relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-400 block font-sans">Deployment Health</span>
              <div className="text-3xl font-black text-white tracking-tight mt-2 font-sans">
                {statusDisplay}
              </div>
            </div>
            <button 
              onClick={() => {
                const el = document.getElementById("section-runtime");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-slate-500 hover:text-white transition-colors"
              title="Jump to Cockpit"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-end justify-between gap-2 mt-4">
            <div className="flex items-end space-x-1.5">
              <div className="w-12 h-14 rounded-2xl bg-[#181d28] border border-white/[0.06] flex flex-col items-center justify-between p-1.5 text-center">
                <span className="text-[9px] text-slate-500 font-mono">#vpc</span>
                <span className="text-[8px] text-slate-400 font-medium">Bridge</span>
              </div>

              <div className="w-14 h-16 rounded-2xl bg-[#b8ff22] text-black shadow-lg shadow-[#b8ff22]/20 flex flex-col items-center justify-between p-1.5 text-center">
                <span className="text-[10px] font-mono font-black">#rego</span>
                <span className="text-[9px] font-black uppercase">{isViolated ? "Denied" : "Active"}</span>
              </div>

              <div className="w-12 h-14 rounded-2xl bg-[#181d28] border border-white/[0.06] flex flex-col items-center justify-between p-1.5 text-center">
                <span className="text-[9px] text-slate-500 font-mono">#drift</span>
                <span className={`text-[8px] font-bold ${isDrifted ? "text-red-400" : "text-green-400"}`}>
                  {isDrifted ? "Alert" : "Clean"}
                </span>
              </div>
            </div>

            {/* White Pill Button: Option 1 - Deploy Now (Full Pipeline: Stages 1-6) */}
            <button
              onClick={onDeploy}
              disabled={isRunning}
              className="px-4 py-2 rounded-full bg-white hover:bg-slate-100 text-black text-xs font-black shadow-md transition-all shrink-0 hover:scale-105 active:scale-95 disabled:opacity-50"
              title="Executes full pipeline including live Docker container deployment"
            >
              {isRunning ? "Deploying..." : "Deploy now"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}