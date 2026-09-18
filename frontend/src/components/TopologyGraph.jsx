import React from 'react';
import { Network, Server, Database, Globe, Cpu, Layers, CheckCircle2, AlertCircle } from 'lucide-react';

export default function TopologyGraph({ containers = [], specServices = {} }) {
  const frontendContainers = containers.filter(c => c.resource.includes('frontend') || c.resource.includes('gateway'));
  const backendContainers = containers.filter(c => c.resource.includes('backend') || c.resource.includes('api') || c.resource.includes('auth'));
  const databaseContainers = containers.filter(c => c.resource.includes('database') || c.resource.includes('db') || c.resource.includes('postgres') || c.resource.includes('redis'));
  const otherContainers = containers.filter(c => 
    !c.resource.includes('frontend') && !c.resource.includes('gateway') &&
    !c.resource.includes('backend') && !c.resource.includes('api') && !c.resource.includes('auth') &&
    !c.resource.includes('database') && !c.resource.includes('db') && !c.resource.includes('postgres') && !c.resource.includes('redis')
  );

  return (
    <div className="bg-dark-800 rounded-xl border border-gray-800 p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Network className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Live Infrastructure Topology</h3>
        </div>
        <div className="flex items-center space-x-2 text-[11px] font-mono text-gray-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Docker Bridge Network (Active)</span>
        </div>
      </div>

      {/* Visual Topology Diagram */}
      <div className="relative bg-dark-950/80 border border-gray-800/80 rounded-xl p-6 overflow-hidden">
        {/* Ambient Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          
          {/* Node 1: Ingress / Client Gateway */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
              <Globe className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-bold text-gray-200 block">External Ingress</span>
              <span className="text-[10px] font-mono text-indigo-400">Port :80 / TCP</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
              Public Ingress Protected
            </span>
          </div>

          {/* Node 2: Frontend Tier */}
          <div className="bg-dark-900/90 border border-gray-800 rounded-xl p-4 space-y-2.5 hover:border-indigo-500/40 transition-all shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-200">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>Frontend Tier</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                {frontendContainers.length || 2} Replicas
              </span>
            </div>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="text-gray-400 flex items-center justify-between">
                <span>Image:</span>
                <span className="text-gray-200">nginx:1.25</span>
              </div>
              <div className="text-gray-400 flex items-center justify-between">
                <span>Memory:</span>
                <span className="text-gray-200">256Mi</span>
              </div>
            </div>
            <div className="pt-1 flex flex-wrap gap-1">
              {frontendContainers.length > 0 ? (
                frontendContainers.map(c => (
                  <span key={c.resource} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-dark-950 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>{c.resource}</span>
                  </span>
                ))
              ) : (
                <span className="text-[9px] text-gray-500 italic">2 containers expected</span>
              )}
            </div>
          </div>

          {/* Node 3: Backend API Tier */}
          <div className="bg-dark-900/90 border border-gray-800 rounded-xl p-4 space-y-2.5 hover:border-indigo-500/40 transition-all shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-200">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Backend Services</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {backendContainers.length || 2} Replicas
              </span>
            </div>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="text-gray-400 flex items-center justify-between">
                <span>Runtime:</span>
                <span className="text-gray-200">node:20-alpine</span>
              </div>
              <div className="text-gray-400 flex items-center justify-between">
                <span>IPC Network:</span>
                <span className="text-gray-200">Bridge</span>
              </div>
            </div>
            <div className="pt-1 flex flex-wrap gap-1">
              {backendContainers.length > 0 ? (
                backendContainers.map(c => (
                  <span key={c.resource} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-dark-950 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>{c.resource}</span>
                  </span>
                ))
              ) : (
                <span className="text-[9px] text-gray-500 italic">2 containers expected</span>
              )}
            </div>
          </div>

          {/* Node 4: Database Tier */}
          <div className="bg-dark-900/90 border border-gray-800 rounded-xl p-4 space-y-2.5 hover:border-indigo-500/40 transition-all shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-200">
                <Database className="w-4 h-4 text-amber-400" />
                <span>Database Tier</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {databaseContainers.length || 1} Primary
              </span>
            </div>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="text-gray-400 flex items-center justify-between">
                <span>Engine:</span>
                <span className="text-gray-200">postgres:16</span>
              </div>
              <div className="text-gray-400 flex items-center justify-between">
                <span>Port:</span>
                <span className="text-gray-200">5432 / TCP</span>
              </div>
            </div>
            <div className="pt-1 flex flex-wrap gap-1">
              {databaseContainers.length > 0 ? (
                databaseContainers.map(c => (
                  <span key={c.resource} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-dark-950 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>{c.resource}</span>
                  </span>
                ))
              ) : (
                <span className="text-[9px] text-gray-500 italic">1 container expected</span>
              )}
            </div>
          </div>

        </div>

        {/* Rogue / Drift Alert */}
        {otherContainers.length > 0 && (
          <div className="mt-4 pt-3 border-t border-rose-500/30 flex items-center justify-between bg-rose-950/20 px-3 py-2 rounded-lg">
            <div className="flex items-center space-x-2 text-rose-400 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Unmanaged / Rogue Containers Detected in Topology:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {otherContainers.map(c => (
                <span key={c.resource} className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {c.resource} ({c.image})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
