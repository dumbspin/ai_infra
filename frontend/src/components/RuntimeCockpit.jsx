import React, { useState } from "react";
import { Container, ShieldCheck, ShieldAlert, Shield, Box, Cpu, AlertTriangle, CheckCircle2, Flame, Trash2, Zap, ArrowUpRight, History, Check, X, RotateCcw, GitCommit, ChevronDown, ChevronUp, SearchCheck, Lock, Clock } from "lucide-react";

export default function RuntimeCockpit({
  containers = [],
  onRefreshContainers,
  isRefreshingInfra,
  driftResult,
  onSimulateDrift,
  onCleanDrift,
  onReconcileDrift,
  isSimulatingDrift,
  isReconcilingDrift,
  opaStatus,
  violations = [],
  policies = [],
  onTogglePolicy,
  terraformCode,
  resourcePlan,
  runHistory = [],
  onClearHistory,
  opaEvaluation = null,
  staticScan = null
}) {
  const [activeTab, setActiveTab] = useState("containers"); // "containers" | "policy" | "artifacts" | "history"
  const [expandedRunId, setExpandedRunId] = useState(null);

  const isDrifted = driftResult?.drift_detected;
  const isOpaPassed = opaStatus === "SUCCESS" && violations.length === 0;
  const isOpaFailed = opaStatus === "FAILED" || violations.length > 0;

  const staticResult = staticScan || opaEvaluation?.static_scan;
  const staticPassed = staticResult ? staticResult.passed : isOpaPassed;
  const staticFindings = staticResult?.findings || [];

  return (
    <div className="ref-dark-card rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
      {/* Header Bar */}
      <div className="bg-[#141824] px-6 py-4 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-[#192234] border border-white/[0.08] flex items-center justify-center text-[#b8ff22] shadow-sm">
            <Container className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white font-sans flex items-center gap-1.5">
              <span>Runtime Cockpit</span>
              <span className="w-2 h-2 rounded-full bg-[#b8ff22] animate-pulse" />
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">Real-time Docker daemon state & drift reconciliation engine</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center p-1 rounded-full bg-[#0c0e14] border border-white/[0.08] max-w-full overflow-x-auto">
          <button
            onClick={() => setActiveTab("containers")}
            className={`flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 min-h-[38px] rounded-full text-xs font-bold transition-all shrink-0 ${
              activeTab === "containers"
                ? "bg-[#b8ff22] text-black shadow-md shadow-[#b8ff22]/20 font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Container className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Containers & Drift</span>
            {isDrifted && <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse ml-0.5 shrink-0" />}
          </button>

          <button
            onClick={() => setActiveTab("policy")}
            className={`flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 min-h-[38px] rounded-full text-xs font-bold transition-all shrink-0 ${
              activeTab === "policy"
                ? "bg-[#b8ff22] text-black shadow-md shadow-[#b8ff22]/20 font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Security & Policy</span>
            {violations.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[9px] font-bold shrink-0">
                {violations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("artifacts")}
            className={`flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 min-h-[38px] rounded-full text-xs font-bold transition-all shrink-0 ${
              activeTab === "artifacts"
                ? "bg-[#b8ff22] text-black shadow-md shadow-[#b8ff22]/20 font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Box className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Terraform & Plan</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 min-h-[38px] rounded-full text-xs font-bold transition-all shrink-0 ${
              activeTab === "history"
                ? "bg-[#b8ff22] text-black shadow-md shadow-[#b8ff22]/20 font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <History className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Run History</span>
            {runHistory.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[9px] font-bold ml-0.5 shrink-0">
                {runHistory.length}
              </span>
            )}
          </button>
        </div>
      </div>


      {/* Content Area */}
      <div className="p-6 bg-[#0e1118] min-h-[300px] flex-1 flex flex-col justify-between">
        
        {/* TAB 1: Containers & Drift */}
        {activeTab === "containers" && (
          <div className="space-y-4">
            {/* Drift Strip */}
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isDrifted ? "bg-[#251316] border-red-500/30 text-red-300" : "bg-[#131822] border-white/[0.06] text-slate-300"
            }`}>
              <div className="flex items-center space-x-3">
                {isDrifted ? (
                  <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 animate-bounce" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-[#17261a] text-[#b8ff22] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black block text-white">
                      {isDrifted ? "⚠️ Drift Detected in Live Daemon State" : "✓ Zero Drift — Specification Compliant"}
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-green-400 font-mono">
                      Cron: Active (every 10m)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {isDrifted ? `${driftResult?.items?.length || 1} unmanaged / mismatched container resource(s)` : "Real-time Docker daemon is 100% synchronized with declarative architecture"}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {isDrifted && (
                  <button
                    onClick={onReconcileDrift}
                    disabled={isReconcilingDrift}
                    className="lime-pill-btn px-4 py-1.5 rounded-full text-xs font-black flex items-center space-x-1.5 animate-pulse"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>{isReconcilingDrift ? "Healing State..." : "⚡ Auto-Reconcile & Self-Heal"}</span>
                  </button>
                )}

                <button
                  onClick={onSimulateDrift}
                  disabled={isSimulatingDrift}
                  className="px-3.5 py-1.5 rounded-full bg-[#1e1518] hover:bg-[#2e1c22] text-red-300 border border-red-500/30 text-xs font-bold flex items-center space-x-1.5 transition-all"
                >
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  <span>{isSimulatingDrift ? "Injecting..." : "Simulate Drift"}</span>
                </button>
              </div>
            </div>

            {/* Container List Table */}
            <div className="overflow-x-auto rounded-2xl border border-white/[0.05] bg-[#090b10]">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/[0.06] text-slate-500 uppercase text-[10px] tracking-wider bg-white/[0.02]">
                    <th className="py-3 px-5 font-bold">Container Name</th>
                    <th className="py-3 px-5 font-bold">Image Tag</th>
                    <th className="py-3 px-5 font-bold text-center">Desired</th>
                    <th className="py-3 px-5 font-bold text-center">Actual</th>
                    <th className="py-3 px-5 font-bold">Health State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03] text-slate-300">
                  {containers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500 font-sans text-xs">
                        No active containers detected. Click "Synthesize & Deploy" above to provision infrastructure.
                      </td>
                    </tr>
                  ) : (
                    containers.map((c, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-5 font-bold text-white flex items-center space-x-2 font-sans">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#b8ff22]" />
                          <span>{c.resource}</span>
                        </td>
                        <td className="py-3 px-5 text-[#b8ff22]">{c.image}</td>
                        <td className="py-3 px-5 text-center text-slate-400">{c.desired}</td>
                        <td className="py-3 px-5 text-center text-[#b8ff22] font-black text-sm">{c.actual}</td>
                        <td className="py-3 px-5">
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#142318] border border-green-500/30 text-green-400 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            <span>{c.status}</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Security & Policy (Layer 1 + Layer 2) */}
        {activeTab === "policy" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Layer 1: Static AST Scanner Card */}
              <div className={`p-4 rounded-2xl border ${
                staticPassed ? "bg-[#142318] border-green-500/30 text-[#b8ff22]" :
                "bg-[#281414] border-red-500/30 text-red-400"
              }`}>
                <div className="flex items-center space-x-3 mb-2">
                  <SearchCheck className={`w-5 h-5 ${staticPassed ? "text-[#b8ff22]" : "text-red-400"}`} />
                  <div>
                    <h4 className="text-xs font-black text-white uppercase font-sans">Layer 1: Static HCL Scanner</h4>
                    <p className="text-[10px] text-slate-400 font-mono">Checkov / AST Rule Validation</p>
                  </div>
                </div>
                <p className="text-[11px] font-mono">
                  {staticPassed ? "✓ Static checks clean (0 findings)" : `✕ ${staticFindings.length} static finding(s) detected`}
                </p>
              </div>

              {/* Layer 2: OPA Policy Gate Card */}
              <div className={`p-4 rounded-2xl border ${
                isOpaPassed ? "bg-[#142318] border-green-500/30 text-[#b8ff22]" :
                isOpaFailed ? "bg-[#281414] border-red-500/30 text-red-400" :
                "bg-[#131822] border-white/[0.06] text-slate-400"
              }`}>
                <div className="flex items-center space-x-3 mb-2">
                  <Lock className={`w-5 h-5 ${isOpaPassed ? "text-[#b8ff22]" : isOpaFailed ? "text-red-400" : "text-slate-400"}`} />
                  <div>
                    <h4 className="text-xs font-black text-white uppercase font-sans">Layer 2: OPA Policy Gate</h4>
                    <p className="text-[10px] text-slate-400 font-mono">Rego Zero-Trust Compliance</p>
                  </div>
                </div>
                <p className="text-[11px] font-mono">
                  {isOpaPassed ? "✓ Rego policies passed (0 denials)" : `${violations.length} policy violations detected`}
                </p>
              </div>
            </div>

            {/* Interactive Policy Toggles */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono block">
                Interactive Policy Sandbox Toggles
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {policies.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => onTogglePolicy(p.id, !p.enabled)}
                    className="p-3.5 rounded-2xl bg-[#090b10] hover:bg-[#11151f] border border-white/[0.06] cursor-pointer transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-white truncate">{p.name}</span>
                        {p.enabled ? (
                          <span className="text-[9px] text-black font-extrabold px-2 py-0.5 rounded-full bg-[#b8ff22]">ON</span>
                        ) : (
                          <span className="text-[9px] text-slate-500 font-bold px-2 py-0.5 rounded-full bg-white/5">OFF</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">{p.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Artifacts */}
        {activeTab === "artifacts" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/[0.06] bg-[#090b10] p-4">
              <span className="text-xs font-bold text-[#b8ff22] font-mono block mb-2">main.tf (Terraform HCL)</span>
              <pre className="text-[11px] font-mono text-[#b8ff22] overflow-x-auto p-3 bg-[#040508] rounded-xl border border-white/[0.04] max-h-48 leading-relaxed">
                {terraformCode || "# No Terraform HCL synthesized yet"}
              </pre>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-[#090b10] p-4">
              <span className="text-xs font-bold text-white font-mono block mb-2">ai_plan.json (Candidate Plan)</span>
              <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto p-3 bg-[#040508] rounded-xl border border-white/[0.04] max-h-48 leading-relaxed">
                {JSON.stringify(resourcePlan, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 4: Run History */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-[#b8ff22]" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Pipeline Run History ({runHistory.length} Recorded Runs)
                </span>
              </div>
              {runHistory.length > 0 && (
                <button
                  onClick={onClearHistory}
                  className="text-[11px] px-3 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 flex items-center space-x-1 font-mono transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear History</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/[0.05] bg-[#090b10]">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/[0.06] text-slate-500 uppercase text-[10px] tracking-wider bg-white/[0.02]">
                    <th className="py-3 px-4 font-bold">Timestamp</th>
                    <th className="py-3 px-4 font-bold">Spec Hash / Commit</th>
                    <th className="py-3 px-4 font-bold">Target</th>
                    <th className="py-3 px-4 font-bold text-center">Mode</th>
                    <th className="py-3 px-4 font-bold text-center">Duration</th>
                    <th className="py-3 px-4 font-bold">Outcome</th>
                    <th className="py-3 px-4 font-bold text-center">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03] text-slate-300">
                  {runHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 font-sans text-xs">
                        No previous pipeline execution runs logged yet. Execute a synthesis or deploy run above to log history.
                      </td>
                    </tr>
                  ) : (
                    runHistory.map((run, idx) => {
                      const runId = run.id || `run-${idx}`;
                      const isRunSuccess = run.status === "SUCCESS";
                      const isExpanded = expandedRunId === runId;

                      return (
                        <React.Fragment key={runId}>
                          <tr 
                            onClick={() => setExpandedRunId(isExpanded ? null : runId)}
                            className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                          >
                            <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                              {run.timestamp || "Just now"}
                            </td>
                            <td className="py-3 px-4 font-bold text-white flex items-center space-x-1.5 font-mono">
                              <span className="px-2 py-0.5 rounded-md bg-[#161c28] border border-white/10 text-[#b8ff22] text-[10px]">
                                #{run.spec_hash || "spec"}
                              </span>
                              <span className="text-slate-500 text-[10px]">({run.spec_commit || "HEAD"})</span>
                            </td>
                            <td className="py-3 px-4 uppercase text-[11px] font-extrabold text-white">
                              {run.target || "docker"}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                run.dry_run ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30" : "bg-purple-500/10 text-purple-300 border border-purple-500/30"
                              }`}>
                                {run.dry_run ? "Dry-Run" : "Deploy"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                              {run.duration_ms ? `${run.duration_ms}ms` : "—"}
                            </td>
                            <td className="py-3 px-4">
                              {isRunSuccess ? (
                                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#142318] border border-green-500/30 text-green-400 text-[10px] font-bold">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>SUCCESS</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#281414] border border-red-500/30 text-red-400 text-[10px] font-bold">
                                  <X className="w-3 h-3 stroke-[3]" />
                                  <span>FAILED ({run.failed_step || "Gate"})</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400 inline" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400 inline" />
                              )}
                            </td>
                          </tr>

                          {/* Expanded Detail View */}
                          {isExpanded && (
                            <tr className="bg-[#06080d]">
                              <td colSpan={7} className="p-4 border-y border-white/[0.05]">
                                <div className="space-y-3 font-mono text-xs">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0d1017] p-3 rounded-xl border border-white/[0.04]">
                                    <div>
                                      <span className="text-[10px] text-slate-500 uppercase block">Run ID</span>
                                      <span className="text-white font-bold text-[11px]">{run.id}</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-slate-500 uppercase block">Git Commit</span>
                                      <span className="text-[#b8ff22] font-bold text-[11px]">{run.spec_commit || "HEAD"}</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-slate-500 uppercase block">Target Target</span>
                                      <span className="text-white font-bold uppercase text-[11px]">{run.target}</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-slate-500 uppercase block">Execution Time</span>
                                      <span className="text-slate-300 font-bold text-[11px]">{run.duration_ms || 0} ms</span>
                                    </div>
                                  </div>

                                  {run.error_message && (
                                    <div className="bg-[#200f13] p-3 rounded-xl border border-red-500/30 space-y-1">
                                      <div className="flex items-center space-x-2 text-red-400 font-bold text-xs">
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        <span>Failure Diagnosis & Error Trace ({run.failed_step || "Pipeline"}):</span>
                                      </div>
                                      <pre className="text-[11px] text-red-300 overflow-x-auto whitespace-pre-wrap leading-relaxed mt-1">
                                        {run.error_message}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}