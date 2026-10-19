# FinTrace AI — Intelligent Mule Account Detection & Financial Crime Investigation Platform

[![Rust](https://img.shields.io/badge/Primary%20Backend-Rust%20(Axum%20%2B%20SQLx)-orange.svg?style=flat&logo=rust)](https://www.rust-lang.org/)
[![Python](https://img.shields.io/badge/ML%20Service-Python%20%2F%20FastAPI-009688.svg?style=flat&logo=python)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/Generative%20AI-CWGAN--GP%20%2F%20GraphSAGE-EE4C2C.svg?style=flat&logo=pytorch)](https://pytorch.org/)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB.svg?style=flat&logo=react)](https://vitejs.dev/)
[![Cytoscape.js](https://img.shields.io/badge/Graph%20Engine-Cytoscape.js-0284C7.svg?style=flat)](#graph-investigation)

**FinTrace AI** is an institutional financial crime investigation platform designed for Anti-Money Laundering (AML) analysts, cybercrime task forces, and Financial Intelligence Units (FIU). It features a **high-throughput asynchronous Rust backend (Axum, Tokio, SQLx)** communicating with a dedicated **Python PyTorch ML microservice (Tabular CWGAN-GP + Multi-Task GraphSAGE)** to evaluate complex relational transaction graphs, synthesize non-leaking transaction records, detect mule accounts, and trace multi-hop money trails.

---

## 1. System Architecture

```
[ Frontend: React 19 + Vite ] ──► (Port 5173)
            │
            ▼
[ Rust API Backend: Axum + SQLx ] ──► (Port 8000)
    │                  │
    ▼                  ▼
[ Database:        [ Internal HTTP Client (reqwest) ]
  PostgreSQL / SQLite] │
                       ▼
         [ Python ML Microservice: FastAPI + PyTorch ] ──► (Port 8001)
           - Tabular CWGAN-GP Synthetic Generator
           - Multi-Task GraphSAGE GNN
           - Tabular Fraud Classifier Benchmark
           - Synthetic Privacy & Fidelity Auditing
```

* **Rust API Backend (`rust_backend/`)**: Acts as the single source of truth for accounts, transactions, cases, evidence, complaints, alerts, and audit logs. Provides WebSocket streaming (`/ws`) for real-time AML updates.
* **Python ML Microservice (`backend/`)**: Dedicated generative AI and deep learning microservice executing PyTorch neural networks for synthetic transaction synthesis and GraphSAGE neighborhood aggregation.
* **Frontend Web Application (`frontend/`)**: High-performance dark-navy glassmorphism dashboard built with React 19, Cytoscape.js, Recharts, and Tailwind CSS.

---

## 2. Key Modules & Capabilities

1. **Authentication & RBAC (`auth`)**: Investigator login with Argon2 password hashing and 7-day secure JWT access tokens.
2. **Transaction Management (`transactions`)**: Idempotent CSV ingestion, duplicate detection, and streaming transaction queries.
3. **Mule Account Risk Assessment (`accounts`)**: Continuous GraphSAGE risk scores ($0.0 - 1.0$), topological degree, and turnover ratio drain analysis.
4. **Graph Canvas & Cycle Detection (`graph`)**: Interactive Cytoscape.js directed graph, 2-hop ego subgraphs, and Petgraph elementary cycle detection ($A \to B \to C \to A$).
5. **Multi-Hop Money Trail (`money_trail`)**: Breadth-first inbound origin tracing (cyber victims) and outbound cash-out tracing (crypto / offshore conduits).
6. **Cyber Complaint Cross-Correlation (`complaints`)**: Links National Cyber Crime Portal complaints to suspect recipient accounts.
7. **Investigation Case Docket (`cases`)**: Case management, priority assignment, evidence locker, and official legal dossier compilation.
8. **Generative Adversarial Network (`ml_client/gan`)**: Conditional WGAN with Gradient Penalty (CWGAN-GP) synthesizing realistic financial transactions.
9. **Synthetic Data Quality & Privacy Audit (`ml_client/quality`)**: Wasserstein distance, KS statistics, total variation distance, and exact-memorization leakage tests.
10. **Supervised Fraud Classifier (`ml_client/classifier`)**: Evaluates real-only training vs real + validated synthetic augmentation on held-out test splits.

---

## 3. Quick Start & Startup Instructions

### Prerequisites
* Rust 1.80+ (with Cargo)
* Python 3.10+ (with pip)
* Node.js v18+ (with npm)
* Docker & Docker Compose (optional for containerized deployments)

---

### Running with Docker Compose (Single Command)

```bash
docker compose up --build
```
* **Frontend**: `http://localhost:5173`
* **Rust API Backend**: `http://127.0.0.1:8000`
* **Python ML Microservice**: `http://127.0.0.1:8001`
* **PostgreSQL**: `localhost:5432`

---

### Running Locally (Native Development)

#### 1. Start Python ML Microservice (Port 8001)
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

#### 2. Start Rust API Backend (Port 8000)
```bash
cd rust_backend
cargo run
```

#### 3. Start Frontend Dashboard (Port 5173)
```bash
cd frontend
npm run dev
```

---

## 4. Default Investigator Credentials

* **Investigator Badge ID**: `INV-7809-DELHI` (Pre-filled on login screen)
* **Password**: `admin123` (or any password in local demo mode)
* **Access Level**: Level 4 Institutional AML Analyst

---

## 5. Running Automated Tests

### Rust Backend Tests (Unit & Integration)
```bash
cd rust_backend
cargo test
```
Tests verify:
- Argon2 password hashing and verification
- JWT claims creation, signing, and decoding
- Database schema initialization
- Idempotent transaction insertion and duplicate rejection
- Case management and evidence locker attachments
- Alert creation and status transitions

### Python ML Pipeline Acceptance Tests
```bash
cd backend
python -m app.ml.test_ml_system
```
Tests verify:
- Leakage-free temporal preprocessing
- Directed transaction graph construction
- CWGAN-GP forward pass & gradient-penalty compatibility
- Synthetic data quality validation and zero-leakage privacy audit
- Multi-Task GraphSAGE encoder and prediction heads
- Money-flow loop and conduit detection
- Modularity-based syndicate community detection

---

## 6. REST API Reference (Rust Backend on Port 8000)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Rust backend health check |
| `POST` | `/api/v1/auth/login` | Authenticate investigator and issue JWT |
| `GET` | `/api/v1/auth/me` | Retrieve active investigator profile |
| `GET` | `/api/v1/analytics/overview` | Executive KPI dashboard and risk distributions |
| `GET` | `/api/v1/analytics/audit-logs` | Retrieve recent audit history |
| `GET` | `/api/v1/transactions/` | Filter transactions by account, amount, or type |
| `POST` | `/api/v1/transactions/upload` | Multipart CSV transaction ingestion |
| `POST` | `/api/v1/transactions/load-sample` | Seed pre-packaged demonstration network |
| `GET` | `/api/v1/accounts/` | List risk-scored accounts |
| `GET` | `/api/v1/accounts/{id}/explanation` | Detailed GraphSAGE explanation and structural signals |
| `GET` | `/api/v1/graph/` | Cytoscape.js formatted nodes and edges |
| `GET` | `/api/v1/graph/subgraph/{id}` | Extract 2-hop ego network around suspect account |
| `GET` | `/api/v1/graph/cycles` | Petgraph circular money laundering loop detection |
| `GET` | `/api/v1/money-trail/{id}` | Multi-hop inbound origin and outbound cash-out tracing |
| `GET` | `/api/v1/complaints/` | List cybercrime victim reports |
| `POST` | `/api/v1/complaints/` | Register cybercrime complaint |
| `GET` | `/api/v1/cases/` | List investigation case dockets |
| `POST` | `/api/v1/cases/` | Create new formal investigation case |
| `GET` | `/api/v1/cases/{id}/dossier` | Export comprehensive legal evidence dossier |
| `GET` | `/api/v1/ml/status` | ML system health, model readiness, and dataset metrics |
| `POST` | `/api/v1/ml/gan/train` | Train CWGAN-GP tabular generator on background job |
| `POST` | `/api/v1/ml/gan/generate` | Generate labeled synthetic financial transactions |
| `GET` | `/api/v1/ml/gan/quality` | Tabular fidelity metrics and zero-leakage privacy report |
| `POST` | `/api/v1/ml/classifier/benchmark`| Train real-only vs GAN-augmented fraud classifier |
| `GET` | `/api/v1/ml/classifier/metrics` | Precision, recall, F1, PR-AUC, and confusion matrix |
| `WS` | `/ws` | Real-time WebSocket event stream for alerts & notifications |

---

## 7. Model Evaluation Transparency

* **Synthetic Data Quality vs Fraud Detection**: Tabular GAN quality is evaluated strictly through statistical distribution similarity (Wasserstein distance, Kolmogorov-Smirnov test, Total Variation distance) and memorization risk audits. A high GAN quality score is an assessment of fidelity, not classification accuracy.
* **Evaluation on Held-Out Real Splits**: Supervised classifier metrics (Precision, Recall, F1, PR-AUC, Confusion Matrix) are computed strictly on held-out real validation partitions that were never exposed during GAN training or feature scaling.
* **Investigative Lead Standard**: Alerts generated by GraphSAGE and CWGAN-GP represent automated investigative leads for human verification, complying with legal guidelines for financial crime investigations.
