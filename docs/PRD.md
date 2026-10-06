# Product Requirements Document
# AI-Assisted Specification Driven Infrastructure Management (SDD-Infra)

**Version**: 2.0 (Engineering Edition)  
**Author's lens**: Senior Backend Engineer — implementation-first, failure-mode-first  
**Status**: Complete / Production Prototype  
**Cost target**: ₹0 for prototype development  

---

## 0. What changed from v1.0

The first draft was directionally correct but written like a pitch deck: too much surface area (Brownfield, AMS, IMS applicability), not enough answer to "what breaks first and how do we know." This version:

* Cuts speculative sections that don't affect what gets built.
* Replaces "the LLM generates Terraform" with a concrete, testable contract for what the LLM is allowed to produce and how the system verifies it.
* Adds the things a backend engineer actually gets paged for: state management, idempotency, retries, schema versioning, and observability.
* Front-loads the highest-risk unknown (can a free model reliably produce usable output at all) instead of discovering it in week 3.
* The core idea from v1.0 is unchanged and still correct: **specification is desired state, AI is a translator not an executor, deterministic systems gate everything before it touches infrastructure.**

---

## 1. Problem, restated precisely

Infrastructure specs drift from Terraform, which drifts from reality, because there is no single enforced source of truth and no automated way to detect when the three diverge. The system needs to:

1. Accept a structured, versioned description of desired infra.
2. Turn that into Terraform without a human hand-writing HCL.
3. Refuse to apply anything that isn't syntactically valid or policy-compliant.
4. Continuously verify that what's running still matches what was asked for.

Everything else in this document is in service of those four things. If a design decision doesn't serve one of them, it's out of scope.

---

## 2. Non-goals

* Not a Terraform replacement, not a multi-cloud platform, not a general chatops tool.
* Not attempting >90% first-try LLM correctness. The system is designed assuming the LLM is wrong a meaningful fraction of the time — validation is the actual safety mechanism, not prompt quality.
* No multi-tenant, no auth system, no RBAC. Single-repo, single-operator prototype.

---

## 3. Architecture Overview

Instead of one big pipeline, five independently testable components with explicit contracts between them:

```
spec-loader  →  spec-compiler (LLM)  →  tf-validator  →  policy-gate (OPA)  →  applier  →  drift-detector
```

| Component | Input | Output | Failure mode it owns |
| :--- | :--- | :--- | :--- |
| **spec-loader** | raw YAML from Git | validated, schema-checked spec object | malformed spec, schema violations, secrets |
| **spec-compiler** | spec object | candidate JSON resource plan | LLM hallucination, schema non-conformance |
| **renderer** | candidate JSON plan | Terraform HCL (`main.tf`) | syntax errors, invalid resource refs |
| **tf-validator** | rendered HCL | validated Terraform plan | syntax / provider errors |
| **policy-gate** | Terraform plan JSON | allow/deny + violation list | policy / security violations |
| **applier** | approved plan | applied infra + state file | apply failures, partial application |
| **drift-detector** | spec + live state | drift report | false positives from representation mismatch |

---

## 4. Specification Schema

The spec is a versioned schema that the LLM, validator, and drift detector all depend on:

```yaml
spec_version: "1.0"          # required — breaking changes bump this
application: ecommerce
environment: development
services:
  frontend:
    replicas: 2
    image: nginx:1.25         # pin versions; never let the LLM choose
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
  created_at: "2026-09-18T00:00:00Z"
```

---

## 5. The AI Layer & Self-Correction Feedback Loop

The LLM never writes Terraform directly. It fills a strict JSON schema (`resource_schema.json`).
If the model's initial output fails validation, the exact schema error is fed back into a prompt retry loop before falling back to the deterministic offline compiler.

```
Spec → [LLM: spec → resource-plan JSON] → [schema gate] → [pure renderer: JSON → .tf]
         nondeterministic, retried              deterministic, unit-tested, no network calls
```

---

## 6. Security Gate & Open Policy Agent

Two independent security layers:
1. **Checkov**: Static AST scanner preventing public ingress and insecure open ports.
2. **Open Policy Agent (OPA)**: Zero-trust Rego rules (`deny_public_access`, `deny_ssh_enabled`, `deny_missing_owner`).

---

## 7. Drift Detection & Auto-Reconciliation

* Normalizes both desired state (spec) and live state (`tfstate` / live container probes).
* Classifies drift into `count_mismatch`, `unmanaged_resource`, and `config_drift`.
* Autonomous reconciliation heals unmanaged and drifted resources in a single step.
