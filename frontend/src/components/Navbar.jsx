import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  Cpu,
  Shield,
  UserCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function Navbar({
  currentPage,
  onSearch,
  onAccountSelect,
  refreshTrigger,
  setRefreshTrigger
}) {
  const [searchInput, setSearchInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      if (onSearch) onSearch(searchInput.trim());
      if (onAccountSelect) onAccountSelect(searchInput.trim().toUpperCase());
    }
  };

  const handleReloadSampleData = async () => {
    setIsSyncing(true);
    try {
      const res = await api.loadSampleDataset();
      setActionNotice({ type: 'success', text: `Sample data reloaded (${res.result?.valid_records || 182} records).` });
      if (setRefreshTrigger) setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setActionNotice({ type: 'error', text: `Failed to reload sample data: ${err.message}` });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleRunInference = async () => {
    setIsSyncing(true);
    try {
      const res = await api.runInference();
      setActionNotice({
        type: 'success',
        text: `GNN Scored ${res.total_accounts_scored} accounts (${res.high_risk_count} High Risk).`
      });
      if (setRefreshTrigger) setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setActionNotice({ type: 'error', text: `Inference failed: ${err.message}` });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const pageTitles = {
    landing: "Intelligence Platform Overview",
    dashboard: "Financial Crime Command Center",
    upload: "Transaction Ingestion & Data Validation",
    transactions: "Financial Transaction Ledger",
    "mule-detection": "GNN Mule Account Detection & Scoring",
    graph: "Interactive Graph Investigation Canvas",
    "money-trail": "Multi-Hop Money Trail & Layering Flow",
    complaints: "Cyber Crime Complaint Correlation",
    cases: "Investigation Case Management",
    "case-details": "Case Dossier, Evidence & Audit Logs",
    "analytics-reports": "Intelligence Reports & Model Analytics",
    "settings-model": "GraphSAGE Model Architecture & Settings",
    login: "Investigator Authentication & Session Portal"
  };

  return (
    <header className="h-16 bg-navy-900/90 border-b border-slate-800 px-6 flex items-center justify-between backdrop-blur-md sticky top-0 z-10">
      {/* Title & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-mono text-electric-400">FINTRACE</span>
          <span>/</span>
          <span className="text-slate-300 font-medium capitalize">{currentPage.replace('-', ' ')}</span>
        </div>
        <h1 className="text-sm font-bold text-white tracking-wide">
          {pageTitles[currentPage] || "Investigator Console"}
        </h1>
      </div>

      {/* Center Actions / Global Search */}
      <div className="flex items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-64 md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search Account ID (e.g. MULE_AGG_01) or Txn..."
            className="w-full pl-9 pr-3 py-1.5 bg-navy-850 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-electric-400 transition font-mono"
          />
        </form>

        <button
          onClick={handleReloadSampleData}
          disabled={isSyncing}
          title="Reload bundled synthetic financial network"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-750 border border-slate-700 text-xs font-medium text-slate-200 transition hover:border-slate-600 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-electric-400" : "text-slate-400"}`} />
          <span className="hidden sm:inline">Reset Demo Data</span>
        </button>

        <button
          onClick={handleRunInference}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-electric-600/20 hover:bg-electric-600/30 border border-electric-500/40 text-xs font-semibold text-electric-300 transition shadow-sm disabled:opacity-50"
        >
          <Cpu className="w-3.5 h-3.5 text-electric-400" />
          <span className="hidden sm:inline">Run GNN Scoring</span>
        </button>
      </div>

      {/* Investigator Info */}
      <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-electric-400">
          <UserCheck className="w-4 h-4" />
        </div>
        <div className="hidden lg:block text-right">
          <div className="text-xs font-semibold text-slate-200">Investigator Vikramaditya</div>
          <div className="text-[10px] text-slate-400 font-mono">FIU-IND Anti-Mule Taskforce</div>
        </div>
      </div>

      {/* Floating Notice */}
      {actionNotice && (
        <div className={`fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium shadow-glass border transition-all ${
          actionNotice.type === 'success'
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
            : 'bg-rose-950/90 text-rose-300 border-rose-500/40'
        }`}>
          {actionNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{actionNotice.text}</span>
        </div>
      )}
    </header>
  );
}
