import React, { useEffect, useState } from 'react';
import {
  FileText,
  Briefcase,
  AlertTriangle,
  Plus,
  Save,
  Download,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
  CreditCard,
  FileWarning,
  RefreshCw,
  Printer
} from 'lucide-react';
import { api } from '../services/api';

export default function CaseDetailsPage({
  caseId,
  setCurrentPage,
  onAccountSelect,
  refreshTrigger
}) {
  const [caseData, setCaseData] = useState(null);
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

  const fetchCase = async () => {
    if (!caseId) {
      // If no case selected, load latest case
      try {
        const cases = await api.getCases({ limit: 1 });
        if (cases && cases.length > 0) {
          loadCaseData(cases[0].case_id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setLoading(false);
      }
      return;
    }
    loadCaseData(caseId);
  };

  const loadCaseData = async (id) => {
    setLoading(true);
    try {
      const data = await api.getCase(id);
      setCaseData(data);
      setStatus(data.status);
      setPriority(data.priority);
      setSummary(data.summary || '');
      setFindings(data.findings || '');
    } catch (err) {
      setError(err.message || "Failed to load case.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCase();
  }, [caseId, refreshTrigger]);

  const handleSaveCase = async () => {
    if (!caseData) return;
    setIsSaving(true);
    try {
      const updated = await api.updateCase(caseData.case_id, {
        status,
        priority,
        summary,
        findings
      });
      setCaseData(updated);
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
    if (!caseData || !evRef) return;
    setIsAddingEv(true);
    try {
      await api.addCaseEvidence(caseData.case_id, {
        evidence_type: evType,
        reference_id: evRef,
        description: evDesc || "Investigative evidence supporting case findings."
      });
      setShowAddEvidence(false);
      setEvRef('');
      setEvDesc('');
      loadCaseData(caseData.case_id);
    } catch (err) {
      alert("Failed to add evidence: " + err.message);
    } finally {
      setIsAddingEv(false);
    }
  };

  const handleExportDossier = async () => {
    if (!caseData) return;
    try {
      const dossier = await api.getCaseDossier(caseData.case_id);
      const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CASE_DOSSIER_${caseData.case_id}.json`;
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
        <h3 className="text-base font-bold text-white">No Case Selected</h3>
        <p className="text-xs">Please select an investigation case from the Cases page or spawn a new case.</p>
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
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-electric-400 bg-electric-500/10 px-2 py-0.5 rounded border border-electric-500/30">
                {caseData.case_id}
              </span>
              <span className="text-slate-400 text-xs font-mono">
                Initiated: {new Date(caseData.created_at).toLocaleDateString()}
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
          <span>Case dossier and findings successfully updated in secure database.</span>
        </div>
      )}

      {/* Case Metadata Form Bar */}
      <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
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
            <span className="font-mono text-xs font-bold text-electric-300 bg-navy-950 px-3 py-2 rounded-lg border border-slate-700 flex-1">
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
          <div className="font-semibold text-slate-200 bg-navy-950 px-3 py-2 rounded-lg border border-slate-700 text-xs">
            {caseData.assigned_investigator}
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
              className="w-full px-3 py-2.5 bg-navy-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-electric-400 leading-relaxed resize-none"
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
              className="w-full px-3 py-2.5 bg-navy-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-electric-400 leading-relaxed resize-none font-mono"
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
                className="px-2.5 py-1 bg-navy-850 hover:bg-slate-800 text-electric-300 border border-slate-700 rounded text-[11px] font-semibold flex items-center gap-1 transition"
              >
                <Plus className="w-3 h-3" />
                <span>Attach</span>
              </button>
            </div>

            {/* Add Evidence Form Drawer */}
            {showAddEvidence && (
              <form onSubmit={handleAddEvidence} className="p-3 rounded-lg bg-navy-950 border border-slate-700 space-y-3 text-xs">
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
                    className="w-full px-2 py-1.5 bg-navy-900 border border-slate-700 rounded text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] mb-1 font-mono">DESCRIPTION</label>
                  <input
                    type="text"
                    value={evDesc}
                    onChange={(e) => setEvDesc(e.target.value)}
                    placeholder="Notes on why this evidence is critical..."
                    className="w-full px-2 py-1.5 bg-navy-900 border border-slate-700 rounded text-white text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
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
                    className="px-3 py-1 bg-electric-600 hover:bg-electric-500 text-white rounded text-xs font-semibold"
                  >
                    {isAddingEv ? "Adding..." : "Add to Locker"}
                  </button>
                </div>
              </form>
            )}

            {/* Evidence Items List */}
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {(caseData.evidence_items || []).map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-lg bg-navy-950 border border-slate-800 text-xs space-y-1.5"
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
                <div className="p-6 text-center text-slate-500 text-xs">
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
