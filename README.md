# FinTrace AI — Intelligent Mule Account Detection & Financial Crime Investigation Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/Deep%20Learning-PyTorch%20%2F%20PyG-EE4C2C.svg?style=flat&logo=pytorch)](https://pytorch.org/)
[![GraphSAGE](https://img.shields.io/badge/GNN%20Architecture-GraphSAGE-6366F1.svg?style=flat)](#gnn-architecture)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB.svg?style=flat&logo=react)](https://vitejs.dev/)
[![Cytoscape.js](https://img.shields.io/badge/Graph%20Engine-Cytoscape.js-0284C7.svg?style=flat)](#graph-investigation)

**FinTrace AI** is an institutional financial crime investigation platform designed for Anti-Money Laundering (AML) analysts, cybercrime cells, and Financial Intelligence Units (FIU). It replaces legacy isolated tabular models (such as XGBoost) with a **Graph Neural Network (GraphSAGE using PyTorch & PyTorch Geometric)** to analyze relational transaction topologies, detect mule account networks, trace multi-hop layering flows, and correlate cyber fraud complaints.

---

## 1. System Architecture: GraphSAGE vs. XGBoost

Standard fraud detection models treat transactions in isolation or compute shallow tabular aggregations. Financial criminals routinely circumvent these by:
1. **Smurfing / Fan-In Aggregation:** Depositing small sums from multiple accounts into a conduit mule account to evade threshold reporting limits.
2. **Rapid Fund Pass-Through:** Draining incoming funds within minutes across multiple outbound hops.
3. **Circular Money Laundering Rings:** Moving funds in closed directed cycles ($A \to B \to C \to D \to A$) to obscure origin.

### Why GraphSAGE?
Unlike XGBoost which evaluates accounts in isolation, **GraphSAGE (Graph Sample and Aggregate)** generates account embeddings by sampling and aggregating feature information from an account's local 1-hop and 2-hop graph neighborhood:

$$h_v^{(k)} = \sigma \left( W^{(k)} \cdot \left[ h_v^{(k-1)} \parallel \text{AGG} \left( \{ h_u^{(k-1)}, \forall u \in \mathcal{N}(v) \} \right) \right] \right)$$

* **Input Features ($d=8$):** In-Degree, Out-Degree, Total Incoming Volume ($\log_{1p}$), Total Outgoing Volume ($\log_{1p}$), Turnover Ratio, Unique Counterparties, PageRank Centrality, Betweenness Centrality.
* **Neighborhood Aggregator:** Mean aggregation over directed counterparty edges.
* **Latent Embeddings:** 16-dimensional dense topological representation feeding a supervised classification head.

---

## 2. Complete 10-Step Investigation Workflow

```
[1. CSV Ingestion] ────► [2. Graph Construction] ────► [3. GraphSAGE Scoring]
                                                               │
                                                               ▼
[6. Money Trail] ◄──── [5. Interactive Graph] ◄──── [4. Fraud Patterns]
       │
       ▼
[7. Complaints] ────► [8. Case Management] ────► [9. Risk Explain] ────► [10. Audit Report]
```

1. **Transaction Data Ingestion:** Upload institution CSVs with validation for mandatory headers, duplicate rejection, and automatic account registration.
2. **Transaction Processing & Normalization:** Directed graph construction with timestamps, transaction types, and structural metric computation.
3. **GNN Mule Account Detection:** GraphSAGE predicts continuous risk scores ($0.0 - 1.0$) categorized into **High ($\ge 0.75$)**, **Medium ($\ge 0.40$)**, and **Low ($< 0.40$)**.
4. **Suspicious Transaction Detection:** Automated tagging of rapid pass-through conduit flows ($< 2$ hours), fan-in aggregators, high turnover drain ($> 90\%$), and cycle loops.
5. **Interactive Graph Canvas:** Cytoscape.js directed visual graph with dynamic layouts, risk color coding, edge inspection, and 2-hop ego subgraphs.
6. **Multi-Hop Money Trail:** Backward source tracking (victim origins) and forward outbound tracing (crypto cash-out / offshore accounts) with layering depth metrics.
7. **Complaint Cross-Correlation:** Cross-referencing victim reports from the National Cyber Crime Reporting Portal (1930) and police FIRs with suspect accounts.
8. **Investigation Case Docket:** Case creation, priority assignment (Critical, High, Medium, Low), status tracking (New, Under Investigation, Escalated, Closed), and evidence locker.
9. **Risk Explainability:** Honest model explanations featuring latent embeddings, structural degree, and connected high-risk counterparties.
10. **Reports & Analytics:** Supervised evaluation metrics (**Precision**, **Recall**, **F1-Score**, **Confusion Matrix**) and exportable legal dossiers.

---

## 3. Technology Stack

* **Backend:**
  * Python 3.11+ / 3.14
  * FastAPI (High-performance async REST API)
  * PyTorch & PyTorch Geometric (PyG `SAGEConv` with native PyTorch fallback)
  * NetworkX (Ego-networks, cycle detection, PageRank, Betweenness)
  * SQLAlchemy (ORM with SQLite default; zero-change migration to PostgreSQL)
  * Scikit-Learn (Precision, Recall, F1, and Confusion Matrix calculation)
  * Pandas (CSV ingestion and validation)
* **Frontend:**
  * React 19 + Vite
  * Tailwind CSS (Dark financial intelligence palette)
  * Cytoscape.js (Interactive high-performance graph visualization)
  * Recharts (Executive metrics, donut charts, area flows, and bar charts)
  * Lucide React (Financial crime investigation iconography)

---

## 4. Quick Start & Setup Instructions

### Prerequisites
* Python 3.10+ (with pip)
* Node.js v18+ (with npm)

### Backend Setup
```bash
cd backend

# (Optional) create virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server (runs on port 8000)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
* Backend API Documentation: `http://127.0.0.1:8000/docs`
* Backend Health Check: `http://127.0.0.1:8000/health`

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server (runs on port 5173)
npm run dev -- --host 127.0.0.1 --port 5173
```
* Application Portal: `http://127.0.0.1:5173`

---

## 5. Pre-Packaged Synthetic Demonstration Dataset

The platform includes a synthetic financial network (`backend/app/data/sample_transactions.csv` and `sample_complaints.csv`) containing:
* **74 Accounts** and **182 Transactions**
* **Mule Ring 1 (Smurfing Aggregator):** 6 cyber phishing victim accounts (`VICTIM_PHISH_01`..`06`) deposit funds into `MULE_AGG_01`, which consolidates and immediately wires ₹3,40,000 to `MULE_LAYER_02`, terminating in offshore crypto conduit `CASHOUT_CRYPTO_09`.
* **Mule Ring 2 (Circular Layering):** `CIRC_MULE_A` $\to$ `CIRC_MULE_B` $\to$ `CIRC_MULE_C` $\to$ `CIRC_MULE_D` $\to$ `CIRC_MULE_A`.
* **Mule Ring 3 (Rapid Conduit):** High-value corporate debit diverted to `RAPID_CONDUIT_77`, with $98\%$ drained in 15 minutes across 3 offshore shell accounts.
* **Correlated Complaints:** 5 real-world cybercrime complaints matching victim accounts and transaction IDs.

*All synthetic data is explicitly labelled as synthetic simulation data for hackathon and academic demonstration purposes.*

---

## 6. REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/transactions/upload` | Upload and validate transactions CSV |
| `POST` | `/api/v1/transactions/load-sample` | Seed pre-packaged synthetic transaction and complaint network |
| `GET` | `/api/v1/transactions/` | List and filter transactions by account, amount, or suspicious status |
| `GET` | `/api/v1/accounts/` | List scored accounts with risk levels and behavioral flags |
| `GET` | `/api/v1/accounts/{id}/explanation` | Detailed GraphSAGE risk explanation and structural signals |
| `POST` | `/api/v1/gnn/train` | Supervised training run on graph with real precision/recall/F1 |
| `POST` | `/api/v1/gnn/infer` | Execute forward pass to score all accounts |
| `GET` | `/api/v1/gnn/runs` | Fetch model training and evaluation audit history |
| `GET` | `/api/v1/graph/` | Nodes and directed edges formatted for Cytoscape.js |
| `GET` | `/api/v1/graph/subgraph/{id}` | Extract 2-hop ego network around a specific account |
| `GET` | `/api/v1/graph/cycles` | Find closed circular money laundering loops |
| `GET` | `/api/v1/money-trail/{id}` | Multi-hop inbound and outbound chronological flow analysis |
| `GET` | `/api/v1/complaints/` | List cybercrime complaints with linked accounts |
| `POST` | `/api/v1/cases/` | Create a formal investigation case with initial evidence |
| `GET` | `/api/v1/cases/{id}/dossier` | Export comprehensive legal evidence dossier |
| `GET` | `/api/v1/analytics/overview` | Executive KPI dashboard and pattern distribution |

---

## 7. Model Evaluation Transparency

In accordance with strict legal and academic standards:
* **Precision, Recall, F1-Score, and the 2x2 Confusion Matrix** are computed strictly on validation splits using PyTorch Cross-Entropy Loss and Scikit-Learn evaluation functions.
* If a model is untrained or ground truth labels are absent, the platform clearly badges risk metrics as *Simulated / Heuristic Baselines* and does not claim trained accuracy.
* Fraud alerts generated by the platform represent **investigative leads** for human verification, not definitive judicial proof of criminal conduct.
