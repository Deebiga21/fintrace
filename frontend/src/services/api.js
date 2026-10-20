const API_BASE = (typeof window !== "undefined" && window.location)
  ? `http://${window.location.hostname || "127.0.0.1"}:8000/api/v1`
  : "http://127.0.0.1:8000/api/v1";

async function request(endpoint, options = {}) {
  // Normalize trailing slash before query parameters to prevent Axum 404
  const cleanEndpoint = endpoint.replace(/\/\?/, '?').replace(/\/$/, '');
  const url = `${API_BASE}${cleanEndpoint}`;
  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...options.headers,
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: "omit",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.error || res.statusText || "Request failed");
    }
    return await res.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  // Auth
  login: (badge_id, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ badge_id, password }),
    }),
  getMe: () => request("/auth/me"),

  // Analytics
  getOverview: () => request("/analytics/overview"),
  getAuditLogs: (limit = 50) => request(`/analytics/audit-logs?limit=${limit}`),

  // Transactions
  getTransactions: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const res = await request(`/transactions?${q}`);
    return Array.isArray(res) ? res : (res.transactions || []);
  },
  uploadTransactionsCsv: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/transactions/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(err.detail || "Upload failed");
    }
    return await res.json();
  },
  loadSampleDataset: () =>
    request("/transactions/load-sample", { method: "POST" }),

  // Accounts
  getAccounts: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const res = await request(`/accounts?${q}`);
    return Array.isArray(res) ? res : (res.accounts || []);
  },
  getAccount: (id) => request(`/accounts/${id}`),
  getAccountExplanation: (id) => request(`/accounts/${id}/explanation`),

  // GNN Model
  trainGNN: (data = {}) =>
    request("/gnn/train", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  runInference: () => request("/gnn/infer", { method: "POST" }),
  getModelRuns: () => request("/gnn/runs"),

  // Graph
  getGraphData: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/graph?${q}`);
  },
  getSubgraph: (accountId, radius = 2) =>
    request(`/graph/subgraph/${accountId}?radius=${radius}`),
  getCycles: () => request("/graph/cycles"),

  // Money Trail
  getMoneyTrail: (accountId, maxHops = 4) =>
    request(`/money-trail/${accountId}?max_hops=${maxHops}`),
  analyzeMoneyTrail: (payload) =>
    request("/money-trail/analyze", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getSavedMoneyTrails: (limit = 20) =>
    request(`/money-trail/saved?limit=${limit}`),
  getMoneyTrailById: (id) => request(`/money-trail/${id}`),
  getMoneyTrailTransactions: (id) => request(`/money-trail/${id}/transactions`),
  saveMoneyTrailToCase: (id, payload) =>
    request(`/money-trail/${id}/save-to-case`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getMoneyTrailReport: (id) => request(`/money-trail/${id}/report`),

  // Complaints
  getComplaints: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const res = await request(`/complaints?${q}`);
    return Array.isArray(res) ? res : (res.complaints || []);
  },
  getComplaintsSummary: () => request("/complaints/summary"),
  getComplaint: (id) => request(`/complaints/${id}`),
  createComplaint: (data) =>
    request("/complaints", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateComplaint: (id, data) =>
    request(`/complaints/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  correlateComplaint: (id, options = {}) =>
    request(`/complaints/${id}/correlate`, {
      method: "POST",
      body: JSON.stringify(options),
    }),
  getComplaintCorrelations: (id) => request(`/complaints/${id}/correlations`),
  getComplaintGraph: (id) => request(`/complaints/${id}/graph`),
  getComplaintTransactions: (id) => request(`/complaints/${id}/transactions`),
  linkComplaintToCase: (id, data) =>
    request(`/complaints/${id}/link-case`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createCaseFromComplaint: (id, data) =>
    request(`/complaints/${id}/create-case`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getComplaintReport: (id) => request(`/complaints/${id}/report`),
  getComplaintsByAccount: (accountId) =>
    request(`/complaints/by-account/${accountId}`),

  // Cases
  getCases: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const res = await request(`/cases?${q}`);
    return Array.isArray(res) ? res : (res.cases || []);
  },
  getCase: (id) => request(`/cases/${id}`),
  createCase: (data) =>
    request("/cases/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCase: (id, data) =>
    request(`/cases/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  addCaseEvidence: (caseId, data) =>
    request(`/cases/${caseId}/evidence`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getCaseDossier: (caseId) => request(`/cases/${caseId}/dossier`),

  // Ingestion Pipeline APIs
  uploadIngestionCsv: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/ingestion/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(err.detail || err.error || "Upload failed");
    }
    return await res.json();
  },
  mapIngestionColumns: (jobId, columnMapping) =>
    request("/ingestion/map-columns", {
      method: "POST",
      body: JSON.stringify({ job_id: jobId, column_mapping: columnMapping }),
    }),
  validateIngestionDataset: (jobId, columnMapping) =>
    request("/ingestion/validate", {
      method: "POST",
      body: JSON.stringify({ job_id: jobId, column_mapping: columnMapping }),
    }),
  getIngestionPreview: (jobId) => request(`/ingestion/${jobId}/preview`),
  cleanIngestionDataset: (jobId, options = {}) =>
    request(`/ingestion/${jobId}/clean`, {
      method: "POST",
      body: JSON.stringify(options),
    }),
  commitIngestionDataset: (jobId, options = {}) =>
    request(`/ingestion/${jobId}/commit`, {
      method: "POST",
      body: JSON.stringify(options),
    }),
  getIngestionStatus: (jobId) => request(`/ingestion/${jobId}/status`),
  getIngestionReport: (jobId) => request(`/ingestion/${jobId}/report`),
  cancelIngestionJob: (jobId) =>
    request(`/ingestion/${jobId}/cancel`, { method: "POST" }),
  listIngestionJobs: () => request("/ingestion/jobs"),

  // Datasets & Demo APIs
  getReadyToTestDatasets: () => request("/datasets/ready-to-test"),
  testIngestDataset: (datasetId) =>
    request(`/datasets/${datasetId}/test-ingest`, { method: "POST" }),
  loadDemoDataset: () => request("/datasets/demo/load", { method: "POST" }),

  // Graph Build & Status APIs
  rebuildGraph: () => request("/graph/build", { method: "POST" }),
  getGraphStatus: () => request("/graph/status"),
  getGraphStatistics: () => request("/graph/statistics"),

  // Complete Multi-Task GNN & Tabular GAN Intelligence API
  getMLStatus: () => request("/ml/status"),
  getMLDatasetSummary: () => request("/ml/dataset/summary"),
  trainGAN: (data = {}) =>
    request("/ml/gan/train", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getGANMetrics: () => request("/ml/gan/metrics"),
  generateSynthetic: (data = {}) =>
    request("/ml/gan/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getSyntheticQuality: () => request("/ml/gan/quality"),
  runClassifierBenchmark: () =>
    request("/ml/classifier/benchmark", { method: "POST" }),
  getClassifierMetrics: () => request("/ml/classifier/metrics"),
  trainMultiTaskGNN: (data = {}) =>
    request("/ml/gnn/train", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getGNNMetrics: () => request("/ml/gnn/metrics"),
  predictAccount: (accountId) =>
    request("/ml/predict/account", {
      method: "POST",
      body: JSON.stringify({ account_id: accountId }),
    }),
  predictTransaction: (data) =>
    request("/ml/predict/transaction", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getRankedAccounts: (limit = 50) => request(`/ml/accounts/ranked?limit=${limit}`),
  getMoneyTrailAnalysis: (accountId, maxHops = 4) =>
    request(`/ml/analysis/money-trail/${accountId}?max_hops=${maxHops}`),
  getCommunitiesAnalysis: (minSize = 3) =>
    request(`/ml/analysis/communities?min_size=${minSize}`),
  getCircularLoopsAnalysis: () => request("/ml/analysis/loops"),
  getRapidConduitsAnalysis: () => request("/ml/analysis/conduits"),
  getArtifactPlotUrl: (plotName) => `${API_BASE}/ml/artifacts/plot/${plotName}`,
  listDatasets: () => request("/ml/dataset/list"),
  selectDataset: (datasetKey) =>
    request("/ml/dataset/select", {
      method: "POST",
      body: JSON.stringify({ dataset_key: datasetKey }),
    }),

  // End-to-End System Pipeline APIs
  getPipelineStatus: (datasetId) =>
    request(`/pipeline/status${datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : ""}`),
  getPipelineHistory: () => request("/pipeline/history"),
  runPipelineStage: (stageNum, payload = {}) =>
    request(`/pipeline/run-stage/${stageNum}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
