# SDD-Infra Deployment Guide

This guide details how to build, configure, and deploy the SDD-Infra FastAPI backend (`src/server.py`), CLI, and React dashboard on a **fully ₹0 stack** using **Render Free Tier** (for containerized web hosting) and **Turso** (for managed, SQLite-compatible persistent run history).

---

## 1. Architectural Security Model & Target Limitations

> [!IMPORTANT]
> **Docker Target vs. Cloud Targets (AWS ECS / Kubernetes)**
> 
> The SDD-Infra container image deliberately **does not** include Docker-in-Docker (DinD) or mount the host's `/var/run/docker.sock`. Mounting the host Docker socket into a container grants root-equivalent control over the host VM/node, creating a critical container-breakout vulnerability.
> 
> - **Hosted Cloud Targets (`aws_ecs`, `kubernetes`)**: Fully supported inside hosted containers. These targets perform AI compilation, Terraform HCL synthesis, Checkov AST static scanning, and OPA Rego policy evaluation without requiring any local container runtime.
> - **Local Docker Target (`docker`)**: The `sdd deploy --target docker` live-provisioning step is designed for local developer workstations where Docker Desktop or a local Docker engine is present. When running in a hosted cloud container (e.g. Render/Fly.io), synthesis and planning (`sdd plan` / AI compilation) work seamlessly, but live container provisioning requires either running locally or connecting to an external Docker daemon via a secured `DOCKER_HOST` TLS endpoint.

---

## 2. Zero-Cost ($0 / ₹0) Database Setup with Turso

Render's free tier container filesystem is ephemeral and resets on every redeploy or idle restart. To ensure pipeline run history persists across redeploys without paying for persistent disks, SDD-Infra uses **Turso** (managed libSQL/SQLite over HTTPS/TLS).

### Step 1: Install Turso CLI & Authenticate
```bash
# Install Turso CLI (macOS/Linux)
curl -sSfL https://get.tur.so/install.sh | bash

# Install Turso CLI (Windows via PowerShell or Scoop)
# scoop install turso   OR   winget install turso

# Login to Turso
turso auth login
```

### Step 2: Create a Free Database
```bash
# Create the sdd-infra database
turso db create sdd-infra

# Retrieve the database connection URL (e.g. libsql://sdd-infra-[username].turso.io)
turso db show sdd-infra --url

# Generate a persistent authentication token
turso db tokens create sdd-infra
```

### Environment Variables
| Variable | Description |
|---|---|
| `TURSO_DATABASE_URL` | The `libsql://...` database endpoint URL obtained from `turso db show sdd-infra --url` |
| `TURSO_AUTH_TOKEN` | The authentication token generated via `turso db tokens create sdd-infra` |
| `SDD_DB_PATH` | *(Optional fallback)* Local SQLite file path (defaults to `./data/sdd.db`). Used automatically when `TURSO_DATABASE_URL` is unset. |

---

## 3. Render Free Tier Web Service Deployment

Render automatically detects the repository's `render.yaml` Blueprint or can be set up manually as a Docker Web Service.

