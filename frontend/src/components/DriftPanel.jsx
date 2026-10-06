import React from "react";
import { AlertTriangle, CheckCircle2, Flame, Trash2, Zap } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export default function DriftPanel({ driftResult, onSimulateDrift, onCleanDrift, onReconcileDrift, isSimulating, isReconciling }) {
  const isDrifted = driftResult?.drift_detected;
  const items = driftResult?.items || [];

  return (
    <Card className={`rounded-3xl p-6 shadow-sm border transition-all ${
      isDrifted 
        ? "border-red-300 bg-red-50/30" 
        : "border-slate-200 bg-white"
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm ${
            isDrifted 
              ? "bg-red-100 text-red-600 border border-red-200" 
              : "bg-green-100 text-green-700 border border-green-200"
          }`}>
            {isDrifted ? (
              <AlertTriangle className="w-4 h-4 animate-bounce" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Drift Detection & Self-Healing Engine</h3>
              {isDrifted ? (
                <Badge variant="destructive" className="animate-pulse font-mono">
                  DRIFT DETECTED
                </Badge>
              ) : (
                <Badge variant="success" className="font-mono">
                  ZERO DRIFT
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-mono">Continuous runtime state comparison against declared YAML spec</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isDrifted && (
            <Button
              onClick={onReconcileDrift}
              disabled={isReconciling}
              variant="secondary"
              className="rounded-xl font-black gap-1.5 shadow-md shadow-green-600/20 bg-green-600 hover:bg-green-700 text-white animate-pulse"
              title="Autonomous self-healing: prunes untracked containers"
            >
              <Zap className={`w-3.5 h-3.5 fill-current ${isReconciling ? "animate-spin" : ""}`} />
              <span>{isReconciling ? "Self-Healing..." : "⚡ Auto-Reconcile & Self-Heal"}</span>
            </Button>
          )}

          {isDrifted && (
            <Button
              onClick={onCleanDrift}
              variant="outline"
              size="sm"
              className="rounded-xl font-bold gap-1 text-slate-700"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Prune Container</span>
            </Button>
          )}

          <Button
            onClick={onSimulateDrift}
            disabled={isSimulating}
            variant="outline"
            className="rounded-xl font-bold gap-1.5 bg-red-50 text-red-700 border-red-200 hover:bg-red-100 shadow-sm"
          >
            <Flame className="w-3.5 h-3.5 fill-current text-red-600" />
            <span>{isSimulating ? "Injecting..." : "Simulate Drift"}</span>
          </Button>
        </div>
      </div>

      {!isDrifted ? (
        <div className="flex items-center space-x-2.5 text-xs font-mono text-green-800 bg-green-50 p-3 rounded-2xl border border-green-200">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span>✓ Zero Drift Detected — Real-time Docker daemon state is 100% compliant with declared architecture.</span>
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          <div className="space-y-2 bg-white p-4 rounded-2xl border border-red-200 text-xs font-mono shadow-inner">
            {items.map((item, idx) => (
              <div key={idx} className="flex flex-col space-y-1 pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                <div className="flex items-center space-x-2">
                  <Badge variant="destructive" className="text-[9px] uppercase font-black">
                    {item.type}
                  </Badge>
                  <span className="text-slate-900 font-bold">{item.resource}</span>
                </div>
                {item.type === "count_mismatch" && (
                  <p className="text-slate-600 pl-2">Expected Replicas: <strong className="text-slate-900">{item.expected}</strong> | Actual Running: <strong className="text-red-600">{item.actual}</strong></p>
                )}
                {item.type === "unmanaged_resource" && (
                  <p className="text-slate-600 pl-2">Rogue untracked container detected in <strong className="text-red-600">{item.source || "docker"}</strong> daemon</p>
                )}
                {item.type === "config_drift" && (
                  <p className="text-slate-600 pl-2">Field '{item.field}' mismatch: expected <strong className="text-slate-900">{String(item.expected)}</strong>, actual <strong className="text-red-600">{String(item.actual)}</strong></p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}