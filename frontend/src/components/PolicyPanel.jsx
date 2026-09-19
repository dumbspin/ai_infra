import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, AlertCircle, Sliders, ToggleLeft, ToggleRight } from 'lucide-react';

export default function PolicyPanel({ opaStatus, violations = [], policies = [], onTogglePolicy }) {
  const [showSandbox, setShowSandbox] = useState(false);
  const isPassed = opaStatus === 'SUCCESS' && violations.length === 0;
  const isFailed = opaStatus === 'FAILED' || violations.length > 0;

  return (
    <div className={`rounded-xl border p-5 shadow-xl transition-all flex flex-col justify-between ${
      opaStatus === 'IDLE'
        ? 'bg-dark-800 border-gray-800 text-gray-400'
        : isPassed 
          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' 
          : 'bg-rose-950/20 border-rose-500/30 text-rose-400'
    }`}>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 text-sm font-bold tracking-tight">
            {isPassed ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : isFailed ? (
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-gray-500" />
            )}
            <span className="text-gray-200 uppercase font-semibold text-xs">OPA Policy Gate</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSandbox(!showSandbox)}
              className="text-[11px] px-2 py-0.5 rounded bg-dark-900 hover:bg-dark-700 text-gray-300 border border-gray-700 flex items-center space-x-1 transition-colors"
              title="Configure active compliance rules"
            >
              <Sliders className="w-3 h-3 text-indigo-400" />
              <span>{showSandbox ? 'Hide Rules' : 'Rule Sandbox'}</span>
            </button>

            {opaStatus !== 'IDLE' && (
              <span className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full ${
                isPassed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                Violations: {violations.length}
              </span>
            )}
          </div>
        </div>

        {/* Evaluation Output */}
        {opaStatus === 'IDLE' ? (
          <p className="text-xs text-gray-500 font-mono">Awaiting pipeline run to evaluate security policies...</p>
        ) : isPassed ? (
          <div className="flex items-center space-x-2 text-xs font-mono text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>✓ OPA validation passed cleanly (0 security policy violations).</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>✕ Deployment Blocked by OPA Security Guardrails</span>
            </div>
            <ul className="text-xs font-mono list-disc list-inside space-y-1 bg-black/40 p-3 rounded-lg border border-rose-500/20 max-h-32 overflow-y-auto">
              {violations.map((v, idx) => (
                <li key={idx} className="text-rose-300">{v}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Interactive Compliance Rule Sandbox Drawer */}
      {showSandbox && (
        <div className="mt-4 pt-3 border-t border-gray-800/80 space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono">
            <span>Active Compliance Guardrails</span>
            <span className="text-[10px] text-indigo-400">Live Sandbox</span>
          </div>

          <div className="space-y-2 font-mono">
            {policies.map((p) => (
              <div 
                key={p.id}
                onClick={() => onTogglePolicy(p.id, !p.enabled)}
                className="flex items-center justify-between p-2 rounded-lg bg-dark-950/80 border border-gray-800/80 hover:border-gray-700 cursor-pointer transition-all"
              >
                <div className="pr-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-200 text-xs">{p.name}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{p.category}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{p.description}</p>
                </div>
                <div className="shrink-0">
                  {p.enabled ? (
                    <span className="text-xs text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">ACTIVE</span>
                  ) : (
                    <span className="text-xs text-gray-500 font-bold px-2 py-0.5 rounded bg-gray-800 border border-gray-700">DISABLED</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

