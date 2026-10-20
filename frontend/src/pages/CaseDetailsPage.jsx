import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  ArrowLeft,
  Save,
  Download,
  Plus,
  Trash2,
  FileText,
  ShieldAlert,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { api } from '../services/api';

export default function CaseDetailsPage({
  caseId,
  setCurrentPage,
  onAccountSelect,
  refreshTrigger
}) {
  const [caseData, setCaseData] = useState(null);
  const [allCases, setAllCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit states
  const [status, setStatus] = useState('New');
  const [priority, setPriority] = useState('High');
  const [summary, setSummary] = useState('');
  const [findings, setFindings] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Add evidence state
  const [showAddEvidence, setShowAddEvidence] = useState(false);
  const [evType, setEvType] = useState('TRANSACTION');
  const [evRef, setEvRef] = useState('');
  const [evDesc, setEvDesc] = useState('');
  const [isAddingEv, setIsAddingEv] = useState(false);

  const fetchCasesAndCurrent = async () => {
    setLoading(true);
    setError(null);
    try {
      const casesRes = await api.getCases({ limit: 50 }).catch(() => []);
      const casesList = Array.isArray(casesRes) ? casesRes : (casesRes?.cases || []);
      setAllCases(casesList);

      const targetId = caseId || (casesList.length > 0 ? casesList[0].case_id : null);
      if (targetId) {
        await loadCaseData(targetId);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || "Failed to initialize case details.");
      setLoading(false);
    }
  };

  const loadCaseData = async (id) => {
    if (!id || id === 'undefined' || id === 'null') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCase(id);
      const rawCase = data.case || data;
      const rawEvidence = data.evidence || data.evidence_items || rawCase.evidence_items || rawCase.evidence || [];

      const normalizedCase = {
        ...rawCase,
        evidence_items: rawEvidence
      };

      setCaseData(normalizedCase);
      setStatus(normalizedCase.status || 'New');
      setPriority(normalizedCase.priority || 'High');
      setSummary(normalizedCase.summary || '');
      setFindings(normalizedCase.findings || '');
    } catch (err) {
      setError(err.message || "Failed to load case data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCasesAndCurrent();
  }, [caseId, refreshTrigger]);

  const handleSaveCase = async () => {
    const activeCaseId = caseData?.case_id || caseId;
    if (!activeCaseId || activeCaseId === 'undefined') {
      alert("No valid case active to update.");
      return;
    }
    setIsSaving(true);
    try {
      const updated = await api.updateCase(activeCaseId, {
        status,
        priority,
        summary,
        findings
      });
      const rawCase = updated.case || updated;
      const rawEvidence = updated.evidence || updated.evidence_items || caseData?.evidence_items || [];
      setCaseData({
        ...rawCase,
        evidence_items: rawEvidence
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save case: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddEvidence = async (e) => {
    e.preventDefault();
    const activeCaseId = caseData?.case_id || caseId;
    if (!activeCaseId || activeCaseId === 'undefined') {
      alert("No valid case selected to attach evidence to. Please select an active case first.");
      return;
    }
    if (!evRef.trim()) {
      alert("Please enter a reference ID (such as a Transaction ID, Account ID, or FIR reference).");
      return;
    }
    setIsAddingEv(true);
    try {
      await api.addCaseEvidence(activeCaseId, {
        evidence_type: evType,
        reference_id: evRef.trim(),
        description: evDesc.trim() || "Investigative evidence supporting case findings."
      });
      setShowAddEvidence(false);
      setEvRef('');
      setEvDesc('');
      await loadCaseData(activeCaseId);
    } catch (err) {
      alert("Failed to add evidence: " + err.message);
    } finally {
      setIsAddingEv(false);
    }
  };

  const handleExportDossier = async () => {
    const activeCaseId = caseData?.case_id || caseId;
    if (!activeCaseId || activeCaseId === 'undefined') return;
    try {
      const dossier = await api.getCaseDossier(activeCaseId);
      const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CASE_DOSSIER_${activeCaseId}.json`;
      a.click();
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-electric-400" />
        <span className="text-xs font-mono">Loading Case Dossier & Evidentiary Locker...</span>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-12 text-center rounded-xl bg-navy-900 border border-slate-800 text-slate-400 space-y-4 max-w-xl mx-auto">
        <Briefcase className="w-10 h-10 text-slate-500 mx-auto" />
        <h3 className="text-base font-bold text-white">No Investigation Cases in Docket</h3>
        <p className="text-xs">Create an investigation case first from Mule Detection, Complaints, or Cases page.</p>
        <button
          onClick={() => setCurrentPage('cases')}
          className="px-4 py-2 bg-electric-600 hover:bg-electric-500 text-white font-bold rounded-lg text-xs"
        >
          View Cases Docket
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentPage('cases')}
            className="p-2 rounded-lg bg-navy-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-electric-400 bg-electric-500/10 px-2 py-0.5 rounded border border-electric-500/30">
                {caseData.case_id}
              </span>

              {/* Case Quick Selector Dropdown */}
              {allCases.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-slate-500 text-[11px]">SWITCH CASE:</span>
                  <select
                    value={caseData.case_id}
                    onChange={(e) => loadCaseData(e.target.value)}
                    className="px-2 py-0.5 bg-navy-950 border border-slate-700 rounded text-electric-300 text-xs font-mono focus:outline-none focus:border-electric-400"
                  >
                    {allCases.map((c) => (
                      <option key={c.case_id} value={c.case_id}>
                        {c.case_id} - {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <span className="text-slate-400 text-xs font-mono">
                Initiated: {caseData.created_at ? new Date(caseData.created_at).toLocaleDateString() : 'Active'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-wide mt-0.5">
              {caseData.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportDossier}
            className="px-3.5 py-2 bg-navy-850 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2 transition"
          >
            <Download className="w-3.5 h-3.5 text-electric-400" />
            <span>Export Dossier (JSON)</span>
          </button>

          <button
            onClick={handleSaveCase}
            disabled={isSaving}
            className="px-4 py-2 bg-electric-600 hover:bg-electric-500 text-white font-bold rounded-lg shadow-glow-electric text-xs flex items-center gap-2 transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving Changes..." : "Save Findings"}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Case docket and findings successfully updated in secure database.</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Case Metadata Form Bar */}
      <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
        <div>
          <label className="block text-slate-400 font-mono text-[10px] mb-1">INVESTIGATION STAGE</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white font-semibold text-xs focus:outline-none focus:border-electric-400"
          >
            <option value="New">New (Intake)</option>
            <option value="Under_Investigation">Under Investigation</option>
            <option value="Escalated">Escalated to Enforcement / FIU</option>
            <option value="Closed">Closed / Account Frozen</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 font-mono text-[10px] mb-1">PRIORITY RATING</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white font-semibold text-xs focus:outline-none focus:border-electric-400"
          >
            <option value="Critical">Critical Priority</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 font-mono text-[10px] mb-1">PRIMARY SUBJECT ACCOUNT</label>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-electric-300 bg-navy-950 px-3 py-2 rounded-lg border border-slate-700 flex-1 truncate">
              {caseData.primary_account_id || "Multi-Account Syndicate"}
            </span>
            {caseData.primary_account_id && (
              <button
                onClick={() => {
                  if (onAccountSelect) onAccountSelect(caseData.primary_account_id);
                  setCurrentPage("money-trail");
                }}
                className="px-2 py-2 bg-navy-850 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-mono shrink-0"
              >
                Trail
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-slate-400 font-mono text-[10px] mb-1">ASSIGNED INVESTIGATOR</label>
          <div className="font-semibold text-slate-200 bg-navy-950 px-3 py-2 rounded-lg border border-slate-700 text-xs truncate">
            {caseData.assigned_investigator || "Lead Financial Crime Specialist"}
          </div>
        </div>
      </div>

      {/* Case Dossier Body: Narrative & Evidence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Narrative & Findings (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              INVESTIGATIVE SUMMARY & ALLEGATION PREMISE
            </h3>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3 py-2.5 bg-navy-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-electric-400 leading-relaxed resize-none font-sans"
            />
          </div>

          <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              DETAILED INVESTIGATION FINDINGS & MULE NETWORK NEXUS
            </h3>
            <textarea
              rows={8}
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              placeholder="Record forensic observations, transaction timestamps, victim statements, and freeze recommendations..."
              className="w-full px-3 py-2.5 bg-navy-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-electric-400 leading-relaxed resize-none font-sans"
            />
          </div>
        </div>

        {/* Evidentiary Locker (1 col) */}
        <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  EVIDENTIARY LOCKER
                </h3>
                <p className="text-[10px] text-slate-400">Attached chain of custody items</p>
              </div>
              <button
                onClick={() => setShowAddEvidence(!showAddEvidence)}
                className="px-2.5 py-1 bg-navy-850 hover:bg-slate-800 text-electric-300 border border-slate-700 rounded text-[11px] font-semibold flex items-center gap-1 transition font-mono"
              >
                <Plus className="w-3 h-3" />
                <span>Attach</span>
              </button>
            </div>

            {/* Add Evidence Form Drawer */}
            {showAddEvidence && (
              <form onSubmit={handleAddEvidence} className="p-3 rounded-lg bg-navy-950 border border-slate-700 space-y-3 text-xs animate-fadeIn font-mono">
                <div>
                  <label className="block text-slate-400 text-[10px] mb-1 font-mono">EVIDENCE TYPE</label>
                  <select
                    value={evType}
                    onChange={(e) => setEvType(e.target.value)}
                    className="w-full px-2 py-1.5 bg-navy-900 border border-slate-700 rounded text-white text-xs"
                  >
                    <option value="ACCOUNT">Bank Account Subject</option>
                    <option value="TRANSACTION">Transaction Reference</option>
                    <option value="GRAPH_SUBGRAPH">Network Subgraph</option>
                    <option value="COMPLAINT">Cyber Crime FIR</option>
                    <option value="GNN_ALERT">Neural Network Signal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] mb-1 font-mono">REFERENCE ID</label>
                  <input
                    type="text"
                    required
                    value={evRef}
                    onChange={(e) => setEvRef(e.target.value)}
                    placeholder="e.g. TXN_10165 or MULE_AGG_01"
                    className="w-full px-2 py-1.5 bg-navy-900 border border-slate-700 rounded text-white font-mono text-xs focus:outline-none focus:border-electric-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] mb-1 font-mono">DESCRIPTION</label>
                  <input
                    type="text"
                    value={evDesc}
                    onChange={(e) => setEvDesc(e.target.value)}
                    placeholder="Notes on why this evidence is critical..."
                    className="w-full px-2 py-1.5 bg-navy-900 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-electric-400"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1 font-mono">
                  <button
                    type="button"
                    onClick={() => setShowAddEvidence(false)}
                    className="px-2.5 py-1 text-slate-400 hover:text-white text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingEv}
                    className="px-3 py-1 bg-electric-600 hover:bg-electric-500 disabled:opacity-50 text-white rounded text-xs font-semibold flex items-center gap-1"
                  >
                    {isAddingEv ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    <span>{isAddingEv ? "Adding..." : "Add to Locker"}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Evidence Items List */}
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {(caseData.evidence_items || []).map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-lg bg-navy-950 border border-slate-800 text-xs space-y-1.5 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] font-bold text-electric-400 bg-electric-500/10 px-1.5 py-0.5 rounded border border-electric-500/30">
                      {ev.evidence_type}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(ev.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="font-mono font-bold text-white text-xs truncate">
                    {ev.reference_id}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    {ev.description}
                  </p>
                </div>
              ))}

              {(!caseData.evidence_items || caseData.evidence_items.length === 0) && (
                <div className="p-6 text-center text-slate-500 text-xs font-mono">
                  No evidence attached yet. Click Attach to log accounts or transactions.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
            Chain of Custody ID: {caseData.case_id}-AUDIT
          </div>
        </div>
      </div>
    </div>
  );
}
