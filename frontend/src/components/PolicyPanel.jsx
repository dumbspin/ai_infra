import React, { useState } from "react";
import { ShieldCheck, ShieldAlert, CheckCircle2, AlertCircle, Sliders, Shield, SearchCheck, Lock, AlertTriangle } from "lucide-react";

export default function PolicyPanel({ 
  opaStatus, 
  violations = [], 
  policies = [], 
  onTogglePolicy,
  opaEvaluation = null,
  staticScan = null
}) {
  const [showSandbox, setShowSandbox] = useState(false);
  
  // Resolve layered security results
  const staticResult = staticScan || opaEvaluation?.static_scan;
  const staticPassed = staticResult ? staticResult.passed : (opaStatus === "SUCCESS" && violations.length === 0);
  const staticFindings = staticResult?.findings || [];
  
  const opaViolationsList = opaEvaluation?.opa_violations || violations.filter(v => !v.startsWith("[CKV_"));
  const isOpaAllow = opaEvaluation?.allow !== undefined ? opaEvaluation.allow : (opaStatus === "SUCCESS" && violations.length === 0);
  
  const isPassed = opaStatus === "SUCCESS" && violations.length === 0;
  const isFailed = opaStatus === "FAILED" || violations.length > 0;
  const hasEvaluated = Boolean(opaEvaluation) || opaStatus === "SUCCESS" || opaStatus === "FAILED";

  const totalRules = opaEvaluation?.total_count || policies.filter(p => p.enabled).length || 3;
  const passedRules = opaEvaluation?.passed_count !== undefined 
    ? opaEvaluation.passed_count 
    : (isPassed ? totalRules : Math.max(0, totalRules - violations.length));

  return (
    <div className={`ref-dark-card rounded-[28px] p-5 sm:p-6 shadow-xl transition-all flex flex-col justify-between ${
      !hasEvaluated || opaStatus === "IDLE"
        ? ""
        : isPassed 
          ? "border-green-500/30" 
          : "border-red-500/40 bg-[#1a1114]"
    }`}>
      <div>
        {/* Main Panel Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm ${
              isPassed ? "bg-[#142318] text-[#b8ff22] border border-[#b8ff22]/30" :
              isFailed ? "bg-[#2a1417] text-red-400 border border-red-500/30" :
              "bg-[#161a24] text-slate-400 border border-white/[0.08]"
            }`}>
              {isPassed ? (
                <ShieldCheck className="w-4 h-4" />
              ) : isFailed ? (
                <ShieldAlert className="w-4 h-4" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-black text-white uppercase tracking-wider font-sans">Dual-Layer Security Gate</h3>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 font-bold">
                  Layer 1 (AST) + Layer 2 (OPA)
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Static HCL Analysis & Rego Zero-Trust Guardrails</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSandbox(!showSandbox)}
              className={`text-xs px-3.5 py-1.5 rounded-full border flex items-center space-x-1.5 transition-colors font-bold shadow-sm ${
                showSandbox 
                  ? "bg-[#b8ff22] text-black border-[#b8ff22]" 
                  : "bg-[#171b26] hover:bg-[#202636] text-slate-200 border-white/[0.08]"
              }`}
              title="Configure active compliance rules"
            >
              <Sliders className={`w-3.5 h-3.5 ${showSandbox ? "text-black" : "text-[#b8ff22]"}`} />
              <span>{showSandbox ? "Hide Sandbox" : "Rule Sandbox"}</span>
            </button>

            {hasEvaluated && opaStatus !== "IDLE" && (
              <span className={`text-xs font-mono font-black px-2.5 py-1 rounded-full ${
                isPassed 
                  ? "bg-[#16291a] text-[#b8ff22] border border-[#b8ff22]/30" 
                  : "bg-[#2c1417] text-red-400 border border-red-500/30"
              }`}>
                {isPassed ? "ALL GATES PASSED" : "GATE BLOCKED"}
              </span>
            )}
          </div>
        </div>

        {/* Security Layers Evaluation Breakdown */}
        {!hasEvaluated || opaStatus === "IDLE" ? (
          <p className="text-xs text-slate-500 font-mono py-3">
            Awaiting pipeline synthesis to execute static scanner and OPA security guardrails...
          </p>
        ) : (
          <div className="space-y-3">
            {/* LAYER 1: Static Terraform Security Scanner (Checkov / AST Rules) */}
            <div className={`p-3.5 rounded-2xl border ${
              staticPassed 
                ? "bg-[#101913] border-green-500/20" 
                : "bg-[#241215] border-red-500/30"
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <SearchCheck className={`w-4 h-4 ${staticPassed ? "text-[#b8ff22]" : "text-red-400"}`} />
                  <span className="text-xs font-black text-white font-mono uppercase">
                    Layer 1: Static HCL Scanner (Checkov / AST)
                  </span>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  staticPassed ? "bg-green-500/20 text-[#b8ff22] border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}>
                  {staticPassed ? "0 Findings (PASSED)" : `${staticFindings.length} Finding(s)`}
                </span>
              </div>

              {staticPassed ? (
                <p className="text-[11px] text-green-400/90 font-mono">
                  ✓ {staticResult?.summary || "All static AST and Checkov security checks passed cleanly."}
                </p>
              ) : (
                <div className="space-y-1 mt-2">
                  <p className="text-[11px] text-red-300 font-mono font-bold">
                    ✕ Static Scanner blocked deploy on {staticFindings.length} issue(s):
                  </p>
                  <ul className="space-y-1 font-mono text-[11px] text-red-300">
                    {staticFindings.map((f, i) => (
                      <li key={i} className="flex items-start space-x-1.5 bg-[#12080a] p-2 rounded-xl border border-red-500/20">
                        <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 text-[9px] font-bold shrink-0 mt-0.5">
                          {f.check_id || "FINDING"}
                        </span>
                        <div className="flex-1">
                          <span className="font-bold text-red-200">{f.check_name}</span>
                          <span className="text-[10px] text-red-400/80 block">{f.details}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* LAYER 2: OPA Policy Gate (Rego Zero-Trust Compliance) */}
            <div className={`p-3.5 rounded-2xl border ${
              isOpaAllow 
                ? "bg-[#101913] border-green-500/20" 
                : "bg-[#241215] border-red-500/30"
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <Lock className={`w-4 h-4 ${isOpaAllow ? "text-[#b8ff22]" : "text-red-400"}`} />
                  <span className="text-xs font-black text-white font-mono uppercase">
                    Layer 2: Policy Gate (OPA Rego Zero-Trust)
                  </span>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  isOpaAllow ? "bg-green-500/20 text-[#b8ff22] border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}>
                  {isOpaAllow ? `${passedRules}/${totalRules} Rules Passed` : `${opaViolationsList.length} Deny Rule(s)`}
                </span>
              </div>

              {isOpaAllow ? (
                <p className="text-[11px] text-green-400/90 font-mono">
                  ✓ {opaEvaluation?.summary || `${passedRules}/${totalRules} active Rego policies satisfied (0 denied resources).`}
                </p>
              ) : (
                <div className="space-y-1 mt-2">
                  <p className="text-[11px] text-red-300 font-mono font-bold">
                    ✕ Rego Zero-Trust compliance denied deployment:
                  </p>
                  <ul className="space-y-1 font-mono text-[11px] text-red-300 bg-[#12080a] p-2 rounded-xl border border-red-500/20">
                    {opaViolationsList.map((v, i) => (
                      <li key={i} className="flex items-center space-x-1.5">
                        <span className="text-red-400 font-bold shrink-0">DENY:</span>
                        <span>{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Compliance Rule Sandbox Drawer */}
      {showSandbox && (
        <div className="mt-4 pt-4 border-t border-white/[0.08] space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
            <span>Configurable Policy Rules</span>
            <span className="text-[#b8ff22] font-black">Interactive Sandbox</span>
          </div>

          <div className="space-y-2 font-mono">
            {policies.map((p) => {
              const ruleDetail = opaEvaluation?.rules?.find(r => r.id === p.id);
              const ruleViolated = ruleDetail?.status === "VIOLATED";

              return (
                <div 
                  key={p.id}
                  onClick={() => onTogglePolicy(p.id, !p.enabled)}
                  className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                    ruleViolated 
                      ? "bg-[#201014] border-red-500/40 hover:bg-[#281418]" 
                      : "bg-[#0c0e14] hover:bg-[#141822] border-white/[0.06]"
                  }`}
                >
                  <div className="pr-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-xs">{p.name}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 uppercase font-mono">
                        {p.category}
                      </span>
                      {hasEvaluated && p.enabled && (
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          ruleViolated 
                            ? "bg-red-500 text-white" 
                            : "bg-green-500/20 text-green-400 border border-green-500/30"
                        }`}>
                          {ruleViolated ? "VIOLATION" : "PASSED"}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight mt-1 font-sans">{p.description}</p>
                  </div>
                  <div className="shrink-0">
                    {p.enabled ? (
                      <span className="text-xs font-black px-3 py-1 rounded-full bg-[#b8ff22] text-black shadow-md shadow-[#b8ff22]/20">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 font-bold px-3 py-1 rounded-full bg-white/5 border border-white/10">
                        DISABLED
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}