import React from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PolicyPanel({ opaStatus, violations = [] }) {
  const isPassed = opaStatus === 'SUCCESS' && violations.length === 0;
  const isFailed = opaStatus === 'FAILED' || violations.length > 0;

  if (opaStatus === 'IDLE') {
    return (
      <div className="bg-dark-800 rounded-xl border border-gray-800 p-5 shadow-xl">
        <div className="flex items-center space-x-2 text-sm font-semibold text-gray-400">
          <ShieldCheck className="w-4 h-4 text-gray-500" />
          <span>OPA Security Policy Gate</span>
        </div>
        <p className="text-xs text-gray-500 mt-2 font-mono">Awaiting pipeline run to evaluate security policies...</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-5 shadow-xl transition-all ${
      isPassed 
        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' 
        : 'bg-rose-950/20 border-rose-500/30 text-rose-400'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2 text-sm font-bold tracking-tight">
          {isPassed ? <ShieldCheck className="w-5 h-5 text-emerald-400" /> : <ShieldAlert className="w-5 h-5 text-rose-400" />}
          <span>POLICY CHECK</span>
        </div>
        <span className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full ${
          isPassed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
        }`}>
          Violations: {violations.length}
        </span>
      </div>

      {isPassed ? (
        <div className="flex items-center space-x-2 text-xs font-mono text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>✓ OPA validation passed cleanly (0 security policy violations).</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>✕ Deployment Blocked by OPA Policy Gate</span>
          </div>
          <ul className="text-xs font-mono list-disc list-inside space-y-1 bg-black/40 p-3 rounded-lg border border-rose-500/20">
            {violations.map((v, idx) => (
              <li key={idx} className="text-rose-300">{v}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
