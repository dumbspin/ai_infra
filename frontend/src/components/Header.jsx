import React from 'react';
import { Server, Activity, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Header({ dockerOnline, pipelineStatus }) {
  return (
    <header className="border-b border-gray-800 bg-dark-800/80 backdrop-blur px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-50">
      <div className="flex items-center space-x-3">
        <div className="bg-indigo-600/20 p-2 rounded-lg border border-indigo-500/30 text-indigo-400">
          <Server className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            SDD-INFRA <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">v2.0</span>
          </h1>
          <p className="text-xs text-gray-400">AI-Assisted Specification Driven Infrastructure Management</p>
        </div>
      </div>

      <div className="flex items-center space-x-4 text-xs font-medium">
        {/* Docker Connection Status */}
        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border ${
          dockerOnline 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${dockerOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
          <span>{dockerOnline ? 'Docker Online' : 'Docker Offline'}</span>
        </div>

        {/* Pipeline Status */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300">
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          <span>Pipeline: <strong className="text-white uppercase font-mono">{pipelineStatus}</strong></span>
        </div>
      </div>
    </header>
  );
}
