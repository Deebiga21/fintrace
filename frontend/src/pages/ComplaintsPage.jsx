import React, { useEffect, useState } from 'react';
import {
  FileWarning,
  Search,
  Plus,
  Link as LinkIcon,
  Briefcase,
  X,
  ShieldAlert,
  RefreshCw,
  Network,
  Download,
  FileText,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import CytoscapeGraph from '../components/CytoscapeGraph';

const generateComplaintId = () => `CMP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

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
  const [newId, setNewId] = useState(generateComplaintId);
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
          <h2 className="text-xl font-bold text-[#4A4A4A] tracking-wide flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-[#6E6264]" />
            <span>Step 7: Cybercrime Complaint Cross-Correlation Engine</span>
          </h2>
          <p className="text-xs text-[#6E6264] mt-1">
            Correlate victim fraud complaints from national portals and police FIRs with flagged banking mule accounts.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="px-4 py-2 rounded-none bg-electric-600 hover:bg-[#B86B7A] text-white font-bold text-xs shadow-glow-rose transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Complaint</span>
        </button>
      </div>

      {/* Summary Statistics Bar */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-none bg-[#FFFFFF]/75 backdrop-blur-2xl border border-[#E8C2BB]">
            <div className="text-[10px] text-[#6E6264] uppercase">Total Complaints</div>
            <div className="text-xl font-bold text-[#4A4A4A] mt-1">{summary.total_complaints}</div>
            <div className="text-[10px] text-[#8A7D7F] mt-0.5">National FIR intake</div>
          </div>

          <div className="p-3.5 rounded-none bg-[#FFFFFF]/75 backdrop-blur-2xl border border-[#E8C2BB]">
            <div className="text-[10px] text-[#6E6264] uppercase">Correlated Entities</div>
            <div className="text-xl font-bold text-[#6E6264] mt-1">{summary.correlated_complaints || 0}</div>
            <div className="text-[10px] text-[#8A7D7F] mt-0.5">Mule matches identified</div>
          </div>

          <div className="p-3.5 rounded-none bg-[#FFFFFF]/75 backdrop-blur-2xl border border-[#E8C2BB]">
            <div className="text-[10px] text-[#6E6264] uppercase">Linked to Active Cases</div>
            <div className="text-xl font-bold text-[#B86B7A] mt-1">{summary.linked_to_investigation}</div>
            <div className="text-[10px] text-[#8A7D7F] mt-0.5">Formal probe underway</div>
          </div>

          <div className="p-3.5 rounded-none bg-[#FFFFFF]/75 backdrop-blur-2xl border border-[#E8C2BB]">
            <div className="text-[10px] text-[#6E6264] uppercase">New Unlinked Intake</div>
            <div className="text-xl font-bold text-[#6E6264] mt-1">{summary.new_complaints}</div>
            <div className="text-[10px] text-[#8A7D7F] mt-0.5">Awaiting correlation</div>
          </div>

          <div className="p-3.5 rounded-none bg-[#FFFFFF]/75 backdrop-blur-2xl border border-[#E8C2BB]">
            <div className="text-[10px] text-[#6E6264] uppercase">Total Loss Claimed</div>
            <div className="text-xl font-bold text-[#FF3B4E] mt-1">₹{(summary.total_confirmed_loss_inr || 0).toLocaleString()}</div>
            <div className="text-[10px] text-[#8A7D7F] mt-0.5">Cumulative reported sum</div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-none bg-[#FFFFFF]/75 backdrop-blur-2xl border border-[#E8C2BB] flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6264]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Complaint ID, Complainant, Reported Account, or Narrative..."
            className="w-full pl-9 pr-3 py-2 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white font-mono text-xs focus:outline-none focus:border-[#E2B4BD]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[#6E6264] text-[11px]">STATUS:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white text-xs focus:outline-none focus:border-[#E2B4BD]"
            >
              <option value="ALL">All Statuses</option>
              <option value="New">New Intake</option>
              <option value="CORRELATED">Correlated</option>
              <option value="Linked">Linked to Case</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#6E6264] text-[11px]">CATEGORY:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white text-xs focus:outline-none focus:border-[#E2B4BD]"
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
        <div className="h-64 flex flex-col items-center justify-center gap-3 text-[#6E6264]">
          <RefreshCw className="w-6 h-6 animate-spin text-[#B86B7A]" />
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
                className="p-5 rounded-none bg-[#FFFFFF]/75 backdrop-blur-2xl border border-[#E8C2BB] hover:border-[#E8C2BB] transition flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#6E6264] bg-[#93C5FD]/15/60 px-2 py-0.5 rounded border border-[#93C5FD]/40 text-[11px]">
                      {c.complaint_id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                        c.status === 'Linked'
                          ? 'bg-electric-950 text-[#B86B7A] border-[#E2B4BD]'
                          : c.status === 'CORRELATED'
                          ? 'bg-[#93C5FD]/15 text-[#6E6264] border-[#93C5FD]/40'
                          : 'bg-[#FFF5F5] text-[#6E6264] border-[#E8C2BB]'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-[#6E6264] uppercase font-mono">Victim Complainant</div>
                    <div className="text-sm font-bold text-[#4A4A4A]">{c.complainant_name}</div>
                    <div className="text-xs text-[#FF3B4E] font-mono font-semibold mt-0.5">
                      Claimed Loss: ₹{(c.amount_lost || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-3 rounded-none bg-[#FFF5F5] border border-[#E8C2BB]/80 text-[11px] text-[#6E6264] leading-relaxed italic">
                    "{c.description}"
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] text-[#8A7D7F] font-mono">REPORTED BENEFICIARY MULE:</div>
                    <button
                      onClick={() => {
                        if (onAccountSelect) onAccountSelect(c.reported_account_id);
                        setCurrentPage("mule-detection");
                      }}
                      className="font-mono text-xs font-bold text-[#B86B7A] hover:text-electric-200 flex items-center gap-1.5"
                    >
                      <LinkIcon className="w-3.5 h-3.5 text-[#B86B7A]" />
                      <span>{c.reported_account_id}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#8A7D7F] font-mono">
                    <span>Category: <strong className="text-[#6E6264] font-sans">{c.category || 'Cyber Fraud'}</strong></span>
                    <span>{new Date(c.date_reported).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-3 border-t border-[#E8C2BB] flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => handleRunCorrelation(c)}
                    disabled={isCorrelating}
                    className="flex-1 py-1.5 px-2 rounded bg-electric-600/30 hover:bg-electric-600/50 text-[#B86B7A] border border-[#E2B4BD] text-[11px] font-bold font-mono transition flex items-center justify-center gap-1"
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
                      className="py-1.5 px-2 rounded bg-navy-850 hover:bg-[#FFFFFF] text-[#6E6264] border border-[#93C5FD]/30 text-[11px] font-semibold transition"
                    >
                      View Findings
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (onAccountSelect) onAccountSelect(c.reported_account_id);
                      setCurrentPage("money-trail");
                    }}
                    className="py-1.5 px-2 rounded bg-navy-850 hover:bg-[#FFFFFF] text-[#6E6264] border border-[#E8C2BB] text-[11px] font-semibold transition"
                  >
                    Trace Flow
                  </button>
                </div>
              </div>
            );
          })}

          {complaints.length === 0 && (
            <div className="col-span-3 p-12 text-center text-[#8A7D7F] text-xs bg-[#FFFFFF] rounded-none border border-[#E8C2BB] font-mono">
              No complaint records found matching the active filters.
            </div>
          )}
        </div>
      )}

      {/* Correlation Results Modal / Side Drawer */}
      {activeCorrelationComplaint && correlationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-4xl bg-[#FFFFFF] border border-[#E8C2BB] rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 bg-navy-850 border-b border-[#E8C2BB] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <Network className="w-5 h-5 text-[#6E6264]" />
                <div>
                  <h3 className="text-sm font-bold text-[#4A4A4A] font-mono flex items-center gap-2">
                    <span>COMPLAINT CORRELATION: {activeCorrelationComplaint.complaint_id}</span>
                    <span className="text-[#6E6264] font-normal">➔ {activeCorrelationComplaint.reported_account_id}</span>
                  </h3>
                  <p className="text-[11px] text-[#6E6264]">
                    Multi-evidence cross-matching across core banking, 1-2 hop mule graph, and prior police reports.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenDossier(activeCorrelationComplaint)}
                  className="px-2.5 py-1 bg-[#FFF5F5] hover:bg-[#FFFFFF] border border-[#E8C2BB] text-[#4A4A4A] text-xs rounded transition flex items-center gap-1 font-mono"
                >
                  <FileText className="w-3 h-3 text-[#6E6264]" />
                  <span>Dossier</span>
                </button>
                <button
                  onClick={() => {
                    setActiveCorrelationComplaint(null);
                    setCorrelationData(null);
                    setCorrelationGraph(null);
                  }}
                  className="text-[#6E6264] hover:text-[#4A4A4A]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 font-mono text-xs">
              {/* Score Banner */}
              <div className="p-4 rounded-none bg-[#FFF5F5] border border-[#E8C2BB] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#6E6264] uppercase">HEURISTIC CONFIDENCE SCORE</span>
                    <div className="text-2xl font-bold text-[#6E6264] mt-0.5">
                      {correlationData.heuristic_confidence_score?.toFixed(1) || '0.0'}%
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-[#6E6264] uppercase">CORRELATION STATUS</span>
                    <div className="text-xs font-bold text-[#B86B7A] mt-0.5">
                      {correlationData.status || 'CORRELATED'}
                    </div>
                    <div className="text-[10px] text-[#8A7D7F]">
                      {correlationData.total_related_transactions || 0} Connected Transactions
                    </div>
                  </div>
                </div>

                {/* Progress Meter */}
                <div className="w-full bg-[#FFFFFF] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#93C5FD] h-full rounded-full transition-all duration-500"
                    style={{ width: `${correlationData.heuristic_confidence_score || 0}%` }}
                  />
                </div>

                <div className="text-[10px] text-[#6E6264] font-sans italic pt-1">
                  * {correlationData.score_disclaimer || "Heuristic correlation score reflects aggregated evidence signals and is not conclusive proof of guilt."}
                </div>
              </div>

              {/* Categorized Findings */}
              <div className="space-y-3 font-sans">
                <h4 className="text-xs font-bold text-[#4A4A4A] uppercase tracking-wider font-mono flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#6E6264]" />
                  <span>CATEGORIZED EVIDENCE FINDINGS</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Direct Account Match */}
                  <div className="p-3.5 rounded-none bg-[#FFF5F5] border border-[#E8C2BB] space-y-1.5">
                    <div className="text-[10px] font-mono font-bold text-[#6E6264] uppercase flex items-center justify-between">
                      <span>1. Core Banking Account Match</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] ${
                        correlationData.matched_categories?.direct_account_match?.matched
                          ? 'bg-[#93C5FD]/15 text-[#6E6264] border border-[#93C5FD]/40'
                          : 'bg-[#FFFFFF] text-[#6E6264]'
                      }`}>
                        {correlationData.matched_categories?.direct_account_match?.matched ? 'MATCHED' : 'UNMATCHED'}
                      </span>
                    </div>
                    {correlationData.matched_categories?.direct_account_match?.matched ? (
                      <div className="text-xs text-[#4A4A4A] space-y-0.5 font-mono">
                        <div>Account: <strong className="text-[#B86B7A]">{correlationData.matched_categories.direct_account_match.account_id}</strong></div>
                        <div className="text-[#6E6264] text-[11px] font-sans">
                          Entity: {correlationData.matched_categories.direct_account_match.customer_name}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-[#8A7D7F] italic">No exact account match found.</div>
                    )}
                  </div>

                  {/* Recidivism / Shared Complaints */}
                  <div className="p-3.5 rounded-none bg-[#FFF5F5] border border-[#E8C2BB] space-y-1.5">
                    <div className="text-[10px] font-mono font-bold text-[#6E6264] uppercase flex items-center justify-between">
                      <span>2. Recidivism & Shared Complaints</span>
                      <span className="text-[#FF3B4E] font-mono font-bold">
                        {correlationData.matched_categories?.shared_complaints?.count || 0} Other Reports
                      </span>
                    </div>
                    {(correlationData.matched_categories?.shared_complaints?.complaints || []).map((sc, i) => (
                      <div key={i} className="text-[11px] text-[#6E6264] border-t border-[#E8C2BB]/80 pt-1 font-sans">
                        <strong className="font-mono text-[#6E6264]">{sc.complaint_id}</strong> by {sc.complainant_name}: "{sc.description}"
                      </div>
                    ))}
                    {(!correlationData.matched_categories?.shared_complaints?.complaints || correlationData.matched_categories.shared_complaints.complaints.length === 0) && (
                      <div className="text-xs text-[#8A7D7F] italic">First reported complaint on this entity.</div>
                    )}
                  </div>

                  {/* Graph-Connected High-Risk Mules */}
                  <div className="p-3.5 rounded-none bg-[#FFF5F5] border border-[#E8C2BB] space-y-1.5">
                    <div className="text-[10px] font-mono font-bold text-[#6E6264] uppercase flex items-center justify-between">
                      <span>3. Graph-Connected Mules (1-2 Hops)</span>
                      <span className="text-[#6E6264] font-mono font-bold">
                        {correlationData.matched_categories?.graph_connected_mules?.count || 0} Connected
                      </span>
                    </div>
                    {(correlationData.matched_categories?.graph_connected_mules?.mules || []).map((m, i) => (
                      <div key={i} className="text-[11px] text-[#6E6264] border-t border-[#E8C2BB]/80 pt-1 font-mono">
                        <span className="text-[#FF3B4E] font-bold">{m.account_id}</span> ({m.connection_type}) - Risk: {m.risk_score} (Turnover: {((m.turnover_ratio || 0) * 100).toFixed(1)}%)
                      </div>
                    ))}
                    {(!correlationData.matched_categories?.graph_connected_mules?.mules || correlationData.matched_categories.graph_connected_mules.mules.length === 0) && (
                      <div className="text-xs text-[#8A7D7F] italic">No flagged mule accounts directly connected within 2 hops.</div>
                    )}
                  </div>

                  {/* Active Investigation Cases */}
                  <div className="p-3.5 rounded-none bg-[#FFF5F5] border border-[#E8C2BB] space-y-1.5">
                    <div className="text-[10px] font-mono font-bold text-[#6E6264] uppercase flex items-center justify-between">
                      <span>4. Active Investigation Cases</span>
                      <span className="text-[#B86B7A] font-mono font-bold">
                        {correlationData.matched_categories?.existing_cases?.count || 0} Open
                      </span>
                    </div>
                    {(correlationData.matched_categories?.existing_cases?.cases || []).map((cs, i) => (
                      <div key={i} className="text-[11px] text-[#6E6264] border-t border-[#E8C2BB]/80 pt-1 font-mono">
                        <strong className="text-[#B86B7A]">{cs.case_id}</strong>: {cs.title} ({cs.status})
                      </div>
                    ))}
                    {(!correlationData.matched_categories?.existing_cases?.cases || correlationData.matched_categories.existing_cases.cases.length === 0) && (
                      <div className="text-xs text-[#8A7D7F] italic">No existing cases active on this entity.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Explanations List */}
              {correlationData.explanations?.length > 0 && (
                <div className="space-y-2 font-mono text-xs">
                  <h4 className="text-xs font-bold text-[#4A4A4A] uppercase tracking-wider">
                    EVIDENCE EXPLANATION NARRATIVE:
                  </h4>
                  <div className="p-3.5 rounded-none bg-[#FFF5F5] border border-[#E8C2BB] space-y-1.5 font-sans text-xs">
                    {correlationData.explanations.map((exp, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[#6E6264]">
                        <ChevronRight className="w-3.5 h-3.5 text-[#6E6264] shrink-0 mt-0.5" />
                        <span>{exp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correlation Graph Topology */}
              {correlationGraph && correlationGraph.elements?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#4A4A4A] uppercase tracking-wider font-mono flex items-center gap-2">
                    <Network className="w-4 h-4 text-[#B86B7A]" />
                    <span>COMPLAINT RELATIONSHIP GRAPH TOPOLOGY</span>
                  </h4>
                  <div className="h-[280px] rounded-none overflow-hidden border border-[#E8C2BB] bg-[#FFF5F5]">
                    <CytoscapeGraph
                      graphData={correlationGraph}
                      selectedNodeId={activeCorrelationComplaint.complaint_id}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-navy-850 border-t border-[#E8C2BB] flex flex-wrap items-center justify-between gap-3 shrink-0 font-mono text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenLinkCase}
                  className="px-3 py-1.5 bg-[#FFF5F5] hover:bg-[#FFFFFF] text-[#4A4A4A] border border-[#E8C2BB] rounded-none transition flex items-center gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5 text-[#B86B7A]" />
                  <span>Link to Existing Case</span>
                </button>

                <button
                  onClick={() => handleCreateCaseFromComplaint(activeCorrelationComplaint)}
                  className="px-3.5 py-1.5 bg-electric-600 hover:bg-[#B86B7A] text-white font-bold rounded-none shadow-glow-rose transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Case</span>
                </button>
              </div>

              <button
                onClick={() => handleOpenDossier(activeCorrelationComplaint)}
                className="px-3.5 py-1.5 bg-[#93C5FD]/15 hover:bg-emerald-900 border border-[#93C5FD]/40 text-[#6E6264] rounded-none transition flex items-center gap-1.5"
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
          <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E8C2BB] rounded-none p-5 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#E8C2BB] pb-3">
              <h3 className="text-sm font-bold text-[#4A4A4A] flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#B86B7A]" />
                <span>LINK COMPLAINT TO CASE</span>
              </h3>
              <button
                onClick={() => setIsLinkCaseOpen(false)}
                className="text-[#6E6264] hover:text-[#4A4A4A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-sans">
              <div>
                <label className="block text-xs font-mono text-[#6E6264] mb-1">
                  SELECT TARGET CASE:
                </label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white font-mono text-xs focus:outline-none focus:border-[#E2B4BD]"
                >
                  {existingCases.map((c) => (
                    <option key={c.case_id} value={c.case_id}>
                      {c.case_id} - {c.title} ({c.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#6E6264] mb-1">
                  CORRELATION NOTES:
                </label>
                <textarea
                  rows={3}
                  value={linkNotes}
                  onChange={(e) => setLinkNotes(e.target.value)}
                  placeholder="Note evidentiary grounds linking this FIR to the open case..."
                  className="w-full px-3 py-2 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white font-sans text-xs focus:outline-none focus:border-[#E2B4BD]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8C2BB]">
                <button
                  onClick={() => setIsLinkCaseOpen(false)}
                  className="px-3 py-1.5 bg-[#FFF5F5] hover:bg-[#FFFFFF] text-[#6E6264] font-mono text-xs rounded-none transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmLinkCase}
                  disabled={linkingCase}
                  className="px-4 py-1.5 bg-electric-600 hover:bg-[#B86B7A] disabled:opacity-50 text-white font-mono text-xs font-bold rounded-none shadow-glow-rose transition flex items-center gap-1.5"
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
          <div className="w-full max-w-2xl bg-[#FFFFFF] border border-[#E8C2BB] rounded-none p-5 space-y-4 shadow-2xl font-mono text-xs max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E8C2BB] pb-3 shrink-0">
              <h3 className="text-sm font-bold text-[#4A4A4A] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#6E6264]" />
                <span>OFFICIAL COMPLAINT FORENSIC DOSSIER</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadDossierJson}
                  className="px-2.5 py-1 bg-[#93C5FD]/15 hover:bg-emerald-900 border border-[#93C5FD]/50 text-[#6E6264] rounded text-xs transition flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Download JSON</span>
                </button>
                <button
                  onClick={() => setIsDossierModalOpen(false)}
                  className="text-[#6E6264] hover:text-[#4A4A4A]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {loadingDossier ? (
                <div className="py-12 text-center text-[#6E6264] flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#B86B7A]" />
                  <span>Synthesizing official complaint dossier...</span>
                </div>
              ) : dossierReport ? (
                <div className="space-y-4 font-sans text-[#6E6264]">
                  <div className="p-3.5 rounded-none bg-[#FFF5F5] border border-[#E8C2BB] font-mono text-[11px] space-y-1">
                    <div className="text-[#4A4A4A] font-bold">{dossierReport.report_title}</div>
                    <div className="text-[#8A7D7F]">
                      ID: {dossierReport.complaint_id} | AUTHORITY: {dossierReport.investigating_authority}
                    </div>
                    <div className="text-[#6E6264] text-[10px]">
                      {dossierReport.legal_disclaimer}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                    <div className="p-3 rounded bg-[#FFF5F5] border border-[#E8C2BB] space-y-1">
                      <div className="text-[10px] text-[#8A7D7F] uppercase">Complainant</div>
                      <div className="text-[#4A4A4A] font-bold">{dossierReport.complainant}</div>
                      <div className="text-[#FF3B4E]">Claimed Loss: ₹{(dossierReport.amount_lost || 0).toLocaleString()}</div>
                    </div>

                    <div className="p-3 rounded bg-[#FFF5F5] border border-[#E8C2BB] space-y-1">
                      <div className="text-[10px] text-[#8A7D7F] uppercase">Subject Entity</div>
                      <div className="text-[#B86B7A] font-bold">{dossierReport.reported_account}</div>
                      <div className="text-[#6E6264]">Category: {dossierReport.category}</div>
                    </div>
                  </div>

                  {dossierReport.correlation_evidence?.explanations?.length > 0 && (
                    <div className="space-y-2 font-mono text-xs">
                      <div className="font-bold text-[#4A4A4A] uppercase text-[11px]">CORRELATION FINDINGS:</div>
                      <div className="p-3 rounded bg-[#FFF5F5] border border-[#E8C2BB] space-y-1.5 font-sans text-xs">
                        {dossierReport.correlation_evidence.explanations.map((exp, i) => (
                          <div key={i} className="flex items-start gap-2 text-[#6E6264]">
                            <ChevronRight className="w-3.5 h-3.5 text-[#6E6264] shrink-0 mt-0.5" />
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
          <div className="w-full max-w-lg bg-[#FFFFFF] border border-[#E8C2BB] rounded-none shadow-glass overflow-hidden flex flex-col">
            <div className="p-4 bg-navy-850 border-b border-[#E8C2BB] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#4A4A4A] tracking-wide">Register Cybercrime Complaint</h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-[#6E6264] hover:text-[#4A4A4A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="p-5 space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#6E6264] font-semibold mb-1 font-mono text-[11px]">Complaint ID / FIR</label>
                  <input
                    type="text"
                    required
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white font-mono text-xs focus:outline-none focus:border-[#E2B4BD]"
                  />
                </div>
                <div>
                  <label className="block text-[#6E6264] font-semibold mb-1 font-mono text-[11px]">Complainant Full Name</label>
                  <input
                    type="text"
                    required
                    value={complainant}
                    onChange={(e) => setComplainant(e.target.value)}
                    placeholder="e.g. Ramesh K. Patel"
                    className="w-full px-3 py-2 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white text-xs focus:outline-none focus:border-[#E2B4BD]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#6E6264] font-semibold mb-1 font-mono text-[11px]">Reported Mule Account</label>
                  <input
                    type="text"
                    required
                    value={accId}
                    onChange={(e) => setAccId(e.target.value)}
                    placeholder="e.g. MULE_AGG_01"
                    className="w-full px-3 py-2 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white font-mono text-xs focus:outline-none focus:border-[#E2B4BD]"
                  />
                </div>
                <div>
                  <label className="block text-[#6E6264] font-semibold mb-1 font-mono text-[11px]">Claimed Loss (INR ₹)</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 75000"
                    className="w-full px-3 py-2 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white font-mono text-xs focus:outline-none focus:border-[#E2B4BD]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#6E6264] font-semibold mb-1 font-mono text-[11px]">Fraud Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white text-xs focus:outline-none focus:border-[#E2B4BD]"
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
                  <label className="block text-[#6E6264] font-semibold mb-1 font-mono text-[11px]">Reporting Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white text-xs focus:outline-none focus:border-[#E2B4BD]"
                  >
                    <option value="National Cyber Crime Reporting Portal (1930)">National Portal (1930)</option>
                    <option value="State Police Cyber Cell FIR">Police Cyber Cell FIR</option>
                    <option value="Bank Customer Grievance Desk">Bank Grievance Desk</option>
                    <option value="Corporate Anti-Fraud Desk">Corporate Fraud Desk</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#6E6264] font-semibold mb-1 font-mono text-[11px]">Incident Description & Modus Operandi</label>
                <textarea
                  rows={3}
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Detail phishing pretext, digital arrest claim, or fraudulent task scheme..."
                  className="w-full px-3 py-2 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white text-xs focus:outline-none focus:border-[#E2B4BD] resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-[#E8C2BB] font-mono">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 bg-[#FFFFFF] text-[#6E6264] font-medium rounded-none text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-electric-600 hover:bg-[#B86B7A] text-white font-bold rounded-none shadow-glow-rose disabled:opacity-50 text-xs"
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
