import React, { useState, useMemo, useEffect } from "react";
import { Check, Loader2, X, Terminal, ChevronDown, ChevronRight, Filter, RotateCcw, AlertTriangle, ShieldAlert, Bug } from "lucide-react";

const STAGES = [
  { id: "specification", stepNum: "01", title: "Spec Validation", category: "synthesis" },
  { id: "ai_compiler", stepNum: "02", title: "AI Synthesis", category: "synthesis" },
  { id: "terraform", stepNum: "03", title: "Terraform HCL", category: "synthesis" },
  { id: "opa_policy", stepNum: "04", title: "OPA Security", category: "synthesis" },
  { id: "deployment", stepNum: "05", title: "Docker Runtime", category: "runtime" },
  { id: "drift_check", stepNum: "06", title: "Drift Health", category: "runtime" },
];

const TARGETS = [
  { id: "docker", label: "Docker runtime" },
  { id: "aws_ecs", label: "AWS ECS runtime" },
  { id: "kubernetes", label: "Kubernetes runtime" }
];

export default function PipelineStepper({ 
  steps = {}, 
  currentStep, 
  pipelineStatus, 
  failedStep = null,
  errorMessage = null,
  logs = [],
  selectedTarget = "docker",
  onSelectTarget
}) {
  const [showLogs, setShowLogs] = useState(false);
  const [filterSegment, setFilterSegment] = useState("all"); // "all" | "synthesis" | "active"
  const [selectedStageFilter, setSelectedStageFilter] = useState("all"); // "all" | stage.id
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
  const [isTargetDropdownOpen, setIsTargetDropdownOpen] = useState(false);

  const completedCount = STAGES.filter(s => steps[s.id] === "SUCCESS").length;
  const isRunning = pipelineStatus === "RUNNING";
  const isFailed = pipelineStatus === "FAILED";
  const isSuccess = pipelineStatus === "SUCCESS";

  // Automatically open logs when a failure occurs so the user gets immediate failure diagnostics
  useEffect(() => {
    if (isFailed) {
      setShowLogs(true);
    }
  }, [isFailed]);

  const activeFailedStep = failedStep || (isFailed ? currentStep : null);
  const failedStageInfo = STAGES.find(s => s.id === activeFailedStep);


  // Compute active filter count
  const activeFiltersCount = (selectedStageFilter !== "all" ? 1 : 0) + (selectedTarget !== "docker" ? 1 : 0) + (filterSegment !== "all" ? 1 : 0);

  // Filter stages based on current active filters
  const filteredStages = useMemo(() => {
    return STAGES.filter(st => {
      // 1. Specific stage dropdown filter
      if (selectedStageFilter !== "all" && st.id !== selectedStageFilter) {
        return false;
      }
      // 2. Segment filter
      if (filterSegment === "synthesis" && st.category !== "synthesis") {
        return false;
      }
      if (filterSegment === "active") {
        const stStatus = steps[st.id] || "IDLE";
        return stStatus === "SUCCESS" || stStatus === "RUNNING" || currentStep === st.id;
      }
      return true;
    });
  }, [selectedStageFilter, filterSegment, steps, currentStep]);

  const resetFilters = () => {
    setSelectedStageFilter("all");
    setFilterSegment("all");
    if (onSelectTarget) onSelectTarget("docker");
  };

  return (
    <div className="space-y-4">
      {/* ── Active Filters Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        
        {/* Left: Interactive Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs relative">
          
          {/* Active filters badge */}
          <div 
            onClick={activeFiltersCount > 0 ? resetFilters : undefined}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border font-bold transition-all ${
              activeFiltersCount > 0 
                ? "bg-[#1f281e] border-[#b8ff22]/40 text-[#b8ff22] cursor-pointer hover:bg-[#253324]" 
                : "bg-[#141822] text-white border-white/[0.08]"
            }`}
            title={activeFiltersCount > 0 ? "Click to reset all filters" : "Active Filters"}
          >
            <Filter className="w-3 h-3" />
            <span>Active filters</span>
            <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-extrabold ${
              activeFiltersCount > 0 ? "bg-[#b8ff22] text-black" : "bg-white text-black"
            }`}>
              {activeFiltersCount}
            </span>
            {activeFiltersCount > 0 && <RotateCcw className="w-2.5 h-2.5 ml-1 text-slate-400 hover:text-white" />}
          </div>

          {/* Filter 1: Stage Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsStageDropdownOpen(!isStageDropdownOpen);
                setIsTargetDropdownOpen(false);
              }}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-full border transition-all ${
                selectedStageFilter !== "all"
                  ? "bg-[#1a2130] text-[#b8ff22] border-[#b8ff22]/40 font-bold"
                  : "bg-[#141822] text-slate-300 border-white/[0.06] hover:text-white hover:border-white/10"
              }`}
            >
              <span>{selectedStageFilter === "all" ? "All stages" : STAGES.find(s => s.id === selectedStageFilter)?.title || "Stage"}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isStageDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-44 rounded-2xl bg-[#12151e] border border-white/10 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => {
                    setSelectedStageFilter("all");
                    setIsStageDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedStageFilter === "all" ? "bg-[#b8ff22] text-black font-extrabold" : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  All stages (6)
                </button>
                {STAGES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedStageFilter(s.id);
                      setIsStageDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      selectedStageFilter === s.id ? "bg-[#b8ff22] text-black font-extrabold" : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <span>{s.stepNum}. {s.title}</span>
                    {steps[s.id] === "SUCCESS" && <Check className="w-3 h-3 text-green-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter 2: Target Runtime Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsTargetDropdownOpen(!isTargetDropdownOpen);
                setIsStageDropdownOpen(false);
              }}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-full border transition-all ${
                selectedTarget !== "docker"
                  ? "bg-[#1a2130] text-[#b8ff22] border-[#b8ff22]/40 font-bold"
                  : "bg-[#141822] text-slate-300 border-white/[0.06] hover:text-white hover:border-white/10"
              }`}
            >
              <span>{TARGETS.find(t => t.id === selectedTarget)?.label || "Docker runtime"}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isTargetDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-44 rounded-2xl bg-[#12151e] border border-white/10 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                {TARGETS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (onSelectTarget) onSelectTarget(t.id);
                      setIsTargetDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedTarget === t.id ? "bg-[#b8ff22] text-black font-extrabold" : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right: Interactive Segmented Pill Switcher */}
        <div className="flex items-center p-1 rounded-full bg-[#141822] border border-white/[0.08] max-w-full overflow-x-auto shrink-0">
          <button
            onClick={() => setFilterSegment("all")}
            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all ${
              filterSegment === "all"
                ? "bg-[#1f2535] text-white shadow-sm font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All Stages (6)
          </button>

          <button
            onClick={() => setFilterSegment("synthesis")}
            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all flex items-center space-x-1 ${
              filterSegment === "synthesis"
                ? "bg-[#1f2535] text-white shadow-sm font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Synthesis</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300">4</span>
          </button>

          {/* Standout Active Lime Pill */}
          <button
            onClick={() => setFilterSegment("active")}
            className={`px-3.5 py-1 rounded-full text-xs font-extrabold transition-all flex items-center space-x-1.5 ${
              filterSegment === "active" || isSuccess || isRunning
                ? "bg-[#b8ff22] text-black shadow-md shadow-[#b8ff22]/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>{isSuccess ? "Online" : isRunning ? "Running" : "Completed"}</span>
            <span className="w-4 h-4 rounded-full bg-black text-[#b8ff22] text-[10px] flex items-center justify-center font-black">
              {completedCount}
            </span>
          </button>
        </div>

      </div>

      {/* ── Sequential Chronological Timeline Card ── */}
      <div className="ref-dark-card rounded-[26px] p-4 sm:p-5 flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06] mb-3">
          <div className="flex items-center space-x-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${isFailed ? "bg-red-500 animate-ping" : isRunning ? "bg-[#b8ff22] animate-pulse" : isSuccess ? "bg-green-400" : "bg-slate-500"}`} />
            <span className="text-white font-bold font-sans uppercase tracking-wider text-[11px]">Execution Timeline</span>
            <span className="text-slate-500">•</span>
            <span className={`font-mono text-[11px] ${isFailed ? "text-red-400 font-bold" : isSuccess ? "text-green-300" : "text-slate-400"}`}>
              {isFailed 
                ? `✕ Pipeline Execution Blocked in Stage ${failedStageInfo?.stepNum || ""}: ${failedStageInfo?.title || "Security/Validation Gate"}`
                : isSuccess 
                ? `${completedCount}/6 stages completed successfully` 
                : isRunning 
                ? `Executing stage: ${currentStep.toUpperCase()}...` 
                : "Ready to synthesize"}
            </span>
          </div>

          {logs.length > 0 && (
            <button
              onClick={() => setShowLogs(!showLogs)}
              className={`text-[11px] px-3 py-1 rounded-full border flex items-center space-x-1.5 transition-colors font-mono ${
                isFailed
                  ? "bg-red-950/40 hover:bg-red-900/60 text-red-300 border-red-500/40"
                  : "bg-[#171b26] hover:bg-[#202636] text-slate-300 border-white/[0.08]"
              }`}
            >
              <Terminal className={`w-3 h-3 ${isFailed ? "text-red-400" : "text-[#b8ff22]"}`} />
              <span>{showLogs ? "Hide Console" : `Console (${logs.length})`}</span>
              {showLogs ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Dynamic Filtered Stages Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {filteredStages.map((st) => {
            const status = steps[st.id] || "IDLE";
            const isThisFailed = st.id === activeFailedStep || status === "FAILED";
            const isStepActive = currentStep === st.id && !isFailed;
            const isStepSuccess = status === "SUCCESS";

            return (
              <div
                key={st.id}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                  isThisFailed
                    ? "bg-[#281414] border-red-500/50 shadow-lg shadow-red-500/10 ring-1 ring-red-500/40"
                    : isStepSuccess
                    ? "bg-[#142218] border-green-500/30"
                    : isStepActive
                    ? "bg-[#1c241b] border-[#b8ff22]/50 shadow-sm scale-[1.02]"
                    : "bg-[#10131b] border-white/[0.04]"
                }`}
              >
                <div>
                  <span className={`text-[9px] font-mono font-bold block ${
                    isThisFailed ? "text-red-400 font-extrabold" : isStepSuccess ? "text-green-400" : isStepActive ? "text-[#b8ff22]" : "text-slate-500"
                  }`}>
                    {st.stepNum}
                  </span>
                  <span className={`text-xs font-bold font-sans ${
                    isThisFailed ? "text-red-200 font-extrabold" : isStepSuccess ? "text-white" : isStepActive ? "text-white font-extrabold" : "text-slate-400"
                  }`}>
                    {st.title}
                  </span>
                </div>

                <div className="shrink-0 ml-2">
                  {isThisFailed ? (
                    <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center font-bold animate-pulse">
                      <X className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : isStepSuccess ? (
                    <div className="w-5 h-5 rounded-full bg-green-500 text-black flex items-center justify-center font-bold">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : isStepActive ? (
                    <div className="w-5 h-5 rounded-full bg-[#b8ff22] text-black flex items-center justify-center font-bold animate-spin">
                      <Loader2 className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-600" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── High-Visibility Failure Diagnostic Card ── */}
        {isFailed && (
          <div className="mt-3 p-4 rounded-2xl bg-[#231215] border border-red-500/40 text-red-300 flex flex-col sm:flex-row sm:items-start justify-between gap-3 animate-in fade-in duration-200 shadow-xl">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black text-white uppercase tracking-wider font-sans">
                    Pipeline Failure in Stage {failedStageInfo?.stepNum || ""}: {failedStageInfo?.title || activeFailedStep || "Security Gate"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-red-500 text-white font-mono text-[9px] font-extrabold tracking-wider uppercase">
                    Execution Denied
                  </span>
                </div>
                <p className="text-xs font-mono text-red-200/90 whitespace-pre-wrap leading-relaxed">
                  {errorMessage || "Pipeline stopped due to security guardrail or schema validation failure."}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowLogs(true)}
              className="self-end sm:self-center px-3.5 py-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 text-xs font-bold font-mono shrink-0 transition-colors shadow-sm flex items-center space-x-1"
            >
              <Terminal className="w-3 h-3" />
              <span>Trace in Console</span>
            </button>
          </div>
        )}

        {/* Live Logs Console if open */}
        {showLogs && logs.length > 0 && (
          <div className="mt-3 p-3.5 bg-[#0a0c10] rounded-2xl border border-white/[0.06] font-mono text-xs max-h-48 overflow-y-auto space-y-1 animate-in fade-in duration-150">
            {logs.map((log, idx) => {
              const isLogErr = log.toLowerCase().includes("error") || log.toLowerCase().includes("failed") || log.toLowerCase().includes("denied") || log.toLowerCase().includes("violation");
              const isLogSuccess = log.includes("✓") || log.includes("SUCCESS") || log.includes("cleanly") || log.includes("passed");

              return (
                <div key={idx} className={`flex items-start space-x-2 leading-relaxed p-1 rounded-lg ${isLogErr ? "bg-red-950/20 border-l-2 border-red-500 pl-2" : ""}`}>
                  <span className="text-slate-600 select-none text-[11px] shrink-0">{idx + 1}.</span>
                  <span className={isLogErr ? "text-red-400 font-bold" : isLogSuccess ? "text-[#b8ff22]" : "text-slate-300"}>
                    {log}
                  </span>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}