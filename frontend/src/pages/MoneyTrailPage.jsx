import React, { useEffect, useState } from 'react';
import {
  Share2,
  Search,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Briefcase,
  AlertTriangle,
  RefreshCw,
  Layers,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Download,
  Filter,
  Eye,
  AlertCircle,
  FileText,
  ChevronRight,
  X
} from 'lucide-react';
import { api } from '../services/api';
import CytoscapeGraph from '../components/CytoscapeGraph';
import RiskBadge from '../components/RiskBadge';

export default function MoneyTrailPage({
  selectedAccount,
  onAccountSelect,
  setCurrentPage,
  onOpenCreateCase,
  refreshTrigger
}) {
  // Search parameters
  const [startAccount, setStartAccount] = useState(selectedAccount || 'MULE_AGG_01');
  const [destAccount, setDestAccount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [maxHops, setMaxHops] = useState(4);
  const [direction, setDirection] = useState('BOTH'); // 'BOTH' | 'INBOUND' | 'OUTBOUND'
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Results State
  const [trailData, setTrailData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' | 'paths' | 'patterns' | 'graph'
  const [selectedPathId, setSelectedPathId] = useState(null);
  const [inspectedElement, setInspectedElement] = useState(null);

  // Case & Report Modals
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [existingCases, setExistingCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [caseNotes, setCaseNotes] = useState('');
  const [savingCase, setSavingCase] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Report Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const demoAccounts = ['MULE_AGG_01', 'RAPID_CONDUIT_77', 'CIRC_MULE_A', 'DISP_SMURF_88'];

  const executeAnalysis = async (overrideParams = {}) => {
    const acc = overrideParams.start_account || startAccount;
    if (!acc.trim() && !transactionId.trim()) {
      setError("Please specify a starting account or transaction ID to trace.");
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedPathId(null);
    setInspectedElement(null);

    const payload = {
      start_account: acc.trim().toUpperCase(),
      destination_account: (overrideParams.destination_account ?? destAccount).trim().toUpperCase() || undefined,
      transaction_id: (overrideParams.transaction_id ?? transactionId).trim() || undefined,
      max_hops: parseInt(overrideParams.max_hops ?? maxHops, 10) || 4,
      direction: overrideParams.direction ?? direction,
      min_amount: minAmount ? parseFloat(minAmount) : undefined,
      max_amount: maxAmount ? parseFloat(maxAmount) : undefined,
      suspicious_only: suspiciousOnly
    };

    try {
      const data = await api.analyzeMoneyTrail(payload);
      setTrailData(data);
    } catch (err) {
      setError(err.message || "Failed to analyze money trail.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAccount) {
      setStartAccount(selectedAccount);
      executeAnalysis({ start_account: selectedAccount });
    } else {
      executeAnalysis({ start_account: startAccount });
    }
  }, [selectedAccount, refreshTrigger]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onAccountSelect && startAccount.trim()) {
      onAccountSelect(startAccount.trim().toUpperCase());
    }
    executeAnalysis();
  };

  const handleOpenCaseModal = async () => {
    setIsCaseModalOpen(true);
    setSaveSuccessMsg('');
    try {
      const cases = await api.getCases({ limit: 50 });
      setExistingCases(Array.isArray(cases) ? cases : []);
      if (cases && cases.length > 0) {
        setSelectedCaseId(cases[0].case_id);
      }
    } catch (err) {
      console.warn("Could not fetch cases:", err);
    }
  };

  const handleSaveToCase = async () => {
    if (!trailData?.trail_id) return;
    setSavingCase(true);
    try {
      const payload = {
        case_id: selectedCaseId || undefined,
        new_case_title: !selectedCaseId && newCaseTitle ? newCaseTitle : undefined,
        notes: caseNotes || `Money Trail ${trailData.trail_id} analysis attached.`
      };
      const res = await api.saveMoneyTrailToCase(trailData.trail_id, payload);
      setSaveSuccessMsg(res.message || "Money trail evidence attached to case successfully!");
      setTimeout(() => {
        setIsCaseModalOpen(false);
        setSaveSuccessMsg('');
      }, 1500);
    } catch (err) {
      alert("Failed to save to case: " + err.message);
    } finally {
      setSavingCase(false);
    }
  };

  const handleViewReport = async () => {
    if (!trailData?.trail_id) return;
    setIsReportModalOpen(true);
    setLoadingReport(true);
    try {
      const report = await api.getMoneyTrailReport(trailData.trail_id);
      setReportData(report);
    } catch (err) {
      alert("Failed to fetch trail report: " + err.message);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleDownloadReportJson = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FINTRACE_TRAIL_REPORT_${reportData.trail_id || 'EXPORT'}.json`;
    a.click();
  };

  // Filter timeline if a specific path is selected
  const activeTimeline = trailData?.chronological_timeline || [];
  const selectedPath = (trailData?.candidate_paths || []).find(p => p.path_id === selectedPathId);
  const filteredTimeline = selectedPath
    ? activeTimeline.filter(t => selectedPath.supporting_transaction_ids.includes(t.transaction_id))
    : activeTimeline;

  return (
    <div className="space-y-6">
      {/* Title & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#4A4A4A] tracking-wide flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#FF3B4E]" />
            <span>Step 6: Multi-Hop Money Trail & Layering Flow Analysis</span>
          </h2>
          <p className="text-xs text-[#6E6264] mt-1">
            Reconstruct multi-hop fund dissemination paths, pinpoint conduit smurfing hops, and calculate elapsed transit velocities.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#FFFFFF] border border-[#E8C2BB] rounded-none">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition ${
              activeTab === 'timeline'
                ? 'bg-electric-600 text-white shadow-sm'
                : 'text-[#6E6264] hover:text-[#4A4A4A]'
            }`}
          >
            Chronological Timeline ({trailData?.chronological_timeline?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('paths')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition ${
              activeTab === 'paths'
                ? 'bg-electric-600 text-white shadow-sm'
                : 'text-[#6E6264] hover:text-[#4A4A4A]'
            }`}
          >
            Candidate Paths ({trailData?.candidate_paths?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition ${
              activeTab === 'patterns'
                ? 'bg-electric-600 text-white shadow-sm'
                : 'text-[#6E6264] hover:text-[#4A4A4A]'
            }`}
          >
            Suspicious Patterns ({trailData?.suspicious_patterns?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition ${
              activeTab === 'graph'
                ? 'bg-electric-600 text-white shadow-sm'
                : 'text-[#6E6264] hover:text-[#4A4A4A]'
            }`}
          >
            Topology Graph
          </button>
        </div>
      </div>

      {/* Search and Investigation Query Bar */}
      <div className="p-4 rounded-none bg-[#FFFFFF]/75 backdrop-blur-2xl border border-[#E8C2BB] space-y-3">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[10px] font-mono font-semibold text-[#6E6264] mb-1">
                STARTING / SUBJECT ACCOUNT:
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6264]" />
                <input
                  type="text"
                  value={startAccount}
                  onChange={(e) => setStartAccount(e.target.value)}
                  placeholder="e.g. MULE_AGG_01"
                  className="w-full pl-9 pr-3 py-2 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white font-mono text-xs focus:outline-none focus:border-[#E2B4BD]"
                />
              </div>
            </div>

            <div className="w-[180px]">
              <label className="block text-[10px] font-mono font-semibold text-[#6E6264] mb-1">
                DESTINATION ACCOUNT (OPTIONAL):
              </label>
              <input
                type="text"
                value={destAccount}
                onChange={(e) => setDestAccount(e.target.value)}
                placeholder="Target Account..."
                className="w-full px-3 py-2 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white font-mono text-xs focus:outline-none focus:border-[#E2B4BD]"
              />
            </div>

            <div className="w-[120px]">
              <label className="block text-[10px] font-mono font-semibold text-[#6E6264] mb-1">
                MAX HOPS:
              </label>
              <select
                value={maxHops}
                onChange={(e) => setMaxHops(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white font-mono text-xs focus:outline-none focus:border-[#E2B4BD]"
              >
                <option value={1}>1 Hop</option>
                <option value={2}>2 Hops</option>
                <option value={3}>3 Hops</option>
                <option value={4}>4 Hops</option>
                <option value={5}>5 Hops</option>
                <option value={6}>6 Hops</option>
              </select>
            </div>

            <div className="w-[140px]">
              <label className="block text-[10px] font-mono font-semibold text-[#6E6264] mb-1">
                DIRECTION:
              </label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white font-mono text-xs focus:outline-none focus:border-[#E2B4BD]"
              >
                <option value="BOTH">Bidirectional</option>
                <option value="INBOUND">Inflow Only</option>
                <option value="OUTBOUND">Outflow Only</option>
              </select>
            </div>

            <div className="flex items-end gap-2 pt-5">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-electric-600 hover:bg-[#B86B7A] disabled:opacity-50 text-white font-bold rounded-none text-xs shadow-glow-rose transition flex items-center gap-1.5"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Analyze Money Trail</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`px-3 py-2 border rounded-none text-xs font-mono transition flex items-center gap-1 ${
                  showAdvanced ? 'bg-navy-800 text-[#B86B7A] border-[#E2B4BD]' : 'bg-[#FFF5F5] text-[#6E6264] border-[#E8C2BB] hover:text-[#4A4A4A]'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filters</span>
              </button>
            </div>
          </div>

          {/* Advanced Filters Drawer */}
          {showAdvanced && (
            <div className="pt-3 border-t border-[#E8C2BB]/80 flex flex-wrap items-center gap-4 text-xs font-mono animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-[#6E6264] text-[11px]">Txn ID:</span>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Optional TXN_..."
                  className="px-2.5 py-1 bg-[#FFF5F5] border border-[#E8C2BB] rounded text-white text-xs w-36 focus:outline-none focus:border-[#E2B4BD]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#6E6264] text-[11px]">Min ₹:</span>
                <input
                  type="number"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  placeholder="0"
                  className="px-2.5 py-1 bg-[#FFF5F5] border border-[#E8C2BB] rounded text-white text-xs w-28 focus:outline-none focus:border-[#E2B4BD]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#6E6264] text-[11px]">Max ₹:</span>
                <input
                  type="number"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  placeholder="No limit"
                  className="px-2.5 py-1 bg-[#FFF5F5] border border-[#E8C2BB] rounded text-white text-xs w-28 focus:outline-none focus:border-[#E2B4BD]"
                />
              </div>

              <label className="flex items-center gap-2 text-[#6E6264] text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={suspiciousOnly}
                  onChange={(e) => setSuspiciousOnly(e.target.checked)}
                  className="rounded border-[#E8C2BB] bg-[#FFF5F5] text-[#B86B7A] focus:ring-0"
                />
                <span className="text-[11px] text-[#FF3B4E] font-semibold">Flagged / Suspicious Only</span>
              </label>
            </div>
          )}
        </form>

        {/* Demo Quick Subjects */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#E8C2BB]/60">
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="text-[#8A7D7F]">QUICK INVESTIGATION SUBJECTS:</span>
            {demoAccounts.map((dAcc) => (
              <button
                key={dAcc}
                onClick={() => {
                  setStartAccount(dAcc);
                  setDestAccount('');
                  setTransactionId('');
                  if (onAccountSelect) onAccountSelect(dAcc);
                  executeAnalysis({ start_account: dAcc, destination_account: '', transaction_id: '' });
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                  startAccount === dAcc
                    ? 'bg-[#FF3B4E]/15 text-[#FF3B4E] border border-[#FF3B4E]/50 font-bold'
                    : 'bg-[#FFF5F5] text-[#6E6264] hover:text-[#4A4A4A] border border-[#E8C2BB]'
                }`}
              >
                {dAcc}
              </button>
            ))}
          </div>

          {trailData?.trail_id && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenCaseModal}
                className="px-3 py-1 bg-navy-800 hover:bg-navy-700 border border-[#E8C2BB] text-[#4A4A4A] font-semibold rounded text-xs transition flex items-center gap-1.5"
              >
                <Briefcase className="w-3 h-3 text-[#B86B7A]" />
                <span>Save Trail to Case</span>
              </button>

              <button
                onClick={handleViewReport}
                className="px-3 py-1 bg-navy-800 hover:bg-navy-700 border border-[#E8C2BB] text-[#4A4A4A] font-semibold rounded text-xs transition flex items-center gap-1.5"
              >
                <FileText className="w-3 h-3 text-[#6E6264]" />
                <span>Export Dossier</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-none bg-[#FF3B4E]/15/40 border border-[#FF3B4E]/40 text-[#FF3B4E] text-xs flex items-center gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 shrink-0 text-[#FF3B4E]" />
          <span>{error}</span>
        </div>
      )}

      {/* Layering & Dissection Summary Banner */}
      {trailData && trailData.layering_analysis && (
        <div className="p-4 rounded-none bg-[#FFFFFF]/75 backdrop-blur-2xl border border-[#E8C2BB] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#4A4A4A] uppercase tracking-wider font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#B86B7A]" />
              <span>FLOW DISSECTION & LAYER ANALYSIS: {trailData.target_account}</span>
            </h3>
            {trailData.layering_analysis.is_potential_conduit && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FF3B4E]/15/70 text-[#FF3B4E] border border-[#FF3B4E]/50 shadow-glow-danger flex items-center gap-1 font-mono">
                <AlertTriangle className="w-3 h-3 text-[#FF3B4E]" />
                RAPID CONDUIT / AGGREGATION DETECTED
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="p-3 rounded-none bg-[#FFF5F5] border border-[#E8C2BB]">
              <div className="text-[10px] text-[#6E6264] font-mono">INFLOW SOURCES</div>
              <div className="text-lg font-mono font-bold text-[#6E6264] mt-1">
                {trailData.layering_analysis.total_inflow_nodes} Nodes
              </div>
              <div className="text-[10px] text-[#8A7D7F] font-mono">
                ₹{(trailData.investigation_summary?.total_inbound_volume || 0).toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-none bg-[#FFF5F5] border border-[#E8C2BB]">
              <div className="text-[10px] text-[#6E6264] font-mono">OUTFLOW DESTINATIONS</div>
              <div className="text-lg font-mono font-bold text-[#FF3B4E] mt-1">
                {trailData.layering_analysis.total_outflow_nodes} Nodes
              </div>
              <div className="text-[10px] text-[#8A7D7F] font-mono">
                ₹{(trailData.investigation_summary?.total_outbound_volume || 0).toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-none bg-[#FFF5F5] border border-[#E8C2BB]">
              <div className="text-[10px] text-[#6E6264] font-mono">TURNOVER RATIO</div>
              <div className="text-lg font-mono font-bold text-[#B86B7A] mt-1">
                {((trailData.layering_analysis.turnover_ratio || 0) * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-[#8A7D7F] font-mono">Pass-Through Velocity</div>
            </div>

            <div className="p-3 rounded-none bg-[#FFF5F5] border border-[#E8C2BB]">
              <div className="text-[10px] text-[#6E6264] font-mono">DETECTED LAYERING DEPTH</div>
              <div className="text-lg font-mono font-bold text-[#6E6264] mt-1">
                {trailData.layering_analysis.detected_layering_hops} Hops
              </div>
              <div className="text-[10px] text-[#8A7D7F] font-mono">Graph Traversal Depth</div>
            </div>

            <div className="p-3 rounded-none bg-[#FFF5F5] border border-[#E8C2BB] flex flex-col justify-between">
              <div className="text-[10px] text-[#6E6264] font-mono">TRAIL REFERENCE</div>
              <div className="text-xs font-mono font-bold text-[#B86B7A] truncate">
                {trailData.trail_id}
              </div>
              <div className="text-[9px] text-[#8A7D7F] font-mono mt-1">
                {new Date(trailData.created_at).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="h-72 flex flex-col items-center justify-center gap-3 text-[#6E6264]">
          <RefreshCw className="w-6 h-6 animate-spin text-[#B86B7A]" />
          <span className="text-xs font-mono">Executing multi-hop graph traversal & velocity extraction...</span>
        </div>
      ) : activeTab === 'graph' ? (
        /* Topology Graph View */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 h-[580px] rounded-none overflow-hidden border border-[#E8C2BB] bg-[#FFF5F5] relative">
            {trailData?.graph ? (
              <CytoscapeGraph
                graphData={trailData.graph}
                selectedNodeId={trailData.target_account}
                onSelectNode={(nodeData) => setInspectedElement({ type: 'node', data: nodeData })}
                onSelectEdge={(edgeData) => setInspectedElement({ type: 'edge', data: edgeData })}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-[#8A7D7F] text-xs">
                No graph trail available
              </div>
            )}
          </div>

          {/* Inspected Element Details Panel */}
          <div className="p-4 rounded-none bg-[#FFFFFF]/75 backdrop-blur-2xl border border-[#E8C2BB] space-y-4 text-xs font-mono">
            <h4 className="text-xs font-bold text-[#4A4A4A] uppercase tracking-wider border-b border-[#E8C2BB] pb-2 flex items-center justify-between">
              <span>ELEMENT INSPECTION</span>
              {inspectedElement && (
                <button
                  onClick={() => setInspectedElement(null)}
                  className="text-[#6E6264] hover:text-[#4A4A4A]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </h4>

            {inspectedElement ? (
              inspectedElement.type === 'node' ? (
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] text-[#6E6264]">ACCOUNT ID:</span>
                    <div className="text-sm font-bold text-[#B86B7A] font-mono">{inspectedElement.data.id}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6E6264]">LABEL / NAME:</span>
                    <div className="text-xs text-white">{inspectedElement.data.customer_name || inspectedElement.data.label}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6E6264]">RISK CLASSIFICATION:</span>
                    <div className="mt-1">
                      <RiskBadge level={inspectedElement.data.risk_level || 'Low'} score={inspectedElement.data.risk_score || 0} />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#E8C2BB]">
                    <button
                      onClick={() => {
                        setStartAccount(inspectedElement.data.id);
                        executeAnalysis({ start_account: inspectedElement.data.id });
                      }}
                      className="w-full py-1.5 bg-electric-600/80 hover:bg-electric-600 text-white rounded text-xs font-semibold transition"
                    >
                      Re-center Trail on Account
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] text-[#6E6264]">TRANSACTION ID:</span>
                    <div className="text-xs font-bold text-[#B86B7A] font-mono">{inspectedElement.data.id || inspectedElement.data.transaction_id}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#6E6264]">FROM:</span>
                      <div className="text-[#4A4A4A] font-mono">{inspectedElement.data.source}</div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-[#8A7D7F]" />
                    <div>
                      <span className="text-[10px] text-[#6E6264]">TO:</span>
                      <div className="text-[#4A4A4A] font-mono">{inspectedElement.data.target}</div>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6E6264]">TRANSFER AMOUNT:</span>
                    <div className="text-base font-bold text-[#6E6264] font-mono">
                      ₹{(inspectedElement.data.amount || inspectedElement.data.weight || 0).toLocaleString()}
                    </div>
                  </div>
                  {inspectedElement.data.timestamp && (
                    <div>
                      <span className="text-[10px] text-[#6E6264]">TIMESTAMP:</span>
                      <div className="text-[#6E6264]">{inspectedElement.data.timestamp}</div>
                    </div>
                  )}
                  {inspectedElement.data.is_suspicious && (
                    <div className="p-2 rounded bg-[#FF3B4E]/15/60 border border-[#FF3B4E]/40 text-[#FF3B4E] text-[10px]">
                      Flagged by baseline rule engine
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="py-8 text-center text-[#8A7D7F] text-xs">
                Click any node or directed edge in the graph canvas to inspect transaction attributes.
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'paths' ? (
        /* Candidate Flow Paths View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#4A4A4A] uppercase tracking-wider font-mono flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#B86B7A]" />
              <span>CANDIDATE DISSEMINATION PATHWAYS ({trailData?.candidate_paths?.length || 0})</span>
            </h3>
            <span className="text-[10px] font-mono text-[#6E6264] italic">
              * Note: Amounts reflect cumulative transfer sums along observed paths, not guaranteed traceable balances.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 font-mono text-xs">
            {(trailData?.candidate_paths || []).map((path, idx) => {
              const isSelected = selectedPathId === path.path_id;
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-none border transition ${
                    isSelected
                      ? 'bg-navy-800 border-[#E2B4BD] shadow-glow-rose'
                      : 'bg-[#FFFFFF] border-[#E8C2BB] hover:border-[#E8C2BB]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8C2BB]/80 pb-2.5">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-electric-950 text-[#B86B7A] border border-[#E2B4BD]">
                        {path.path_id}
                      </span>
                      <span className="text-[#6E6264] text-xs">
                        HOPS: <strong className="text-[#4A4A4A]">{path.hops}</strong>
                      </span>
                      <span className="text-[#6E6264] text-xs">
                        SUPPORTING TRANSACTIONS: <strong className="text-[#4A4A4A]">{path.supporting_transaction_ids.length}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] text-[#6E6264]">{path.value_label}</div>
                        <div className="text-sm font-bold text-[#6E6264]">
                          ₹{path.total_transfer_sum.toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPathId(isSelected ? null : path.path_id);
                          setActiveTab('timeline');
                        }}
                        className="px-3 py-1 bg-[#FFF5F5] hover:bg-electric-600 border border-[#E8C2BB] text-[#4A4A4A] hover:text-[#4A4A4A] rounded text-[11px] transition flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{isSelected ? 'View All Timeline' : 'View In Timeline'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Flow Sequence Nodes */}
                  <div className="py-3 flex flex-wrap items-center gap-2 overflow-x-auto">
                    {path.accounts_sequence.map((acc, aIdx) => (
                      <React.Fragment key={aIdx}>
                        <div className={`px-2.5 py-1 rounded border text-xs font-bold ${
                          aIdx === 0
                            ? 'bg-[#93C5FD]/15/60 text-[#6E6264] border-[#93C5FD]/40'
                            : aIdx === path.accounts_sequence.length - 1
                            ? 'bg-[#FF3B4E]/15/60 text-[#FF3B4E] border-[#FF3B4E]/40'
                            : 'bg-[#FFF5F5] text-[#4A4A4A] border-[#E8C2BB]'
                        }`}>
                          {acc}
                        </div>
                        {aIdx < path.accounts_sequence.length - 1 && (
                          <div className="flex items-center text-slate-600">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Suspicious Indicators */}
                  {path.suspicious_indicators?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E8C2BB]/60 text-[10px]">
                      <span className="text-[#8A7D7F]">FLAGS:</span>
                      {path.suspicious_indicators.map((ind, iIdx) => (
                        <span
                          key={iIdx}
                          className="px-2 py-0.5 rounded bg-[#FF3B4E]/15/50 text-[#FF3B4E] border border-[#FF3B4E]/30 font-semibold"
                        >
                          {ind}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {(!trailData?.candidate_paths || trailData.candidate_paths.length === 0) && (
              <div className="p-10 text-center text-[#8A7D7F] text-xs bg-[#FFFFFF] rounded-none border border-[#E8C2BB]">
                No distinct multi-hop candidate paths detected matching current query filters.
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'patterns' ? (
        /* Detected Suspicious Patterns View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#4A4A4A] uppercase tracking-wider font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#6E6264]" />
              <span>DETECTED SUSPICIOUS PATTERNS & BEHAVIORAL INDICATORS</span>
            </h3>
            <span className="text-[10px] font-mono text-[#6E6264]">
              Correlated against GNN model embeddings & transaction velocity rules
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(trailData?.suspicious_patterns || []).map((pat, idx) => (
              <div
                key={idx}
                className="p-5 rounded-none bg-[#FFFFFF]/75 backdrop-blur-2xl border border-[#E8C2BB] space-y-3 font-mono text-xs hover:border-[#E8C2BB] transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className={`w-4 h-4 ${
                      pat.severity === 'CRITICAL' ? 'text-[#FF3B4E]' : 'text-[#6E6264]'
                    }`} />
                    <span className="font-bold text-[#4A4A4A] text-xs">{pat.title}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    pat.severity === 'CRITICAL'
                      ? 'bg-[#FF3B4E]/15 text-[#FF3B4E] border-[#FF3B4E]/50'
                      : 'bg-[#93C5FD]/15 text-[#6E6264] border-[#93C5FD]/50'
                  }`}>
                    {pat.severity} ({Math.round(pat.confidence * 100)}% CONF.)
                  </span>
                </div>

                <p className="text-[#6E6264] text-xs leading-relaxed font-sans">
                  {pat.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-[#E8C2BB] text-[10px] text-[#6E6264]">
                  <span>SUBJECT: <strong className="text-[#B86B7A]">{pat.account}</strong></span>
                  <span className="text-[#8A7D7F]">TYPE: {pat.pattern}</span>
                </div>
              </div>
            ))}

            {(!trailData?.suspicious_patterns || trailData.suspicious_patterns.length === 0) && (
              <div className="col-span-2 p-10 text-center text-[#8A7D7F] text-xs bg-[#FFFFFF] rounded-none border border-[#E8C2BB]">
                No acute behavioral fraud patterns triggered for this account under current threshold parameters.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Chronological Timeline View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#B86B7A]" />
              <h3 className="text-xs font-bold text-[#4A4A4A] uppercase tracking-wider font-mono">
                CHRONOLOGICAL TRANSACTION DISSEMINATION TIMELINE
              </h3>
            </div>
            {selectedPath && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-[#B86B7A] bg-electric-950/80 px-2 py-0.5 rounded border border-[#E2B4BD]">
                  Filtered by {selectedPath.path_id}
                </span>
                <button
                  onClick={() => setSelectedPathId(null)}
                  className="text-[#6E6264] hover:text-[#4A4A4A] text-xs font-mono underline"
                >
                  Show All
                </button>
              </div>
            )}
          </div>

          <div className="p-4 rounded-none bg-[#FFFFFF]/75 backdrop-blur-2xl border border-[#E8C2BB] space-y-3 font-mono text-xs">
            {filteredTimeline.map((step, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-none bg-[#FFF5F5] border border-[#E8C2BB]/90 hover:border-[#E8C2BB] transition space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between text-[11px] gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#6E6264] font-bold">EVENT #{idx + 1}</span>
                    <span className="px-2 py-0.2 rounded text-[10px] bg-navy-800 text-[#B86B7A] border border-[#E8C2BB] font-semibold">
                      {step.elapsed_time}
                    </span>
                    <span className="text-[#8A7D7F]">{new Date(step.timestamp).toLocaleString()}</span>
                  </div>

                  <span className="text-[#6E6264] text-[10px]">
                    TYPE: <strong className="text-[#4A4A4A]">{step.transaction_type}</strong>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-bold pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setStartAccount(step.sender);
                        executeAnalysis({ start_account: step.sender });
                      }}
                      className="text-[#6E6264] hover:text-[#B86B7A] hover:underline"
                    >
                      {step.sender}
                    </button>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                    <button
                      onClick={() => {
                        setStartAccount(step.receiver);
                        executeAnalysis({ start_account: step.receiver });
                      }}
                      className="text-[#6E6264] hover:text-[#B86B7A] hover:underline"
                    >
                      {step.receiver}
                    </button>
                  </div>

                  <span className="text-[#6E6264] font-bold text-sm">
                    ₹{step.amount.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#8A7D7F] pt-1 border-t border-[#E8C2BB]">
                  <span>TXN ID: <strong className="font-mono text-[#6E6264]">{step.transaction_id}</strong></span>
                  {step.is_suspicious && (
                    <span className="text-[#FF3B4E] font-bold bg-[#FF3B4E]/15/70 px-1.5 py-0.5 rounded border border-[#FF3B4E]/40">
                      FLAGGED HIGH-VELOCITY
                    </span>
                  )}
                </div>
              </div>
            ))}

            {filteredTimeline.length === 0 && (
              <div className="p-8 text-center text-[#8A7D7F] text-xs">
                No chronological transfers found matching the active criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Trail to Case Modal */}
      {isCaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E8C2BB] rounded-none p-5 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#E8C2BB] pb-3">
              <h3 className="text-sm font-bold text-[#4A4A4A] flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#B86B7A]" />
                <span>ATTACH MONEY TRAIL TO CASE</span>
              </h3>
              <button
                onClick={() => setIsCaseModalOpen(false)}
                className="text-[#6E6264] hover:text-[#4A4A4A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {saveSuccessMsg ? (
              <div className="p-4 rounded-none bg-[#93C5FD]/15/60 border border-[#93C5FD] text-[#6E6264] text-center font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#6E6264]" />
                <span>{saveSuccessMsg}</span>
              </div>
            ) : (
              <div className="space-y-3 font-sans">
                <div>
                  <label className="block text-xs font-mono text-[#6E6264] mb-1">
                    SELECT EXISTING CASE:
                  </label>
                  <select
                    value={selectedCaseId}
                    onChange={(e) => setSelectedCaseId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white font-mono text-xs focus:outline-none focus:border-[#E2B4BD]"
                  >
                    <option value="">-- Or Create New Case Below --</option>
                    {existingCases.map((c) => (
                      <option key={c.case_id} value={c.case_id}>
                        {c.case_id} - {c.title} ({c.status})
                      </option>
                    ))}
                  </select>
                </div>

                {!selectedCaseId && (
                  <div>
                    <label className="block text-xs font-mono text-[#6E6264] mb-1">
                      NEW CASE TITLE:
                    </label>
                    <input
                      type="text"
                      value={newCaseTitle}
                      onChange={(e) => setNewCaseTitle(e.target.value)}
                      placeholder={`Investigation on Trail ${trailData?.trail_id}`}
                      className="w-full px-3 py-2 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white font-mono text-xs focus:outline-none focus:border-[#E2B4BD]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-mono text-[#6E6264] mb-1">
                    INVESTIGATION NOTES:
                  </label>
                  <textarea
                    rows={3}
                    value={caseNotes}
                    onChange={(e) => setCaseNotes(e.target.value)}
                    placeholder="Enter investigator observations regarding pass-through transit speeds and smurfing indicators..."
                    className="w-full px-3 py-2 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white font-sans text-xs focus:outline-none focus:border-[#E2B4BD]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8C2BB]">
                  <button
                    onClick={() => setIsCaseModalOpen(false)}
                    className="px-3 py-1.5 bg-[#FFF5F5] hover:bg-[#FFFFFF] text-[#6E6264] font-mono text-xs rounded-none transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveToCase}
                    disabled={savingCase}
                    className="px-4 py-1.5 bg-electric-600 hover:bg-[#B86B7A] disabled:opacity-50 text-white font-mono text-xs font-bold rounded-none shadow-glow-rose transition flex items-center gap-1.5"
                  >
                    {savingCase ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Briefcase className="w-3.5 h-3.5" />}
                    <span>Confirm Evidence Link</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-[#FFFFFF] border border-[#E8C2BB] rounded-none p-5 space-y-4 shadow-2xl font-mono text-xs max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E8C2BB] pb-3 shrink-0">
              <h3 className="text-sm font-bold text-[#4A4A4A] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#6E6264]" />
                <span>MONEY TRAIL FORENSIC DOSSIER</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadReportJson}
                  className="px-2.5 py-1 bg-[#93C5FD]/15 hover:bg-emerald-900 border border-[#93C5FD]/50 text-[#6E6264] rounded text-xs transition flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Download JSON</span>
                </button>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="text-[#6E6264] hover:text-[#4A4A4A]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {loadingReport ? (
                <div className="py-12 text-center text-[#6E6264] flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#B86B7A]" />
                  <span>Synthesizing multi-hop forensic report...</span>
                </div>
              ) : reportData ? (
                <div className="space-y-4 font-sans text-[#6E6264]">
                  <div className="p-3 rounded-none bg-[#FFF5F5] border border-[#E8C2BB] font-mono text-[11px] space-y-1">
                    <div className="text-[#4A4A4A] font-bold">{reportData.report_title}</div>
                    <div className="text-[#8A7D7F]">TRAIL ID: {reportData.trail_id} | GENERATED: {reportData.generated_at}</div>
                    <div className="text-[#6E6264] text-[10px]">{reportData.legal_disclaimer}</div>
                  </div>

                  <div className="space-y-1 font-mono text-xs">
                    <div className="font-bold text-[#4A4A4A] uppercase text-[11px]">SUBJECT SUMMARY:</div>
                    <div className="p-3 rounded bg-[#FFF5F5] border border-[#E8C2BB] space-y-1 text-[#6E6264]">
                      <div>Target Account: <strong className="text-[#B86B7A]">{reportData.target_account}</strong></div>
                      <div>Total Inbound: <strong className="text-[#6E6264]">₹{(reportData.total_inbound_volume || 0).toLocaleString()}</strong></div>
                      <div>Total Outbound: <strong className="text-[#FF3B4E]">₹{(reportData.total_outbound_volume || 0).toLocaleString()}</strong></div>
                      <div>Transit Turnover: <strong className="text-[#B86B7A]">{((reportData.turnover_ratio || 0) * 100).toFixed(1)}%</strong></div>
                    </div>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    <div className="font-bold text-[#4A4A4A] uppercase text-[11px]">IDENTIFIED SUSPICIOUS PATTERNS:</div>
                    {(reportData.suspicious_patterns || []).map((p, idx) => (
                      <div key={idx} className="p-2.5 rounded bg-[#FFF5F5] border border-[#E8C2BB] space-y-1">
                        <div className="text-[#FF3B4E] font-bold">{p.title} ({p.severity})</div>
                        <div className="text-[#6E6264] text-[11px] font-sans">{p.description}</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    <div className="font-bold text-[#4A4A4A] uppercase text-[11px]">CANDIDATE DISSEMINATION PATHS:</div>
                    {(reportData.candidate_paths || []).map((cp, idx) => (
                      <div key={idx} className="p-2.5 rounded bg-[#FFF5F5] border border-[#E8C2BB] space-y-1">
                        <div className="flex items-center justify-between text-white font-bold">
                          <span>{cp.path_id} ({cp.hops} Hops)</span>
                          <span className="text-[#6E6264]">₹{cp.total_transfer_sum.toLocaleString()}</span>
                        </div>
                        <div className="text-[#6E6264] text-[10px]">{cp.accounts_sequence.join(' ➔ ')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
