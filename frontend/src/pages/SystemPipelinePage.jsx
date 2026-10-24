import React, { useEffect, useState } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  Database,
  Network,
  Cpu,
  Layers,
  Activity,
  ShieldAlert,
  Share2,
  FileWarning,
  Briefcase,
  LayoutDashboard,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Lock,
  Play,
  Check,
  AlertCircle,
  Info,
  ChevronRight,
  Filter,
  Search,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';

const STAGE_ICONS = {
  1: UploadCloud,
  2: CheckCircle2,
  3: Database,
  4: Network,
  5: Cpu,
  6: Layers,
  7: Activity,
  8: ShieldAlert,
  9: Share2,
  10: FileWarning,
  11: Briefcase,
  12: LayoutDashboard,
};

const STATUS_THEMES = {
  COMPLETED: {
    badge: 'bg-[#D6E85A]/15/70 text-[#D6E85A] border-[#D6E85A]/40',
    dot: 'bg-emerald-400',
    border: 'border-[#1B1F22] hover:border-[#D6E85A]/40',
    accent: 'text-[#D6E85A]',
  },
  READY: {
    badge: 'bg-electric-950/70 text-[#22D3E6] border-[#22D3E6]',
    dot: 'bg-electric-400',
    border: 'border-[#1B1F22] hover:border-[#22D3E6]',
    accent: 'text-[#22D3E6]',
  },
  RUNNING: {
    badge: 'bg-cyan-950/70 text-cyan-300 border-cyan-500/40',
    dot: 'bg-cyan-400 animate-ping',
    border: 'border-cyan-500/50 shadow-glow-cyan',
    accent: 'text-cyan-400',
  },
  BLOCKED: {
    badge: 'bg-[#FF3B4E]/15/70 text-[#FF3B4E] border-[#FF3B4E]/40',
    dot: 'bg-rose-400',
    border: 'border-[#1B1F22] hover:border-[#FF3B4E]/40',
    accent: 'text-[#FF3B4E]',
  },
  NOT_STARTED: {
    badge: 'bg-[#05080A] text-[#E2E2E2]-400 border-[#1B1F22]',
    dot: 'bg-slate-500',
    border: 'border-[#1B1F22]',
    accent: 'text-[#E2E2E2]-400',
  },
};

