import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import SpecEditor from "./components/SpecEditor";
import PipelineStepper from "./components/PipelineStepper";
import TopologyGraph from "./components/TopologyGraph";
import TelemetryHUD from "./components/TelemetryHUD";
import RuntimeCockpit from "./components/RuntimeCockpit";
import PolicyPanel from "./components/PolicyPanel";
import TerraformPanel from "./components/TerraformPanel";
import ResourcePlanPanel from "./components/ResourcePlanPanel";

const INITIAL_SPEC = `spec_version: "1.0"
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
  created_at: "2026-09-18T00:00:00Z"`;

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export default function Cockpit() {
  const [specText, setSpecText] = useState(INITIAL_SPEC);
  const [selectedTarget, setSelectedTarget] = useState("docker");
  const [activeNavTab, setActiveNavTab] = useState("specification");
  const [dockerOnline, setDockerOnline] = useState(true);
  const [policies, setPolicies] = useState([]);
  const [pipelineState, setPipelineState] = useState({
    status: "IDLE",
    target: "docker",
    current_step: "idle",
    steps: {
      specification: "IDLE",
      ai_compiler: "IDLE",
      terraform: "IDLE",
      opa_policy: "IDLE",
      deployment: "IDLE",
      verification: "IDLE",
      drift_check: "IDLE"
    },
    error_message: null,
    logs: [],
    violations: [],
    opa_evaluation: null,
    telemetry: {
      model: "liquid/lfm-2.5-2.6b:free",
      inference_time_ms: 0,
      total_duration_ms: 0,
      cost_usd: 0.0,
      cache_active: true
    }
  });
  const [validationResult, setValidationResult] = useState(null);
  const [resourcePlan, setResourcePlan] = useState({ resources: [] });
  const [terraformCode, setTerraformCode] = useState("");
  const [containers, setContainers] = useState([]);
  const [driftResult, setDriftResult] = useState({ drift_detected: false, items: [] });
  const [isSimulatingDrift, setIsSimulatingDrift] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isRefreshingInfra, setIsRefreshingInfra] = useState(false);
  const [runHistory, setRunHistory] = useState([]);

  // Poll Docker & System Status
  const fetchSystemData = async () => {
    // 1. Pipeline Status
    try {
      const pipeRes = await fetch(`${API_BASE}/api/pipeline/status`);
      if (pipeRes.ok) {
        const pipeData = await pipeRes.json();
        setPipelineState(pipeData);
      }
    } catch (e) {
      console.error("Error fetching pipeline status:", e);
    }

    // 2. Docker Status
    try {
      const dockerRes = await fetch(`${API_BASE}/api/docker/status`);
      if (dockerRes.ok) {
        const dockerData = await dockerRes.json();
        setDockerOnline(dockerData.connected);
      }
    } catch (e) {}

    // 3. Infrastructure Containers
    try {
      const infraRes = await fetch(`${API_BASE}/api/infrastructure`);
      if (infraRes.ok) {
        const infraData = await infraRes.json();
        setContainers(infraData.containers || []);
      }
    } catch (e) {}

    // 4. Drift Status
    try {
      const driftRes = await fetch(`${API_BASE}/api/drift`);
      if (driftRes.ok) {
        const driftData = await driftRes.json();
        setDriftResult(driftData);
      }
    } catch (e) {}

    // 5. Generated Artifacts
    try {
      const planRes = await fetch(`${API_BASE}/api/generated/resource-plan`);
      if (planRes.ok) {
        const planData = await planRes.json();
        setResourcePlan(planData);
      }
      const tfRes = await fetch(`${API_BASE}/api/generated/terraform`);
      if (tfRes.ok) {
        const tfData = await tfRes.json();
        setTerraformCode(tfData.code || "");
      }
    } catch (e) {}

    // 6. Active Policies
    try {
      const polRes = await fetch(`${API_BASE}/api/policies`);
      if (polRes.ok) {
        const polData = await polRes.json();
        setPolicies(polData.policies || []);
      }
    } catch (e) {}

    // 7. Run History
    try {
      const histRes = await fetch(`${API_BASE}/api/pipeline/history`);
      if (histRes.ok) {
        const histData = await histRes.json();
        setRunHistory(histData.history || []);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(fetchSystemData, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleClearHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/pipeline/history`, { method: "DELETE" });
      if (res.ok) {
        setRunHistory([]);
      }
    } catch (e) {
      console.error("Error clearing history:", e);
    }
  };

  // Validate Specification
  const handleValidate = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/specification/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specification: specText })
      });
      const data = await res.json();
      setValidationResult(data);
      return data.valid;
    } catch (err) {
      setValidationResult({ valid: false, message: `Server error: ${err.message}` });
      return false;
    }
  };

  // Option 1: Top Button — Synthesis Only (Dry-Run Stages 1-4)
  const handleSynthesizeOnly = async () => {
    const isValid = await handleValidate();
    if (!isValid) return;

    try {
      const res = await fetch(`${API_BASE}/api/pipeline/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          specification: specText,
          target: selectedTarget,
          dry_run: true
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPipelineState(prev => ({ ...prev, status: "RUNNING" }));
        fetchSystemData();
      } else {
        alert(data.detail || "Failed to start synthesis");
      }
    } catch (err) {
      alert(`Synthesis error: ${err.message}`);
    }
  };

  // Option 1: Bottom Button — Full Pipeline Deploy (Stages 1-6)
  const handleDeployFull = async () => {
    const isValid = await handleValidate();
    if (!isValid) return;

    try {
      const res = await fetch(`${API_BASE}/api/pipeline/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          specification: specText,
          target: selectedTarget,
          dry_run: false
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPipelineState(prev => ({ ...prev, status: "RUNNING" }));
        fetchSystemData();
      } else {
        alert(data.detail || "Failed to start pipeline");
      }
    } catch (err) {
      alert(`Pipeline error: ${err.message}`);
    }
  };

  // Calculate declared services & target replicas from live specText
  const { declaredServicesCount, targetUnitsCount } = React.useMemo(() => {
    try {
      const lines = specText.split("\n");
      let inServices = false;
      let svcCount = 0;
      let totalUnits = 0;
      let currentReplicas = null;

      for (let line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("services:")) {
          inServices = true;
          continue;
        }
        if (inServices) {
          if (trimmed.startsWith("security:") || trimmed.startsWith("metadata:")) {
            inServices = false;
            if (currentReplicas !== null) totalUnits += currentReplicas;
            currentReplicas = null;
            continue;
          }
          if (line.startsWith("  ") && !line.startsWith("    ") && trimmed.endsWith(":")) {
            svcCount += 1;
            if (currentReplicas !== null) totalUnits += currentReplicas;
            currentReplicas = 1;
          } else if (trimmed.startsWith("replicas:")) {
            currentReplicas = parseInt(trimmed.split(":")[1].trim()) || 1;
          }
        }
      }
      if (currentReplicas !== null) totalUnits += currentReplicas;

      return {
        declaredServicesCount: Math.max(1, svcCount),
        targetUnitsCount: Math.max(1, totalUnits)
      };
    } catch (e) {
      return { declaredServicesCount: 3, targetUnitsCount: 5 };
    }
  }, [specText]);

  // Toggle OPA Policy
  const handleTogglePolicy = async (policyId, enabled) => {
    try {
      const res = await fetch(`${API_BASE}/api/policies/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy_id: policyId, enabled })
      });
      if (res.ok) {
        // Re-evaluate against active policies
        try {
          const evalRes = await fetch(`${API_BASE}/api/policies/evaluate`, { method: "POST" });
          if (evalRes.ok) {
            const evalData = await evalRes.json();
            setPipelineState(prev => ({
              ...prev,
              opa_evaluation: evalData,
              violations: evalData.violations || [],
              steps: {
                ...prev.steps,
                opa_policy: evalData.allow ? "SUCCESS" : "FAILED"
              }
            }));
          }
        } catch (e) {}
        await fetchSystemData();
      }
    } catch (err) {
      console.error("Error toggling policy:", err);
    }
  };

  // Export Infrastructure Bundle (.zip)
  const handleExportBundle = () => {
    window.location.href = `${API_BASE}/api/export/bundle?target=${selectedTarget}`;
  };

  // Simulate Drift
  const handleSimulateDrift = async () => {
    setIsSimulatingDrift(true);
    try {
      const res = await fetch(`${API_BASE}/api/drift/simulate`, { method: "POST" });
      const data = await res.json();
      setDriftResult(data);
      await fetchSystemData();
    } catch (err) {
      alert(`Drift simulation error: ${err.message}`);
    } finally {
      setIsSimulatingDrift(false);
    }
  };

  // Auto-Reconcile & Self-Heal Drift
  const handleReconcileDrift = async () => {
    setIsReconciling(true);
    try {
      const res = await fetch(`${API_BASE}/api/drift/reconcile`, { method: "POST" });
      const data = await res.json();
      setDriftResult(data);
      await fetchSystemData();
    } catch (err) {
      alert(`Reconciliation error: ${err.message}`);
    } finally {
      setIsReconciling(false);
    }
  };

  // Clean Drift Container
  const handleCleanDrift = async () => {
    try {
      await fetch(`${API_BASE}/api/drift/simulate`, { method: "DELETE" });
      await fetchSystemData();
    } catch (err) {
      alert(`Error cleaning drift: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#cbccd4] text-slate-100 flex flex-col items-center justify-center p-2 sm:p-6 lg:p-10 font-sans selection:bg-[#b8ff22]/40 selection:text-black">
      {/* ── TABLET CONTAINER MATCHING REFERENCE IMAGE ── */}
      <div className="tablet-container rounded-[36px] sm:rounded-[44px] max-w-[1560px] w-full mx-auto p-4 sm:p-8 space-y-6 relative overflow-hidden">
        {/* 1. TOP NAVBAR WITH FLOATING WHITE PILL */}
        <Header 
          dockerOnline={dockerOnline} 
          pipelineStatus={pipelineState.status}
          selectedTarget={selectedTarget}
          onSelectTarget={setSelectedTarget}
          onExportBundle={handleExportBundle}
          activeTab={activeNavTab}
          onSelectTab={setActiveNavTab}
        />

        {/* 2. HERO TITLE + TOP 4 METRIC CARDS */}
        <div id="section-telemetry">
          <TelemetryHUD
            telemetry={pipelineState.telemetry}
            pipelineStatus={pipelineState.status}
            onSynthesize={handleSynthesizeOnly}
            onDeploy={handleDeployFull}
            isRunning={pipelineState.status === "RUNNING"}
            containers={containers}
            violations={pipelineState.violations || []}
            driftResult={driftResult}
            declaredServicesCount={declaredServicesCount}
            targetUnitsCount={targetUnitsCount}
            runHistory={runHistory}
          />
        </div>

        {/* 3. ACTIVE FILTERS STRIP + TIMELINE */}
        <div id="section-stepper">
          <PipelineStepper
            steps={pipelineState.steps}
            currentStep={pipelineState.current_step}
            pipelineStatus={pipelineState.status}
            failedStep={pipelineState.failed_step}
            errorMessage={pipelineState.error_message}
            logs={pipelineState.logs}
            selectedTarget={selectedTarget}
            onSelectTarget={setSelectedTarget}
          />
        </div>

        {/* 4. SIGNATURE DUAL-SURFACE SPLIT CARD ISLAND */}
        <SpecEditor
          specText={specText}
          setSpecText={setSpecText}
          onValidate={handleValidate}
          onDeploy={handleDeployFull}
          validationResult={validationResult}
          isRunning={pipelineState.status === "RUNNING"}
          containers={containers}
          terraformCode={terraformCode}
          resourcePlan={resourcePlan}
          policies={policies}
          violations={pipelineState.violations || []}
          driftResult={driftResult}
          selectedTarget={selectedTarget}
        />

        {/* 5. OPA GOVERNANCE + TERRAFORM & CANDIDATE PLAN ACCORDIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div id="section-opa" className="lg:col-span-6">
            <PolicyPanel
              opaStatus={pipelineState.steps.opa_policy}
              violations={pipelineState.violations || []}
              policies={policies}
              onTogglePolicy={handleTogglePolicy}
              opaEvaluation={pipelineState.opa_evaluation}
              staticScan={pipelineState.static_scan}
            />
          </div>
          <div id="section-terraform" className="lg:col-span-6 space-y-4">
            <TerraformPanel terraformCode={terraformCode} />
            <ResourcePlanPanel resourcePlan={resourcePlan} />
          </div>
        </div>

        {/* 6. RUNTIME COCKPIT: LIVE CONTAINERS & DRIFT HEALING ENGINE */}
        <div id="section-runtime">
          <RuntimeCockpit
            containers={containers}
            onRefreshContainers={async () => {
              setIsRefreshingInfra(true);
              await fetchSystemData();
              setIsRefreshingInfra(false);
            }}
            isRefreshingInfra={isRefreshingInfra}
            driftResult={driftResult}
            onSimulateDrift={handleSimulateDrift}
            onCleanDrift={handleCleanDrift}
            onReconcileDrift={handleReconcileDrift}
            isSimulatingDrift={isSimulatingDrift}
            isReconcilingDrift={isReconciling}
            opaStatus={pipelineState.steps.opa_policy}
            violations={pipelineState.violations || []}
            policies={policies}
            onTogglePolicy={handleTogglePolicy}
            terraformCode={terraformCode}
            resourcePlan={resourcePlan}
            runHistory={runHistory}
            onClearHistory={handleClearHistory}
            opaEvaluation={pipelineState.opa_evaluation}
            staticScan={pipelineState.static_scan}
          />
        </div>
      </div>
    </div>
  );
}
