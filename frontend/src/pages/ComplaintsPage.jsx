import React, { useEffect, useState } from 'react';
import {
  FileWarning,
  Search,
  Plus,
  Link as LinkIcon,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  X,
  ShieldAlert,
  Building,
  RefreshCw,
  Network,
  Download,
  FileText,
  ChevronRight,
  Layers,
  ExternalLink,
  ShieldCheck,
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import CytoscapeGraph from '../components/CytoscapeGraph';
import RiskBadge from '../components/RiskBadge';

export default function ComplaintsPage({
  setCurrentPage,
  onAccountSelect,
  onOpenCreateCase,
  refreshTrigger
}) {
  const [complaints, setComplaints] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal / Drawer State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [activeCorrelationComplaint, setActiveCorrelationComplaint] = useState(null);
  const [correlationData, setCorrelationData] = useState(null);
  const [correlationGraph, setCorrelationGraph] = useState(null);
  const [correlatingId, setCorrelatingId] = useState(null);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [dossierReport, setDossierReport] = useState(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  // Link Case Modal inside correlation
  const [isLinkCaseOpen, setIsLinkCaseOpen] = useState(false);
  const [existingCases, setExistingCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [linkNotes, setLinkNotes] = useState('');
  const [linkingCase, setLinkingCase] = useState(false);

  // New Complaint Form State
  const [newId, setNewId] = useState(`CMP-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [complainant, setComplainant] = useState('');
  const [accId, setAccId] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Cyber Fraud');
  const [desc, setDesc] = useState('');
  const [source, setSource] = useState('National Cyber Crime Reporting Portal (1930)');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSummaryAndComplaints = async () => {
    setLoading(true);
    try {
      const [sumRes, compRes] = await Promise.all([
        api.getComplaintsSummary().catch(() => null),
        api.getComplaints({
          search: search || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
          limit: 100
        })
      ]);
      setSummary(sumRes);
      setComplaints(Array.isArray(compRes) ? compRes : (compRes?.complaints || []));
    } catch (err) {
      console.error("Error loading complaints:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryAndComplaints();
  }, [search, statusFilter, categoryFilter, refreshTrigger]);

  const handleCreateComplaint = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createComplaint({
        complaint_id: newId,
        date_reported: new Date().toISOString(),
        complainant_name: complainant,
        reported_account_id: accId.trim().toUpperCase(),
        amount_lost: parseFloat(amount) || 0,
        description: desc,
        status: "New",
        source: source,
        category: category,
        assigned_to: "Unassigned"
      });
      setIsNewModalOpen(false);
      setComplainant('');
      setAccId('');
      setAmount('');
      setDesc('');
      setNewId(`CMP-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      fetchSummaryAndComplaints();
    } catch (err) {
      alert("Failed to record complaint: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunCorrelation = async (complaint) => {
    setCorrelatingId(complaint.complaint_id);
    setActiveCorrelationComplaint(complaint);
    try {
      const [corrRes, graphRes] = await Promise.all([
        api.correlateComplaint(complaint.complaint_id, {}),
        api.getComplaintGraph(complaint.complaint_id).catch(() => null)
      ]);
      setCorrelationData(corrRes.correlation || corrRes);
      setCorrelationGraph(graphRes);
      // Refresh list to update status badge
      fetchSummaryAndComplaints();
    } catch (err) {
      alert("Correlation analysis failed: " + err.message);
    } finally {
      setCorrelatingId(null);
    }
  };

  const handleViewExistingCorrelation = async (complaint) => {
    setActiveCorrelationComplaint(complaint);
    setCorrelatingId(complaint.complaint_id);
    try {
      const [corrRes, graphRes] = await Promise.all([
        api.getComplaintCorrelations(complaint.complaint_id),
        api.getComplaintGraph(complaint.complaint_id).catch(() => null)
      ]);
      setCorrelationData(corrRes.correlation || corrRes);
      setCorrelationGraph(graphRes);
    } catch (err) {
      alert("Failed to fetch correlation details: " + err.message);
    } finally {
      setCorrelatingId(null);
    }
  };

  const handleOpenLinkCase = async () => {
    setIsLinkCaseOpen(true);
    try {
      const cases = await api.getCases({ limit: 50 });
      setExistingCases(Array.isArray(cases) ? cases : []);
      if (cases && cases.length > 0) {
        setSelectedCaseId(cases[0].case_id);
      }
    } catch (err) {
      console.warn("Could not load cases:", err);
    }
  };

  const handleConfirmLinkCase = async () => {
    if (!activeCorrelationComplaint || !selectedCaseId) return;
    setLinkingCase(true);
    try {
      await api.linkComplaintToCase(activeCorrelationComplaint.complaint_id, {
        case_id: selectedCaseId,
        notes: linkNotes || `Linked from complaint ${activeCorrelationComplaint.complaint_id}`
      });
      alert(`Complaint ${activeCorrelationComplaint.complaint_id} linked to case ${selectedCaseId}!`);
      setIsLinkCaseOpen(false);
      fetchSummaryAndComplaints();
    } catch (err) {
      alert("Failed to link case: " + err.message);
    } finally {
      setLinkingCase(false);
    }
  };

  const handleCreateCaseFromComplaint = async (complaint) => {
    const targetComp = complaint || activeCorrelationComplaint;
    if (!targetComp) return;
    try {
      const res = await api.createCaseFromComplaint(targetComp.complaint_id, {
        title: `Syndicate Probe: ${targetComp.complaint_id} (${targetComp.reported_account_id})`,
        priority: "High",
        description: `Initiated from victim report: ${targetComp.description}`
      });
      alert(`Case ${res.case_id} spawned successfully!`);
      fetchSummaryAndComplaints();
    } catch (err) {
      alert("Failed to create case: " + err.message);
    }
  };

  const handleOpenDossier = async (complaint) => {
    const c = complaint || activeCorrelationComplaint;
    if (!c) return;
    setIsDossierModalOpen(true);
    setLoadingDossier(true);
    try {
      const rep = await api.getComplaintReport(c.complaint_id);
      setDossierReport(rep);
    } catch (err) {
      alert("Failed to fetch complaint dossier: " + err.message);
    } finally {
      setLoadingDossier(false);
    }
  };

  const handleDownloadDossierJson = () => {
    if (!dossierReport) return;
    const blob = new Blob([JSON.stringify(dossierReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `COMPLAINT_DOSSIER_${dossierReport.complaint_id || 'EXPORT'}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-amber-400" />
            <span>Step 7: Cybercrime Complaint Cross-Correlation Engine</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Correlate victim fraud complaints from national portals and police FIRs with flagged banking mule accounts.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-electric-600 hover:bg-electric-500 text-white font-bold text-xs shadow-glow-electric transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Complaint</span>
        </button>
      </div>

      {/* Summary Statistics Bar */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-navy-900 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Total Complaints</div>
            <div className="text-xl font-bold text-white mt-1">{summary.total_complaints}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">National FIR intake</div>
          </div>

          <div className="p-3.5 rounded-xl bg-navy-900 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Correlated Entities</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{summary.correlated_complaints || 0}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Mule matches identified</div>
          </div>

          <div className="p-3.5 rounded-xl bg-navy-900 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Linked to Active Cases</div>
            <div className="text-xl font-bold text-electric-400 mt-1">{summary.linked_to_investigation}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Formal probe underway</div>
          </div>

          <div className="p-3.5 rounded-xl bg-navy-900 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">New Unlinked Intake</div>
            <div className="text-xl font-bold text-amber-400 mt-1">{summary.new_complaints}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Awaiting correlation</div>
          </div>

          <div className="p-3.5 rounded-xl bg-navy-900 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Total Loss Claimed</div>
            <div className="text-xl font-bold text-rose-400 mt-1">₹{(summary.total_confirmed_loss_inr || 0).toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Cumulative reported sum</div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Complaint ID, Complainant, Reported Account, or Narrative..."
            className="w-full pl-9 pr-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-electric-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">STATUS:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-navy-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-electric-400"
            >
              <option value="ALL">All Statuses</option>
              <option value="New">New Intake</option>
              <option value="CORRELATED">Correlated</option>
              <option value="Linked">Linked to Case</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">CATEGORY:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-navy-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-electric-400"
            >
              <option value="ALL">All Fraud Types</option>
              <option value="Cyber Fraud">Cyber Fraud</option>
              <option value="KYC Phishing Fraud">KYC Phishing</option>
              <option value="Part-Time Task Scam">Task Scam</option>
              <option value="Business Email Compromise">BEC Compromise</option>
              <option value="Digital Arrest Scam">Digital Arrest</option>
              <option value="Utility Phishing Scam">Utility Phishing</option>
            </select>
          </div>
        </div>
      </div>

      {/* Complaints Grid */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-electric-400" />
          <span className="text-xs font-mono">Loading cybercrime complaint records...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {complaints.map((c) => {
            const hasCorrelation = c.correlation_data_json && c.correlation_data_json !== '{}';
            const isCorrelating = correlatingId === c.complaint_id;

            return (
              <div
                key={c.complaint_id}
                className="p-5 rounded-xl bg-navy-900 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40 text-[11px]">
                      {c.complaint_id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                        c.status === 'Linked'
                          ? 'bg-electric-950 text-electric-300 border-electric-500/40'
                          : c.status === 'CORRELATED'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                          : 'bg-navy-950 text-slate-400 border-slate-800'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Victim Complainant</div>
                    <div className="text-sm font-bold text-white">{c.complainant_name}</div>
                    <div className="text-xs text-rose-400 font-mono font-semibold mt-0.5">
                      Claimed Loss: ₹{(c.amount_lost || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-navy-950 border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed italic">
                    "{c.description}"
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] text-slate-500 font-mono">REPORTED BENEFICIARY MULE:</div>
                    <button
                      onClick={() => {
                        if (onAccountSelect) onAccountSelect(c.reported_account_id);
                        setCurrentPage("mule-detection");
                      }}
                      className="font-mono text-xs font-bold text-electric-300 hover:text-electric-200 flex items-center gap-1.5"
                    >
                      <LinkIcon className="w-3.5 h-3.5 text-electric-400" />
                      <span>{c.reported_account_id}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>Category: <strong className="text-slate-300 font-sans">{c.category || 'Cyber Fraud'}</strong></span>
                    <span>{new Date(c.date_reported).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => handleRunCorrelation(c)}
                    disabled={isCorrelating}
                    className="flex-1 py-1.5 px-2 rounded bg-electric-600/30 hover:bg-electric-600/50 text-electric-300 border border-electric-500/40 text-[11px] font-bold font-mono transition flex items-center justify-center gap-1"
                  >
                    {isCorrelating ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Network className="w-3 h-3" />
                    )}
                    <span>{isCorrelating ? 'Correlating...' : 'Correlate with Network'}</span>
                  </button>

                  {hasCorrelation && (
                    <button
                      onClick={() => handleViewExistingCorrelation(c)}
                      className="py-1.5 px-2 rounded bg-navy-850 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold transition"
                    >
                      View Findings
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (onAccountSelect) onAccountSelect(c.reported_account_id);
                      setCurrentPage("money-trail");
                    }}
                    className="py-1.5 px-2 rounded bg-navy-850 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-semibold transition"
                  >
                    Trace Flow
                  </button>
                </div>
              </div>
            );
          })}

          {complaints.length === 0 && (
            <div className="col-span-3 p-12 text-center text-slate-500 text-xs bg-navy-900 rounded-xl border border-slate-800 font-mono">
              No complaint records found matching the active filters.
            </div>
          )}
        </div>
      )}

      {/* Correlation Results Modal / Side Drawer */}
      {activeCorrelationComplaint && correlationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-4xl bg-navy-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 bg-navy-850 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <Network className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <span>COMPLAINT CORRELATION: {activeCorrelationComplaint.complaint_id}</span>
                    <span className="text-slate-400 font-normal">➔ {activeCorrelationComplaint.reported_account_id}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Multi-evidence cross-matching across core banking, 1-2 hop mule graph, and prior police reports.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenDossier(activeCorrelationComplaint)}
                  className="px-2.5 py-1 bg-navy-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded transition flex items-center gap-1 font-mono"
                >
                  <FileText className="w-3 h-3 text-emerald-400" />
                  <span>Dossier</span>
                </button>
                <button
                  onClick={() => {
                    setActiveCorrelationComplaint(null);
                    setCorrelationData(null);
                    setCorrelationGraph(null);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 font-mono text-xs">
              {/* Score Banner */}
              <div className="p-4 rounded-xl bg-navy-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">HEURISTIC CONFIDENCE SCORE</span>
                    <div className="text-2xl font-bold text-emerald-400 mt-0.5">
                      {correlationData.heuristic_confidence_score?.toFixed(1) || '0.0'}%
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase">CORRELATION STATUS</span>
                    <div className="text-xs font-bold text-electric-300 mt-0.5">
                      {correlationData.status || 'CORRELATED'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {correlationData.total_related_transactions || 0} Connected Transactions
                    </div>
                  </div>
                </div>

                {/* Progress Meter */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${correlationData.heuristic_confidence_score || 0}%` }}
                  />
                </div>

                <div className="text-[10px] text-slate-400 font-sans italic pt-1">
                  * {correlationData.score_disclaimer || "Heuristic correlation score reflects aggregated evidence signals and is not conclusive proof of guilt."}
                </div>
              </div>

              {/* Categorized Findings */}
              <div className="space-y-3 font-sans">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>CATEGORIZED EVIDENCE FINDINGS</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Direct Account Match */}
                  <div className="p-3.5 rounded-lg bg-navy-950 border border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-mono font-bold text-slate-400 uppercase flex items-center justify-between">
                      <span>1. Core Banking Account Match</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] ${
                        correlationData.matched_categories?.direct_account_match?.matched
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {correlationData.matched_categories?.direct_account_match?.matched ? 'MATCHED' : 'UNMATCHED'}
                      </span>
                    </div>
                    {correlationData.matched_categories?.direct_account_match?.matched ? (
                      <div className="text-xs text-slate-200 space-y-0.5 font-mono">
                        <div>Account: <strong className="text-electric-300">{correlationData.matched_categories.direct_account_match.account_id}</strong></div>
                        <div className="text-slate-400 text-[11px] font-sans">
                          Entity: {correlationData.matched_categories.direct_account_match.customer_name}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic">No exact account match found.</div>
                    )}
                  </div>

                  {/* Recidivism / Shared Complaints */}
                  <div className="p-3.5 rounded-lg bg-navy-950 border border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-mono font-bold text-slate-400 uppercase flex items-center justify-between">
                      <span>2. Recidivism & Shared Complaints</span>
                      <span className="text-rose-400 font-mono font-bold">
                        {correlationData.matched_categories?.shared_complaints?.count || 0} Other Reports
                      </span>
                    </div>
                    {(correlationData.matched_categories?.shared_complaints?.complaints || []).map((sc, i) => (
                      <div key={i} className="text-[11px] text-slate-300 border-t border-slate-800/80 pt-1 font-sans">
                        <strong className="font-mono text-amber-300">{sc.complaint_id}</strong> by {sc.complainant_name}: "{sc.description}"
                      </div>
                    ))}
                    {(!correlationData.matched_categories?.shared_complaints?.complaints || correlationData.matched_categories.shared_complaints.complaints.length === 0) && (
                      <div className="text-xs text-slate-500 italic">First reported complaint on this entity.</div>
                    )}
                  </div>

                  {/* Graph-Connected High-Risk Mules */}
                  <div className="p-3.5 rounded-lg bg-navy-950 border border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-mono font-bold text-slate-400 uppercase flex items-center justify-between">
                      <span>3. Graph-Connected Mules (1-2 Hops)</span>
                      <span className="text-amber-400 font-mono font-bold">
                        {correlationData.matched_categories?.graph_connected_mules?.count || 0} Connected
                      </span>
                    </div>
                    {(correlationData.matched_categories?.graph_connected_mules?.mules || []).map((m, i) => (
                      <div key={i} className="text-[11px] text-slate-300 border-t border-slate-800/80 pt-1 font-mono">
                        <span className="text-rose-400 font-bold">{m.account_id}</span> ({m.connection_type}) - Risk: {m.risk_score} (Turnover: {((m.turnover_ratio || 0) * 100).toFixed(1)}%)
                      </div>
                    ))}
                    {(!correlationData.matched_categories?.graph_connected_mules?.mules || correlationData.matched_categories.graph_connected_mules.mules.length === 0) && (
                      <div className="text-xs text-slate-500 italic">No flagged mule accounts directly connected within 2 hops.</div>
                    )}
                  </div>

                  {/* Active Investigation Cases */}
                  <div className="p-3.5 rounded-lg bg-navy-950 border border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-mono font-bold text-slate-400 uppercase flex items-center justify-between">
                      <span>4. Active Investigation Cases</span>
                      <span className="text-electric-400 font-mono font-bold">
                        {correlationData.matched_categories?.existing_cases?.count || 0} Open
                      </span>
                    </div>
                    {(correlationData.matched_categories?.existing_cases?.cases || []).map((cs, i) => (
                      <div key={i} className="text-[11px] text-slate-300 border-t border-slate-800/80 pt-1 font-mono">
                        <strong className="text-electric-300">{cs.case_id}</strong>: {cs.title} ({cs.status})
                      </div>
                    ))}
                    {(!correlationData.matched_categories?.existing_cases?.cases || correlationData.matched_categories.existing_cases.cases.length === 0) && (
                      <div className="text-xs text-slate-500 italic">No existing cases active on this entity.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Explanations List */}
              {correlationData.explanations?.length > 0 && (
                <div className="space-y-2 font-mono text-xs">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    EVIDENCE EXPLANATION NARRATIVE:
                  </h4>
                  <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 space-y-1.5 font-sans text-xs">
                    {correlationData.explanations.map((exp, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-slate-300">
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{exp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correlation Graph Topology */}
              {correlationGraph && correlationGraph.elements?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <Network className="w-4 h-4 text-electric-400" />
                    <span>COMPLAINT RELATIONSHIP GRAPH TOPOLOGY</span>
                  </h4>
                  <div className="h-[280px] rounded-xl overflow-hidden border border-slate-800 bg-navy-950">
                    <CytoscapeGraph
                      graphData={correlationGraph}
                      selectedNodeId={activeCorrelationComplaint.complaint_id}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-navy-850 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 font-mono text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenLinkCase}
                  className="px-3 py-1.5 bg-navy-950 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition flex items-center gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5 text-electric-400" />
                  <span>Link to Existing Case</span>
                </button>

                <button
                  onClick={() => handleCreateCaseFromComplaint(activeCorrelationComplaint)}
                  className="px-3.5 py-1.5 bg-electric-600 hover:bg-electric-500 text-white font-bold rounded-lg shadow-glow-electric transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Case</span>
                </button>
              </div>

              <button
                onClick={() => handleOpenDossier(activeCorrelationComplaint)}
                className="px-3.5 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 rounded-lg transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Official Dossier</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link to Existing Case Modal */}
      {isLinkCaseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-navy-900 border border-slate-700 rounded-xl p-5 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-electric-400" />
                <span>LINK COMPLAINT TO CASE</span>
              </h3>
              <button
                onClick={() => setIsLinkCaseOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-sans">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  SELECT TARGET CASE:
                </label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-electric-400"
                >
                  {existingCases.map((c) => (
                    <option key={c.case_id} value={c.case_id}>
                      {c.case_id} - {c.title} ({c.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  CORRELATION NOTES:
                </label>
                <textarea
                  rows={3}
                  value={linkNotes}
                  onChange={(e) => setLinkNotes(e.target.value)}
                  placeholder="Note evidentiary grounds linking this FIR to the open case..."
                  className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white font-sans text-xs focus:outline-none focus:border-electric-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setIsLinkCaseOpen(false)}
                  className="px-3 py-1.5 bg-navy-950 hover:bg-slate-800 text-slate-300 font-mono text-xs rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmLinkCase}
                  disabled={linkingCase}
                  className="px-4 py-1.5 bg-electric-600 hover:bg-electric-500 disabled:opacity-50 text-white font-mono text-xs font-bold rounded-lg shadow-glow-electric transition flex items-center gap-1.5"
                >
                  {linkingCase ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Briefcase className="w-3.5 h-3.5" />}
                  <span>Confirm Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dossier Report Modal */}
      {isDossierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-navy-900 border border-slate-700 rounded-xl p-5 space-y-4 shadow-2xl font-mono text-xs max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>OFFICIAL COMPLAINT FORENSIC DOSSIER</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadDossierJson}
                  className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 rounded text-xs transition flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Download JSON</span>
                </button>
                <button
                  onClick={() => setIsDossierModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {loadingDossier ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-electric-400" />
                  <span>Synthesizing official complaint dossier...</span>
                </div>
              ) : dossierReport ? (
                <div className="space-y-4 font-sans text-slate-300">
                  <div className="p-3.5 rounded-lg bg-navy-950 border border-slate-800 font-mono text-[11px] space-y-1">
                    <div className="text-white font-bold">{dossierReport.report_title}</div>
                    <div className="text-slate-500">
                      ID: {dossierReport.complaint_id} | AUTHORITY: {dossierReport.investigating_authority}
                    </div>
                    <div className="text-amber-400 text-[10px]">
                      {dossierReport.legal_disclaimer}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                    <div className="p-3 rounded bg-navy-950 border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-500 uppercase">Complainant</div>
                      <div className="text-white font-bold">{dossierReport.complainant}</div>
                      <div className="text-rose-400">Claimed Loss: ₹{(dossierReport.amount_lost || 0).toLocaleString()}</div>
                    </div>

                    <div className="p-3 rounded bg-navy-950 border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-500 uppercase">Subject Entity</div>
                      <div className="text-electric-300 font-bold">{dossierReport.reported_account}</div>
                      <div className="text-slate-400">Category: {dossierReport.category}</div>
                    </div>
                  </div>

                  {dossierReport.correlation_evidence?.explanations?.length > 0 && (
                    <div className="space-y-2 font-mono text-xs">
                      <div className="font-bold text-white uppercase text-[11px]">CORRELATION FINDINGS:</div>
                      <div className="p-3 rounded bg-navy-950 border border-slate-800 space-y-1.5 font-sans text-xs">
                        {dossierReport.correlation_evidence.explanations.map((exp, i) => (
                          <div key={i} className="flex items-start gap-2 text-slate-300">
                            <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{exp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* New Complaint Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-navy-900 border border-slate-700 rounded-xl shadow-glass overflow-hidden flex flex-col">
            <div className="p-4 bg-navy-850 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white tracking-wide">Register Cybercrime Complaint</h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="p-5 space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 font-mono text-[11px]">Complaint ID / FIR</label>
                  <input
                    type="text"
                    required
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-electric-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 font-mono text-[11px]">Complainant Full Name</label>
                  <input
                    type="text"
                    required
                    value={complainant}
                    onChange={(e) => setComplainant(e.target.value)}
                    placeholder="e.g. Ramesh K. Patel"
                    className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-electric-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 font-mono text-[11px]">Reported Mule Account</label>
                  <input
                    type="text"
                    required
                    value={accId}
                    onChange={(e) => setAccId(e.target.value)}
                    placeholder="e.g. MULE_AGG_01"
                    className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-electric-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 font-mono text-[11px]">Claimed Loss (INR ₹)</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 75000"
                    className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-electric-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 font-mono text-[11px]">Fraud Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-electric-400"
                  >
                    <option value="Cyber Fraud">Cyber Fraud</option>
                    <option value="KYC Phishing Fraud">KYC Phishing Fraud</option>
                    <option value="Part-Time Task Scam">Part-Time Task Scam</option>
                    <option value="Business Email Compromise">Business Email Compromise</option>
                    <option value="Digital Arrest Scam">Digital Arrest Scam</option>
                    <option value="Utility Phishing Scam">Utility Phishing Scam</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 font-mono text-[11px]">Reporting Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-electric-400"
                  >
                    <option value="National Cyber Crime Reporting Portal (1930)">National Portal (1930)</option>
                    <option value="State Police Cyber Cell FIR">Police Cyber Cell FIR</option>
                    <option value="Bank Customer Grievance Desk">Bank Grievance Desk</option>
                    <option value="Corporate Anti-Fraud Desk">Corporate Fraud Desk</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 font-mono text-[11px]">Incident Description & Modus Operandi</label>
                <textarea
                  rows={3}
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Detail phishing pretext, digital arrest claim, or fraudulent task scheme..."
                  className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-electric-400 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-800 font-mono">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-medium rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-electric-600 hover:bg-electric-500 text-white font-bold rounded-lg shadow-glow-electric disabled:opacity-50 text-xs"
                >
                  {isSubmitting ? "Recording..." : "Save Complaint Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
