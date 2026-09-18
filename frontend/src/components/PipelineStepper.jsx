import React from 'react';
import { Check, Loader2, X, Circle } from 'lucide-react';

const STAGES = [
  { id: 'specification', label: 'Spec' },
  { id: 'ai_compiler', label: 'AI Compilation' },
  { id: 'terraform', label: 'Terraform' },
  { id: 'opa_policy', label: 'OPA Policy' },
  { id: 'deployment', label: 'Deployment' },
  { id: 'drift_check', label: 'Drift Check' },
];

export default function PipelineStepper({ steps, currentStep, pipelineStatus, logs = [] }) {
  const getStageIcon = (status) => {
    switch (status) {
      case 'SUCCESS':
        return <Check className="w-4 h-4 text-emerald-400" />;
      case 'RUNNING':
        return <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />;
      case 'FAILED':
        return <X className="w-4 h-4 text-rose-400" />;
      default:
        return <Circle className="w-3 h-3 text-gray-600" />;
    }
  };

  const getStageStyle = (status) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'RUNNING':
        return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 ring-2 ring-indigo-500/20';
      case 'FAILED':
        return 'bg-rose-500/10 border-rose-500/30 text-rose-400';
      default:
        return 'bg-gray-800/60 border-gray-800 text-gray-500';
    }
  };

  return (
    <div className="bg-dark-800 rounded-xl border border-gray-800 p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Pipeline Execution Stepper</h3>
        <span className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full ${
          pipelineStatus === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
          pipelineStatus === 'FAILED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
          pipelineStatus === 'RUNNING' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 animate-pulse' :
          'bg-gray-800 text-gray-400'
        }`}>
          {pipelineStatus}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAGES.map((stage, idx) => {
          const status = steps[stage.id] || 'IDLE';
          return (
            <div
              key={stage.id}
              className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${getStageStyle(status)}`}
            >
              <div className="shrink-0">{getStageIcon(status)}</div>
              <div className="truncate">
                <span className="font-semibold block truncate">{stage.label}</span>
                <span className="text-[10px] opacity-75 capitalize font-mono block">{status.toLowerCase()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {logs && logs.length > 0 && (
        <div className="bg-dark-950 border border-gray-800/80 rounded-lg p-3 font-mono text-[11px] text-gray-300 max-h-36 overflow-y-auto space-y-1">
          <div className="text-[10px] uppercase font-bold text-gray-500 mb-1 border-b border-gray-800 pb-1 flex justify-between items-center">
            <span>Live Pipeline Output</span>
            <span className="text-[9px] text-gray-600">{logs.length} events logged</span>
          </div>
          {logs.map((line, idx) => (
            <div key={idx} className={`leading-relaxed ${line.includes('ERROR') ? 'text-rose-400 font-semibold' : line.includes('passed') || line.includes('SUCCESS') || line.includes('completed') || line.includes('cleanly') ? 'text-emerald-400' : 'text-gray-300'}`}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
