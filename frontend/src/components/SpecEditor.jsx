import React, { useState } from 'react';
import { Play, CheckCircle2, XCircle, RotateCcw, ShieldCheck, FileCode2 } from 'lucide-react';

const DEFAULT_SPEC = `spec_version: "1.0"
application: ecommerce
environment: development
services:
  frontend:
    replicas: 2
    image: nginx:1.25
    resources:
      cpu: "0.5"
      memory: "256Mi"
  backend:
    replicas: 2
    image: node:20-alpine
  database:
    replicas: 1
    image: postgres:16
security:
  public_access: false
  ssh: false
metadata:
  owner: ayush
  created_at: "2026-09-18T00:00:00Z"`;

export default function SpecEditor({ specText, setSpecText, onValidate, onRunPipeline, validationResult, isRunning }) {
  const lineCount = specText.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="bg-dark-800 rounded-xl border border-gray-800 shadow-xl overflow-hidden flex flex-col">
      {/* Panel Header */}
      <div className="bg-dark-700/50 px-5 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm font-semibold text-white">
          <FileCode2 className="w-4 h-4 text-indigo-400" />
          <span>Specification Editor</span>
          <span className="text-xs text-gray-400 font-mono font-normal">(infrastructure.yaml)</span>
        </div>
        <button
          onClick={() => setSpecText(DEFAULT_SPEC)}
          className="text-xs text-gray-400 hover:text-white flex items-center space-x-1 transition-colors"
          title="Reset to default eCommerce spec"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Example</span>
        </button>
      </div>

      {/* Editor Body with Line Numbers */}
      <div className="flex-1 flex bg-dark-900/60 font-mono text-xs overflow-hidden relative">
        {/* Line Numbers */}
        <div className="py-4 px-3 bg-dark-900/80 text-gray-600 text-right select-none border-r border-gray-800/60 w-12 font-mono">
          {lineNumbers.map((num) => (
            <div key={num} className="leading-6">{num}</div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          value={specText}
          onChange={(e) => setSpecText(e.target.value)}
          spellCheck="false"
          className="flex-1 py-4 px-4 bg-transparent text-gray-200 resize-none focus:outline-none leading-6 code-font whitespace-pre font-mono"
          style={{ tabSize: 2 }}
        />
      </div>

      {/* Validation Feedback Banner */}
      {validationResult && (
        <div className={`px-5 py-2.5 border-t text-xs font-mono flex items-center space-x-2 ${
          validationResult.valid 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          {validationResult.valid ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{validationResult.message}</span>
        </div>
      )}

      {/* Action Footer Buttons */}
      <div className="bg-dark-800 px-5 py-3 border-t border-gray-800 flex items-center justify-between gap-3">
        <button
          onClick={onValidate}
          disabled={isRunning}
          className="px-4 py-2 bg-gray-700/60 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-lg transition-colors border border-gray-600/50 flex items-center space-x-2 disabled:opacity-50"
        >
          <ShieldCheck className="w-4 h-4 text-gray-400" />
          <span>Validate Specification</span>
        </button>

        <button
          onClick={onRunPipeline}
          disabled={isRunning}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/20 transition-all flex items-center space-x-2 disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isRunning ? 'Running Pipeline...' : 'Run Infrastructure Pipeline'}</span>
        </button>
      </div>
    </div>
  );
}
