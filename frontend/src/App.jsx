import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SpecEditor from './components/SpecEditor';
import PipelineStepper from './components/PipelineStepper';
import TopologyGraph from './components/TopologyGraph';
import TelemetryHUD from './components/TelemetryHUD';
import ResourcePlanPanel from './components/ResourcePlanPanel';
import TerraformPanel from './components/TerraformPanel';
import PolicyPanel from './components/PolicyPanel';
import InfrastructureTable from './components/InfrastructureTable';
import DriftPanel from './components/DriftPanel';

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

export default function App() {
  const [specText, setSpecText] = useState(INITIAL_SPEC);
  const [dockerOnline, setDockerOnline] = useState(true);
  const [pipelineState, setPipelineState] = useState({
    status: 'IDLE',
    current_step: 'idle',
    steps: {
      specification: 'IDLE',
      ai_compiler: 'IDLE',
      terraform: 'IDLE',
      opa_policy: 'IDLE',
      deployment: 'IDLE',
      verification: 'IDLE',
      drift_check: 'IDLE'
    },
    error_message: null,
    logs: [],
    violations: [],
    telemetry: {
      model: 'liquid/lfm-2.5-2.6b:free',
      inference_time_ms: 0,
      total_duration_ms: 0,
      cost_usd: 0.0,
      cache_active: true
    }
  });
  const [validationResult, setValidationResult] = useState(null);
  const [resourcePlan, setResourcePlan] = useState({ resources: [] });
  const [terraformCode, setTerraformCode] = useState('');
  const [containers, setContainers] = useState([]);
  const [driftResult, setDriftResult] = useState({ drift_detected: false, items: [] });
  const [isSimulatingDrift, setIsSimulatingDrift] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isRefreshingInfra, setIsRefreshingInfra] = useState(false);

  // Poll Docker & System Status
  const fetchSystemData = async () => {
    // 1. Pipeline Status
    try {
      const pipeRes = await fetch('/api/pipeline/status');
      if (pipeRes.ok) {
        const pipeData = await pipeRes.json();
        setPipelineState(pipeData);
      }
    } catch (e) {
      console.error('Error fetching pipeline status:', e);
    }

    // 2. Docker Status
    try {
      const dockerRes = await fetch('/api/docker/status');
      if (dockerRes.ok) {
        const dockerData = await dockerRes.json();
        setDockerOnline(dockerData.connected);
      }
    } catch (e) {}

    // 3. Infrastructure Containers
    try {
      const infraRes = await fetch('/api/infrastructure');
      if (infraRes.ok) {
        const infraData = await infraRes.json();
        setContainers(infraData.containers || []);
      }
    } catch (e) {}

    // 4. Drift Status
    try {
      const driftRes = await fetch('/api/drift');
      if (driftRes.ok) {
        const driftData = await driftRes.json();
        setDriftResult(driftData);
      }
    } catch (e) {}

    // 5. Generated Artifacts
    try {
      const planRes = await fetch('/api/generated/resource-plan');
      if (planRes.ok) {
        const planData = await planRes.json();
        setResourcePlan(planData);
      }
      const tfRes = await fetch('/api/generated/terraform');
      if (tfRes.ok) {
        const tfData = await tfRes.json();
        setTerraformCode(tfData.code || '');
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(fetchSystemData, 1500);
    return () => clearInterval(interval);
  }, []);

  // Validate Specification
  const handleValidate = async () => {
    try {
      const res = await fetch('/api/specification/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Run Infrastructure Pipeline
  const handleRunPipeline = async () => {
    const isValid = await handleValidate();
    if (!isValid) return;

    try {
      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specification: specText })
      });
      const data = await res.json();
      if (res.ok) {
        setPipelineState(prev => ({ ...prev, status: 'RUNNING' }));
        fetchSystemData();
      } else {
        alert(data.detail || 'Failed to start pipeline');
      }
    } catch (err) {
      alert(`Pipeline error: ${err.message}`);
    }
  };

  // Simulate Drift
  const handleSimulateDrift = async () => {
    setIsSimulatingDrift(true);
    try {
      const res = await fetch('/api/drift/simulate', { method: 'POST' });
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
      const res = await fetch('/api/drift/reconcile', { method: 'POST' });
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
      await fetch('/api/drift/simulate', { method: 'DELETE' });
      await fetchSystemData();
    } catch (err) {
      alert(`Error cleaning drift: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-gray-100 flex flex-col font-sans pb-12">
      <Header dockerOnline={dockerOnline} pipelineStatus={pipelineState.status} />

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Top HUD: AI & System Telemetry */}
        <TelemetryHUD
          telemetry={pipelineState.telemetry}
          pipelineStatus={pipelineState.status}
        />

        {/* Section 1: Specification Editor with Scenario Presets */}
        <SpecEditor
          specText={specText}
          setSpecText={setSpecText}
          onValidate={handleValidate}
          onRunPipeline={handleRunPipeline}
          validationResult={validationResult}
          isRunning={pipelineState.status === 'RUNNING'}
        />

        {/* Section 2: Pipeline Stepper & Live Streaming Logs */}
        <PipelineStepper
          steps={pipelineState.steps}
          currentStep={pipelineState.current_step}
          pipelineStatus={pipelineState.status}
          logs={pipelineState.logs}
        />

        {/* Pipeline Error Alert Banner if failed */}
        {pipelineState.status === 'FAILED' && pipelineState.error_message && (
          <div className="bg-rose-950/30 border border-rose-500/40 p-4 rounded-xl text-xs font-mono text-rose-300 shadow-xl">
            <strong className="text-rose-400 block mb-1">❌ Pipeline Execution Blocked / Guardrail Enforced:</strong>
            <pre className="whitespace-pre-wrap">{pipelineState.error_message}</pre>
          </div>
        )}

        {/* Section 3: Interactive Architecture Topology Graph */}
        <TopologyGraph containers={containers} />

        {/* Section 4: Expandable Artifact Panels (AI Resource Plan, Terraform HCL, Policy Check) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ResourcePlanPanel resourcePlan={resourcePlan} />
          <TerraformPanel terraformCode={terraformCode} />
          <PolicyPanel 
            opaStatus={pipelineState.steps.opa_policy} 
            violations={pipelineState.violations || []} 
          />
        </div>

        {/* Section 5: Live Infrastructure Table */}
        <InfrastructureTable
          containers={containers}
          onRefresh={async () => {
            setIsRefreshingInfra(true);
            await fetchSystemData();
            setIsRefreshingInfra(false);
          }}
          isLoading={isRefreshingInfra}
        />

        {/* Section 6: Drift Detection & Auto-Reconciliation Engine */}
        <DriftPanel
          driftResult={driftResult}
          onSimulateDrift={handleSimulateDrift}
          onCleanDrift={handleCleanDrift}
          onReconcileDrift={handleReconcileDrift}
          isSimulating={isSimulatingDrift}
          isReconciling={isReconciling}
        />
      </main>
    </div>
  );
}
