import React, { useState } from "react";
import { 
  Server, ShieldCheck, Database, Layers, Radio, Activity, 
  ArrowRight, AlertTriangle, CheckCircle2, Box, Cpu, Zap, 
  ExternalLink, CheckSquare, CornerDownRight, X, ChevronRight, Info
} from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export default function TopologyGraph({ containers = [] }) {
  const [selectedNode, setSelectedNode] = useState(null);

  // Compute live container counts
  const frontendUnits = containers.filter(c => c.resource === "frontend" && c.status === "RUNNING").length;
  const backendUnits = containers.filter(c => c.resource === "backend" && c.status === "RUNNING").length;
  const dbUnits = containers.filter(c => c.resource === "database" && c.status === "RUNNING").length;
  const driftContainers = containers.filter(c => c.status === "DRIFT");
  const isDrifted = driftContainers.length > 0;
  const hasRunningContainers = containers.length > 0;

  return (
    <Card className="rounded-3xl p-5 sm:p-7 shadow-sm border-slate-200 overflow-hidden flex flex-col relative">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shadow-sm">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-black tracking-tight text-slate-900 uppercase">
                Interactive Infrastructure Topology
              </h3>
              <Badge variant="warning" className="text-[10px] font-mono font-bold bg-orange-50 text-orange-700 border-orange-200">
                LIVE GRAPH
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Real-time declarative workflow architecture and deterministic dependency graph
            </p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 shadow-sm">
            <span className={`w-2 h-2 rounded-full ${hasRunningContainers ? "bg-green-500 animate-pulse" : "bg-amber-400"}`} />
            <span className="text-slate-700 font-bold text-[11px]">
              {hasRunningContainers ? `${containers.length} Units Active` : "Standby / Model Spec"}
            </span>
          </div>
          {isDrifted && (
            <div className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 font-bold text-[11px] animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span>Drift Alert ({driftContainers.length})</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Workflow Canvas Area */}
      <div className="relative mt-4 rounded-2xl border border-slate-200 canvas-dot-grid p-4 sm:p-7 min-h-[440px] flex flex-col justify-between overflow-x-auto overflow-y-hidden select-none bg-slate-50/50">
        
        {/* SVG Wire Connectors Layer with Clean Slate/Orange Arrow Markers */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none hidden lg:block" 
          style={{ minWidth: "760px", zIndex: 1 }}
        >
          <defs>
            <marker 
              id="arrow-down-slate" 
              viewBox="0 0 10 10" 
              refX="5" 
              refY="7" 
              markerWidth="6" 
              markerHeight="6" 
              orient="auto"
            >
              <path d="M 1.5 1 L 5 8 L 8.5 1 z" fill="#64748b" />
            </marker>

            <marker 
              id="arrow-right-slate" 
              viewBox="0 0 10 10" 
              refX="7" 
              refY="5" 
              markerWidth="6" 
              markerHeight="6" 
              orient="auto"
            >
              <path d="M 1 1.5 L 8 5 L 1 8.5 z" fill="#64748b" />
            </marker>

            <marker 
              id="arrow-right-coral" 
              viewBox="0 0 10 10" 
              refX="7" 
              refY="5" 
              markerWidth="6" 
              markerHeight="6" 
              orient="auto"
            >
              <path d="M 1 1.5 L 8 5 L 1 8.5 z" fill="#ef4444" />
            </marker>
          </defs>

          {/* 1. TOP VERTICAL BUS WIRE CONNECTOR */}
          <line
            x1="295"
            y1="64"
            x2="295"
            y2="135"
            stroke="#94a3b8"
            strokeWidth="1.75"
            markerEnd="url(#arrow-down-slate)"
          />

          {/* 2. BOTTOM STATE PROBE BRANCH CONNECTOR */}
          <path
            d="M 295 248 L 295 266 Q 295 278 307 278 L 478 278 Q 490 278 490 290 L 490 328 Q 490 340 480 340 L 442 340"
            fill="none"
            stroke={isDrifted ? "#ef4444" : "#94a3b8"}
            strokeWidth="1.75"
            strokeDasharray="4,4"
            markerEnd={isDrifted ? "url(#arrow-right-coral)" : "url(#arrow-right-slate)"}
          />
        </svg>

        {/* ── TOP SECTION: Floating Policy Guardrail Node ── */}
        <div className="relative z-10 flex items-center mb-4 pl-4 sm:pl-28">
          <div className="flex items-center space-x-3">
            {/* Checklist micro-badge on wire */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[10px] font-mono shadow-sm">
              <CheckSquare className="w-3.5 h-3.5 text-orange-600" />
              <span>Rego Rules</span>
            </div>

            {/* Task Card */}
            <div 
              onClick={() => setSelectedNode({
                type: "Policy Guardrail Task",
                name: "Zero-Trust OPA Gate",
                image: "openpolicyagent/opa:latest",
                status: "Enforced",
                tier: "Security Gate",
                details: "Validates tag schema, public ingress limits, and disallows SSH"
              })}
              className="cursor-pointer bg-white hover:bg-orange-50/40 border border-slate-200 hover:border-orange-400 p-3 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center space-x-3 group"
            >
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Guardrail Task
                </span>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                  OPA Security Verification
                </h4>
              </div>
            </div>
          </div>
        </div>

        {/* ── MIDDLE SECTION: Main Dashed VPC Container ── */}
        {/* ── MIDDLE SECTION: Main Dashed VPC Container ── */}
        <div 
          className="relative z-10 rounded-3xl border-2 border-dashed border-slate-300 bg-white/90 p-4 sm:p-6 backdrop-blur-sm shadow-sm w-full max-w-full overflow-hidden"
        >
          {/* Subnet / Container Header Label */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500">
              <Radio className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
              <span className="text-slate-800 font-bold">VPC Network Subnet</span>
              <span className="text-slate-300">•</span>
              <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 text-[10px] font-bold">
                172.28.0.0/16 [bridge]
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 hidden sm:block">
              Continuous Wire Protocol
            </div>
          </div>

          {/* Responsive 4-Tier Node Grid: 1 col on 375px, 2x2 on 768px, 4-tier row on >=1024px */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch relative">
            
            {/* 1. START NODE (Vibrant Orange Brand Block) */}
            <div 
              onClick={() => setSelectedNode({
                type: "Start / Traffic Ingress",
                name: "Ingress Controller",
                image: "traefik/caddy:latest",
                ports: "80:80, 443:443",
                status: "Listening",
                tier: "Ingress Gateway",
                details: "Entry point for external HTTP/HTTPS traffic routing into VPC"
              })}
              className="cursor-pointer group relative bg-gradient-to-br from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white p-4 rounded-2xl shadow-md shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 flex flex-col items-center justify-center min-h-[110px] text-center w-full"
            >
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white mb-1.5 group-hover:scale-110 transition-transform">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-xs font-black tracking-tight">START</span>
              <span className="text-[9px] text-orange-100 font-mono font-medium mt-0.5">Ingress Wire (:80/HTTP)</span>
            </div>

            {/* 2. FRONTEND NODE (Clean White Card) */}
            <div 
              onClick={() => setSelectedNode({
                type: "Service / Edge Container",
                name: "frontend",
                image: "nginx:1.25",
                desired: 2,
                actual: frontendUnits,
                status: frontendUnits > 0 ? "Healthy" : "Declared",
                tier: "Presentation Tier",
                details: "Serves compiled SPA static assets with reverse proxy routing"
              })}
              className="cursor-pointer group relative bg-white hover:bg-slate-50 border border-slate-200 hover:border-orange-400 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[110px] w-full"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Box className="w-3.5 h-3.5" />
                </div>
                <Badge variant="warning" className="text-[9px] px-1.5 py-0 font-bold bg-orange-50 text-orange-700 border-orange-200">
                  {frontendUnits} Replicas
                </Badge>
              </div>

              <div>
                <h4 className="text-xs font-black text-slate-900 group-hover:text-orange-600 transition-colors">
                  frontend
                </h4>
                <p className="text-[10px] text-slate-500 font-mono truncate">nginx:1.25 (:3000/API)</p>
              </div>
            </div>

            {/* 3. BACKEND NODE (Clean White Card with Green Details) */}
            <div 
              onClick={() => setSelectedNode({
                type: "Application Server",
                name: "backend",
                image: "node:20-alpine",
                desired: 2,
                actual: backendUnits,
                status: backendUnits > 0 ? "Healthy" : "Declared",
                tier: "Business Logic Tier",
                details: "NodeJS runtime microservice handling business logic and auth"
              })}
              className="cursor-pointer group relative bg-white hover:bg-slate-50 border border-slate-200 hover:border-green-500 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[110px] w-full"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-lg bg-green-50 text-green-700 flex items-center justify-center">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <Badge variant="success" className="text-[9px] px-1.5 py-0 font-bold bg-green-50 text-green-700 border-green-200">
                  {backendUnits} Replicas
                </Badge>
              </div>

              <div>
                <h4 className="text-xs font-black text-slate-900 group-hover:text-green-700 transition-colors">
                  backend
                </h4>
                <p className="text-[10px] text-slate-500 font-mono truncate">node:20-alpine (:5432/TCP)</p>
              </div>
            </div>

            {/* 4. DATABASE NODE (Clean Card with Emerald/Green Accent) */}
            <div 
              onClick={() => setSelectedNode({
                type: "Persistence Store",
                name: "database",
                image: "postgres:16",
                desired: 1,
                actual: dbUnits,
                status: dbUnits > 0 ? "Healthy" : "Declared",
                tier: "Persistence Tier",
                details: "Stateful relational storage with ACID transactions and isolated volume"
              })}
              className="cursor-pointer group relative bg-white hover:bg-slate-50 border border-slate-200 hover:border-green-600 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[110px] w-full"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-lg bg-green-100 text-green-800 flex items-center justify-center">
                  <Database className="w-3.5 h-3.5" />
                </div>
                <Badge variant="success" className="text-[9px] px-1.5 py-0 font-bold bg-green-50 text-green-800 border-green-200">
                  {dbUnits} Node
                </Badge>
              </div>

              <div>
                <h4 className="text-xs font-black text-slate-900 group-hover:text-green-800 transition-colors">
                  database
                </h4>
                <p className="text-[10px] text-slate-500 font-mono truncate">postgres:16</p>
              </div>
            </div>

          </div>
        </div>

        {/* ── BOTTOM SECTION: Continuous State Probe Node ── */}
        <div className="relative z-10 flex items-center justify-end mt-4 pr-4 sm:pr-24">
          <div 
            onClick={() => setSelectedNode({
              type: "Live Runtime Probe",
              name: "Daemon State Engine",
              image: "docker-daemon:socket",
              status: isDrifted ? "Drift Alert" : "Synchronized",
              tier: "Reconciliation Loop",
              details: isDrifted ? `${driftContainers.length} untracked / drifted containers active in daemon` : "Zero drift detected between runtime state and declarative model"
            })}
            className={`cursor-pointer border p-3 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center space-x-3 group ${
              isDrifted 
                ? "bg-red-50/90 border-red-300" 
                : "bg-white hover:bg-slate-50 border-slate-200 hover:border-green-400"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isDrifted ? "bg-red-100 text-red-600 animate-pulse" : "bg-green-50 text-green-700"
            }`}>
              {isDrifted ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                Continuous Probe
              </span>
              <h4 className={`text-xs font-bold ${
                isDrifted ? "text-red-700" : "text-slate-900 group-hover:text-green-700"
              }`}>
                {isDrifted ? "Drift Anomaly Flagged" : "Runtime State Reconciled"}
              </h4>
            </div>
          </div>
        </div>

      </div>

      {/* Node Inspector Flyout Modal */}
      {selectedNode && (
        <div className="mt-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start space-x-3.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-xs font-black text-slate-900">{selectedNode.name}</h4>
                <Badge variant="outline" className="text-[10px] font-mono text-slate-600 bg-slate-50">
                  {selectedNode.type}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-sans">{selectedNode.details}</p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] font-mono text-slate-500">
                {selectedNode.image && <span>Image: <strong className="text-slate-800">{selectedNode.image}</strong></span>}
                {selectedNode.status && <span>Status: <strong className="text-green-700">{selectedNode.status}</strong></span>}
                {selectedNode.tier && <span>Tier: <strong className="text-orange-700">{selectedNode.tier}</strong></span>}
              </div>
            </div>
          </div>

          <Button
            onClick={() => setSelectedNode(null)}
            variant="outline"
            size="sm"
            className="rounded-xl self-end md:self-center font-bold"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            <span>Close</span>
          </Button>
        </div>
      )}
    </Card>
  );
}