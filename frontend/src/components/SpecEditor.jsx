import React, { useState, useRef, useCallback, useMemo } from "react";
import { 
  Play, CheckCircle2, XCircle, ShieldCheck, FileCode2, ArrowUpRight, Copy, Check, Wand2, 
  Layers, Box, Database, Cpu, Activity, Sparkles, SlidersHorizontal, Eye, Code, Terminal, CheckSquare
} from "lucide-react";

const DEMO_SPECS = {
  compliant: `spec_version: "1.0"
application: ecommerce
environment: production
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
  owner: platform-team
  created_at: "2026-09-18T00:00:00Z"`,

  security_fail: `spec_version: "1.0"
application: security-violation-demo
environment: production
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
  public_access: true
  ssh: true
metadata:
  owner: SecOps-Test
  created_at: "2026-09-22T00:00:00Z"`,

  schema_fail: `spec_version: "1.0"
application: invalid-schema-demo
environment: production
services:
  frontend_invalid:
    replicas: 99
    image: nginx:1.25
security:
  public_access: false
  ssh: false
metadata:
  owner: qa-team
  created_at: "2026-09-22T00:00:00Z"`
};

export default function SpecEditor({ 
  specText, 
  setSpecText, 
  onValidate, 
  onDeploy, 
  validationResult, 
  isRunning,
  containers = [],
  terraformCode = "",
  resourcePlan = { resources: [] },
  policies = [],
  violations = [],
  driftResult = {},
  selectedTarget = "docker"
}) {
  const [viewMode, setViewMode] = useState("editor"); // "editor" | "list"
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [copied, setCopied] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState(null);


  const textareaRef = useRef(null);
  const highlightRef = useRef(null);
  const lineNumberRef = useRef(null);

  // Dynamic YAML parsing for services and metadata from the live code editor
  const parsedSpec = useMemo(() => {
    try {
      const lines = specText.split("\n");
      let appName = "ecommerce";
      let owner = "platform-team";
      let services = [];
      let inServices = false;
      let currentService = null;

      for (let line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("application:")) {
          appName = trimmed.split(":")[1].trim().replace(/['"]/g, "");
        }
        if (trimmed.startsWith("owner:")) {
          owner = trimmed.split(":")[1].trim().replace(/['"]/g, "");
        }
        if (trimmed.startsWith("services:")) {
          inServices = true;
          continue;
        }
        if (inServices) {
          if (trimmed.startsWith("security:") || trimmed.startsWith("metadata:")) {
            inServices = false;
            if (currentService) services.push(currentService);
            currentService = null;
            continue;
          }
          // Service name line (indented by 2 spaces)
          if (line.startsWith("  ") && !line.startsWith("    ") && trimmed.endsWith(":")) {
            if (currentService) services.push(currentService);
            const name = trimmed.slice(0, -1).trim();
            currentService = { name, replicas: 1, image: "latest", status: "Declared" };
          } else if (currentService && trimmed.startsWith("replicas:")) {
            currentService.replicas = parseInt(trimmed.split(":")[1].trim()) || 1;
          } else if (currentService && trimmed.startsWith("image:")) {
            currentService.image = trimmed.split(":")[1].trim().replace(/['"]/g, "");
          }
        }
      }
      if (currentService) services.push(currentService);

      return {
        appName,
        owner,
        services: services.map((s, idx) => {
          const matchingContainer = containers.find(c => c.resource.startsWith(s.name));
          return {
            ...s,
            id: `#${(400 + idx * 12).toString().padStart(3, "0")}`,
            status: matchingContainer ? matchingContainer.status : (containers.length > 0 ? "Running" : "Declared"),
            avatar: s.name.includes("db") || s.name.includes("data") || s.name.includes("postgres") ? "🗄️" : s.name.includes("front") || s.name.includes("gateway") ? "🌐" : "⚡"
          };
        })
      };
    } catch (e) {
      return { appName: "infrastructure", owner: "platform-team", services: [] };
    }
  }, [specText, containers]);

  const serviceList = parsedSpec.services.length > 0 ? parsedSpec.services : [
    { id: "#400", name: "service-unit", image: "custom:latest", replicas: 1, status: "Declared", avatar: "⚡" }
  ];

  const handleEditorScroll = useCallback((e) => {
    const { scrollTop, scrollLeft } = e.target;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }
    if (lineNumberRef.current) {
      lineNumberRef.current.scrollTop = scrollTop;
    }
  }, []);

  const handleWheel = useCallback((e) => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop += e.deltaY;
    }
  }, []);

  const lineCount = specText.split("\n").length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  const handleCursorMove = (e) => {
    const textBeforeCursor = e.target.value.substring(0, e.target.selectionStart);
    const lines = textBeforeCursor.split("\n");
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(specText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormat = () => {
    try {
      const lines = specText.split("\n").map(l => l.replace(/\t/g, "  "));
      setSpecText(lines.join("\n"));
    } catch (e) {}
  };

  const renderHighlightedYaml = (code) => {
    return code.split("\n").map((line, idx) => {
      if (line.trim().startsWith("#")) {
        return <div key={idx} className="text-slate-400 italic leading-6">{line || " "}</div>;
      }
      const commentIdx = line.indexOf("#");
      let codePart = commentIdx !== -1 ? line.substring(0, commentIdx) : line;
      let commentPart = commentIdx !== -1 ? line.substring(commentIdx) : "";

      const colonIdx = codePart.indexOf(":");
      if (colonIdx !== -1) {
        const keyPart = codePart.substring(0, colonIdx);
        const valPart = codePart.substring(colonIdx + 1);

        let valColor = "text-emerald-700 font-semibold";
        const trimmedVal = valPart.trim();
        if (trimmedVal === "true" || trimmedVal === "false") {
          valColor = "text-orange-600 font-bold";
        } else if (!isNaN(Number(trimmedVal)) && trimmedVal !== "") {
          valColor = "text-amber-600 font-bold";
        } else if (trimmedVal.startsWith("\"") || trimmedVal.startsWith("'")) {
          valColor = "text-emerald-700 font-semibold";
        }

        return (
          <div key={idx} className="leading-6">
            <span className="text-slate-900 font-bold">{keyPart}:</span>
            <span className={valColor}>{valPart}</span>
            {commentPart && <span className="text-slate-400 italic font-normal">{commentPart}</span>}
          </div>
        );
      }

      return (
        <div key={idx} className="text-slate-800 leading-6">
          {codePart}
          {commentPart && <span className="text-slate-400 italic font-normal">{commentPart}</span>}
        </div>
      );
    });
  };

  return (
    <div id="section-specification" className="ref-white-card rounded-[34px] p-5 sm:p-7 shadow-2xl text-slate-900">
      
      {/* ── SPLIT GRID: Left White Editor + Right Embedded Dark Card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* ── LEFT HALF: Blueprint Code Editor & Service Units ── */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          
          {/* Header Strip */}
          <div className="flex items-center justify-between pb-2">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight font-sans">
                Declarative Blueprint
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                {parsedSpec.appName} • {parsedSpec.owner}
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 rounded-full bg-slate-100 border border-slate-200 shadow-sm">
              <button
                onClick={() => setViewMode("editor")}
                className={`p-1.5 rounded-full text-xs font-bold transition-all ${
                  viewMode === "editor" ? "bg-white text-black shadow-sm" : "text-slate-500 hover:text-black"
                }`}
                title="Code Editor"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-full text-xs font-bold transition-all ${
                  viewMode === "list" ? "bg-white text-black shadow-sm" : "text-slate-500 hover:text-black"
                }`}
                title="Parsed Service Units"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Preset Blueprints Pill Bar */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80 text-[11px] font-mono font-bold">
            <span className="text-slate-400 text-[10px] uppercase px-2 font-sans font-extrabold">Presets:</span>
            <button
              type="button"
              onClick={() => setSpecText(DEMO_SPECS.compliant)}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-50 text-slate-800 shadow-xs border border-slate-200 transition-all hover:text-black"
              title="Standard compliant 3-tier ecommerce application"
            >
              ✓ Compliant
            </button>
            <button
              type="button"
              onClick={() => setSpecText(DEMO_SPECS.security_fail)}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-red-50 text-red-700 shadow-xs border border-red-200 transition-all"
              title="Spec with public_access and ssh enabled to demo OPA / Scanner gate failure"
            >
              ⚠️ Security Deny
            </button>
            <button
              type="button"
              onClick={() => setSpecText(DEMO_SPECS.schema_fail)}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-orange-50 text-orange-700 shadow-xs border border-orange-200 transition-all"
              title="Spec with invalid replica count (99) to demo schema validator failure"
            >
              ❌ Schema Fail
            </button>
          </div>


          {/* Dynamic Left Content: Code Editor OR Parsed Service List */}
          {viewMode === "list" ? (
            <div className="space-y-2 py-1 max-h-[300px] overflow-y-auto">
              {serviceList.map((item, idx) => {
                const isSelected = selectedServiceId === item.id || (selectedServiceId === null && idx === 0);
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedServiceId(item.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-md"
                        : "bg-slate-50/70 hover:bg-slate-100/80 border-slate-200 text-slate-900"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm bg-white border border-slate-200">
                        {item.avatar}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className={`text-xs font-black ${isSelected ? "text-white" : "text-slate-900"}`}>
                            {item.id}
                          </span>
                          <span className={`text-[10px] ${isSelected ? "text-slate-400" : "text-slate-500"}`}>
                            {item.image}
                          </span>
                        </div>
                        <p className={`text-[11px] font-mono truncate max-w-[140px] ${isSelected ? "text-slate-300" : "text-slate-600"}`}>
                          {item.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected ? "bg-white/20 text-white" : "bg-white border border-slate-200 text-slate-700"
                      }`}>
                        {item.status}
                      </span>
                      <span className={`text-xs font-black font-mono ${isSelected ? "text-[#b8ff22]" : "text-slate-900"}`}>
                        {item.replicas} {item.replicas === 1 ? "Unit" : "Units"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-[#fafbfc] overflow-hidden flex flex-col font-mono text-xs relative h-[360px] shadow-sm">
              <div className="flex-1 min-h-0 flex relative overflow-hidden" onWheel={handleWheel}>
                {/* Line Numbers */}
                <div
                  ref={lineNumberRef}
                  className="py-3 px-2.5 bg-slate-100 text-slate-400 text-right select-none border-r border-slate-200 w-10 shrink-0 overflow-hidden text-[10px]"
                >
                  {lineNumbers.map((num) => (
                    <div key={num} className="leading-6">{num}</div>
                  ))}
                </div>

                {/* Textarea + Syntax Highlight Layer */}
                <div className="relative flex-1 h-full overflow-hidden">
                  <div
                    ref={highlightRef}
                    className="absolute inset-0 py-3 px-3.5 font-mono text-xs whitespace-pre pointer-events-none overflow-hidden select-none code-font leading-6"
                  >
                    {renderHighlightedYaml(specText)}
                  </div>

                  <textarea
                    ref={textareaRef}
                    value={specText}
                    onChange={(e) => setSpecText(e.target.value)}
                    onScroll={handleEditorScroll}
                    onKeyUp={handleCursorMove}
                    onClick={handleCursorMove}
                    onSelect={handleCursorMove}
                    spellCheck="false"
                    className="absolute inset-0 w-full h-full py-3 px-3.5 bg-transparent text-transparent caret-black resize-none focus:outline-none leading-6 code-font whitespace-pre font-mono overflow-y-scroll overflow-x-auto selection:bg-[#b8ff22]/40 selection:text-black z-10"
                    style={{ tabSize: 2 }}
                  />
                </div>
              </div>

              {/* Status Bar */}
              <div className="bg-slate-100 px-4 py-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono shrink-0">
                <span>YAML 1.2 • Ln {cursorPos.line}, Col {cursorPos.col}</span>
                <div className="flex items-center space-x-2">
                  <button onClick={handleFormat} className="hover:text-black flex items-center gap-1 font-bold">
                    <Wand2 className="w-3 h-3" /> Format
                  </button>
                  <span>•</span>
                  <button onClick={handleCopy} className="hover:text-black flex items-center gap-1 font-bold">
                    {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />} {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Validation Banner if available */}
          {validationResult && (
            <div className={`p-2.5 rounded-2xl border text-xs font-mono flex items-center space-x-2 ${
              validationResult.valid ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-700"
            }`}>
              {validationResult.valid ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> : <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
              <span className="truncate">{validationResult.message}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={onValidate}
              disabled={isRunning}
              className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all border border-slate-200 shadow-sm"
            >
              Validate Spec
            </button>

            <span className="text-[11px] font-mono text-slate-400">
              Zero Secrets Leakage ✓
            </span>
          </div>

        </div>

        {/* ── RIGHT HALF: Embedded Dark Obsidian Card ── */}
        <div className="lg:col-span-7 ref-inner-dark rounded-[28px] p-5 sm:p-6 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden">
          
          {/* Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div>
              <span className="text-[10px] text-slate-400 font-mono block">Infrastructure Details</span>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-xl font-black text-white font-sans">#{parsedSpec.appName}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                  violations.length > 0 ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-[#1c2230] text-slate-300 border border-white/10"
                }`}>
                  {violations.length > 0 ? "Denied" : "Compliant"}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-mono block">Target Platform</span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="text-sm font-bold text-white uppercase">{selectedTarget} Local</span>
                <span className="w-2 h-2 rounded-full bg-[#b8ff22] animate-pulse" />
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 p-0.5">
                <div className="w-full h-full rounded-full bg-[#11141c] flex items-center justify-center text-xs font-bold">
                  👩‍💻
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-white block leading-tight">{parsedSpec.owner}</span>
                <span className="text-[10px] text-slate-400 font-mono">Owner / Admin</span>
              </div>
            </div>
          </div>

          {/* 3 Dark Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
            
            {/* Tile 1: Candidate Plan */}
            <div 
              onClick={() => {
                const el = document.getElementById("section-terraform");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="ref-tile-dark rounded-2xl p-3.5 flex flex-col justify-between min-h-[90px] cursor-pointer transition-all hover:scale-[1.02]"
            >
              <div className="flex items-start justify-between">
                <span className="text-base font-black text-white font-mono">
                  {parsedSpec.services.reduce((acc, s) => acc + (s.replicas || 1), 0) || 5} Target Units
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-2">
                Candidate Plan ({parsedSpec.services.length} Svcs)
              </span>
            </div>

            {/* Tile 2: Terraform HCL */}
            <div 
              onClick={() => {
                const el = document.getElementById("section-terraform");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="ref-tile-dark rounded-2xl p-3.5 flex flex-col justify-between min-h-[90px] cursor-pointer transition-all hover:scale-[1.02]"
            >
              <div className="flex items-start justify-between">
                <span className="text-base font-black text-[#b8ff22] font-mono">main.tf</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-2">{terraformCode ? "Terraform Ready" : "Terraform Draft"}</span>
            </div>

            {/* Tile 3: OPA Policy */}
            <div 
              onClick={() => {
                const el = document.getElementById("section-opa");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="ref-tile-dark rounded-2xl p-3.5 flex flex-col justify-between min-h-[90px] cursor-pointer transition-all hover:scale-[1.02]"
            >
              <div className="flex items-start justify-between">
                <span className={`text-base font-black font-mono ${violations.length > 0 ? "text-red-400" : "text-white"}`}>
                  {violations.length > 0 ? `${violations.length} Violations` : `${policies.filter(p => p.enabled).length || 3} Rules`}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-2">OPA Governance</span>
            </div>

          </div>

          {/* Micro Dynamic Topology Bus Diagram */}
          <div className="p-4 rounded-2xl bg-[#0a0c10] border border-white/[0.06] my-2">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.05] text-[10px] font-mono text-slate-400">
              <span>Topology Bus</span>
              <span className="text-[#b8ff22]">172.28.0.0/16 [{selectedTarget}]</span>
            </div>

            <div className="flex items-center justify-between gap-1.5 pt-3 overflow-x-auto">
              <div className="px-2.5 py-1.5 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-black text-[10px] font-black text-center shrink-0 shadow-sm">
                INGRESS
              </div>

              {serviceList.map((s, idx) => (
                <React.Fragment key={idx}>
                  <div className="h-0.5 flex-1 min-w-[20px] bg-[#252c3d] relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#b8ff22]" />
                  </div>
                  <div className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-bold text-center shrink-0 ${
                    s.name.includes("db") || s.name.includes("data") || s.name.includes("postgres")
                      ? "bg-[#171b26] border-green-500/40 text-green-400"
                      : "bg-[#171b26] border-white/10 text-white"
                  }`}>
                    {s.name} ({s.replicas}x)
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Bottom Subtotal & Option 1 Standout Full Deploy Button */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/[0.08] mt-3">
            
            <div className="flex items-center space-x-4 sm:space-x-6">
              <div>
                <span className="text-[9px] text-slate-500 uppercase font-mono block">Declared Svcs</span>
                <span className="text-sm font-black text-white font-mono">{parsedSpec.services.length} Services</span>
              </div>

              <div>
                <span className="text-[9px] text-slate-500 uppercase font-mono block">Target Units</span>
                <span className="text-sm font-black text-white font-mono">{parsedSpec.services.reduce((acc, s) => acc + (s.replicas || 1), 0) || 5} Units</span>
              </div>

              <div>
                <span className="text-[9px] text-slate-500 uppercase font-mono block">Containers Live</span>
                <span className={`text-sm font-black font-mono ${containers.length > 0 ? "text-[#b8ff22]" : "text-slate-400"}`}>
                  {containers.length > 0 ? `${containers.length} Running` : "0 Standby"}
                </span>
              </div>

              <div>
                <span className="text-[9px] text-slate-500 uppercase font-mono block">Drift Status</span>
                <span className={`text-sm font-black font-mono ${driftResult?.drift_detected ? "text-red-400" : "text-[#b8ff22]"}`}>
                  {driftResult?.drift_detected ? "Drift Alert" : "Zero Drift"}
                </span>
              </div>
            </div>

            {/* Bottom Button: Option 1 - Full Deploy */}
            <button
              onClick={onDeploy}
              disabled={isRunning}
              className="lime-pill-btn px-6 py-2.5 rounded-full text-xs font-black flex items-center space-x-2 disabled:opacity-50"
              title="Executes full pipeline including live Docker container deployment"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? "Deploying..." : "⚡ Synthesize & Deploy"}</span>
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}