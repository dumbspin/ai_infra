import React from 'react';
import { AlertTriangle, CheckCircle2, Flame, Trash2, RefreshCw } from 'lucide-react';

export default function DriftPanel({ driftResult, onSimulateDrift, onCleanDrift, onReconcileDrift, isSimulating, isReconciling }) {
  const isDrifted = driftResult?.drift_detected;
  const items = driftResult?.items || [];
  const reconciledActions = driftResult?.reconciled_actions || [];

  return (
    <div className={`rounded-xl border p-5 shadow-xl transition-all ${
      isDrifted 
        ? 'bg-amber-950/20 border-amber-500/40 text-amber-300' 
        : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center space-x-2 text-sm font-bold tracking-tight">
          {isDrifted ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 animate-bounce" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          )}
          <span>DRIFT STATUS & RECONCILIATION ENGINE</span>
        </div>

        <div className="flex items-center space-x-2">
          {isDrifted && (
            <button
              onClick={onReconcileDrift}
              disabled={isReconciling}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-emerald-600/20 flex items-center space-x-1.5 transition-colors disabled:opacity-50 animate-pulse"
              title="Automatically heal infrastructure back to specification"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />
              <span>{isReconciling ? 'Reconciling...' : '⚡ Auto-Reconcile & Self-Heal'}</span>
            </button>
          )}

          {isDrifted && (
            <button
              onClick={onCleanDrift}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-lg border border-gray-700 flex items-center space-x-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-gray-400" />
              <span>Prune Container</span>
            </button>
          )}

          <button
            onClick={onSimulateDrift}
            disabled={isSimulating}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs rounded-lg shadow-lg shadow-amber-600/20 flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            <Flame className="w-4 h-4 fill-current" />
            <span>{isSimulating ? 'Simulating...' : 'Simulate Drift'}</span>
          </button>
        </div>
      </div>

      {!isDrifted ? (
        <div className="flex items-center space-x-2 text-xs font-mono text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>✓ No Drift Detected — Desired infrastructure specification matches live Docker state.</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs font-mono font-bold text-amber-300">
            <span>🚨 DRIFT DETECTED IN LIVE INFRASTRUCTURE</span>
          </div>

          <div className="space-y-2 bg-black/50 p-4 rounded-lg border border-amber-500/30 text-xs font-mono">
            {items.map((item, idx) => (
              <div key={idx} className="flex flex-col space-y-1 pb-2 border-b border-gray-800 last:border-0 last:pb-0">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] uppercase font-bold">
                    {item.type}
                  </span>
                  <span className="text-white font-semibold">{item.resource}</span>
                </div>
                {item.type === 'count_mismatch' && (
                  <p className="text-gray-400 pl-2">Expected Replicas: <strong className="text-white">{item.expected}</strong> | Actual Running: <strong className="text-amber-400">{item.actual}</strong></p>
                )}
                {item.type === 'unmanaged_resource' && (
                  <p className="text-gray-400 pl-2">Unmanaged container detected in <strong className="text-amber-400">{item.source || 'docker'}</strong> daemon</p>
                )}
                {item.type === 'config_drift' && (
                  <p className="text-gray-400 pl-2">Field '{item.field}' mismatch: expected <strong className="text-white">{String(item.expected)}</strong>, actual <strong className="text-amber-400">{String(item.actual)}</strong></p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
