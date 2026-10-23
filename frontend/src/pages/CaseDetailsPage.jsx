import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  FolderOpen,
  GitCommit,
  Network,
  Users,
  CreditCard,
  History,
  ExternalLink,
  Lock,
  Layers,
  Search,
  Check,
  HelpCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { wsService } from '../services/websocket';

const STAGE_OPTIONS = [
  {
    value: 'New',
    label: 'New (Intake)',
    hint: 'Initial case intake. Awaiting preliminary evidence collection.'
  },
  {
    value: 'Under_Investigation',
    label: 'Under Investigation',
    hint: 'Active inquiry underway. Tracing multi-hop mule layering and fund routing.'
  },
  {
    value: 'Under Review',
    label: 'Under Review',
    hint: 'Forensic narrative completed. Awaiting supervisory clearance.'
  },
  {
    value: 'Pending Review',
    label: 'Pending Review',
    hint: 'Awaiting bank nodal officer response or transaction log submission.'
  },
  {
    value: 'Escalated',
    label: 'Escalated to Enforcement / FIU',
    hint: 'Transferred for immediate regulatory lien / statutory account freeze.'
  },
  {
    value: 'Closed',
    label: 'Closed / Account Frozen',
    hint: 'Investigation concluded. Target accounts frozen or exonerated.'
  },
  {
    value: 'Reopened',
    label: 'Reopened for Supplemental Inquiry',
    hint: 'Reopened following new victim FIR or newly discovered fund flow.'
  }
];

const PRIORITY_OPTIONS = [
  { value: 'Critical', label: 'Critical Priority (Immediate Action)', badge: 'bg-rose-600 text-white font-extrabold' },
  { value: 'High', label: 'High Priority (Expedited)', badge: 'bg-rose-950 text-rose-300 border border-rose-500/50' },
  { value: 'Medium', label: 'Medium Priority (Standard)', badge: 'bg-amber-950 text-amber-300 border border-amber-500/40' },
  { value: 'Low', label: 'Low Priority (Routine)', badge: 'bg-slate-800 text-slate-300 border border-slate-700' }
];

