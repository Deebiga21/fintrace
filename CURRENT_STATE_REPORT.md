# FinTrace AI — Current State Report

Inspection date: 2026-10-26. Scope: everything under `fintrace/` except `Dataset/`. Findings are labelled **Verified** (read directly from current code/config), **Suspected** (strong inference, not executed), or **Unknown** (no safe way to confirm). No project files were modified.

## 1. Repository Structure — Verified

`fintrace/` is a single Git repository with three services:

- `frontend/` — React 19 + Vite SPA, routes and hash navigation via `src/App.jsx`.
- `rust_backend/` — Axum + SQLx + SQLite API on port `8000`, the runtime source of truth for the UI.
- `backend/` — Python FastAPI/PyTorch ML service on port `8001`, proxied by Rust at `127.0.0.1:8001/api/v1`.

Supporting files: `docker-compose.yml`, `.env.example`, `README.md`, `sample_test_csvs/`. There is no root-level build tool; each service is built independently. Build artifacts (`frontend/node_modules`, `rust_backend/target`, `backend/.venv`) are absent.

## 2. Frontend Pages & Navigation — Verified

Fourteen pages exist under `frontend/src/pages/`: Landing, Dashboard, System Pipeline, Upload, Transactions, Mule Detection, Graph Investigation, Money Trail, Complaints, Cases, Case Details, Analytics/Reports, Settings/Model Studio, Legal/Privacy. Routing and cross-page state live in `App.jsx`; `Sidebar.jsx` drives navigation, and `Navbar.jsx` exposes “Run Inference” plus sample-data sync.

The UI is visually complete, but several pages render placeholder or locally-derived data rather than server state. `services/api.js` hardcodes `API_BASE` to `http://<hostname>:8000/api/v1` and ignores `VITE_API_BASE_URL` (**Verified**). The frontend calls `ingestion/upload`, `validate`, `clean`, and `commit`, but never `ingestion/map-columns` (**Verified**).

## 3. Backend API Surface — Verified

Rust modules cover accounts, alerts, analytics, audit, cases, complaints, dashboard, datasets, demo, graph, ingestion, jobs, ML client, models, money trail, pipeline, surveillance, transactions, WebSockets, and admin/demo endpoints. The router is composed in `rust_backend/src/main.rs`.

The Python service exposes ML status, train, generate, metrics, artifact plots, and legacy `/gnn/infer` routes (`backend/app/api/ml_router.py`). The Rust side is the integration hub: it owns ingestion, persistence, and proxying. Endpoint presence does not imply correctness — the pipeline and ML proxy handlers frequently return success-shaped responses without doing the claimed work.

## 4. Data Flow — Verified

CSV upload → parse/preview → validate → clean → commit into SQLite → score via ML → surface in dashboard, account queue, graph, and money trail. In practice the chain has breaks:

- **Mapping loss (Verified).** `validate_dataset_handler` uses the posted `column_mapping` but never writes it to `ingestion_jobs.column_mapping_json`. `commit_dataset_handler` reloads the stored mapping. Any user-edited mapping is silently discarded at commit.
- **Score units (Verified).** Validation returns `dataset_quality_score = (score * 10).round() / 10.0` (effectively 0–100), while `UploadPage.jsx` displays it as `/10` and compares against `7.0`. The quality report also labels the 0–100 value with `max_score: 10`.
- **Dashboard truncation (Verified).** `DashboardPage.jsx` fetches only the newest 500 transactions and derives flagged accounts and chart totals locally, so counts and volumes under-report on larger uploads.

## 5. ML & Risk Scoring — Verified

No `.pt` checkpoint exists under `backend/app/ml/artifacts` (only JSON/report artifacts). `predict_service.py` therefore returns `CHECKPOINT_UNAVAILABLE` for account and transaction predictions until training is run. The README’s claim of committed weights is stale.

Consequences: the UI’s “Run Inference” path reports “GNN Scored 0 accounts (0 High Risk)” as a success because `/gnn/infer` returns HTTP 200 with `status: model_unavailable` (**Verified**). `MuleDetectionPage.jsx` expects `reasons`/`top_reasons`, but the backend returns `supporting_evidence`/`detected_patterns`; the page therefore falls back to hardcoded strings such as “Rapid fund passthrough (94% within 15 mins)” for every account (**Verified**). Docker also mounts an empty `ml_artifacts` volume over `/app/app/ml/artifacts`, hiding committed JSON/plots until retraining (**Verified**).

