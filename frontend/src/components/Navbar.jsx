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

const PAGE_TITLES = {
  landing: 'Intelligence platform overview',
  dashboard: 'Institutional fintech command',
  upload: 'Transaction ingestion & validation',
  transactions: 'Financial transaction ledger',
  'mule-detection': 'Mule account detection & scoring',
  graph: 'Graph investigation canvas',
  'money-trail': 'Money trail & layering flow',
  complaints: 'Complaint correlation',
  cases: 'Investigation case management',
  'case-details': 'Case dossier, evidence & audit logs',
  'analytics-reports': 'Reports & model analytics',
  'settings-model': 'GraphSAGE model architecture',
  pipeline: 'System execution pipeline',
  'theme-preview': 'Design system preview'
};

export default function Navbar({
  currentPage,
  onSearch,
  onAccountSelect,
  setRefreshTrigger,
  onOpenLivePipeline
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
      setActionNotice({
        type: 'success',
        text: `Benchmark data synchronized (${res.result?.valid_records || 182} records).`
      });
      if (setRefreshTrigger) setRefreshTrigger((prev) => prev + 1);
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
        text: `GNN scored ${res.total_accounts_scored} accounts (${res.high_risk_count} high risk).`
      });
      if (setRefreshTrigger) setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setActionNotice({ type: 'error', text: `Inference failed: ${err.message}` });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  return (
    <header className="h-14 bg-[rgba(11,11,15,0.85)] border-b border-rule px-5 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 select-none backdrop-blur-md">
      {/* Breadcrumb + title */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint leading-none">
          <span className="text-ink-muted">FinTrace</span>
          <span aria-hidden="true">/</span>
          <span className="truncate">{currentPage.replace(/-/g, ' ')}</span>
        </div>
        <h1 className="text-[13px] font-semibold tracking-tight text-ink mt-1 truncate">
          {PAGE_TITLES[currentPage] || 'FinTrace console'}
        </h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <form onSubmit={handleSearchSubmit} className="relative hidden md:flex items-center">
          <Search className="w-3.5 h-3.5 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search account, txn, hash…"
            aria-label="Search account, transaction or hash"
            className="w-56 lg:w-64 bg-transparent border border-rule rounded-full pl-8 pr-3 py-1.5 text-[11px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-[var(--focus)] transition-colors font-mono"
          />
        </form>

        <button
          type="button"
          onClick={handleReloadSampleData}
          disabled={isSyncing}
          title="Sync benchmark banking network"
          className="ft-btn-ghost hidden sm:inline-flex px-3 py-1.5 text-[11px]"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>Sync data</span>
        </button>

        <button
          type="button"
          onClick={handleRunInference}
          disabled={isSyncing}
          title="Run graph neural network scoring"
          className="ft-btn-cyan hidden md:inline-flex px-3 py-1.5 text-[11px]"
        >
          <Cpu className="w-3 h-3" />
          <span>Run GNN</span>
        </button>

        {onOpenLivePipeline && (
          <button
            type="button"
            onClick={onOpenLivePipeline}
            title="Run real-time pipeline"
            className="ft-btn-primary px-3 py-1.5 text-[11px]"
          >
            <Play className="w-3 h-3 fill-current" />
            <span className="hidden sm:inline">Live pipeline</span>
          </button>
        )}
      </div>

      {/* Operator */}
      <div className="flex items-center gap-2.5 pl-4 border-l border-rule shrink-0">
        <div className="w-7 h-7 rounded-full border border-rule flex items-center justify-center text-ink-muted">
          <UserCheck className="w-3.5 h-3.5" />
        </div>
        <div className="hidden lg:block leading-none">
          <div className="font-mono text-[11px] text-ink">DESK_01</div>
          <div className="mt-1 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
            <span className="ft-dot bg-[var(--status-gain)]" />
            Authorized
          </div>
        </div>
      </div>

      {/* Action notice */}
      {actionNotice && (
        <div
          role="status"
          className={`fixed top-16 right-6 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-canvas-raised border text-[11px] font-mono shadow-2xl ${
            actionNotice.type === 'success'
              ? 'border-[rgba(34,197,94,0.4)] text-[var(--status-gain)]'
              : 'border-[rgba(255,92,108,0.4)] text-[var(--status-loss)]'
          }`}
        >
          {actionNotice.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{actionNotice.text}</span>
        </div>
      )}
    </header>
  );
}
