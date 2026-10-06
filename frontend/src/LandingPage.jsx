import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "./components/BrandLogo";

// High Performance Jitter Pixel Grid Canvas Component
function FlickeringGridCanvas({ active = true, squareSize = 3, gridGap = 3, color = "184, 255, 34" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    let squares = [];
    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;

    const resize = () => {
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      width = canvas.width = rect.width;
      height = canvas.height = rect.height;
      cols = Math.ceil(width / (squareSize + gridGap));
      rows = Math.ceil(height / (squareSize + gridGap));

      squares = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const topWeight = Math.max(0.1, 1 - r / rows);
          squares.push({
            x: c * (squareSize + gridGap),
            y: r * (squareSize + gridGap),
            opacity: Math.random() * 0.8 * topWeight,
            targetOpacity: Math.random() * 0.8 * topWeight,
            speed: 0.008 + Math.random() * 0.015,
            topWeight: topWeight,
          });
        }
      }
    };

    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < squares.length; i++) {
        const sq = squares[i];

        if (Math.abs(sq.opacity - sq.targetOpacity) < 0.02) {
          sq.targetOpacity =
            Math.random() < 0.35
              ? Math.random() * 0.85 * sq.topWeight
              : Math.random() * 0.12 * sq.topWeight;
        } else {
          sq.opacity += (sq.targetOpacity - sq.opacity) * sq.speed;
        }

        if (sq.opacity > 0.02) {
          ctx.fillStyle = `rgba(${color}, ${sq.opacity})`;
          ctx.fillRect(sq.x, sq.y, squareSize, squareSize);
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [squareSize, gridGap, color]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block pointer-events-none"
    />
  );
}

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState(1);

  return (
    <div className="min-h-screen relative font-sans antialiased overflow-x-hidden selection:bg-[#b8ff22]/30 selection:text-white bg-[#060707] text-[#f3f5ef]">
      {/* Technical Background Grid */}
      <div className="bg-grid-pattern"></div>

      {/* MAIN WRAPPER */}
      <div className="max-w-6xl mx-auto border-x border-white/[0.08] relative bg-void min-h-screen">
        {/* Top Corner Crosshairs */}
        <div className="crosshair-corner -top-1 -left-1"></div>
        <div className="crosshair-corner -top-1 -right-1"></div>

        {/* TOP NAVBAR */}
        <header className="sticky top-0 z-50 px-6 py-4 backdrop-blur-md bg-void/85 border-b border-white/[0.08] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <BrandLogo className="w-7 h-7 rounded-lg border border-white/20" />
            <span className="font-bold text-base text-white tracking-tight">
              sdd<span className="text-[#b8ff22]">.infra</span>
            </span>
          </Link>

          <nav className="flex items-center gap-4 sm:gap-6 text-xs font-mono font-medium">
            <Link to="/cli" className="text-[#b8ff22] hover:text-[#c8ff4d] transition-colors flex items-center gap-1.5 font-bold">
              <span>CLI Docs</span>
              <span className="text-[10px] bg-[#b8ff22]/15 text-[#b8ff22] px-1.5 py-0.5 rounded border border-[#b8ff22]/30">v2.0</span>
            </Link>
            <a
              href="https://github.com/dumbspin/ai_infra"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 hover:text-white transition-colors hidden md:inline-block"
            >
              GitHub
            </a>
          </nav>
        </header>

        {/* HERO SECTION */}
        <section className="relative px-6 pt-16 pb-16 md:pt-24 md:pb-24 border-b border-white/[0.08] flex flex-col items-center justify-center text-center space-y-8 overflow-hidden">
          {/* Neon Green / Emerald Atmosphere Glow */}
          <div className="hero-glow-container">
            <div className="hero-glow-primary"></div>
            <div className="hero-glow-secondary"></div>
          </div>

          {/* Hero Headline */}
          <h1 className="relative z-10 text-[clamp(1.85rem,5vw+0.5rem,4.25rem)] font-bold tracking-tight text-white max-w-4xl leading-[1.15] px-2">
            Write the infrastructure you want —<br className="hidden sm:inline" />{" "}
            <span className="text-zinc-400">not the Terraform to build it.</span>
          </h1>

          {/* Subhead */}
          <p className="relative z-10 text-sm sm:text-base md:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed px-4">
            Declare your multi-service architecture in clean YAML. SDD-Infra compiles it into candidate Terraform definitions, gates it with dual independent security layers, and maintains autonomous runtime drift reconciliation.
          </p>

          {/* Hero Action Buttons */}
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 w-full max-w-md px-4">
            <Link
              to="/cockpit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 min-h-[44px] rounded-full bg-[#b8ff22] text-zinc-950 font-bold text-sm shadow-[0_4px_28px_rgba(184,255,34,0.35)] hover:bg-[#c8ff4d] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span>Run the live demo</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
              </svg>
            </Link>
          </div>

          {/* Compiles to Chip Row */}
          <div className="relative z-10 pt-8 space-y-3">
            <p className="text-[11px] uppercase tracking-widest font-mono text-zinc-400 font-semibold">
              Compiles to
            </p>

            <div className="flex items-center justify-center gap-2 flex-wrap w-full max-w-full px-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/[0.1] bg-black/40 backdrop-blur-sm font-mono text-xs text-zinc-300 min-h-[36px]">
                <svg className="w-3.5 h-3.5 text-white shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1.44 0v7.697l6.657 3.848V3.848L1.44 0zm8.01 4.634v7.697l6.657 3.848V8.482L9.45 4.634zm0 9.268v7.697l6.657 3.848v-7.697L9.45 13.902zm8.01-4.634v7.697l6.657-3.848V5.42L17.46 9.268z"/>
                </svg>
                <span>Terraform HCL</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#b8ff22] text-zinc-950 font-mono text-xs font-bold shadow-[0_2px_12px_rgba(184,255,34,0.3)] min-h-[36px]">
                <svg className="w-3.5 h-3.5 text-zinc-950 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.186v1.887c0 .102.083.185.185.185m-2.954-5.43h2.118a.185.185 0 00.186-.186V3.574a.185.185 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.185.185 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .103.082.186.185.186m-2.955 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H8.074a.185.185 0 00-.185.185v1.887c0 .103.083.186.185.186m0-2.716h2.119a.186.186 0 00.185-.186V3.574a.186.186 0 00-.185-.185H8.074a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.955 5.432h2.119a.186.186 0 00.185-.185V9.006a.186.186 0 00-.185-.186H5.119a.186.186 0 00-.185.186v1.887c0 .102.083.185.185.185m0-2.716h2.119a.186.186 0 00.185-.186V6.29a.186.186 0 00-.185-.185H5.119a.186.186 0 00-.185.185v1.887c0 .103.083.186.185.186m-2.954 2.716h2.119a.186.186 0 00.185-.185V9.006a.186.186 0 00-.185-.186H2.165a.186.186 0 00-.185.186v1.887c0 .102.083.185.185.185m0-2.716h2.119a.186.186 0 00.185-.186V6.29a.186.186 0 00-.185-.185H2.165a.185.185 0 00-.185.185v1.887c0 .103.083.186.185.186M.03 12.553c0 1.944.536 3.743 1.547 5.163.633.889 1.442 1.638 2.383 2.196 1.84.153 3.655-.429 5.253-1.447 1.874-1.192 3.653-2.88 5.642-4.103 1.996-1.229 4.397-1.892 6.772-1.782.723.033 1.439.157 2.13.366.196-.649.17-1.353-.08-1.99a3.864 3.864 0 00-1.488-1.769 8.7 8.7 0 00-2.983-1.077c-1.189-.204-2.404-.2-3.606.012a14.28 14.28 0 00-4.053 1.546c-1.488.85-2.903 1.83-4.324 2.802a20.08 20.08 0 01-4.788 2.502 8.44 8.44 0 01-1.875.337c-.365.019-.73-.017-1.082-.108a2.535 2.535 0 01-.845-.423c-.317-.258-.497-.643-.497-1.054a1.86 1.86 0 01.35-.985c.196-.307.478-.55.811-.7.21-.095.433-.162.662-.2.434-.07.876-.08 1.313-.03 1.05.12 2.062.46 2.996.99 0 0 .195-.562.103-.974a1.272 1.272 0 00-.776-.84 3.512 3.512 0 00-1.385-.246c-1.025.028-2.023.32-2.9.85-.853.518-1.554 1.238-2.036 2.09-.434.766-.662 1.636-.662 2.521z"/>
                </svg>
                <span>Docker Daemon ★</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/[0.1] bg-black/40 backdrop-blur-sm font-mono text-xs text-zinc-300 min-h-[36px]">
                <svg className="w-3.5 h-3.5 text-white shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.004 0L1.758 5.918v12.164L12.004 24l10.238-5.918V5.918L12.004 0zm0 2.29l8.254 4.772v.004L12.004 11.83 3.75 7.066V7.06L12.004 2.29zm-8.254 6.782l7.254 4.192v9.336L3.75 18.414V9.072zm9.254 13.528v-9.336l7.254-4.192v9.342l-7.254 4.186z"/>
                </svg>
                <span>AWS ECS</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/[0.1] bg-black/40 backdrop-blur-sm font-mono text-xs text-zinc-300 min-h-[36px]">
                <svg className="w-3.5 h-3.5 text-white shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.455.197a1.09 1.09 0 011.09 0l9.638 5.563a1.09 1.09 0 01.545.944v11.127a1.09 1.09 0 01-.545.944l-9.638 5.563a1.09 1.09 0 01-1.09 0l-9.638-5.563A1.09 1.09 0 011.267 17.83V6.704a1.09 1.09 0 01.545-.944L11.455.197zm.545 2.11L3.45 7.098v9.804l8.55 4.936 8.55-4.936V7.098L12 2.307zM12 7a5 5 0 110 10 5 5 0 010-10zm0 2a3 3 0 100 6 3 3 0 000-6z"/>
                </svg>
                <span>Kubernetes</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/[0.1] bg-black/40 backdrop-blur-sm font-mono text-xs text-zinc-300 min-h-[36px]">
                <svg className="w-3.5 h-3.5 text-white shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.11v4.71c0 4.49-3.08 8.7-7 9.81-3.92-1.11-7-5.32-7-9.81V6.29l7-3.11z"/>
                </svg>
                <span>OPA / Rego</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/[0.1] bg-black/40 backdrop-blur-sm font-mono text-xs text-zinc-300 min-h-[36px]">
                <svg className="w-3.5 h-3.5 text-white shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 3a7 7 0 110 14 7 7 0 010-14zm-1 3v3H8v2h3v3h2v-3h3v-2h-3V8h-2z"/>
                </svg>
                <span>OpenRouter Free</span>
              </span>
            </div>
          </div>
        </section>

        {/* INTERACTIVE PIPELINE DEMO TABS (Edge-to-Edge Jitter Pixel Grid Background) */}
        <section className="border-b border-white/[0.08] bg-zinc-950/60 relative">
          {/* Top Crosshairs on section divide */}
          <div className="crosshair-corner -top-1 -left-1"></div>
          <div className="crosshair-corner -top-1 -right-1"></div>

          {/* 4 Tabs Header with Edge-to-Edge Canvas Grid Backgrounds */}
          <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-white/[0.08]">
            {/* Tab 1 */}
            <button
              onClick={() => setActiveTab(1)}
              className="relative h-16 w-full text-sm font-semibold transition-all flex items-center justify-center border-r border-white/[0.08] overflow-hidden group p-0"
            >
              <div className={`flicker-grid-mask transition-opacity duration-300 ${activeTab === 1 ? "opacity-100" : "opacity-0"}`}>
                <FlickeringGridCanvas />
              </div>
              <span className={`relative z-10 font-bold tracking-tight px-4 pointer-events-none transition-colors ${activeTab === 1 ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"}`}>
                01. YAML Spec
              </span>
              <span className={`absolute bottom-0 left-0 right-0 h-[2px] ${activeTab === 1 ? "bg-[#b8ff22] shadow-[0_0_12px_#b8ff22]" : "bg-transparent"}`}></span>
            </button>

            {/* Tab 2 */}
            <button
              onClick={() => setActiveTab(2)}
              className="relative h-16 w-full text-sm font-semibold transition-all flex items-center justify-center border-r border-white/[0.08] overflow-hidden group p-0"
            >
              <div className={`flicker-grid-mask transition-opacity duration-300 ${activeTab === 2 ? "opacity-100" : "opacity-0"}`}>
                <FlickeringGridCanvas />
              </div>
              <span className={`relative z-10 font-bold tracking-tight px-4 pointer-events-none transition-colors ${activeTab === 2 ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"}`}>
                02. AI Compile & Retry
              </span>
              <span className={`absolute bottom-0 left-0 right-0 h-[2px] ${activeTab === 2 ? "bg-[#b8ff22] shadow-[0_0_12px_#b8ff22]" : "bg-transparent"}`}></span>
            </button>

            {/* Tab 3 */}
            <button
              onClick={() => setActiveTab(3)}
              className="relative h-16 w-full text-sm font-semibold transition-all flex items-center justify-center border-r border-white/[0.08] overflow-hidden group p-0"
            >
              <div className={`flicker-grid-mask transition-opacity duration-300 ${activeTab === 3 ? "opacity-100" : "opacity-0"}`}>
                <FlickeringGridCanvas />
              </div>
              <span className={`relative z-10 font-bold tracking-tight px-4 pointer-events-none transition-colors ${activeTab === 3 ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"}`}>
                03. Dual Security Gate
              </span>
              <span className={`absolute bottom-0 left-0 right-0 h-[2px] ${activeTab === 3 ? "bg-[#b8ff22] shadow-[0_0_12px_#b8ff22]" : "bg-transparent"}`}></span>
            </button>

            {/* Tab 4 */}
            <button
              onClick={() => setActiveTab(4)}
              className="relative h-16 w-full text-sm font-semibold transition-all flex items-center justify-center overflow-hidden group p-0"
            >
              <div className={`flicker-grid-mask transition-opacity duration-300 ${activeTab === 4 ? "opacity-100" : "opacity-0"}`}>
                <FlickeringGridCanvas />
              </div>
              <span className={`relative z-10 font-bold tracking-tight px-4 pointer-events-none transition-colors ${activeTab === 4 ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"}`}>
                04. Drift Reconciliation
              </span>
              <span className={`absolute bottom-0 left-0 right-0 h-[2px] ${activeTab === 4 ? "bg-[#b8ff22] shadow-[0_0_12px_#b8ff22]" : "bg-transparent"}`}></span>
            </button>
          </div>

          {/* Interactive Tab Content Display with macOS Terminal Window Styling */}
          <div className="p-6 md:p-8">
            {/* View 1: YAML Spec Terminal */}
            {activeTab === 1 && (
              <div className="mac-terminal">
                <div className="mac-terminal-header justify-between">
                  <div className="flex items-center gap-2">
                    <span className="mac-dot mac-dot-red"></span>
                    <span className="mac-dot mac-dot-yellow"></span>
                    <span className="mac-dot mac-dot-green"></span>
                    <span className="text-zinc-400 font-mono text-[11px] ml-2">specification/infrastructure.yaml</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#b8ff22] bg-[#b8ff22]/10 px-2 py-0.5 rounded border border-[#b8ff22]/20">schema verified ✓</span>
                </div>
                <div className="p-5 font-mono text-xs leading-relaxed space-y-2">
                  <p className="text-zinc-400"><span className="text-emerald-400 font-bold">$</span> cat specification/infrastructure.yaml</p>
                  <pre className="text-zinc-300 pt-1 overflow-x-auto">
                    <span className="text-zinc-500">spec_version:</span> <span className="text-emerald-400">"1.0"</span>{"\n"}
                    <span className="text-zinc-500">application:</span> <span className="text-emerald-400">"ecommerce-core"</span>{"\n"}
                    <span className="text-zinc-500">services:</span>{"\n"}
                    {"  "}<span className="text-[#b8ff22]">frontend:</span> {"{ "}<span className="text-zinc-400">replicas:</span> <span className="text-amber-400">2</span>, <span className="text-zinc-400">image:</span> <span className="text-emerald-400">"nginx:1.25"</span>{" }"}{"\n"}
                    {"  "}<span className="text-[#b8ff22]">backend:</span>  {"{ "}<span className="text-zinc-400">replicas:</span> <span className="text-amber-400">2</span>, <span className="text-zinc-400">image:</span> <span className="text-emerald-400">"node:20-alpine"</span>{" }"}{"\n"}
                    {"  "}<span className="text-[#b8ff22]">database:</span> {"{ "}<span className="text-zinc-400">replicas:</span> <span className="text-amber-400">1</span>, <span className="text-zinc-400">image:</span> <span className="text-emerald-400">"postgres:16"</span>{" }"}{"\n"}
                    <span className="text-zinc-500">security:</span>{"\n"}
                    {"  "}<span className="text-zinc-400">public_access:</span> <span className="text-zinc-400">false</span>{"\n"}
                    {"  "}<span className="text-zinc-400">ssh:</span> <span className="text-zinc-400">false</span>
                  </pre>
                </div>
              </div>
            )}

            {/* View 2: AI Compile & Retry Terminal */}
            {activeTab === 2 && (
              <div className="mac-terminal">
                <div className="mac-terminal-header justify-between">
                  <div className="flex items-center gap-2">
                    <span className="mac-dot mac-dot-red"></span>
                    <span className="mac-dot mac-dot-yellow"></span>
                    <span className="mac-dot mac-dot-green"></span>
                    <span className="text-zinc-400 font-mono text-[11px] ml-2">sdd-infra compile --retry-with-feedback</span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">schema_valid_on_retry</span>
                </div>
                <div className="p-5 font-mono text-xs leading-relaxed space-y-2">
                  <p className="text-zinc-400"><span className="text-emerald-400 font-bold">$</span> sdd compile --model="liquid/lfm-2.5-2.6b:free"</p>
                  <p className="text-zinc-400">Connecting to OpenRouter AI inference endpoint...</p>
                  <p className="text-red-400">[Attempt 1] ValidationError: missing required field 'tags'</p>
                  <p className="text-zinc-400">[Attempt 2] Injecting schema feedback: <span className="text-zinc-200">"Fix output and return ONLY valid JSON matching schema"</span></p>
                  <p className="text-[#b8ff22]">Resolving candidate plan: <span className="text-white font-bold">100% (3/3 services)</span>, done.</p>
                  <p className="text-emerald-400 font-bold">✓ Candidate JSON Resource Plan generated successfully in 214ms</p>
                </div>
              </div>
            )}

            {/* View 3: Dual Security Gate Terminal */}
            {activeTab === 3 && (
              <div className="mac-terminal">
                <div className="mac-terminal-header justify-between">
                  <div className="flex items-center gap-2">
                    <span className="mac-dot mac-dot-red"></span>
                    <span className="mac-dot mac-dot-yellow"></span>
                    <span className="mac-dot mac-dot-green"></span>
                    <span className="text-zinc-400 font-mono text-[11px] ml-2">sdd-infra security-gate</span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">ALL GATES PASSED</span>
                </div>
                <div className="p-5 font-mono text-xs leading-relaxed space-y-2">
                  <p className="text-zinc-400"><span className="text-emerald-400 font-bold">$</span> sdd security-scan --static=checkov --policy=opa</p>
                  <p className="text-zinc-400">Executing Static Terraform Security Scanner (Checkov AST rules)...</p>
                  <p className="text-emerald-400">✓ [Layer 1] Static HCL Scanner: 0 critical/high findings</p>
                  <p className="text-zinc-400">Evaluating OPA Rego Zero-Trust Compliance Policies (policies/security.rego)...</p>
                  <p className="text-[#b8ff22]">✓ [Layer 2] OPA Security Gate: 3/3 rules passed (0 violations)</p>
                  <p className="text-zinc-300 font-bold">✓ Zero-Trust compliance verdict: APPROVED for deployment</p>
                </div>
              </div>
            )}

            {/* View 4: Drift Reconciliation Terminal */}
            {activeTab === 4 && (
              <div className="mac-terminal">
                <div className="mac-terminal-header justify-between">
                  <div className="flex items-center gap-2">
                    <span className="mac-dot mac-dot-red"></span>
                    <span className="mac-dot mac-dot-yellow"></span>
                    <span className="mac-dot mac-dot-green"></span>
                    <span className="text-zinc-400 font-mono text-[11px] ml-2">sdd-infra drift-daemon.log</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#b8ff22] bg-[#b8ff22]/10 px-2 py-0.5 rounded border border-[#b8ff22]/20">Cron Active (10m)</span>
                </div>
                <div className="p-5 font-mono text-xs leading-relaxed space-y-2">
                  <p className="text-zinc-400"><span className="text-emerald-400 font-bold">$</span> sdd drift-detect --normalize-and-compare</p>
                  <p className="text-zinc-400">Querying live Docker daemon containers against desired Terraform state...</p>
                  <p className="text-amber-400">Analyzing container drift: <span className="text-white font-bold">5 managed containers verified</span></p>
                  <p className="text-zinc-400">Reconciling out-of-band state changes...</p>
                  <p className="text-emerald-400 font-bold">✓ Zero drift detected: Infrastructure 100% converged</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* BENTO FEATURES GRID */}
        <section id="pipeline" className="p-6 md:p-12 border-b border-white/[0.08] space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#b8ff22]">Core Capabilities</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              How a spec becomes infrastructure.
            </h2>
            <p className="text-zinc-400 text-sm">
              Deterministic compilation with automated schema retry, layered static/policy evaluation, and continuous reconciliation.
            </p>
          </div>

          <div className="relative">
            {/* Circular green gradient glow between cards */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none z-0 hidden sm:block"
              style={{
                background: "radial-gradient(circle, rgba(184, 255, 34, 0.12) 0%, rgba(184, 255, 34, 0.05) 35%, transparent 70%)"
              }}
            ></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              {/* Bento Card 1: AI Synthesis */}
              <div className="magic-card p-7 flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">AI Synthesis & Schema Recovery</h3>
                    <span className="font-mono text-[11px] text-[#b8ff22] bg-[#b8ff22]/10 px-2.5 py-0.5 rounded-full border border-[#b8ff22]/20 font-semibold">OpenRouter</span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Translates declarative YAML specifications into structured candidate resource plans via free-tier LLM inference with automated schema retry loops.
                  </p>
                </div>

                {/* Mini Terminal */}
                <div className="mac-terminal">
                  <div className="mac-terminal-header">
                    <span className="mac-dot mac-dot-red"></span>
                    <span className="mac-dot mac-dot-yellow"></span>
                    <span className="mac-dot mac-dot-green"></span>
                    <span className="text-zinc-400 font-mono text-[10px] ml-2">compile_plan.json</span>
                  </div>
                  <div className="p-3.5 font-mono text-[11px] space-y-1">
                    <p className="text-zinc-400"><span className="text-emerald-400 font-bold">$</span> sdd compile-spec</p>
                    <p className="text-[#b8ff22]">{"{\"type\": \"docker_container\", \"replicas\": 2}"}</p>
                    <p className="text-emerald-400 text-[10px]">✓ Schema valid on attempt 1</p>
                  </div>
                </div>
              </div>

              {/* Bento Card 2: Security Gate */}
              <div className="magic-card p-7 flex flex-col justify-between space-y-5" id="security">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Dual Security Gate</h3>
                    <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-semibold">Layered</span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Two independent security layers — a static Checkov/AST scanner and an OPA Rego policy gate — either can block a deploy.
                  </p>
                </div>

                {/* Mini Terminal */}
                <div className="mac-terminal">
                  <div className="mac-terminal-header">
                    <span className="mac-dot mac-dot-red"></span>
                    <span className="mac-dot mac-dot-yellow"></span>
                    <span className="mac-dot mac-dot-green"></span>
                    <span className="text-zinc-400 font-mono text-[10px] ml-2">policy_evaluation.log</span>
                  </div>
                  <div className="p-3.5 font-mono text-[11px] space-y-1">
                    <p className="text-zinc-400"><span className="text-emerald-400 font-bold">$</span> sdd eval-policies</p>
                    <p className="text-zinc-300">Layer 1: Checkov AST <span className="text-emerald-400">[PASSED]</span></p>
                    <p className="text-zinc-300">Layer 2: OPA Rego <span className="text-[#b8ff22]">[3/3 PASSED]</span></p>
                  </div>
                </div>
              </div>

              {/* Bento Card 3: Multi-Cloud Targets */}
              <div className="magic-card p-7 flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Multi-cloud targets</h3>
                    <span className="font-mono text-[11px] text-zinc-400 bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/[0.08]">Single Spec</span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    The same spec renders to Docker, AWS ECS, or Kubernetes without rewriting application definitions.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-center">
                  <div className="p-2.5 rounded-lg bg-[#b8ff22]/10 border border-[#b8ff22]/30 text-[#b8ff22] font-bold">Docker</div>
                  <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-zinc-300">AWS ECS</div>
                  <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-zinc-300">Kubernetes</div>
                </div>
              </div>

              {/* Bento Card 4: Drift & Self-Healing */}
              <div className="magic-card p-7 flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Drift & self-healing</h3>
                    <span className="font-mono text-[11px] text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-semibold">10m Cron</span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Background reconciliation runs every 10 minutes to normalize and align live containers with desired state.
                  </p>
                </div>

                {/* Mini Terminal */}
                <div className="mac-terminal">
                  <div className="mac-terminal-header">
                    <span className="mac-dot mac-dot-red"></span>
                    <span className="mac-dot mac-dot-yellow"></span>
                    <span className="mac-dot mac-dot-green"></span>
                    <span className="text-zinc-400 font-mono text-[10px] ml-2">reconcile_output</span>
                  </div>
                  <div className="p-3.5 font-mono text-[11px] space-y-1">
                    <p className="text-zinc-400"><span className="text-emerald-400 font-bold">$</span> sdd reconcile-drift</p>
                    <p className="text-red-400">rogue container: frontend-3-untracked</p>
                    <p className="text-emerald-400">✓ Reconciled → state converged</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RUN HISTORY & PROVENANCE TABLE */}
        <section id="history" className="p-6 md:p-12 border-b border-white/[0.08] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold text-white">Full audit trail, every run.</h2>
              <p className="text-zinc-400 text-xs sm:text-sm">Every deployed resource is tagged with the Git commit hash of the spec file that produced it.</p>
            </div>
            <Link to="/cockpit" className="text-xs font-mono font-bold text-[#b8ff22] hover:underline self-start sm:self-auto">
              Open Cockpit →
            </Link>
          </div>

          <div className="magic-card overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-white/[0.02] border-b border-white/[0.08] text-[10px] text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Spec Commit</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 font-semibold text-white">f966d061</td>
                  <td className="py-3 px-4 text-zinc-400">Docker</td>
                  <td className="py-3 px-4 text-zinc-400">9.6s</td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#b8ff22]/15 text-[#b8ff22] border border-[#b8ff22]/25">Deployed</span>
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 font-semibold text-white">a1c239de</td>
                  <td className="py-3 px-4 text-zinc-400">AWS ECS</td>
                  <td className="py-3 px-4 text-zinc-400">12.1s</td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#b8ff22]/15 text-[#b8ff22] border border-[#b8ff22]/25">Deployed</span>
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 font-semibold text-white">88f0a2b1</td>
                  <td className="py-3 px-4 text-zinc-400">Kubernetes</td>
                  <td className="py-3 px-4 text-zinc-400">8.4s</td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#b8ff22]/15 text-[#b8ff22] border border-[#b8ff22]/25">Deployed</span>
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 font-semibold text-white">2e77c9aa</td>
                  <td className="py-3 px-4 text-zinc-400">Docker</td>
                  <td className="py-3 px-4 text-zinc-400">0.9s</td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/25">Blocked</span>
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 font-semibold text-white">5d1147ff</td>
                  <td className="py-3 px-4 text-zinc-400">AWS ECS</td>
                  <td className="py-3 px-4 text-zinc-400">11.7s</td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#b8ff22]/15 text-[#b8ff22] border border-[#b8ff22]/25">Deployed</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ ACCORDION */}
        <section id="faq" className="p-6 md:p-12 border-b border-white/[0.08] space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Questions, answered plainly.</h2>
            <p className="text-zinc-400 text-xs sm:text-sm">Technical specifics on policy enforcement, cloud target provisioning, and offline fallback.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <details className="magic-card p-5 group cursor-pointer" open>
              <summary className="font-bold text-sm text-zinc-100 list-none flex justify-between items-center gap-2">
                <span>What happens if the AI generates something insecure?</span>
                <svg className="w-4 h-4 text-[#b8ff22] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </summary>
              <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                Nothing deploys. A static scanner and an OPA policy gate both evaluate the plan independently, and either one can block it.
              </p>
            </details>

            <details className="magic-card p-5 group cursor-pointer">
              <summary className="font-bold text-sm text-zinc-100 list-none flex justify-between items-center gap-2">
                <span>Does trying this need a real cloud account?</span>
                <svg className="w-4 h-4 text-[#b8ff22] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </summary>
              <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                No. The Docker target runs entirely locally; AWS ECS and Kubernetes targets render valid Terraform without requiring you to apply it.
              </p>
            </details>

            <details className="magic-card p-5 group cursor-pointer">
              <summary className="font-bold text-sm text-zinc-100 list-none flex justify-between items-center gap-2">
                <span>What does the ₹0 cost actually include?</span>
                <svg className="w-4 h-4 text-[#b8ff22] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </summary>
              <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                The AI layer uses OpenRouter's free-tier models, with a deterministic offline compiler as a fallback if a model is rate-limited or unavailable.
              </p>
            </details>

            <details className="magic-card p-5 group cursor-pointer">
              <summary className="font-bold text-sm text-zinc-100 list-none flex justify-between items-center gap-2">
                <span>Can I change which model compiles the spec?</span>
                <svg className="w-4 h-4 text-[#b8ff22] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </summary>
              <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                Yes, the model is configurable via an environment variable, with a fallback model if the primary is unavailable.
              </p>
            </details>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="p-6 md:p-12 space-y-8 bg-black/40">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <BrandLogo className="w-6 h-6 rounded-md border border-white/20" />
              <span className="font-bold text-base text-white">
                sdd<span className="text-[#b8ff22]">.infra</span>
              </span>
            </div>

            <a
              href="mailto:dwivediayush9634@gmail.com?subject=Question about SDD-Infra"
              className="h-8 px-4 rounded-full bg-[#b8ff22] text-zinc-950 font-bold text-xs hover:bg-[#c8ff4d] transition-all inline-flex items-center shrink-0"
            >
              Ask a question
            </a>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono text-zinc-500">
            <p>© 2026, SDD-Infra. Built by Ayush Dwivedi.</p>

            <div className="flex gap-4">
              <a
                href="https://github.com/dumbspin/ai_infra"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors"
                aria-label="GitHub"
              >
                GitHub
              </a>
              <Link to="/cockpit" className="hover:text-white transition-colors">
                Live Cockpit
              </Link>
            </div>
          </div>
        </footer>

        {/* Bottom Corner Crosshairs */}
        <div className="crosshair-corner -bottom-1 -left-1"></div>
        <div className="crosshair-corner -bottom-1 -right-1"></div>
      </div>
    </div>
  );
}