### Blueprint Deployment (`render.yaml`)
1. Fork or push this repository to GitHub.
2. Log in to [Render](https://render.com) and navigate to **Blueprints** > **New Blueprint Instance**.
3. Select your repository. Render will automatically parse `render.yaml`.
4. Fill in the required environment secrets in the Render dashboard:
   - `OPENROUTER_API_KEY`: Your OpenRouter API key.
   - `OPENROUTER_MODEL`: e.g. `liquid/lfm-2.5-2.6b:free`
   - `OPENROUTER_FALLBACK_MODEL`: e.g. `meta-llama/llama-3.2-3b-instruct:free`
   - `CORS_ALLOWED_ORIGINS`: Comma-separated allowed URLs, e.g. `https://your-frontend.vercel.app,http://localhost:5173`
   - `TURSO_DATABASE_URL`: `libsql://sdd-infra-[org].turso.io`
   - `TURSO_AUTH_TOKEN`: Your Turso JWT auth token

> [!NOTE]
> **Free Tier Idle Spin-Down & Cold Starts**
> 
> Render's free tier automatically spins down web services after 15 minutes of inactivity. When a new request arrives, Render spins the container back up, which introduces a **cold start delay of ~50 seconds** on the very first request. This is an expected trade-off of the ₹0 hosting model, not a bug. Once warmed up, all requests respond with normal sub-second latencies.

---

## 4. Container Build & Local Verification

### Build the Image Locally
```bash
docker build -t sdd-infra:latest .
```

### Run Container Locally with Turso or SQLite Fallback
```bash
# Running with Turso persistence
docker run -d \
  --name sdd-infra \
  -p 8000:8000 \
  -e OPENROUTER_API_KEY="your_api_key_here" \
  -e TURSO_DATABASE_URL="libsql://sdd-infra-[org].turso.io" \
  -e TURSO_AUTH_TOKEN="your_token_here" \
  sdd-infra:latest

# Or running purely locally (falls back to local SQLite file)
docker run -d \
  --name sdd-infra-local \
  -p 8000:8000 \
  -e OPENROUTER_API_KEY="your_api_key_here" \
  sdd-infra:latest
```

### Verify Endpoints
```bash
# Healthcheck Probe
curl http://localhost:8000/health

# Run History Probe
curl http://localhost:8000/api/pipeline/history
```

---

## 5. End-to-End Verification Checklist

To verify the deployment pipeline:

1. **Local Fallback Verification**:
   ```bash
   # Unset TURSO_DATABASE_URL and run test suite
   python -m pytest tests/test_db.py -v
   ```
   Confirm all tests pass against the local SQLite fallback path.

2. **Turso Persistence Verification**:
   Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` locally, perform a test run:
   ```bash
   sdd plan specification/infrastructure.yaml
   sdd history
   ```
   Confirm the run is logged and queryable via `turso db shell sdd-infra "SELECT * FROM runs;"`.

3. **Render Redeploy Persistence Test**:
   - Deploy backend to Render.
   - Execute a pipeline run via `POST /api/pipeline/run`.
   - Trigger a **Manual Redeploy** in the Render Dashboard (clears container filesystem).
   - Once the service restarts, check `GET /api/pipeline/history` — previously recorded runs will remain present because they are persisted in Turso.

4. **Frontend Connection**:
   - Set `VITE_API_BASE_URL` in your frontend environment (e.g. `https://sdd-infra.onrender.com`).
   - Run `npm run build` or deploy to Vercel/Netlify.
   - Open the live Cockpit to inspect live pipeline status, telemetry, and run history.

---

## 6. GitHub Actions CI/CD Pipeline (`.github/workflows/pipeline.yml`)

The repository includes a two-job CI/CD pipeline using the `sdd` CLI:

### Job 1: `validate` (Runs on Pull Requests)
- Validates spec syntax (`sdd validate`)
- Generates and tests dry-run plans for all targets: **Docker**, **AWS ECS**, and **Kubernetes** (`sdd plan --json`)
- Runs the full unit and integration test suite (`pytest tests/ -v`)
- Fails the PR immediately on any security policy violation or schema defect without executing changes.

### Job 2: `deploy-check` (Runs on push to `main`)
- Validates that the runner's Docker daemon is reachable via `is_docker_daemon_reachable()`.
- Runs live end-to-end container provisioning on the runner: `sdd deploy specification/infrastructure.yaml --target docker --yes --json`.
- Automatically executes teardown cleanup (`terraform destroy`) in `if: always()` block.
- Persists run history to Turso database.

### Required GitHub Repository Secrets
Navigate to **GitHub Repo** > **Settings** > **Secrets and variables** > **Actions** > **New repository secret**:

| Secret Name | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | **Yes** | API key for AI synthesis engine (e.g. OpenRouter) |
| `OPENROUTER_MODEL` | Optional | AI Model ID (defaults to `liquid/lfm-2.5-2.6b:free`) |
| `OPENROUTER_FALLBACK_MODEL` | Optional | Fallback model ID (defaults to `meta-llama/llama-3.2-3b-instruct:free`) |
| `TURSO_DATABASE_URL` | Optional | Turso database URL for run history persistence in CI |
| `TURSO_AUTH_TOKEN` | Optional | Turso JWT authentication token |

---

## 7. Summary of Included Tooling

| Tool | Version | Purpose |
|---|---|---|
| **Python** | 3.11-slim | FastAPI runtime & SDD core pipeline |
| **libSQL / Turso** | >= 0.1.0 | Remote SQLite-compatible zero-cost persistent run history |
| **Terraform** | 1.7.5 | HCL validation, plan synthesis, and change calculation |
| **Open Policy Agent (OPA)** | 0.62.0 | Zero-trust Rego compliance and security policy gating |
| **Checkov** | >= 3.2.0 | AST static analysis for infrastructure misconfigurations |

