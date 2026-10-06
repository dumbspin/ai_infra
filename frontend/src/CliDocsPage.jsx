import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Check, ArrowLeft, ArrowUpRight } from "lucide-react";
import BrandLogo from "./components/BrandLogo";

function CodeBlock({ code, language = "bash" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl bg-[#0c0e10] border border-white/[0.08] overflow-hidden my-3">
      <div className="flex items-center justify-between px-4 py-2 bg-[#121518] border-b border-white/[0.06] text-[11px] font-mono text-zinc-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/80"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/80"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/80"></span>
          <span className="ml-2 text-zinc-400">{language}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-zinc-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/[0.06] transition-colors"
          title="Copy command"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#b8ff22]" />
              <span className="text-[#b8ff22]">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto font-mono text-xs text-zinc-200 leading-relaxed">
        <pre className="m-0">{code}</pre>
      </div>
    </div>
  );
}

export default function CliDocsPage() {
  const [activeSection, setActiveSection] = useState("overview");

  const navLinks = [
    { id: "overview", label: "Overview", num: "00" },
    { id: "installation", label: "Installation & Setup", num: "01" },
    { id: "validate", label: "sdd validate", num: "02" },
    { id: "compile", label: "sdd compile", num: "03" },
    { id: "plan", label: "sdd plan", num: "04" },
    { id: "deploy", label: "sdd deploy", num: "05" },
    { id: "drift", label: "sdd drift", num: "06" },
    { id: "history", label: "sdd history", num: "07" },
  ];

  return (
    <div className="min-h-screen relative font-sans antialiased overflow-x-hidden selection:bg-[#b8ff22]/30 selection:text-white bg-[#060707] text-[#f3f5ef]">
      {/* Background Grid Pattern */}
      <div className="bg-grid-pattern"></div>

      {/* Main Wrapper */}
      <div className="max-w-6xl mx-auto border-x border-white/[0.08] relative bg-void min-h-screen flex flex-col">
        {/* Top Crosshairs */}
        <div className="crosshair-corner -top-1 -left-1"></div>
        <div className="crosshair-corner -top-1 -right-1"></div>

        {/* TOP NAVBAR */}
        <header className="sticky top-0 z-50 px-6 py-4 backdrop-blur-md bg-void/85 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2.5 group">
              <BrandLogo className="w-7 h-7 rounded-lg border border-white/20" />
              <span className="font-bold text-base text-white tracking-tight">
                sdd<span className="text-[#b8ff22]">.infra</span>
              </span>
            </Link>
            <span className="hidden sm:inline-block text-zinc-600">/</span>
            <span className="hidden sm:inline-block font-mono text-xs text-zinc-400">CLI Documentation</span>
          </div>

          <nav className="flex items-center gap-4 sm:gap-6 text-xs font-mono font-medium">
            <Link to="/" className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5 text-[#b8ff22]" />
              <span>Landing</span>
            </Link>
            <Link to="/cli" className="text-[#b8ff22] font-bold border-b border-[#b8ff22] pb-0.5">
              CLI Docs
            </Link>
            <a
              href="https://github.com/dumbspin/ai_infra"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 hover:text-white transition-colors hidden md:inline-block"
            >
              GitHub
            </a>
            <Link
              to="/cockpit"
              className="h-8 px-4 rounded-full bg-[#b8ff22] text-zinc-950 font-bold text-xs hover:bg-[#c8ff4d] hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-1.5 shadow-[0_0_15px_rgba(184,255,34,0.3)]"
            >
              <span>Cockpit</span>
              <span>→</span>
            </Link>
          </nav>
        </header>

        {/* DOCS HERO BANNER */}
        <section className="relative px-6 py-12 md:py-16 border-b border-white/[0.08] overflow-hidden bg-zinc-950/40">
          <div className="hero-glow-container">
            <div className="hero-glow-primary !h-[260px] !bottom-[-60px]"></div>
          </div>

          <div className="max-w-3xl space-y-4 relative z-10">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
              Autonomous Infrastructure from your Terminal.
            </h1>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              The <code className="text-[#b8ff22] font-mono bg-white/[0.05] px-1.5 py-0.5 rounded">sdd</code> CLI brings the entire compilation, policy gating, deployment, and drift reconciliation pipeline into your local shell and CI/CD pipelines.
            </p>
          </div>
        </section>

        {/* MAIN CONTENT GRID (Sidebar + Content) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12">
          {/* Sticky Sidebar Navigation */}
          <aside className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-white/[0.08] p-6 lg:p-8 bg-zinc-950/20 lg:sticky lg:top-[65px] lg:h-[calc(100vh-65px)] lg:overflow-y-auto">
            <div className="space-y-6">
              <div>
                <p className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-3">Commands</p>
                <ul className="space-y-1">
                  {navLinks.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        onClick={() => setActiveSection(item.id)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono transition-all group ${
                          activeSection === item.id
                            ? "bg-[#b8ff22]/15 text-[#b8ff22] font-bold border border-[#b8ff22]/30"
                            : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                        }`}
                      >
                        <span className={`text-[10px] font-mono ${activeSection === item.id ? "text-[#b8ff22]" : "text-zinc-600 group-hover:text-zinc-400"}`}>
                          {item.num}.
                        </span>
                        <span>{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                <p className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Interactive Cockpit
                </p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Prefer a graphical UI? Run your pipeline in the SDD-Infra Web Cockpit.
                </p>
                <Link
                  to="/cockpit"
                  className="inline-flex items-center gap-1 text-xs font-mono text-[#b8ff22] font-bold hover:underline pt-1"
                >
                  <span>Open Cockpit</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </aside>

          {/* Docs Main Content Column */}
          <main className="lg:col-span-9 p-6 sm:p-10 md:p-12 space-y-16">
            
            {/* 1. OVERVIEW */}
            <section id="overview" className="space-y-4">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Overview & Invocation
              </h2>
              <p className="text-zinc-300 text-sm leading-relaxed">
                The SDD-Infra CLI is designed as a thin, deterministic interface over our compiler and policy engine. It can be invoked directly via the registered <code className="text-[#b8ff22] font-mono">sdd</code> executable or as a Python module:
              </p>

              <CodeBlock
                language="bash"
                code={`# Direct binary invocation (recommended)
sdd <command> [OPTIONS] [ARGS]

# Python module invocation (universal fallback)
python -m src.cli <command> [OPTIONS] [ARGS]`}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="magic-card p-4 space-y-1.5">
                  <p className="font-mono text-xs font-bold text-[#b8ff22]">Deterministic</p>
                  <p className="text-xs text-zinc-400">Offline mock fallback when API keys are absent or rate-limited.</p>
                </div>
                <div className="magic-card p-4 space-y-1.5">
                  <p className="font-mono text-xs font-bold text-emerald-400">Policy-Gated</p>
                  <p className="text-xs text-zinc-400">Dual security gates (Checkov AST + OPA Rego) run on every plan.</p>
                </div>
                <div className="magic-card p-4 space-y-1.5">
                  <p className="font-mono text-xs font-bold text-cyan-400">CI/CD Ready</p>
                  <p className="text-xs text-zinc-400">Structured <code className="text-white">--json</code> output and exit codes for automated GitHub Actions.</p>
                </div>
              </div>
            </section>

            {/* 2. INSTALLATION & SETUP */}
            <section id="installation" className="space-y-4 border-t border-white/[0.08] pt-12">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Installation & Setup
              </h2>
              <p className="text-zinc-300 text-sm leading-relaxed">
                Install SDD-Infra in editable mode to register the global <code className="text-[#b8ff22] font-mono">sdd</code> console script in your Python environment:
              </p>

              <CodeBlock
                language="bash"
                code={`# Clone and install dependencies
cd d:/ai-infra
pip install -r requirements.txt
pip install -e .`}
              />

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2 text-xs text-zinc-300">
                <p className="font-bold text-amber-400 font-mono uppercase tracking-wide text-[11px]">
                  PowerShell PATH Configuration
                </p>
                <p>
                  If PowerShell reports <code className="text-zinc-100 font-mono">'sdd' is not recognized</code>, add Python's Scripts folder to your PATH:
                </p>
                <CodeBlock
                  language="powershell"
                  code={`$env:PATH += ";C:\\Users\\dwive\\python311;C:\\Users\\dwive\\python311\\Scripts"`}
                />
              </div>
            </section>

            {/* 3. SDD VALIDATE */}
            <section id="validate" className="space-y-4 border-t border-white/[0.08] pt-12">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white font-mono tracking-tight">
                  <span className="text-zinc-500 font-normal">01.</span> sdd validate
                </h2>
                <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">Fast-Fail Gate</span>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed">
                Validates the specification syntax against the JSON Schema and runs an immediate secret scanner across all fields (denylisting passwords, tokens, API keys).
              </p>

              <CodeBlock
                language="bash"
                code={`sdd validate specification/infrastructure.yaml`}
              />

              <div className="space-y-2">
                <p className="text-xs font-mono text-zinc-400 font-bold uppercase">Expected Output</p>
                <div className="mac-terminal">
                  <div className="p-4 font-mono text-xs text-zinc-300 space-y-1">
                    <p className="text-emerald-400 font-bold">✓ Specification valid</p>
                    <p className="text-zinc-500">Exit Code: 0</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. SDD COMPILE */}
            <section id="compile" className="space-y-4 border-t border-white/[0.08] pt-12">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white font-mono tracking-tight">
                  <span className="text-zinc-500 font-normal">02.</span> sdd compile
                </h2>
                <span className="font-mono text-xs text-[#b8ff22] bg-[#b8ff22]/10 px-2.5 py-0.5 rounded-full border border-[#b8ff22]/20">AI Synthesis</span>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed">
                Compiles the spec into candidate JSON resources with schema validation retry loops and deterministic offline fallback.
              </p>

              <CodeBlock
                language="bash"
                code={`# Compile for local Docker daemon
sdd compile specification/infrastructure.yaml --target docker

# Compile for AWS ECS with custom output path
sdd compile specification/infrastructure.yaml --target aws_ecs --output terraform/generated/plan.json`}
              />

              <div className="space-y-2">
                <p className="text-xs font-mono text-zinc-400 font-bold uppercase">Options</p>
                <div className="magic-card overflow-hidden">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-white/[0.02] border-b border-white/[0.08] text-[10px] text-zinc-400 uppercase">
                      <tr>
                        <th className="py-2.5 px-4">Flag</th>
                        <th className="py-2.5 px-4">Description</th>
                        <th className="py-2.5 px-4">Default</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                      <tr>
                        <td className="py-2.5 px-4 text-[#b8ff22] font-semibold">--target, -t</td>
                        <td className="py-2.5 px-4">Target cloud architecture (docker, aws_ecs, kubernetes)</td>
                        <td className="py-2.5 px-4 text-zinc-500">docker</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 text-[#b8ff22] font-semibold">--model, -m</td>
                        <td className="py-2.5 px-4">OpenRouter model override</td>
                        <td className="py-2.5 px-4 text-zinc-500">liquid/lfm-2.5-2.6b:free</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 text-[#b8ff22] font-semibold">--output, -o</td>
                        <td className="py-2.5 px-4">File path to write compiled JSON resource plan</td>
                        <td className="py-2.5 px-4 text-zinc-500">stdout</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* 5. SDD PLAN */}
            <section id="plan" className="space-y-4 border-t border-white/[0.08] pt-12">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white font-mono tracking-tight">
                  <span className="text-zinc-500 font-normal">03.</span> sdd plan
                </h2>
                <span className="font-mono text-xs text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">Zero-Mutation</span>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed">
                Runs Terraform validation, Checkov static AST scanning, and OPA Rego zero-trust compliance evaluation. <strong className="text-white">Never mutates live infrastructure.</strong>
              </p>

              <CodeBlock
                language="bash"
                code={`# Human-readable terminal output
sdd plan specification/infrastructure.yaml

# CI-ready JSON output
sdd plan specification/infrastructure.yaml --json`}
              />

              <div className="space-y-2">
                <p className="text-xs font-mono text-zinc-400 font-bold uppercase">Terminal Evaluation Sample</p>
                <div className="mac-terminal">
                  <div className="p-4 font-mono text-xs space-y-1">
                    <p className="text-emerald-400 font-bold">✓ Terraform valid</p>
                    <p className="text-emerald-400 font-bold">✓ Static scan: 0 critical/high findings</p>
                    <p className="text-[#b8ff22] font-bold">✓ OPA: 3/3 policies passed</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 6. SDD DEPLOY */}
            <section id="deploy" className="space-y-4 border-t border-white/[0.08] pt-12">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white font-mono tracking-tight">
                  <span className="text-zinc-500 font-normal">04.</span> sdd deploy
                </h2>
                <span className="font-mono text-xs text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">Live Provision</span>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed">
                Runs all plan-stage verification checks, prompts for confirmation in interactive terminals, and executes Terraform apply.
              </p>

              <CodeBlock
                language="bash"
                code={`# Interactive deploy (will prompt confirmation in terminal)
sdd deploy specification/infrastructure.yaml

# Auto-approved CI deploy
sdd deploy specification/infrastructure.yaml --yes

# Dry-run execution (identical to plan)
sdd deploy specification/infrastructure.yaml --dry-run`}
              />
            </section>

            {/* 7. SDD DRIFT */}
            <section id="drift" className="space-y-4 border-t border-white/[0.08] pt-12">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white font-mono tracking-tight">
                  <span className="text-zinc-500 font-normal">05.</span> sdd drift
                </h2>
                <span className="font-mono text-xs text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">Self-Healing</span>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed">
                Normalizes desired state from the YAML spec against live Docker containers and Terraform state. Can autonomously prune rogue containers and re-apply drifted resources.
              </p>

              <CodeBlock
                language="bash"
                code={`# Detect live drift
sdd drift

# Automatically reconcile & self-heal detected drift
sdd drift --reconcile`}
              />
            </section>

            {/* 8. SDD HISTORY */}
            <section id="history" className="space-y-4 border-t border-white/[0.08] pt-12 pb-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white font-mono tracking-tight">
                  <span className="text-zinc-500 font-normal">06.</span> sdd history
                </h2>
                <span className="font-mono text-xs text-zinc-400 bg-white/[0.05] px-2.5 py-0.5 rounded-full border border-white/[0.1]">Audit Trail</span>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed">
                Displays the execution history of past runs with Git commit provenance, target cloud, durations, and statuses.
              </p>

              <CodeBlock
                language="bash"
                code={`sdd history --limit 10`}
              />
            </section>

          </main>
        </div>

        {/* FOOTER */}
        <footer className="p-6 md:p-12 space-y-6 bg-black/40 border-t border-white/[0.08]">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono text-zinc-500">
            <p>© 2026, SDD-Infra. Autonomous Infrastructure Compiler.</p>
            <div className="flex gap-4">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <Link to="/cockpit" className="hover:text-white transition-colors">Live Cockpit</Link>
              <a href="https://github.com/dumbspin/ai_infra" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
            </div>
          </div>
        </footer>

        {/* Bottom Crosshairs */}
        <div className="crosshair-corner -bottom-1 -left-1"></div>
        <div className="crosshair-corner -bottom-1 -right-1"></div>
      </div>
    </div>
  );
}