export default function CaseDetailsPage({
  caseId,
  setSelectedCaseId,
  setCurrentPage,
  onAccountSelect,
  refreshTrigger
}) {
  const [caseData, setCaseData] = useState(null);
  const [allCases, setAllCases] = useState([]);
  const [investigatorsList, setInvestigatorsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('evidence'); // 'evidence' | 'accounts' | 'transactions' | 'complaints' | 'audit'

  // Edit states
  const [status, setStatus] = useState('New');
  const [priority, setPriority] = useState('High');
  const [assignedInvestigator, setAssignedInvestigator] = useState('');
  const [summary, setSummary] = useState('');
  const [findings, setFindings] = useState('');
  const [closureReason, setClosureReason] = useState('');
  const [caseVersion, setCaseVersion] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [syncNotice, setSyncNotice] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);

  // Ease of access state
  const [showChecklistGuide, setShowChecklistGuide] = useState(false);
  const [copiedCaseNum, setCopiedCaseNum] = useState(false);

  // Add Evidence modal state
  const [showAddEvidence, setShowAddEvidence] = useState(false);
  const [evType, setEvType] = useState('TRANSACTION');
  const [evRef, setEvRef] = useState('');
  const [evDesc, setEvDesc] = useState('');
  const [isAddingEv, setIsAddingEv] = useState(false);

  // Link entity drawer states
  const [showLinkAccount, setShowLinkAccount] = useState(false);
  const [linkAccId, setLinkAccId] = useState('');
  const [linkAccRole, setLinkAccRole] = useState('Conduit Mule Account');
  const [showLinkTxn, setShowLinkTxn] = useState(false);
  const [linkTxnId, setLinkTxnId] = useState('');
  const [linkTxnRelevance, setLinkTxnRelevance] = useState('Suspected Layering Transfer');
  const [showLinkComplaint, setShowLinkComplaint] = useState(false);
  const [linkComplaintId, setLinkComplaintId] = useState('');

  // Keep track of active editing to avoid clobbering textareas on WebSocket sync
  const isEditingSummaryRef = useRef(false);
  const isEditingFindingsRef = useRef(false);

  // Load investigators list
  useEffect(() => {
    api.getInvestigators()
      .then((list) => {
        if (Array.isArray(list)) setInvestigatorsList(list);
      })
      .catch(() => {});
  }, []);

  const showSyncBadge = (msg) => {
    setSyncNotice(msg);
    setTimeout(() => setSyncNotice(null), 3000);
  };

  const loadCaseData = useCallback(async (id, isSilent = false) => {
    if (!id || id === 'undefined' || id === 'null') {
      if (!isSilent) setLoading(false);
      return;
    }
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const data = await api.getCase(id);
      const rawCase = data.case || data;
      const rawEvidence = data.evidence || data.evidence_items || rawCase.evidence_items || [];

      const normalized = {
        ...rawCase,
        evidence_items: rawEvidence,
        linked_accounts: data.linked_accounts || [],
        linked_transactions: data.linked_transactions || [],
        correlated_complaints: data.correlated_complaints || [],
        audit_logs: data.audit_logs || []
      };

      setCaseData(normalized);
      setLastSyncedAt(new Date());
      setBackendOnline(true);
      setStatus(normalized.status || 'New');
      setPriority(normalized.priority || 'High');
      setAssignedInvestigator(normalized.assigned_investigator || 'Investigator');
      setClosureReason(normalized.closure_reason || '');
      setCaseVersion(normalized.version || 1);

      // Keep parent app state aligned
      if (setSelectedCaseId && normalized.case_id) {
        setSelectedCaseId(normalized.case_id);
      }

      // Only update textarea state if investigator isn't currently actively typing
      if (!isEditingSummaryRef.current) {
        setSummary(normalized.summary || '');
      }
      if (!isEditingFindingsRef.current) {
        setFindings(normalized.findings || '');
      }
    } catch (err) {
      console.error('[FinTrace Dossier] Error loading case:', err);
      setBackendOnline(false);
      if (!isSilent) setError(err.message || 'Failed to load case data.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [setSelectedCaseId]);

  const fetchCasesAndCurrent = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const casesRes = await api.getCases({ limit: 100 }).catch(() => []);
      const casesList = Array.isArray(casesRes) ? casesRes : (casesRes?.cases || []);
      setAllCases(casesList);

      const targetId = caseId || (casesList.length > 0 ? casesList[0].case_id : null);
      if (targetId) {
        await loadCaseData(targetId, isSilent);
      } else {
        if (!isSilent) setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize case details.');
      if (!isSilent) setLoading(false);
    }
  }, [caseId, loadCaseData]);

  // Refresh the selected case from the database as a fallback when websocket events are missed.
  useEffect(() => {
    const activeId = caseData?.case_id || caseId;
    if (!activeId) return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadCaseData(activeId, true);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [caseData?.case_id, caseId, loadCaseData]);

  // Initial load
  useEffect(() => {
    fetchCasesAndCurrent(false);
  }, [fetchCasesAndCurrent]);

  // Silent refresh on background refreshTrigger without flashing loading spinner
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchCasesAndCurrent(true);
    }
  }, [refreshTrigger, fetchCasesAndCurrent]);

  // Real-time WebSocket and Cross-Tab sync listener
  useEffect(() => {
    const handleSyncMessage = (msg) => {
      if (!msg || !msg.event || !msg.event.startsWith('case.')) return;
      const currentActiveId = caseData?.case_id || caseId;

      // If update affects the current active case, refresh silently
      if (msg.case_id && (msg.case_id === currentActiveId || msg.case_id === caseData?.case_number)) {
        console.log('[FinTrace Dossier] Real-time sync for active case:', msg.event);

        if (msg.event === 'case.status_changed' && msg.data?.new_status) {
          setStatus(msg.data.new_status);
          showSyncBadge(`Status updated to ${msg.data.new_status.replace('_', ' ')}`);
        } else if (msg.event === 'case.priority_changed' && msg.data?.new_priority) {
          setPriority(msg.data.new_priority);
          showSyncBadge(`Priority updated to ${msg.data.new_priority}`);
        } else if (msg.event === 'case.evidence_added') {
          showSyncBadge('New evidence item attached');
        } else if (msg.event === 'case.evidence_removed') {
          showSyncBadge('Evidence item removed');
        }

        // Silent reload of full case data
        loadCaseData(currentActiveId, true);
      } else if (msg.event === 'case.created' || msg.event === 'case.status_changed') {
        // Refresh case switcher dropdown list silently
        api.getCases({ limit: 100 })
          .then((res) => {
            const list = Array.isArray(res) ? res : (res.cases || []);
            setAllCases(list);
          })
          .catch(() => {});
      }
    };

    const unsubscribe = wsService.subscribe(handleSyncMessage);
    return () => unsubscribe();
  }, [caseData, caseId, loadCaseData]);

  // Case Switcher Handler
  const handleSwitchCase = (newId) => {
    if (setSelectedCaseId) setSelectedCaseId(newId);
    loadCaseData(newId);
    window.location.hash = `#case-details?id=${encodeURIComponent(newId)}`;
  };

  // Save Findings & Narrative
  const handleSaveFindings = async () => {
    const activeCaseId = caseData?.case_id || caseId;
    if (!activeCaseId) {
      setError('No active case selected.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const res = await api.updateCaseFindings(activeCaseId, summary, findings, caseVersion);
      setCaseVersion(res.version || caseVersion + 1);
      setSaveSuccess(true);
      setSaveMessage('Investigative findings & allegation premise successfully saved to database.');
      setTimeout(() => setSaveSuccess(false), 3500);

      // Instant broadcast
      wsService.broadcastLocalEvent('case.findings_updated', activeCaseId, {
        case_id: activeCaseId,
        summary,
        findings,
        version: res.version || caseVersion + 1,
        updated_at: new Date().toISOString()
      });

      await loadCaseData(activeCaseId, true);
    } catch (err) {
      setError('Failed to save findings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Immediate status change handler
  const handleStatusChange = async (newStatus) => {
    const activeCaseId = caseData?.case_id || caseId;
    if (!activeCaseId) return;

    setStatus(newStatus);
    try {
      const res = await api.updateCaseStatus(activeCaseId, newStatus, closureReason, caseVersion);
      setCaseVersion(res.version || caseVersion + 1);
      setSaveSuccess(true);
      setSaveMessage(`Case status transition recorded: ${newStatus.replace('_', ' ')}`);
      setTimeout(() => setSaveSuccess(false), 3000);

      // Instant cross-tab and cross-page sync
      wsService.broadcastLocalEvent('case.status_changed', activeCaseId, {
        case_id: activeCaseId,
        new_status: newStatus,
        version: res.version || caseVersion + 1,
        updated_at: new Date().toISOString()
      });

      await loadCaseData(activeCaseId, true);
    } catch (err) {
      setError('Status update failed: ' + err.message);
      setStatus(caseData?.status || 'New');
    }
  };

  // Immediate priority change handler
  const handlePriorityChange = async (newPriority) => {
    const activeCaseId = caseData?.case_id || caseId;
    if (!activeCaseId) return;

    setPriority(newPriority);
    try {
      const res = await api.updateCasePriority(activeCaseId, newPriority, caseVersion);
      setCaseVersion(res.version || caseVersion + 1);
      setSaveSuccess(true);
      setSaveMessage(`Priority updated to ${newPriority}`);
      setTimeout(() => setSaveSuccess(false), 3000);

      // Instant cross-tab sync
      wsService.broadcastLocalEvent('case.priority_changed', activeCaseId, {
        case_id: activeCaseId,
        new_priority: newPriority,
        version: res.version || caseVersion + 1,
        updated_at: new Date().toISOString()
      });

      await loadCaseData(activeCaseId, true);
    } catch (err) {
      setError('Priority update failed: ' + err.message);
      setPriority(caseData?.priority || 'High');
    }
  };

  // Immediate investigator assignment handler
  const handleAssigneeChange = async (newInvestigator) => {
    const activeCaseId = caseData?.case_id || caseId;
    if (!activeCaseId) return;

    setAssignedInvestigator(newInvestigator);
    try {
      const res = await api.updateCaseAssignee(activeCaseId, newInvestigator, caseVersion);
      setCaseVersion(res.version || caseVersion + 1);
      setSaveSuccess(true);
      setSaveMessage(`Case assignment transferred to ${newInvestigator}`);
      setTimeout(() => setSaveSuccess(false), 3000);

      wsService.broadcastLocalEvent('case.assignee_changed', activeCaseId, {
        case_id: activeCaseId,
        new_assignee: newInvestigator,
        version: res.version || caseVersion + 1,
        updated_at: new Date().toISOString()
      });

      await loadCaseData(activeCaseId, true);
    } catch (err) {
      setError('Assignment update failed: ' + err.message);
      setAssignedInvestigator(caseData?.assigned_investigator || '');
    }
  };

  // Add Evidence item
  const handleAddEvidence = async (e) => {
    e.preventDefault();
    const activeCaseId = caseData?.case_id || caseId;
    if (!activeCaseId) {
      alert('Please select an active case first.');
      return;
    }
    if (!evRef.trim()) {
      alert('Please enter a valid reference ID (such as an Account ID or Transaction ID).');
      return;
    }

    setIsAddingEv(true);
    try {
      await api.addCaseEvidence(activeCaseId, {
        evidence_type: evType,
        reference_id: evRef.trim(),
        description: evDesc.trim() || 'Forensic evidence item attached to investigative docket.',
        attached_by: assignedInvestigator
      });

      setShowAddEvidence(false);
      setEvRef('');
      setEvDesc('');

      wsService.broadcastLocalEvent('case.evidence_added', activeCaseId, {
        case_id: activeCaseId,
        evidence_type: evType,
        reference_id: evRef.trim()
      });

      await loadCaseData(activeCaseId, true);
    } catch (err) {
      alert('Failed to attach evidence: ' + err.message);
    } finally {
      setIsAddingEv(false);
    }
  };

  // Remove Evidence item (soft delete preserving audit trail)
  const handleRemoveEvidence = async (evidenceId, referenceId) => {
    const activeCaseId = caseData?.case_id || caseId;
    if (!activeCaseId) return;

    if (!window.confirm(`Are you sure you want to remove evidence reference ${referenceId} from this active dossier? The audit record will be preserved.`)) {
      return;
    }

    try {
      await api.removeCaseEvidence(activeCaseId, evidenceId);

      wsService.broadcastLocalEvent('case.evidence_removed', activeCaseId, {
        case_id: activeCaseId,
        evidence_id: evidenceId
      });

      await loadCaseData(activeCaseId, true);
    } catch (err) {
      alert('Failed to remove evidence: ' + err.message);
    }
  };

  // Link Account
  const handleLinkAccountSubmit = async (e) => {
    e.preventDefault();
    const activeCaseId = caseData?.case_id || caseId;
    if (!activeCaseId || !linkAccId.trim()) return;

    try {
      await api.linkCaseAccount(activeCaseId, linkAccId.trim(), linkAccRole, 'Linked via Investigation Dossier');
      setShowLinkAccount(false);
      setLinkAccId('');

      wsService.broadcastLocalEvent('case.account_linked', activeCaseId, {
        case_id: activeCaseId,
        account_id: linkAccId.trim()
      });

      await loadCaseData(activeCaseId, true);
    } catch (err) {
      alert('Failed to link account: ' + err.message);
    }
  };

  // Unlink Account
  const handleUnlinkAccount = async (accId) => {
    const activeCaseId = caseData?.case_id || caseId;
    if (!activeCaseId) return;

    if (!window.confirm(`Unlink account ${accId} from this investigation?`)) return;
    try {
      await api.unlinkCaseAccount(activeCaseId, accId);

      wsService.broadcastLocalEvent('case.account_unlinked', activeCaseId, {
        case_id: activeCaseId,
        account_id: accId
      });

      await loadCaseData(activeCaseId, true);
    } catch (err) {
      alert('Failed to unlink account: ' + err.message);
    }
  };

  // Link Transaction
  const handleLinkTxnSubmit = async (e) => {
    e.preventDefault();
    const activeCaseId = caseData?.case_id || caseId;
    if (!activeCaseId || !linkTxnId.trim()) return;

    try {
      await api.linkCaseTransaction(activeCaseId, linkTxnId.trim(), linkTxnRelevance, 'Linked via Investigation Dossier');
      setShowLinkTxn(false);
      setLinkTxnId('');

      wsService.broadcastLocalEvent('case.transaction_linked', activeCaseId, {
        case_id: activeCaseId,
        transaction_id: linkTxnId.trim()
      });

      await loadCaseData(activeCaseId, true);
    } catch (err) {
      alert('Failed to link transaction: ' + err.message);
    }
  };

  // Unlink Transaction
  const handleUnlinkTxn = async (txnId) => {
    const activeCaseId = caseData?.case_id || caseId;
    if (!activeCaseId) return;

    if (!window.confirm(`Unlink transaction ${txnId} from this investigation?`)) return;
    try {
      await api.unlinkCaseTransaction(activeCaseId, txnId);

      wsService.broadcastLocalEvent('case.transaction_unlinked', activeCaseId, {
        case_id: activeCaseId,
        transaction_id: txnId
      });

      await loadCaseData(activeCaseId, true);
    } catch (err) {
      alert('Failed to unlink transaction: ' + err.message);
    }
  };

  // Link Complaint
  const handleLinkComplaintSubmit = async (e) => {
    e.preventDefault();
    const activeCaseId = caseData?.case_id || caseId;
    if (!activeCaseId || !linkComplaintId.trim()) return;

    try {
      await api.linkCaseComplaint(activeCaseId, linkComplaintId.trim());
      setShowLinkComplaint(false);
      setLinkComplaintId('');

      wsService.broadcastLocalEvent('case.complaint_linked', activeCaseId, {
        case_id: activeCaseId,
        complaint_id: linkComplaintId.trim()
      });

      await loadCaseData(activeCaseId, true);
    } catch (err) {
      alert('Failed to link complaint: ' + err.message);
    }
  };

  // Export Dossier JSON
  const handleExportDossier = async () => {
    const activeCaseId = caseData?.case_id || caseId;
    if (!activeCaseId) return;

    try {
      const dossier = await api.getCaseDossier(activeCaseId);
      const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FINTRACE_DOSSIER_${dossier.case_number || activeCaseId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  const handleCopyCaseId = (caseNum) => {
    if (!caseNum) return;
    navigator.clipboard.writeText(caseNum);
    setCopiedCaseNum(true);
    setTimeout(() => setCopiedCaseNum(false), 2000);
  };

  const currentStageInfo = STAGE_OPTIONS.find((s) => s.value === status) || STAGE_OPTIONS[0];

  if (loading && !caseData) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-300">
        <RefreshCw className="w-8 h-8 animate-spin text-electric-400" />
        <span className="text-sm font-mono font-medium">Loading Case Dossier & Evidentiary Locker...</span>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-16 text-center rounded-xl bg-navy-900 border border-slate-800 text-slate-300 space-y-4 max-w-xl mx-auto my-12">
        <Briefcase className="w-12 h-12 text-slate-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">No Investigation Cases in Docket</h3>
        <p className="text-sm text-slate-300">
          Create an investigation case first from Mule Detection, Complaints, or Cases page.
        </p>
        <button
          onClick={() => setCurrentPage('cases')}
          className="px-5 py-2.5 bg-electric-600 hover:bg-electric-500 text-white font-bold rounded-lg text-xs shadow-glow-electric transition"
        >
          View Cases Docket
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Navigation Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => setCurrentPage('cases')}
            className="p-2.5 rounded-lg bg-navy-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-2 text-xs font-semibold"
            title="Return to Investigation Docket"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Cases Docket</span>
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Case Number Badge with Copy */}
              <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-electric-300 bg-navy-950 px-3 py-1 rounded-md border border-electric-500/40">
                <span>{caseData.case_number || caseData.case_id}</span>
                <button
                  onClick={() => handleCopyCaseId(caseData.case_number || caseData.case_id)}
                  className="text-slate-500 hover:text-white transition"
                  title="Copy Case Number"
                >
                  {copiedCaseNum ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {caseData.version && (
                <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  Version {caseData.version}
                </span>
              )}

              {/* Case Quick Selector Dropdown */}
              {allCases.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-slate-400 font-bold">SWITCH:</span>
                  <select
                    value={caseData.case_id}
                    onChange={(e) => handleSwitchCase(e.target.value)}
                    className="px-2.5 py-1 bg-navy-950 border border-slate-700 rounded text-electric-300 text-xs font-mono font-semibold focus:outline-none focus:border-electric-400"
                  >
                    {allCases.map((c) => (
                      <option key={c.case_id} value={c.case_id}>
                        {c.case_number || c.case_id} - {c.title.substring(0, 32)}...
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <span className="text-slate-300 text-xs font-mono">
                Initiated: <strong>{caseData.created_at ? new Date(caseData.created_at).toLocaleDateString() : 'Active'}</strong>
              </span>

              <span className={`flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${backendOnline ? 'text-emerald-300 bg-emerald-950/80 border-emerald-500/40' : 'text-rose-300 bg-rose-950/80 border-rose-500/40'}`} title={lastSyncedAt ? `Last database refresh: ${lastSyncedAt.toLocaleTimeString()}` : 'Waiting for database connection'}>
                <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                <span>{backendOnline ? `DB Live · ${lastSyncedAt?.toLocaleTimeString() || 'Connected'}` : 'Database Offline'}</span>
              </span>
            </div>

            <h1 className="text-xl font-black text-white tracking-wide mt-1.5">
              {caseData.title}
            </h1>
            <p className="max-w-3xl text-xs text-slate-400 leading-relaxed mt-1">
              This case file brings together its stage, priority, subject account, investigator, allegation summary, findings, linked records, and attached evidence references.
            </p>
          </div>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Real-time synchronization notice pill */}
          {syncNotice && (
            <div className="px-3 py-1.5 rounded-lg bg-electric-950 border border-electric-500/50 text-electric-300 text-xs font-mono font-semibold flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{syncNotice}</span>
            </div>
          )}

          {/* Ease of Access: Legal Checklist Toggle */}
          <button
            onClick={() => setShowChecklistGuide(!showChecklistGuide)}
            className={`px-3.5 py-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition ${
              showChecklistGuide
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                : 'bg-navy-900 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700'
            }`}
            title="Investigation Checklist & Protocols"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>Checklist</span>
            {showChecklistGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Export Dossier JSON */}
          <button
            onClick={handleExportDossier}
            className="px-4 py-2.5 bg-navy-850 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-2 transition font-mono"
            title="Download complete forensic JSON dossier"
          >
            <Download className="w-4 h-4 text-electric-400" />
            <span>Export Dossier (JSON)</span>
          </button>

          {/* Save Findings Button */}
          <button
            onClick={handleSaveFindings}
            disabled={isSaving}
            className="px-4 py-2.5 bg-electric-600 hover:bg-electric-500 text-white font-bold rounded-lg shadow-glow-electric text-xs flex items-center gap-2 transition disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Saving Changes...' : 'Save Findings'}</span>
          </button>
        </div>
      </div>

      {/* Ease of Access: Investigation Checklist Banner */}
      {showChecklistGuide && (
        <div className="p-5 rounded-xl bg-gradient-to-r from-navy-900 via-navy-850 to-navy-900 border border-electric-500/40 shadow-lg space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm tracking-wide">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Investigator Standard Operating Checklist (PMLA / CrPC Forensic Standards)</span>
            </div>
            <button
              onClick={() => setShowChecklistGuide(false)}
              className="text-xs text-slate-400 hover:text-white font-mono flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Dismiss</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-navy-950/80 border border-slate-800 space-y-1.5">
              <div className="font-bold text-electric-300">1. Forensic Fund Tracing</div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Click <strong>"Trail"</strong> or <strong>"Graph"</strong> next to the primary subject account to trace the multi-hop fund flows and pinpoint aggregator mule nodes.
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-navy-950/80 border border-slate-800 space-y-1.5">
              <div className="font-bold text-amber-300">2. Chain of Custody Evidence</div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Attach existing account, transaction, or complaint records. SHA-256 hashes help detect later record changes; they do not verify source authenticity or legal admissibility.
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-navy-950/80 border border-slate-800 space-y-1.5">
              <div className="font-bold text-emerald-300">3. Investigator Review</div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Verify every linked source record, save investigator notes, then export the case JSON dossier for review.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {saveSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn font-mono font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveMessage || 'Case updated in secure database.'}</span>
        </div>
      )}

      {/* Error Notification Banner */}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-950/90 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2.5 animate-fadeIn font-mono font-semibold">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Case Metadata Controls Bar */}
      <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Stage / Status */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            INVESTIGATION STAGE
          </label>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-navy-950 border border-slate-700 rounded-lg text-white font-bold text-xs focus:outline-none focus:border-electric-400 transition"
          >
            {STAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="text-[11px] text-slate-400 font-sans leading-tight">
            {currentStageInfo.hint}
          </div>
        </div>

        {/* Priority Rating */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            PRIORITY RATING
          </label>
          <select
            value={priority}
            onChange={(e) => handlePriorityChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-navy-950 border border-slate-700 rounded-lg text-white font-bold text-xs focus:outline-none focus:border-electric-400 transition"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="text-[11px] text-slate-400 font-sans">
            Directly governs case queue priority and alert routing velocity.
          </div>
        </div>

        {/* Primary Subject Account */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            PRIMARY SUBJECT ACCOUNT
          </label>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-electric-300 bg-navy-950 px-3 py-2.5 rounded-lg border border-slate-700 flex-1 truncate">
              {caseData.primary_account_id || 'Not specified'}
            </span>
            {caseData.primary_account_id && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    if (onAccountSelect) onAccountSelect(caseData.primary_account_id);
                    setCurrentPage('money-trail');
                  }}
                  className="px-2.5 py-2.5 bg-navy-850 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition"
                  title="Trace fund flows in Money Trail"
                >
                  <GitCommit className="w-3.5 h-3.5 text-amber-400" />
                  <span>Trail</span>
                </button>
                <button
                  onClick={() => {
                    if (onAccountSelect) onAccountSelect(caseData.primary_account_id);
                    setCurrentPage('graph');
                  }}
                  className="px-2.5 py-2.5 bg-navy-850 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition"
                  title="Inspect in Graph Canvas"
                >
                  <Network className="w-3.5 h-3.5 text-purple-400" />
                  <span>Graph</span>
                </button>
              </div>
            )}
          </div>
          <div className="text-[11px] text-slate-400 font-sans">
            {caseData.primary_account_id
              ? 'Exact account ID from the shared transaction records.'
              : 'No primary account is set. Link a real account record to identify the main subject.'}
          </div>
        </div>

        {/* Assigned Investigator */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            ASSIGNED INVESTIGATOR
          </label>
          {investigatorsList.length > 0 ? (
            <select
              value={assignedInvestigator}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-navy-950 border border-slate-700 rounded-lg text-white font-bold text-xs focus:outline-none focus:border-electric-400 transition"
            >
              {investigatorsList.map((inv) => (
                <option key={inv.id || inv.badge_id} value={inv.name}>
                  {inv.name} ({inv.badge_id})
                </option>
              ))}
            </select>
          ) : (
            <div className="font-bold text-white bg-navy-950 px-3 py-2.5 rounded-lg border border-slate-700 text-xs truncate">
              {assignedInvestigator || 'Investigator'}
            </div>
          )}
          <div className="text-[11px] text-slate-400 font-sans">
            Lead forensic officer responsible for statutory filings.
          </div>
        </div>
      </div>

      <div className={`p-3.5 rounded-lg border text-xs leading-relaxed ${/synthetic|demo|sample/i.test(caseData.source_type || '') ? 'bg-amber-950/50 border-amber-500/40 text-amber-100' : 'bg-navy-900 border-slate-700 text-slate-300'}`}>
        <strong>{/synthetic|demo|sample/i.test(caseData.source_type || '') ? 'Synthetic source:' : 'Source and evidence note:'}</strong>{' '}
        {caseData.source_type ? `This case is marked as ${caseData.source_type}${caseData.source_reference_id ? ` (${caseData.source_reference_id})` : ''}.` : 'Case fields and linked records below are loaded from the application database.'} Verify source records before treating narrative or model signals as findings. Evidence hashes cover reference metadata, not the original source file or transaction contents, and do not establish authenticity or legal admissibility.
      </div>

      {/* Case Dossier Body: narrative first, linked records and evidence below */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Section 1: Investigative Summary */}
          <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <FileText className="w-4 h-4 text-electric-400" />
                <span>INVESTIGATIVE SUMMARY & ALLEGATION PREMISE</span>
              </h2>
              <span className="text-xs font-mono text-slate-400">Persistent Editable Record</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Enter the core allegation premise, initial complainant statement, originating police FIR details, or trigger alerts.
            </p>
            <textarea
              rows={4}
              value={summary}
              onFocus={() => { isEditingSummaryRef.current = true; }}
              onBlur={() => { isEditingSummaryRef.current = false; }}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Record the official allegation premise, victim FIR origins, and primary suspicion nexus..."
              className="w-full px-3.5 py-3 bg-navy-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-electric-400 leading-relaxed resize-none font-sans placeholder:text-slate-500 shadow-inner"
            />
          </div>

          {/* Section 2: Detailed Findings */}
          <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-electric-400" />
                <span>DETAILED INVESTIGATION FINDINGS & MULE NETWORK NEXUS</span>
              </h2>
              <span className="text-xs font-mono text-slate-400">Investigator Notes</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Record observations and cite the source account, transaction, or alert IDs. Separate verified records from model signals and investigator hypotheses.
            </p>
            <textarea
              rows={9}
              value={findings}
              onFocus={() => { isEditingFindingsRef.current = true; }}
              onBlur={() => { isEditingFindingsRef.current = false; }}
              onChange={(e) => setFindings(e.target.value)}
              placeholder="Example: TXN_10167 (₹340,000) moves MULE_AGG_01 → MULE_LAYER_02 at 2026-10-12 22:15. This is bundled synthetic demo data; verify the transaction record before describing it as a finding."
              className="w-full px-3.5 py-3 bg-navy-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-electric-400 leading-relaxed resize-none font-sans placeholder:text-slate-500 shadow-inner"
            />
            <div className="flex justify-end pt-1">
              <button
                onClick={handleSaveFindings}
                disabled={isSaving}
                className="px-4 py-2 bg-electric-600 hover:bg-electric-500 text-white font-bold rounded-lg text-xs flex items-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Narrative Changes</span>
              </button>
            </div>
          </div>

        </div>

        {/* Linked records and evidence share a focused workspace row. */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-7">
          {/* Quick Tabbed Sub-Section for Accounts, Transactions, Complaints, Audit */}
          <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">CASE RECORDS</h2>
              <p className="text-xs text-slate-400 leading-relaxed mt-1">
                Browse the accounts and transfers linked to this case, related complaint records, or the case activity log. Counts show how many records are currently linked.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <button
                  onClick={() => setActiveTab('accounts')}
                  className={`px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'accounts'
                      ? 'bg-electric-500/25 text-electric-300 border border-electric-500/60 shadow-sm'
                      : 'bg-navy-950 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Linked Accounts ({caseData.linked_accounts?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('transactions')}
                  className={`px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'transactions'
                      ? 'bg-electric-500/25 text-electric-300 border border-electric-500/60 shadow-sm'
                      : 'bg-navy-950 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Linked Transfers ({caseData.linked_transactions?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('complaints')}
                  className={`px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'complaints'
                      ? 'bg-electric-500/25 text-electric-300 border border-electric-500/60 shadow-sm'
                      : 'bg-navy-950 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Correlated FIRs ({caseData.correlated_complaints?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('audit')}
                  className={`px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'audit'
                      ? 'bg-electric-500/25 text-electric-300 border border-electric-500/60 shadow-sm'
                      : 'bg-navy-950 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Audit Trail ({caseData.audit_logs?.length || 0})</span>
                </button>
              </div>
            </div>

            {/* Tab: Linked Accounts */}
            {activeTab === 'accounts' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-xs font-bold">Syndicate Counterparties & Subject Nodes</span>
                  <button
                    onClick={() => setShowLinkAccount(!showLinkAccount)}
                    className="px-3 py-1.5 bg-navy-850 hover:bg-slate-700 text-electric-300 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Link Account</span>
                  </button>
                </div>

                {showLinkAccount && (
                  <form onSubmit={handleLinkAccountSubmit} className="p-3.5 bg-navy-950 border border-slate-700 rounded-lg space-y-3 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-slate-300 font-bold mb-1">ACCOUNT IDENTIFIER *</label>
                        <input
                          type="text"
                          required
                          value={linkAccId}
                          onChange={(e) => setLinkAccId(e.target.value)}
                          placeholder="e.g. MULE_AGG_01"
                          className="w-full px-3 py-2 bg-navy-900 border border-slate-700 rounded text-white text-xs font-mono focus:border-electric-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-300 font-bold mb-1">ROLE / CLASSIFICATION</label>
                        <input
                          type="text"
                          value={linkAccRole}
                          onChange={(e) => setLinkAccRole(e.target.value)}
                          placeholder="e.g. Conduit Mule, Aggregator Hub"
                          className="w-full px-3 py-2 bg-navy-900 border border-slate-700 rounded text-white text-xs focus:border-electric-400"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowLinkAccount(false)}
                        className="px-3 py-1.5 text-slate-400 hover:text-white text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-electric-600 hover:bg-electric-500 text-white rounded text-xs font-bold shadow-sm"
                      >
                        Confirm Link
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2.5">
                  {(caseData.linked_accounts || []).map((acc) => (
                    <div
                      key={acc.account_id}
                      className="p-3 rounded-lg bg-navy-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{acc.account_id}</span>
                          <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-200 border border-slate-700 font-semibold">
                            {acc.role}
                          </span>
                          {acc.risk_score > 0 && (
                            <span className="text-xs text-rose-400 font-bold">
                              {(acc.risk_score * 100).toFixed(1)}% Risk
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-300 font-sans mt-0.5">
                          {acc.customer_name || 'Verified Subject'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (onAccountSelect) onAccountSelect(acc.account_id);
                            setCurrentPage('money-trail');
                          }}
                          className="px-2.5 py-1.5 bg-navy-850 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold flex items-center gap-1 border border-slate-700"
                          title="Trace account fund flow"
                        >
                          <GitCommit className="w-3.5 h-3.5 text-amber-400" />
                          <span>Trail</span>
                        </button>
                        <button
                          onClick={() => {
                            if (onAccountSelect) onAccountSelect(acc.account_id);
                            setCurrentPage('graph');
                          }}
                          className="px-2.5 py-1.5 bg-navy-850 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold flex items-center gap-1 border border-slate-700"
                          title="Inspect account in graph"
                        >
                          <Network className="w-3.5 h-3.5 text-purple-400" />
                          <span>Graph</span>
                        </button>
                        <button
                          onClick={() => handleUnlinkAccount(acc.account_id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition"
                          title="Unlink account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(!caseData.linked_accounts || caseData.linked_accounts.length === 0) && (
                    <div className="p-6 text-center text-slate-400 text-xs font-mono bg-navy-950/60 rounded-lg border border-slate-800/80">
                      No secondary accounts linked yet. Click "Link Account" above to associate suspect nodes.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Linked Transactions */}
            {activeTab === 'transactions' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-xs font-bold">Flagged Transfer References</span>
                  <button
                    onClick={() => setShowLinkTxn(!showLinkTxn)}
                    className="px-3 py-1.5 bg-navy-850 hover:bg-slate-700 text-electric-300 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Link Transfer</span>
                  </button>
                </div>

                {showLinkTxn && (
                  <form onSubmit={handleLinkTxnSubmit} className="p-3.5 bg-navy-950 border border-slate-700 rounded-lg space-y-3 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-slate-300 font-bold mb-1">TRANSACTION IDENTIFIER *</label>
                        <input
                          type="text"
                          required
                          value={linkTxnId}
                          onChange={(e) => setLinkTxnId(e.target.value)}
                          placeholder="e.g. TXN_3_SZ..."
                          className="w-full px-3 py-2 bg-navy-900 border border-slate-700 rounded text-white text-xs font-mono focus:border-electric-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-300 font-bold mb-1">RELEVANCE / NOTE</label>
                        <input
                          type="text"
                          value={linkTxnRelevance}
                          onChange={(e) => setLinkTxnRelevance(e.target.value)}
                          placeholder="e.g. Rapid Layering Hop, Cash Out"
                          className="w-full px-3 py-2 bg-navy-900 border border-slate-700 rounded text-white text-xs focus:border-electric-400"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowLinkTxn(false)}
                        className="px-3 py-1.5 text-slate-400 hover:text-white text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-electric-600 hover:bg-electric-500 text-white rounded text-xs font-bold shadow-sm"
                      >
                        Confirm Link
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2.5">
                  {(caseData.linked_transactions || []).map((txn) => (
                    <div
                      key={txn.transaction_id}
                      className="p-3 rounded-lg bg-navy-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-white text-sm">{txn.transaction_id}</span>
                          <span className="text-xs text-amber-300 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
                            INR {Number(txn.amount || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 truncate max-w-sm font-sans mt-0.5">
                          {txn.relevance || 'Flagged Transfer'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-1">
                          {txn.sender_account || 'Unknown sender'} → {txn.receiver_account || 'Unknown recipient'}
                          {txn.timestamp ? ` · ${new Date(txn.timestamp).toLocaleString()}` : ''}
                        </div>
                      </div>

                      <button
                        onClick={() => handleUnlinkTxn(txn.transaction_id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition"
                        title="Unlink transaction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {(!caseData.linked_transactions || caseData.linked_transactions.length === 0) && (
                    <div className="p-6 text-center text-slate-400 text-xs font-mono bg-navy-950/60 rounded-lg border border-slate-800/80">
                      No transactions linked yet. Click "Link Transfer" above to document specific fund movements.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Correlated Complaints */}
            {activeTab === 'complaints' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-xs font-bold">1930 Cybercrime Portal Reports & Police FIRs</span>
                  <button
                    onClick={() => setShowLinkComplaint(!showLinkComplaint)}
                    className="px-3 py-1.5 bg-navy-850 hover:bg-slate-700 text-electric-300 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Link FIR</span>
                  </button>
                </div>

                {showLinkComplaint && (
                  <form onSubmit={handleLinkComplaintSubmit} className="p-3.5 bg-navy-950 border border-slate-700 rounded-lg space-y-3 animate-fadeIn">
                    <div>
                      <label className="block text-[11px] text-slate-300 font-bold mb-1">FIR / COMPLAINT IDENTIFIER *</label>
                      <input
                        type="text"
                        required
                        value={linkComplaintId}
                        onChange={(e) => setLinkComplaintId(e.target.value)}
                        placeholder="e.g. CMP-2026-8812"
                        className="w-full px-3 py-2 bg-navy-900 border border-slate-700 rounded text-white text-xs font-mono focus:border-electric-400"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowLinkComplaint(false)}
                        className="px-3 py-1.5 text-slate-400 hover:text-white text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-electric-600 hover:bg-electric-500 text-white rounded text-xs font-bold shadow-sm"
                      >
                        Confirm Link
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2.5">
                  {(caseData.correlated_complaints || []).map((cmp) => (
                    <div
                      key={cmp.complaint_id}
                      className="p-3 rounded-lg bg-navy-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-white text-sm">{cmp.complaint_id}</span>
                          <span className="text-xs text-rose-300 font-bold bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/40">
                            Loss: INR {Number(cmp.amount_lost || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 font-sans mt-0.5">
                          Complainant: <strong>{cmp.complainant_name}</strong>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded text-xs font-bold bg-sky-950 text-sky-300 border border-sky-500/40">
                        {cmp.status || 'Active'}
                      </span>
                    </div>
                  ))}

                  {(!caseData.correlated_complaints || caseData.correlated_complaints.length === 0) && (
                    <div className="p-6 text-center text-slate-400 text-xs font-mono bg-navy-950/60 rounded-lg border border-slate-800/80">
                      No cybercrime complaints linked yet. Click "Link FIR" above to cross-reference victim statements.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Audit Trail */}
            {activeTab === 'audit' && (
              <div className="space-y-2.5 font-mono text-xs max-h-[340px] overflow-y-auto pr-1">
                {(caseData.audit_logs || []).map((aud) => (
                  <div
                    key={aud.id}
                    className="p-3 rounded-lg bg-navy-950 border border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-electric-300 font-bold bg-navy-900 px-2 py-0.5 rounded border border-slate-700">
                        {aud.action}
                      </span>
                      <span className="text-slate-400">
                        {aud.timestamp ? new Date(aud.timestamp).toLocaleString() : 'Recorded'}
                      </span>
                    </div>
                    <div className="text-slate-200 font-sans leading-relaxed text-xs">{aud.details}</div>
                    <div className="text-[11px] text-slate-400">Recorded by: <strong>{aud.user || 'System'}</strong></div>
                  </div>
                ))}

                {(!caseData.audit_logs || caseData.audit_logs.length === 0) && (
                  <div className="p-6 text-center text-slate-400 text-xs font-mono bg-navy-950/60 rounded-lg border border-slate-800/80">
                    No explicit audit logs recorded yet for this case.
                  </div>
                )}
              </div>
            )}
          </div>
          </div>

        {/* Right Column: Evidentiary Locker (1 Col) */}
        <div className="xl:col-span-5 p-5 rounded-xl bg-navy-900 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Lock className="w-4 h-4 text-electric-400" />
                  <span>EVIDENTIARY LOCKER</span>
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Evidence references & metadata integrity</p>
                <p className="text-xs text-slate-400 leading-relaxed mt-2 max-w-md">
                  Attach an existing account, transaction, or complaint ID to keep its reference and description with this case. This prototype stores a metadata hash; it does not copy or verify the original source.
                </p>
              </div>

              <button
                onClick={() => setShowAddEvidence(!showAddEvidence)}
                className="px-3 py-1.5 bg-navy-850 hover:bg-slate-700 text-electric-300 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition font-mono"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Attach</span>
              </button>
            </div>

            {/* Ease of Access: Evidence Protocol Banner */}
            <div className="p-3 rounded-lg bg-electric-950/40 border border-electric-500/30 text-xs text-slate-300 leading-relaxed font-sans flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-electric-400 shrink-0 mt-0.5" />
              <span>
                <strong>Metadata hash:</strong> SHA-256 covers the evidence reference, description, and timestamp. It does not hash the referenced transaction or file, prove authenticity, or establish court admissibility.
              </span>
            </div>

            {/* Add Evidence Drawer */}
            {showAddEvidence && (
              <form onSubmit={handleAddEvidence} className="p-4 rounded-xl bg-navy-950 border border-slate-700 space-y-3.5 text-xs animate-fadeIn font-mono">
                <div>
                  <label className="block text-slate-300 text-xs font-bold mb-1.5 font-mono">EVIDENCE TYPE *</label>
                  <select
                    value={evType}
                    onChange={(e) => setEvType(e.target.value)}
                    className="w-full px-3 py-2 bg-navy-900 border border-slate-700 rounded-lg text-white text-xs font-mono focus:border-electric-400"
                  >
                    <option value="ACCOUNT">Bank Account Subject</option>
                    <option value="TRANSACTION">Transaction Reference</option>
                    <option value="GRAPH_SUBGRAPH">Network Subgraph</option>
                    <option value="COMPLAINT">Cyber Crime FIR (1930)</option>
                    <option value="GNN_ALERT">Neural Network Signal</option>
                    <option value="DOCUMENT">Judicial Affidavit / Document</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-300 text-xs font-bold font-mono">REFERENCE IDENTIFIER *</label>
                    {caseData.primary_account_id && (
                      <button
                        type="button"
                        onClick={() => {
                          setEvRef(caseData.primary_account_id);
                          setEvType('ACCOUNT');
                        }}
                        className="text-[11px] text-electric-400 hover:text-electric-300 font-mono underline"
                        title="Quick-fill primary subject account"
                      >
                        + Insert Primary Subject
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={evRef}
                    onChange={(e) => setEvRef(e.target.value)}
                    placeholder="e.g. MULE_AGG_01 or TXN_10167"
                    className="w-full px-3 py-2 bg-navy-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-electric-400"
                  />

                  {/* Ease of Access: Quick-Pick Chips from Linked Entities */}
                  {((caseData.linked_accounts?.length || 0) > 0 || (caseData.linked_transactions?.length || 0) > 0) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-1.5 border-t border-slate-800">
                      <span className="text-[10px] text-slate-400">Quick-Pick:</span>
                      {(caseData.linked_accounts || []).slice(0, 3).map((a) => (
                        <button
                          key={a.account_id}
                          type="button"
                          onClick={() => {
                            setEvRef(a.account_id);
                            setEvType('ACCOUNT');
                          }}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono"
                        >
                          {a.account_id}
                        </button>
                      ))}
                      {(caseData.linked_transactions || []).slice(0, 2).map((t) => (
                        <button
                          key={t.transaction_id}
                          type="button"
                          onClick={() => {
                            setEvRef(t.transaction_id);
                            setEvType('TRANSACTION');
                          }}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono truncate max-w-[100px]"
                        >
                          {t.transaction_id}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-bold mb-1.5 font-mono">DESCRIPTION & FORENSIC SIGNIFICANCE</label>
                  <textarea
                    rows={2}
                    value={evDesc}
                    onChange={(e) => setEvDesc(e.target.value)}
                    placeholder="Explain why this item is crucial to the investigation..."
                    className="w-full px-3 py-2 bg-navy-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-electric-400 font-sans"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1 font-mono">
                  <button
                    type="button"
                    onClick={() => setShowAddEvidence(false)}
                    className="px-3 py-1.5 text-slate-400 hover:text-white text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingEv}
                    className="px-4 py-1.5 bg-electric-600 hover:bg-electric-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    {isAddingEv ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{isAddingEv ? 'Securing Hash...' : 'Add to Locker'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Evidence Items List */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {(caseData.evidence_items || []).map((ev) => (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-lg bg-navy-950 border border-slate-800 text-xs space-y-2 hover:border-slate-700 transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-electric-300 bg-electric-950/80 px-2 py-0.5 rounded border border-electric-500/40">
                      {ev.evidence_type}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">
                        {ev.created_at ? new Date(ev.created_at).toLocaleDateString() : 'Logged'}
                      </span>
                      <button
                        onClick={() => handleRemoveEvidence(ev.id, ev.reference_id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition"
                        title="Remove evidence"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono font-bold text-white text-sm truncate">
                      {ev.reference_id}
                    </div>

                    {/* Quick navigation for Account or Transaction evidence */}
                    {ev.evidence_type === 'ACCOUNT' && (
                      <button
                        onClick={() => {
                          if (onAccountSelect) onAccountSelect(ev.reference_id);
                          setCurrentPage('money-trail');
                        }}
                        className="px-2 py-0.5 bg-navy-850 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[10px] font-mono shrink-0"
                        title="Trace this account"
                      >
                        Trace
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    {ev.description}
                  </p>

                  {ev.integrity_hash && (
                    <div className="text-[11px] font-mono text-slate-400 truncate pt-1.5 border-t border-slate-900 flex items-center justify-between">
                      <span className="truncate max-w-[200px]" title={`SHA-256: ${ev.integrity_hash}`}>
                        SHA-256: {ev.integrity_hash.substring(0, 16)}...
                      </span>
                      <span className="text-emerald-400 font-bold shrink-0">Metadata hash</span>
                    </div>
                  )}
                </div>
              ))}

              {(!caseData.evidence_items || caseData.evidence_items.length === 0) && (
                <div className="p-8 text-center text-slate-400 text-xs font-mono bg-navy-950/60 rounded-lg border border-slate-800/80">
                  No source records are attached yet. Use “Attach” and enter an account, transaction, or complaint ID that exists in the database.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 font-mono flex items-center justify-between">
            <span>Case record: <strong>{caseData.case_id}</strong></span>
            <span className="font-bold flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${caseData.evidence_items?.some((item) => item.integrity_hash) ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              {caseData.evidence_items?.some((item) => item.integrity_hash)
                ? 'Evidence metadata hashed'
                : 'No evidence hash recorded'}
            </span>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
