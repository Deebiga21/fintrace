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
    pipeline: "Interactive System Execution Pipeline"
  };

  return (
    <header className="h-14 bg-[#FFFFFF]/95 border-b border-[#E8C2BB] px-6 flex items-center justify-between sticky top-0 z-10 select-none font-['Titillium_Web',sans-serif]">
      {/* Title & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-[10px] text-[#6E6264] font-['Share_Tech_Mono',monospace]">
          <span className="text-[#B86B7A] font-bold">FINTRACE_OS</span>
          <span className="text-[#8A7D7F]">&gt;</span>
          <span className="text-[#6E6264] uppercase tracking-wider">{currentPage.replace('-', '_')}</span>
        </div>
        <h1 className="text-xs sm:text-sm font-['Rajdhani',sans-serif] font-bold text-[#4A4A4A] uppercase tracking-wider">
          {pageTitles[currentPage] || "INVESTIGATOR CONSOLE"}
        </h1>
      </div>

      {/* Center Actions / Global Search */}
      <div className="flex items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-56 md:w-72 flex items-center">
          <span className="font-['Share_Tech_Mono',monospace] text-xs text-[#B86B7A] mr-1.5 font-bold">&gt;</span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="search account, hash, txn..."
            className="w-full bg-transparent border-b border-[#E8C2BB] text-xs text-[#4A4A4A] placeholder-[#8A7D7F] focus:outline-none focus:border-[#E2B4BD] pb-0.5 rounded-none font-['Share_Tech_Mono',monospace] transition"
          />
        </form>

        <button
          onClick={handleReloadSampleData}
          disabled={isSyncing}
          title="Sync benchmark banking network"
          className="flex items-center gap-1.5 px-3 py-1 bg-[#FFFFFF] hover:bg-[#F7D6D0] border border-[#E8C2BB] hover:border-[#E2B4BD] text-xs font-['Rajdhani',sans-serif] font-bold text-[#6E6264] hover:text-[#B86B7A] uppercase tracking-wider transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin text-[#B86B7A]" : "text-[#8A7D7F]"}`} />
          <span className="hidden sm:inline">Sync Benchmark</span>
        </button>

        <button
          onClick={handleRunInference}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-3 py-1 bg-[#F7D6D0] hover:bg-[#B86B7A] hover:text-[#171B23] border border-[#E2B4BD] text-xs font-['Rajdhani',sans-serif] font-bold text-[#B86B7A] uppercase tracking-wider transition disabled:opacity-50"
        >
          <Cpu className="w-3 h-3" />
          <span className="hidden sm:inline">Run GNN Scoring</span>
        </button>

        <button
          onClick={onOpenLivePipeline}
          className="flex items-center gap-1.5 px-3.5 py-1 bg-[#FFFFFF] hover:bg-[#B86B7A] text-[#171B23] font-['Rajdhani',sans-serif] font-bold text-xs uppercase tracking-wider transition"
          title="Run Real-Time End-to-End Pipeline Execution with live logs"
        >
          <Play className="w-3 h-3 fill-current text-current" />
          <span className="hidden md:inline">Live Pipeline</span>
          <span className="text-[9px] bg-[#FFF5F5] text-[#B86B7A] px-1 py-0.2 font-['Share_Tech_Mono',monospace] font-bold">● LIVE</span>
        </button>
      </div>

      {/* Investigator Info */}
      <div className="flex items-center gap-3 pl-4 border-l border-[#E8C2BB]">
        <div className="w-7 h-7 bg-[#F7D6D0] border border-[#E2B4BD] rotate-45 flex items-center justify-center text-[#B86B7A]">
          <UserCheck className="w-3.5 h-3.5 -rotate-45" />
        </div>
        <div className="hidden lg:block text-right font-['Share_Tech_Mono',monospace]">
          <div className="text-xs text-[#4A4A4A] font-bold">OPERATOR_01</div>
          <div className="text-[9px] text-[#B86B7A]">SEC: CLEARED</div>
        </div>
      </div>

      {/* Floating Notice */}
      {actionNotice && (
        <div className={`fixed top-16 right-6 z-50 flex items-center gap-2 px-3 py-2 text-xs font-['Share_Tech_Mono',monospace] border shadow-lg transition-all ${
          actionNotice.type === 'success'
            ? 'bg-[#FFFFFF] text-[#B86B7A] border-[#E2B4BD]'
            : 'bg-[#FFFFFF] text-[#FF3B4E] border-[#FF3B4E]'
        }`}>
          {actionNotice.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-[#B86B7A]" /> : <AlertCircle className="w-3.5 h-3.5 text-[#FF3B4E]" />}
          <span>{actionNotice.text}</span>
        </div>
      )}
    </header>
  );
}
