import React, { useState } from 'react';
import { Cpu, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

export default function ResourcePlanPanel({ resourcePlan }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(resourcePlan, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-dark-800 rounded-xl border border-gray-800 shadow-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3 bg-dark-700/40 hover:bg-dark-700/70 border-b border-gray-800 flex items-center justify-between text-left transition-colors"
      >
        <div className="flex items-center space-x-2 text-sm font-semibold text-white">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>AI Candidate Resource Plan</span>
          <span className="text-xs text-gray-400 font-mono font-normal">
            ({resourcePlan?.resources?.length || 0} resources declaration schema)
          </span>
        </div>
        <div className="flex items-center space-x-2 text-gray-400">
          <span className="text-xs font-mono">{isOpen ? 'Hide JSON' : 'Expand JSON'}</span>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 bg-dark-900/80 relative">
          <button
            onClick={handleCopy}
            className="absolute top-6 right-6 p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 text-xs flex items-center space-x-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <pre className="text-xs font-mono text-cyan-300 overflow-x-auto p-4 bg-black/40 rounded-lg border border-gray-800 max-h-80 leading-5">
            {jsonString}
          </pre>
        </div>
      )}
    </div>
  );
}
