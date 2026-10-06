# ==============================================================================
# SDD-Infra Backend Dockerfile
# Base Image: Python 3.11 Slim
# ==============================================================================
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Set working directory
WORKDIR /app

# ------------------------------------------------------------------------------
# System Dependencies & Core Binaries
# ------------------------------------------------------------------------------
# Install system utilities needed for fetching binaries and runtime operation
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    ca-certificates \
    git \
 && rm -rf /var/lib/apt/lists/*

# Install Terraform CLI (v1.7.5) for plan & validate stages
RUN ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "arm64" ]; then TF_ARCH="arm64"; else TF_ARCH="amd64"; fi && \
    curl -fsSL "https://releases.hashicorp.com/terraform/1.7.5/terraform_1.7.5_linux_${TF_ARCH}.zip" -o terraform.zip && \
    unzip terraform.zip -d /usr/local/bin && \
    rm terraform.zip && \
    terraform --version

# Install Open Policy Agent (OPA v0.62.0) for zero-trust security gate evaluation
RUN ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "arm64" ]; then OPA_ARCH="arm64_static"; else OPA_ARCH="amd64_static"; fi && \
    curl -fsSL "https://openpolicyagent.org/downloads/v0.62.0/opa_linux_${OPA_ARCH}" -o /usr/local/bin/opa && \
    chmod +x /usr/local/bin/opa && \
    opa version

# ------------------------------------------------------------------------------
# ARCHITECTURAL NOTE ON DOCKER DEPLOY TARGET & HOST SOCKET ACCESS:
# ------------------------------------------------------------------------------
# This container intentionally DOES NOT install Docker-in-Docker (DinD) or mount
# the host /var/run/docker.sock. Mounting the host socket gives the container
# root-equivalent privileges on the host, which is a major security risk in
# shared or cloud environments (e.g., Render, Fly.io, Kubernetes).
#
# - AWS ECS and Kubernetes targets work completely hosted inside this container
#   because they only compile, validate HCL, and plan against cloud provider schemas.
# - The Docker deploy target ('sdd deploy --target docker') is designed for local
#   developer execution where the local Docker daemon is natively available.
# - If remote Docker provisioning is required in cloud environments, use a remote
#   TLS-secured DOCKER_HOST endpoint rather than mounting the host socket.
# ------------------------------------------------------------------------------

# ------------------------------------------------------------------------------
# Python Dependencies (Cached Layer)
# ------------------------------------------------------------------------------
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ------------------------------------------------------------------------------
# Application Source Code & CLI Entrypoint
# ------------------------------------------------------------------------------
COPY pyproject.toml README.md ./
COPY src/ ./src/
COPY specification/ ./specification/
COPY policies/ ./policies/
COPY specs/ ./specs/

# Install SDD package in editable mode to register the `sdd` CLI binary in PATH
RUN pip install --no-cache-dir -e .

# Expose port for FastAPI backend
EXPOSE 8000

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f "http://localhost:${PORT:-8000}/health" || exit 1

# Start FastAPI server using uvicorn, honoring $PORT injected by cloud providers
CMD ["sh", "-c", "uvicorn src.server:app --host 0.0.0.0 --port ${PORT:-8000}"]
