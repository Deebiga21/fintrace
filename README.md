# FinTrace AI — Intelligent Mule Account Detection & Financial Crime Investigation Platform

[![Rust](https://img.shields.io/badge/Primary%20Backend-Rust%20(Axum%20%2B%20SQLx)-orange.svg?style=flat&logo=rust)](https://www.rust-lang.org/)
[![Python](https://img.shields.io/badge/ML%20Service-Python%20%2F%20FastAPI-009688.svg?style=flat&logo=python)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/Generative%20AI-CWGAN--GP%20%2F%20GraphSAGE-EE4C2C.svg?style=flat&logo=pytorch)](https://pytorch.org/)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB.svg?style=flat&logo=react)](https://vitejs.dev/)
[![Cytoscape.js](https://img.shields.io/badge/Graph%20Engine-Cytoscape.js-0284C7.svg?style=flat)](#graph-investigation)
[![License: MIT](https://img.shields.io/badge/License-MIT-2E7D32.svg?style=flat)](LICENSE)

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
[ Database: SQLite  [ Internal HTTP Client (reqwest) ]
  (SQLx)]           │
                       ▼
         [ Private Python ML Microservice: FastAPI + PyTorch ] ──► (internal port 8001)
           - Tabular CWGAN-GP Synthetic Generator
           - Multi-Task GraphSAGE GNN
           - Isolation Forest transaction anomaly baseline
           - Tabular Fraud Classifier Benchmark
           - Synthetic Privacy & Fidelity Auditing
```

* **Rust API Backend (`rust_backend/`)**: Acts as the single source of truth for accounts, transactions, cases, evidence, complaints, alerts, and audit logs. Provides WebSocket streaming (`/ws`) for real-time AML updates.
* **Python ML Microservice (`backend/`)**: Dedicated generative AI and deep learning microservice executing PyTorch neural networks for synthetic transaction synthesis and GraphSAGE neighborhood aggregation.
* **Frontend Web Application (`frontend/`)**: Editorial-dark investigation console built with React 19, Cytoscape.js, Recharts, and Tailwind CSS. Every screen — dashboard, ledger, dossiers, analytics, pipeline and legal — shares one near-black/cyan design system; the landing page keeps a deliberately light 3D globe canvas inside the dark editorial layout.

> **API surface note:** the dashboard and every end-user flow call only the Rust API on port 8000. The Python service still keeps standalone CRUD routes for ML debugging and notebook-style experiments, but Compose does not publish port 8001 and the UI never calls it. Rust remains the single source of truth at runtime.

---

## 2. Key Modules & Capabilities

1. **Open API**: The local dashboard and API run without a login or authentication token.
2. **Transaction Management (`transactions`)**: Idempotent CSV ingestion, duplicate detection, and streaming transaction queries.
3. **Mule Account Risk Assessment (`accounts`)**: Continuous GraphSAGE risk scores ($0.0 - 1.0$), topological degree, and turnover ratio drain analysis. On a cold start before the GNN is trained, 18 accounts carry label-derived demo triage scores so the queue is populated; the API tags those rows `score_source: demo_label` and the UI shows no model confidence for them.
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
cp .env.example .env
docker compose up --build
```
* **Frontend**: `http://localhost:5173`
* **Rust API Backend**: `http://127.0.0.1:8000`
* **Python ML Microservice**: private to the Compose network on port 8001
* **Database**: SQLite in a persistent Compose volume (the current Rust SQLx build enables SQLite only)

On the first start against an empty database, the Rust backend **auto-seeds the packaged 182-transaction synthetic demo network** (74 accounts, 15 flagged mule transfers), **18 label-derived triage scores** (9 high / 9 medium risk) and **three investigation dossiers** that reference those seeded records. There is no manual "load demo data" step before the dashboard is presentable; the seed is skipped whenever the `transactions` table already has rows.

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

## 4. Local Access

The application intentionally has no login or authentication. Docker Compose binds the frontend and Rust API to `127.0.0.1`; the Python ML service remains private to the Compose network. Do not expose these unauthenticated services to an untrusted network.

Why this is deliberate: the platform is a self-contained investigation demo, not a hosted multi-tenant service. Adding half-finished auth (a login screen with no real session hardening) would be worse than an explicitly local-only deployment, so authentication is out of scope and called out here rather than implied.

CSV uploads accept files up to **50 MB** (the Rust API raises Axum's default 2 MB body cap so the handler can return a readable validation error instead of a bare `413`).

---

## 5. Running Automated Tests

### Rust Backend Tests (Unit & Integration)
```bash
cd rust_backend
cargo test
```
Tests verify:
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
| `GET` | `/api/v1/analytics/overview` | Executive KPI dashboard and risk distributions |
| `GET` | `/api/v1/analytics/audit-logs` | Retrieve recent audit history |
| `GET` | `/api/v1/dashboard/summary` | Aggregated volume, risk and investigation counters used by the home dashboard |
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
| `POST` | `/api/v1/ml/isolation-forest/train` | Train a temporal 80/20 unsupervised transaction anomaly baseline |
| `GET` | `/api/v1/ml/isolation-forest/metrics` | Get Isolation Forest training and holdout scoring summary |
| `POST` | `/api/v1/ml/gan/train` | Train CWGAN-GP tabular generator on background job |
| `POST` | `/api/v1/ml/gan/generate` | Generate labeled synthetic financial transactions |
| `GET` | `/api/v1/ml/gan/quality` | Tabular fidelity metrics and zero-leakage privacy report |
| `POST` | `/api/v1/ml/classifier/benchmark`| Train real-only vs GAN-augmented fraud classifier |
| `GET` | `/api/v1/ml/classifier/metrics` | Precision, recall, F1, PR-AUC, and confusion matrix |
| `WS` | `/ws` | Real-time WebSocket event stream for alerts & notifications |

---

## 7. Model Evaluation Transparency

* **Synthetic Data Quality vs Fraud Detection**: Tabular GAN quality is evaluated strictly through statistical distribution similarity (Wasserstein distance, Kolmogorov-Smirnov test, Total Variation distance) and memorization risk audits. A high GAN quality score is an assessment of fidelity, not classification accuracy.
* **Evaluation on Held-Out Benchmark Splits**: Supervised classifier metrics (Precision, Recall, F1, PR-AUC, Confusion Matrix) are computed on a held-out test partition that was never exposed during GAN training or feature scaling. The word "real" in `classifier_benchmark_report.json` means **non-generated benchmark rows**, not customer data: the packaged datasets are the public PaySim simulation and locally generated synthetic networks. No real bank records are in this repository.
* **Investigative Lead Standard**: Alerts generated by GraphSAGE and CWGAN-GP represent automated investigative leads for human verification, complying with legal guidelines for financial crime investigations.
* **Cold-start demo scaffolding**: the 18 seeded risk scores and three seeded dossiers exist to make an empty database demonstrable. The scores are computed from the packaged dataset's own suspicious-transaction labels, not from a trained model; the API marks them `score_source: demo_label`, and training the GNN replaces them.

### Data handling

Only the synthetic benchmark and public simulation data are included. Local bank statement files, derived customer profiles, score outputs, and model artifacts are excluded from version control. Removing a file from the current branch does not erase it from earlier Git commits; if previously committed data was real or identifying, coordinate a history purge with all collaborators before sharing or cloning again.

The Model Studio button trains on the currently selected included dataset. To score separate unsupervised training and holdout CSVs, run from `backend/` so generated artifacts stay local:

```bash
python -m app.ml.training.isolation_forest --train PATH_TO_TRAIN.csv --holdout PATH_TO_HOLDOUT.csv --artifacts app/ml/artifacts
```

The scorer excludes record/account identifiers and any fraud/suspicion label columns from model features. It writes ranked holdout scores locally; do not treat anomaly flags as confirmed fraud.

---

## 8. Measured Results

Every figure below is copied from a JSON artifact committed under [`backend/app/ml/artifacts/`](backend/app/ml/artifacts). They were produced on **different packaged dataset snapshots**, so the rows are not directly comparable with each other — the artifact path is the source of truth, and each can be regenerated.

| Model / audit | Metric | Value | Artifact |
|---|---|---|---|
| GraphSAGE — account mule head | Precision / Recall / F1 / ROC-AUC | 0.447 / 0.971 / 0.613 / 0.998 | `gnn_evaluation_metrics.json` |
| GraphSAGE — transaction head | Precision / Recall / F1 / PR-AUC | 0.566 / 0.971 / 0.715 / 0.954 | `gnn_evaluation_metrics.json` |
| GraphSAGE — unsupervised separation | Mean anomaly score, mule vs normal | 0.276 vs 0.085 (3.25×) | `gnn_evaluation_metrics.json` |
| Fraud classifier — no augmentation | Precision / Recall / F1 / PR-AUC | 0.191 / 0.200 / 0.195 / 0.232 | `classifier_benchmark_report.json` |
| Fraud classifier — +500 GAN rows | Precision / Recall / F1 / PR-AUC | 0.235 / 0.200 / 0.216 / 0.258 | `classifier_benchmark_report.json` |
| GAN augmentation lift | F1 / PR-AUC | +2.11% / +2.59% | `classifier_benchmark_report.json` |
| Isolation Forest baseline | Flagged on chronological 20% holdout | 11 of 362 rows (3.04%), contamination 0.015 | `isolation_forest_metrics.json` |
| CWGAN-GP fidelity | Overall fidelity score | 81.46 / 100 | `synthetic_quality_report.json` |
| CWGAN-GP privacy audit | Exact memorization / novel samples | 0.2% / 99.8% | `synthetic_quality_report.json` |
| CWGAN-GP convergence | Final Wasserstein distance (25 epochs) | 0.236 | `gan_metrics.json` |

**How to read this honestly.** The account head is tuned for *recall* (0.971), which is the correct operating point for triage: it surfaces almost every mule for a human, at the cost of precision (0.447). Precision 0.447 does not mean "45% of alerts are fraud" in the real world — it means that on this benchmark split, roughly half of flagged accounts were not labelled mules, which is why alerts are presented as investigative leads. The classifier's "real-only" baseline and the GNN evaluation were run on larger snapshots than the 1,810-row benchmark shipped in `backend/app/data/`; re-run the training endpoints to reproduce them on the included data.

---

## 9. What Is Real vs Simulated

| Layer | Status | Notes |
|---|---|---|
| Transaction data | **Simulated** | Public PaySim simulation plus locally generated synthetic networks; no bank or customer records |
| Seeded demo network | **Simulated** | 182 transactions / 74 accounts / 15 labelled mule transfers, packaged as `rust_backend/data/sample_transactions.csv` |
| ML training runs | **Real executions** | GraphSAGE, CWGAN-GP, Isolation Forest and the classifier were actually trained; metrics and weights are committed |
| GAN-generated rows | **Synthetic** | Produced by the trained generator, validated for fidelity and memorization before use |
| Rust detection logic | **Real implementation** | Bound-parameter SQL, breadth-first multi-hop tracing, Petgraph cycle detection, graph metrics — no mocked paths |
| Model risk scores & alerts | **Model output** | GraphSAGE / Isolation Forest artifacts; automated leads requiring human verification, not fraud verdicts |
| Cold-start triage scores | **Label-derived (demo)** | 18 accounts scored from the packaged dataset's own suspicious-transaction labels so the queue is populated before training. Tagged `score_source: demo_label`; the UI shows `—` instead of inventing model confidence |
| Cases, complaints, audit log | **Demo records** | Three seeded dossiers reference real seeded transactions and accounts; the audit trail is real application state, the subjects are not |
| Authentication | **Intentionally absent** | Local demo only; see [§4](#4-local-access) |

---

## 10. Three-Minute Demo Path

A cold database is enough — the backend seeds itself on first start. Suggested walkthrough:

1. **Capital Command** (30 s) — dashboard opens with 182 transactions, 74 accounts, 15 flagged transfers, 18 accounts in flagged flows and 9 high-risk triage scores already loaded. Point out that this came from the cold-start seed, not a pre-baked screenshot.
2. **Mule Account Detection** (45 s) — sorted by risk; open `MULE_AGG_01` to show the seeded triage score plus the **real** structural signals computed from the ledger: 6 inbound counterparties collapsing into 1 outbound hop and a 97.97% turnover ratio. Say plainly that cold-start scores come from dataset labels; if time allows, retrain the GNN in Model Studio and show model-scored rows with a confidence value.
3. **Graph Topology Canvas** (30 s) — expand the `MULE_AGG_01` ego network, then show cycle detection for the `CIRC_MULE_A → B → C → D` circular flow.
4. **Money Trail Analysis** (45 s) — trace `MULE_AGG_01` in both directions: victim accounts on the inbound side, crypto/offshore cash-out on the outbound side.
5. **Investigation Cases → Dossier** (45 s) — open one of the three seeded dossiers (smurfing fan-out, circular layering, crypto cash-out), show the evidence locker and compile the legal dossier view.
6. **Model Architecture** (20 s) — show the committed artifacts: GAN fidelity 81.46, 0.2% memorization, classifier lift +2.11% F1, and state the honest scope (synthetic data, leads not verdicts).

If the volume already contains unrelated data, `POST /api/v1/datasets/demo/load` re-loads the demo network, triage scores and dossiers idempotently.

---

## 11. Known Limitations

* **Local-only by design.** No auth, no multi-tenancy; Compose binds services to `127.0.0.1`.
* **SQLite, single node.** Schema evolution uses idempotent `ALTER TABLE` statements rather than a migration framework; there is no horizontal scaling story.
* **Benchmark scope.** All metrics are on synthetic/public simulation data. The GraphSAGE artifact was recorded on a larger test partition than the packaged 1,810-row benchmark.
* **Classifier naming.** "Real-only" in the artifact means non-augmented benchmark rows; it does not mean production bank data.
* **Seed duplication.** Local runs prefer `backend/app/data/sample_transactions.csv` and fall back to the copy embedded in the Rust binary (`rust_backend/data/`); if the source CSV changes, re-copy it to keep both in sync.
* **Cold-start triage scores.** The 18 seeded risk scores are derived from dataset labels, not model inference, and are overwritten when the GNN is trained. The UI deliberately shows `—` rather than a confidence for these rows.
* **Alerts are leads.** No model output here should be treated as a confirmed fraud determination.

---

## 12. License

Released under the [MIT License](LICENSE). The bundled datasets remain subject to their own terms: PaySim is a public research simulation, and the generated networks are synthetic. Review dataset licensing before redistributing this repository or any derived data.
