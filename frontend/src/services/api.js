const API_BASE = "http://127.0.0.1:8000/api/v1";

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const res = await fetch(url, { ...options, credentials: "omit" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Request failed");
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
  getTransactions: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/transactions/?${q}`);
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
  getAccounts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/accounts/?${q}`);
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
    return request(`/graph/?${q}`);
  },
  getSubgraph: (accountId, radius = 2) =>
    request(`/graph/subgraph/${accountId}?radius=${radius}`),
  getCycles: () => request("/graph/cycles"),

  // Money Trail
  getMoneyTrail: (accountId, maxHops = 4) =>
    request(`/money-trail/${accountId}?max_hops=${maxHops}`),

  // Complaints
  getComplaints: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/complaints/?${q}`);
  },
  createComplaint: (data) =>
    request("/complaints/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getComplaintsByAccount: (accountId) =>
    request(`/complaints/by-account/${accountId}`),

  // Cases
  getCases: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/cases/?${q}`);
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
};