## 6. Persistence — Verified

SQLite via SQLx; schema and migrations are in `rust_backend/src/database.rs`. Uploaded CSVs are stored on disk and referenced by path. Docker runs the Rust DB at `/app/data/fintrace.db` but Python at `/app/fintrace.db`, so the two services use separate databases; the legacy `/gnn/infer` scores Python’s DB while the UI reads Rust’s. Demo seeding and “ready to test” discovery in `datasets/mod.rs` hardcode `quality_score: 9.6` and rely on `../sample_test_csvs` paths that are empty in-container (**Verified**).

## 7. Testing — Verified

There are 21 Rust test attributes across `tests/api_tests.rs`, `tests/case_tests.rs`, and inline module tests (roughly 14 API integration tests, 5 case tests, plus unit tests). No ingestion/CSV-commit round-trip test was found. Python has no `pytest` installed; the ML acceptance test cannot run without generating artifacts/DB. No frontend tests exist.

## 8. Git State — Verified

Branch `main`, tracking `origin/main`, clean working tree, no untracked files. HEAD is `e4978c5` (docs commit); the frontend last changed in `0c2c1f5`. No changes were made during this inspection.

## 9. Top Five Issues & Three-Hour Plan

**1. Column mapping is discarded at commit (Verified, critical).** `rust_backend/src/ingestion/mod.rs`. Fix validate to persist `column_mapping_json` (or have commit accept mapping) and call `/map-columns` from `UploadPage.jsx`. *Verify:* upload a CSV with renamed headers, edit mapping, commit, confirm stored columns match.

**2. Pipeline fabricates results (Verified, high).** `rust_backend/src/pipeline/mod.rs`: stage 6 hardcodes GAN fidelity `81.46`; stage 7 inserts a fake model run with hardcoded ROC-AUC/F1 without calling ML; stage 8 claims “6 alerts” but creates none; stage 9 hardcodes velocity/drain ratio; “EXECUTE STAGE NOW” is largely a metrics refresh. *Fix/verify:* mark stages simulated or wire real calls; after executing, compare response against DB rows.

**3. Missing weights produce false success (Verified, high).** No checkpoint; `/gnn/infer` returns 200 with `model_unavailable`, and the Navbar shows a success toast. *Fix:* return non-2xx or surface “model not trained”; block inference until a checkpoint exists. *Verify:* run inference on a fresh install and confirm an explicit error state.

**4. Quality score unit mismatch (Verified, high).** Backend returns 0–100, UI labels `/10`. Pick one contract (recommend 0–10 everywhere) in `ingestion/mod.rs` and `UploadPage.jsx`, including `can_proceed`. *Verify:* upload a known-quality CSV and check score and threshold agreement.

**5. Invented explanations (Verified, high).** `MuleDetectionPage.jsx` falls back to hardcoded reasons. *Fix:* consume `supporting_evidence`/`detected_patterns`, remove invented text, show “no evidence available” when empty. *Verify:* open an unscored/low-evidence account and confirm no fabricated claims.

**Plan (3 hours):** 0:00–0:35 mapping fix + UI call; 0:35–1:05 score-contract fix; 1:05–1:45 pipeline honesty (remove hardcoded metrics, fix stage 8 alerts); 1:45–2:20 explanation passthrough + error states; 2:20–2:45 dashboard aggregation (server-side counts instead of 500-row slice); 2:45–3:00 add an ingestion mapping round-trip test and run `cargo test` / `npm run build`.

## Checks Not Performed

`cargo test`, `npm run build`, `npm run lint`, the ML acceptance test, and live endpoint/DB checks were not run: build artifacts and dependencies are absent, and inspection-only constraints forbid installs, builds, or state changes. Findings above rest on static inspection plus safe version checks (Node 24.19, npm 11.17, cargo/rustc 1.99, Python 3.14 with torch 2.14 CPU).
