import React from 'react';
import { Server, Activity, Download, Cloud, Layers, Box } from 'lucide-react';

const TARGETS = [
  { id: 'docker', label: 'Docker (Local)', icon: Box },
  { id: 'aws_ecs', label: 'AWS ECS (Fargate)', icon: Cloud },
  { id: 'kubernetes', label: 'Kubernetes', icon: Layers },
];

export default function Header({ dockerOnline, pipelineStatus, selectedTarget = 'docker', onSelectTarget, onExportBundle }) {
  return (
    <header className="border-b border-gray-800 bg-dark-800/80 backdrop-blur px-6 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sticky top-0 z-50">
      <div className="flex items-center space-x-3">
        <div className="bg-indigo-600/20 p-2 rounded-lg border border-indigo-500/30 text-indigo-400">
          <Server className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            SDD-INFRA <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">v2.0</span>
          </h1>
          <p className="text-xs text-gray-400">Specification Driven Multi-Cloud Infrastructure Management</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
        {/* Multi-Cloud Target Switcher */}
        <div className="flex items-center space-x-1 bg-dark-900 p-1 rounded-lg border border-gray-800">
          <span className="text-[10px] uppercase font-bold text-gray-500 px-2">Target:</span>
          {TARGETS.map((t) => {
            const Icon = t.icon;
            const isSelected = selectedTarget === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onSelectTarget(t.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-dark-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* 1-Click Export Bundle Button */}
        <button
          onClick={onExportBundle}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-dark-900 hover:bg-dark-700 text-gray-200 border border-gray-700 hover:border-gray-600 shadow-sm transition-all text-xs font-semibold"
          title={`Download complete ${selectedTarget.toUpperCase()} Terraform, Spec & CI/CD bundle as .zip`}
        >
          <Download className="w-3.5 h-3.5 text-indigo-400" />
          <span>Export Bundle (.zip)</span>
        </button>

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
          <span>Status: <strong className="text-white uppercase font-mono">{pipelineStatus}</strong></span>
        </div>
      </div>
    </header>
  );
}
