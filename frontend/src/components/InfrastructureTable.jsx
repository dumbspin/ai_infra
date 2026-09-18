import React from 'react';
import { Container, RefreshCw } from 'lucide-react';

export default function InfrastructureTable({ containers = [], onRefresh, isLoading }) {
  return (
    <div className="bg-dark-800 rounded-xl border border-gray-800 shadow-xl overflow-hidden">
      {/* Table Header */}
      <div className="px-5 py-3 bg-dark-700/40 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm font-semibold text-white">
          <Container className="w-4 h-4 text-emerald-400" />
          <span>Live Infrastructure (Docker Containers)</span>
          <span className="text-xs text-gray-400 font-mono">({containers.length} active)</span>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="text-xs text-gray-400 hover:text-white flex items-center space-x-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="bg-dark-900/60 border-b border-gray-800 text-gray-400 uppercase text-[10px] tracking-wider">
              <th className="py-3 px-5 font-semibold">Resource Name</th>
              <th className="py-3 px-5 font-semibold">Image Tag</th>
              <th className="py-3 px-5 font-semibold text-center">Desired</th>
              <th className="py-3 px-5 font-semibold text-center">Actual</th>
              <th className="py-3 px-5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 text-gray-300">
            {containers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500 font-sans">
                  No active containers detected. Run the pipeline to deploy infrastructure.
                </td>
              </tr>
            ) : (
              containers.map((c, idx) => (
                <tr key={idx} className="hover:bg-dark-700/20 transition-colors">
                  <td className="py-3 px-5 font-semibold text-white">{c.resource}</td>
                  <td className="py-3 px-5 text-gray-400">{c.image}</td>
                  <td className="py-3 px-5 text-center text-gray-400">{c.desired}</td>
                  <td className="py-3 px-5 text-center text-emerald-400 font-bold">{c.actual}</td>
                  <td className="py-3 px-5">
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{c.status}</span>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
