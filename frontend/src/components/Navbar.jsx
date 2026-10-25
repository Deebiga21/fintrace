import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  Cpu,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Play
} from 'lucide-react';
import { api } from '../services/api';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({
  currentPage,
  onSearch,
  onAccountSelect,
  refreshTrigger,
  setRefreshTrigger,
  onOpenLivePipeline
}) {
  const [searchInput, setSearchInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const { isDark } = useTheme();

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
      setActionNotice({ type: 'success', text: `Benchmark data synchronized (${res.result?.valid_records || 182} records).` });
      if (setRefreshTrigger) setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setActionNotice({ type: 'error', text: `Failed to sync benchmark data: ${err.message}` });
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
    dashboard: "Institutional Fintech Command",
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
    pipeline: "Interactive System Execution Pipeline"
  };

  return (
    <header className="h-14 bg-fintech-card/95 border-b border-fintech-border px-5 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none backdrop-blur-md transition-colors duration-200">
      {/* Title & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-[10px] text-fintech-muted font-mono">
          <span className="text-fintech-primary font-bold">FINTRACE_DESK</span>
          <span className="text-fintech-border">/</span>
          <span className="uppercase tracking-wider">{currentPage.replace('-', '_')}</span>
        </div>
        <h1 className="text-xs sm:text-sm font-bold tracking-tight text-fintech-text uppercase">
          {pageTitles[currentPage] || "FINTECH CONSOLE"}
        </h1>
      </div>

      {/* Center Actions / Global Search */}
      <div className="flex items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-48 md:w-64 flex items-center">
          <Search className="w-3.5 h-3.5 text-fintech-muted absolute left-2.5 top-2 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search account, txn, hash..."
            className="w-full bg-fintech-surface border border-fintech-border rounded-lg pl-8 pr-3 py-1 text-xs text-fintech-text placeholder-fintech-muted focus:outline-none focus:border-fintech-primary transition font-mono"
          />
        </form>

        <button
          onClick={handleReloadSampleData}
          disabled={isSyncing}
          title="Sync benchmark banking network"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fintech-surface hover:bg-fintech-elevated border border-fintech-border hover:border-fintech-primary text-xs font-semibold text-fintech-muted hover:text-fintech-text transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin text-fintech-primary" : "text-fintech-muted"}`} />
          <span>Sync Data</span>
        </button>

        <button
          onClick={handleRunInference}
          disabled={isSyncing}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fintech-surface hover:bg-fintech-elevated border border-fintech-border text-xs font-semibold text-fintech-primary transition disabled:opacity-50"
        >
          <Cpu className="w-3 h-3" />
          <span>Run GNN</span>
        </button>

        {onOpenLivePipeline && (
          <button
            onClick={onOpenLivePipeline}
            className="btn-accent px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
            title="Run Real-Time Pipeline"
          >
            <Play className="w-3 h-3 fill-current" />
            <span className="hidden sm:inline">Live Pipeline</span>
          </button>
        )}
      </div>

      {/* Right Controls: Theme Toggle & Investigator Profile */}
      <div className="flex items-center gap-3 pl-3 sm:pl-4 border-l border-fintech-border">
        {/* Dark/Light Theme Toggle */}
        <ThemeToggle size="sm" showLabel={false} />

        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-fintech-surface border border-fintech-border flex items-center justify-center text-fintech-primary">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="hidden lg:block text-right font-mono leading-tight">
            <div className="text-xs font-bold text-fintech-text">DESK_01</div>
            <div className="text-[10px] text-fintech-primary">AUTHORIZED</div>
          </div>
        </div>
      </div>

      {/* Floating Notice */}
      {actionNotice && (
        <div className={`fixed top-16 right-6 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-mono border shadow-lg backdrop-blur-md transition-all ${
          actionNotice.type === 'success'
            ? 'bg-fintech-card text-[#22C55E] border-[#22C55E]/40'
            : 'bg-fintech-card text-[#FF5C6C] border-[#FF5C6C]/40'
        }`}>
          {actionNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-[#22C55E]" /> : <AlertCircle className="w-4 h-4 text-[#FF5C6C]" />}
          <span>{actionNotice.text}</span>
        </div>
      )}
    </header>
  );
}
