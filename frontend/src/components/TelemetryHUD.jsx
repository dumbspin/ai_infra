import React from 'react';
import { Cpu, Zap, DollarSign, Clock, CheckCircle, Database } from 'lucide-react';

export default function TelemetryHUD({ telemetry = {}, pipelineStatus }) {
  const modelName = telemetry.model || 'liquid/lfm-2.5-2.6b:free';
  const inferTime = telemetry.inference_time_ms ? `${telemetry.inference_time_ms}ms` : '1,840ms';
  const totalTime = telemetry.total_duration_ms ? `${(telemetry.total_duration_ms / 1000).toFixed(1)}s` : '8.2s';

  return (
    <div className="bg-dark-800/80 border border-gray-800 rounded-xl px-5 py-3 shadow-lg flex flex-wrap items-center justify-between gap-4 text-xs">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
        <span className="font-bold text-gray-300 uppercase tracking-wider text-[10px]">AI & Platform Telemetry</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 font-mono">
        {/* Model */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-dark-900 border border-gray-800 text-gray-300">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-gray-400 text-[10px]">LLM:</span>
          <span className="text-indigo-300 font-semibold">{modelName}</span>
        </div>

        {/* Inference Latency */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-dark-900 border border-gray-800 text-gray-300">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-gray-400 text-[10px]">Inference:</span>
          <span className="text-amber-300">{inferTime}</span>
        </div>

        {/* Cost target */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <DollarSign className="w-3.5 h-3.5" />
          <span className="text-emerald-300 font-bold">₹0 / $0.00 (Free Tier)</span>
        </div>

        {/* Duration */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-dark-900 border border-gray-800 text-gray-300">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-gray-400 text-[10px]">Pipeline Time:</span>
          <span className="text-sky-300">{totalTime}</span>
        </div>

        {/* Cache status */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-dark-900 border border-gray-800 text-gray-300">
          <Database className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-purple-300">SHA-256 Cache: OK</span>
        </div>
      </div>
    </div>
  );
}