export default function SystemPipelinePage({
  setCurrentPage,
  onAccountSelect,
  setSelectedCaseId,
  refreshTrigger,
  setRefreshTrigger,
  onOpenLivePipeline
}) {
  const [pipelineData, setPipelineData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [runningStage, setRunningStage] = useState(null);
  const [historySearch, setHistorySearch] = useState('');
  const [activeStageFilter, setActiveStageFilter] = useState('ALL');

  const fetchPipeline = async (datasetId) => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, historyRes] = await Promise.all([
        api.getPipelineStatus(datasetId || undefined),
        api.getPipelineHistory().catch(() => ({ history: [] }))
      ]);
      setPipelineData(statusRes);
      setHistoryData(historyRes.history || []);
      if (statusRes.active_dataset && !selectedDatasetId) {
        setSelectedDatasetId(statusRes.active_dataset.dataset_id);
      }
    } catch (err) {
      setError(err.message || "Failed to load pipeline status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline(selectedDatasetId);
  }, [selectedDatasetId, refreshTrigger]);

  const handleRunStage = async (stageNum) => {
    setRunningStage(stageNum);
    try {
      const res = await api.runPipelineStage(stageNum);
      alert(res.message || `Stage ${stageNum} executed successfully!`);
      if (setRefreshTrigger) setRefreshTrigger(prev => prev + 1);
      fetchPipeline(selectedDatasetId);
    } catch (err) {
      alert(`Failed to execute Stage ${stageNum}: ` + err.message);
    } finally {
      setRunningStage(null);
    }
  };

  const handleNavigateStage = (route) => {
    if (setCurrentPage) {
      setCurrentPage(route);
    }
  };

  const activeDataset = pipelineData?.active_dataset;
  const stages = pipelineData?.stages || [];
  const availableDatasets = pipelineData?.available_datasets || [];

  const filteredHistory = historyData.filter(h => {
    if (!historySearch) return true;
    const term = historySearch.toLowerCase();
    return (
      h.action?.toLowerCase().includes(term) ||
      h.details?.toLowerCase().includes(term) ||
      h.actor?.toLowerCase().includes(term) ||
      h.target_id?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold font-mono bg-electric-950 text-[#22D3E6] border border-[#22D3E6]">
              CORE SYSTEM ARCHITECTURE
            </span>
            <span className="text-[10px] font-mono text-[#D6E85A] bg-[#D6E85A]/15/60 px-2 py-0.5 rounded border border-[#D6E85A]/30">
              12 / 12 STAGES OPERATIONAL
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide mt-1.5 flex items-center gap-2">
            <span>System Pipeline: End-to-End Financial Crime Intelligence Flow</span>
          </h2>
          <p className="text-xs text-[#E2E2E2]-400 mt-1 max-w-3xl leading-relaxed">
            Trace how ingested banking statements flow through strict canonical validation, relational storage, multi-hop graph topology, GraphSAGE neural scoring, behavioral rule dissection, cybercrime FIR correlation, and formal evidentiary custody.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenLivePipeline}
            className="px-4 py-2 bg-gradient-to-r from-electric-600 via-cyan-500 to-emerald-500 hover:from-electric-500 hover:to-cyan-400 text-white font-bold text-xs rounded-none transition flex items-center gap-2 shadow-glow-electric transform hover:scale-105 active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>⚡ Execute Full Pipeline Live</span>
          </button>

          <button
            onClick={() => fetchPipeline(selectedDatasetId)}
            disabled={loading}
            className="px-4 py-2 bg-navy-850 hover:bg-[#0E1215] text-[#E2E2E2] border border-[#1B1F22] font-mono text-xs rounded-none transition flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#22D3E6] ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Pipeline State</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-none bg-[#FF3B4E]/15/40 border border-[#FF3B4E]/40 text-[#FF3B4E] text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#FF3B4E]" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Dataset Status Panel */}
      {activeDataset && (
        <div className="p-4 rounded-none bg-[#05080A]/75 backdrop-blur-2xl border border-[#1B1F22] space-y-3 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1B1F22]/80 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[#E2E2E2]-400 text-[11px] font-semibold">ACTIVE PIPELINE DATASET:</span>
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="px-3 py-1 bg-[#000000] border border-[#1B1F22] rounded text-[#22D3E6] font-bold text-xs focus:outline-none focus:border-[#22D3E6]"
              >
                {availableDatasets.map((ds) => (
                  <option key={ds.dataset_id} value={ds.dataset_id}>
                    {ds.name} ({ds.valid_rows || ds.total_rows || 0} rows)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#E2E2E2]-400">STATUS:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D6E85A]/15 text-[#D6E85A] border border-[#D6E85A]/40">
                {activeDataset.status || 'ACTIVE'}
              </span>
              <button
                onClick={() => setCurrentPage('upload')}
                className="px-2.5 py-1 bg-[#000000] hover:bg-[#0E1215] text-[#E2E2E2]-300 border border-[#1B1F22] rounded text-[11px] transition flex items-center gap-1"
              >
                <UploadCloud className="w-3 h-3 text-[#22D3E6]" />
                <span>Ingest New Dataset</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-mono">
            <div className="p-2.5 rounded-none bg-[#000000] border border-[#1B1F22]/80">
              <span className="text-[10px] text-[#5A5F64] block">DATASET TYPE</span>
              <span className="font-bold text-white text-xs mt-0.5 block truncate">
                {activeDataset.dataset_type || 'Real CBS Statements'}
              </span>
            </div>

            <div className="p-2.5 rounded-none bg-[#000000] border border-[#1B1F22]/80">
              <span className="text-[10px] text-[#5A5F64] block">VALIDATED TRANSACTIONS</span>
              <span className="font-bold text-[#D6E85A] text-xs mt-0.5 block">
                {(activeDataset.valid_rows || 0).toLocaleString()} Rows
              </span>
            </div>

            <div className="p-2.5 rounded-none bg-[#000000] border border-[#1B1F22]/80">
              <span className="text-[10px] text-[#5A5F64] block">TOTAL RECORD INTAKE</span>
              <span className="font-bold text-white text-xs mt-0.5 block">
                {(activeDataset.total_rows || 0).toLocaleString()} Rows
              </span>
            </div>

            <div className="p-2.5 rounded-none bg-[#000000] border border-[#1B1F22]/80">
              <span className="text-[10px] text-[#5A5F64] block">FRAUD LABELS</span>
              <span className="font-bold text-cyan-400 text-xs mt-0.5 block">
                {activeDataset.fraud_labels_present ? "Supervised / Ground-Truth" : "Unlabeled (Unsupervised)"}
              </span>
            </div>

            <div className="p-2.5 rounded-none bg-[#000000] border border-[#1B1F22]/80">
              <span className="text-[10px] text-[#5A5F64] block">DATA QUALITY SCORE</span>
              <span className="font-bold text-[#D6E85A] text-xs mt-0.5 block">
                {activeDataset.readiness_score || 100}% Sanitized
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Flow Diagram: Visual 12-Stage Subway Map */}
      <div className="p-5 rounded-none bg-[#05080A]/75 backdrop-blur-2xl border border-[#1B1F22] space-y-3 font-mono">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#22D3E6]" />
            <span>12-STAGE PIPELINE FLOW MAP</span>
          </h3>
          <span className="text-[11px] text-[#5A5F64]">
            Click any step to inspect stage specification
          </span>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex items-center min-w-[1100px] gap-1 relative py-2">
            {stages.map((stage, idx) => {
              const Icon = STAGE_ICONS[stage.stage_number] || Activity;
              const theme = STATUS_THEMES[stage.status] || STATUS_THEMES.READY;

              return (
                <React.Fragment key={stage.stage_number}>
                  <div
                    onClick={() => {
                      const el = document.getElementById(`stage-card-${stage.stage_number}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className={`flex-1 p-2 rounded-none bg-[#000000] border transition cursor-pointer hover:border-[#22D3E6] flex flex-col items-center text-center space-y-1.5 ${theme.border}`}
                  >
                    <div className="flex items-center justify-between w-full text-[9px] text-[#E2E2E2]-400">
                      <span className="font-bold text-[#5A5F64]">#{stage.stage_number}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                    </div>
                    <div className="p-1.5 rounded-md bg-[#05080A] text-[#22D3E6]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-white leading-tight line-clamp-1">
                      {stage.name}
                    </span>
                    <span className={`text-[8px] px-1 py-0.2 rounded border font-semibold ${theme.badge}`}>
                      {stage.status_badge || stage.status}
                    </span>
                  </div>

                  {idx < stages.length - 1 && (
                    <div className="text-slate-600 shrink-0">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* 12 Detailed Pipeline Stage Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#22D3E6]" />
            <span>DETAILED PIPELINE STAGES & EXECUTION BLUEPRINTS</span>
          </h3>
          <span className="text-[11px] font-mono text-[#E2E2E2]-400">
            Strict dependency enforcement across relational storage, graph networks, and models
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {stages.map((stage) => {
            const Icon = STAGE_ICONS[stage.stage_number] || Activity;
            const theme = STATUS_THEMES[stage.status] || STATUS_THEMES.READY;
            const isStageRunning = runningStage === stage.stage_number;

            return (
              <div
                key={stage.stage_number}
                id={`stage-card-${stage.stage_number}`}
                className={`p-5 rounded-none bg-[#05080A]/75 backdrop-blur-2xl border transition flex flex-col justify-between space-y-4 ${theme.border}`}
              >
                <div className="space-y-3 font-mono text-xs">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-[#1B1F22]/80 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-none bg-[#000000] border border-[#1B1F22] text-[#22D3E6] shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#5A5F64]">
                            STAGE {stage.stage_number < 10 ? `0${stage.stage_number}` : stage.stage_number}
                          </span>
                          <span className={`text-[10px] px-2 py-0.2 rounded border font-semibold ${theme.badge}`}>
                            {stage.status_badge || stage.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-0.5">
                          {stage.name}
                        </h4>
                      </div>
                    </div>

                    <span className="text-[10px] text-[#5A5F64] shrink-0">
                      {stage.last_run}
                    </span>
                  </div>

                  {/* Purpose Narrative */}
                  <p className="text-[#E2E2E2]-300 text-xs leading-relaxed font-sans">
                    {stage.purpose}
                  </p>

                  {/* Input ➔ Output Flow */}
                  <div className="p-3 rounded-none bg-[#000000] border border-[#1B1F22] space-y-2 text-[11px]">
                    <div className="flex items-start gap-2">
                      <span className="text-[#5A5F64] font-bold shrink-0 w-16">INPUT:</span>
                      <span className="text-[#E2E2E2]-300">{stage.input}</span>
                    </div>
                    <div className="flex items-start gap-2 pt-1 border-t border-slate-850">
                      <span className="text-[#D6E85A] font-bold shrink-0 w-16">OUTPUT:</span>
                      <span className="text-[#D6E85A] font-semibold">{stage.output}</span>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  {stage.metrics && Object.keys(stage.metrics).length > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
                      {Object.entries(stage.metrics).map(([key, val]) => (
                        <div key={key} className="p-2 rounded bg-[#000000]/70 border border-[#1B1F22]">
                          <span className="text-[#5A5F64] block uppercase text-[9px] truncate">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="font-bold text-[#E2E2E2] mt-0.5 block truncate">
                            {typeof val === 'boolean' ? (val ? 'Yes / Enforced' : 'No') : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dependencies & Blockers */}
                  <div className="pt-2 border-t border-[#1B1F22]/80 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                    <div className="flex items-center gap-1.5 text-[#E2E2E2]-400">
                      <span className="text-[#5A5F64]">PREREQUISITES:</span>
                      <span>{stage.dependencies?.length > 0 ? stage.dependencies.join(', ') : 'None (Root Intake)'}</span>
                    </div>

                    {stage.is_blocked && (
                      <span className="text-[#FF3B4E] font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>{stage.blocker_reason || 'Blocked by earlier stage'}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-[#1B1F22] flex items-center justify-between gap-2 font-mono text-xs">
                  {stage.stage_number === 4 || stage.stage_number === 7 ? (
                    <button
                      onClick={() => handleRunStage(stage.stage_number)}
                      disabled={isStageRunning || stage.is_blocked}
                      className="px-3 py-1.5 bg-[#000000] hover:bg-[#0E1215] disabled:opacity-50 text-[#E2E2E2] border border-[#1B1F22] rounded-none text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      {isStageRunning ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-[#22D3E6]" />
                      ) : (
                        <Play className="w-3 h-3 text-[#D6E85A]" />
                      )}
                      <span>{isStageRunning ? "Executing..." : "Execute Stage Operation"}</span>
                    </button>
                  ) : (
                    <div className="text-[10px] text-[#5A5F64]">
                      Synchronized with live ledger state
                    </div>
                  )}

                  <button
                    onClick={() => handleNavigateStage(stage.route)}
                    className="px-3.5 py-1.5 bg-electric-600 hover:bg-[#22D3E6] text-white font-bold rounded-none shadow-glow-electric text-xs transition flex items-center gap-1.5 ml-auto"
                  >
                    <span>{stage.action_label || 'Inspect Stage'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pipeline Audit & Execution History */}
      <div className="p-5 rounded-none bg-[#05080A]/75 backdrop-blur-2xl border border-[#1B1F22] space-y-4 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1B1F22] pb-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-[#22D3E6]" />
              <span>PIPELINE EXECUTION & AUDIT LOG HISTORY ({filteredHistory.length})</span>
            </h3>
            <p className="text-[11px] text-[#E2E2E2]-400 mt-0.5">
              Immutable chain of custody tracking datasets, graph updates, GNN inferences, and forensic case operations.
            </p>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#E2E2E2]-400" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search audit action or actor..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#000000] border border-[#1B1F22] rounded-none text-white text-xs focus:outline-none focus:border-[#22D3E6]"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#000000] text-[#E2E2E2]-400 text-[10px] sticky top-0 uppercase">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Target Entity</th>
                <th className="py-2.5 px-3">Operational Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B1F22] text-[11px]">
              {filteredHistory.map((item, idx) => (
                <tr key={idx} className="hover:bg-navy-850/60 transition">
                  <td className="py-2.5 px-3 text-[#E2E2E2]-400 whitespace-nowrap">
                    {new Date(item.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#E2E2E2]">
                    {item.actor}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-[#22D3E6]">
                    <span className="px-2 py-0.5 rounded bg-electric-950/70 border border-[#22D3E6] text-[10px]">
                      {item.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[#E2E2E2]-300">
                    {item.target_id || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-[#E2E2E2]-400 font-sans">
                    {item.details}
                  </td>
                </tr>
              ))}

              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#5A5F64] text-xs font-mono">
                    No pipeline history records found matching search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
