import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Briefcase,
  Search,
  Plus,
  Filter,
  ArrowRight,
  ShieldAlert,
  Clock,
  UserCheck,
  FileText,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  GitCommit,
  Radio,
  SlidersHorizontal,
  X,
  HelpCircle,
  Network,
  Share2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  ExternalLink,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { wsService } from '../services/websocket';

const STAGE_CONFIG = {
  New: {
    label: 'New (Intake)',
    badge: 'bg-sky-950/80 text-sky-300 border-sky-500/50',
    dot: 'bg-sky-400'
  },
  Under_Investigation: {
    label: 'Under Investigation',
    badge: 'bg-[#93C5FD]/15/80 text-[#6E6264] border-[#93C5FD]/50',
    dot: 'bg-amber-400'
  },
  'Under Investigation': {
    label: 'Under Investigation',
    badge: 'bg-[#93C5FD]/15/80 text-[#6E6264] border-[#93C5FD]/50',
    dot: 'bg-amber-400'
  },
  'Active Investigation': {
    label: 'Active Investigation',
    badge: 'bg-[#93C5FD]/15/80 text-[#6E6264] border-[#93C5FD]/50',
    dot: 'bg-amber-400'
  },
  'Under Review': {
    label: 'Under Review',
    badge: 'bg-[#F7D6D0] text-[#B86B7A] border-[#E2B4BD]',
    dot: 'bg-[#B86B7A]'
  },
  'Pending Review': {
    label: 'Pending Review',
    badge: 'bg-[#F7D6D0] text-[#B86B7A] border-[#E2B4BD]',
    dot: 'bg-[#B86B7A]'
  },
  Escalated: {
    label: 'Escalated to FIU/LE',
    badge: 'bg-[#FF3B4E]/15/80 text-[#FF3B4E] border-[#FF3B4E]/60 shadow-glow-danger',
    dot: 'bg-rose-400 animate-ping'
  },
  Closed: {
    label: 'Closed / Frozen',
    badge: 'bg-[#93C5FD]/15/80 text-[#6E6264] border-[#93C5FD]/50',
    dot: 'bg-emerald-400'
  },
  Reopened: {
    label: 'Reopened Case',
    badge: 'bg-orange-950/80 text-orange-300 border-orange-500/50',
    dot: 'bg-orange-400'
  }
};

const STAGE_DROPDOWN_OPTIONS = [
  'New',
  'Under_Investigation',
  'Under Review',
  'Pending Review',
  'Escalated',
  'Closed',
  'Reopened'
];

const PRIORITY_BADGES = {
  Critical: 'bg-rose-600 text-white font-extrabold shadow-sm border border-rose-400',
  CRITICAL: 'bg-rose-600 text-white font-extrabold shadow-sm border border-rose-400',
  High: 'bg-[#FF3B4E]/15/90 text-[#FF3B4E] border border-[#FF3B4E]/60 font-bold',
  HIGH: 'bg-[#FF3B4E]/15/90 text-[#FF3B4E] border border-[#FF3B4E]/60 font-bold',
  Medium: 'bg-[#93C5FD]/15/90 text-[#6E6264] border border-[#93C5FD]/50 font-bold',
  MEDIUM: 'bg-[#93C5FD]/15/90 text-[#6E6264] border border-[#93C5FD]/50 font-bold',
  Low: 'bg-[#FFFFFF] text-[#6E6264] border border-[#E8C2BB] font-semibold',
  LOW: 'bg-[#FFFFFF] text-[#6E6264] border border-[#E8C2BB] font-semibold'
};

const PRIORITY_DROPDOWN_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];

const SOURCE_ICONS = {
  'GNN Alert': AlertCircle,
  'Money Trail': GitCommit,
  Complaint: ShieldAlert,
  Manual: Briefcase
};

export default function CasesPage({
  setCurrentPage,
  setSelectedCaseId,
  selectedCaseId,
  onOpenCreateCase,
  onAccountSelect,
  refreshTrigger
}) {
  const [cases, setCases] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [investigatorFilter, setInvestigatorFilter] = useState('ALL');
  const [investigatorsList, setInvestigatorsList] = useState([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Ease of access guide toggle & feedback
  const [showQuickGuide, setShowQuickGuide] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [syncNotice, setSyncNotice] = useState(null);

  // Load available investigators
  useEffect(() => {
    api.getInvestigators()
      .then((list) => {
        if (Array.isArray(list)) setInvestigatorsList(list);
      })
      .catch(() => {});
  }, []);

  const fetchCasesAndSummary = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;
      if (sourceFilter !== 'ALL') params.source_type = sourceFilter;
      if (investigatorFilter !== 'ALL') params.investigator = investigatorFilter;

      const [casesRes, summaryRes] = await Promise.all([
        api.getCases(params),
        api.getCasesSummary().catch(() => null)
      ]);

      const casesList = Array.isArray(casesRes) ? casesRes : (casesRes?.cases || []);
      setCases(casesList);
      if (summaryRes) setSummary(summaryRes);
    } catch (err) {
      console.error('[FinTrace Cases] Error fetching cases:', err);
      setError(err.message || 'Failed to load investigation cases docket.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [search, statusFilter, priorityFilter, sourceFilter, investigatorFilter]);

  // Initial load & filter reaction
  useEffect(() => {
    fetchCasesAndSummary();
  }, [fetchCasesAndSummary]);

  // Background refresh on global refreshTrigger
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchCasesAndSummary(true);
    }
  }, [refreshTrigger, fetchCasesAndSummary]);

  // Real-time listener for WebSocket and cross-tab sync events
  useEffect(() => {
    const handleCaseEvent = (msg) => {
      if (!msg || !msg.event || !msg.event.startsWith('case.')) return;

      console.log('[FinTrace Cases] Real-time event synchronized:', msg.event, msg.case_id);

      // Instant optimistic state update for zero latency
      if (msg.event === 'case.status_changed' && msg.data) {
        setCases((prev) =>
          prev.map((c) =>
            c.case_id === msg.case_id || c.case_number === msg.case_id
              ? {
                  ...c,
                  status: msg.data.new_status || c.status,
                  updated_at: msg.data.updated_at || new Date().toISOString()
                }
              : c
          )
        );
        showSyncBadge(`Case ${msg.case_id} status updated to ${msg.data.new_status}`);
      } else if (msg.event === 'case.priority_changed' && msg.data) {
        setCases((prev) =>
          prev.map((c) =>
            c.case_id === msg.case_id || c.case_number === msg.case_id
              ? {
                  ...c,
                  priority: msg.data.new_priority || c.priority,
                  updated_at: msg.data.updated_at || new Date().toISOString()
                }
              : c
          )
        );
        showSyncBadge(`Case ${msg.case_id} priority set to ${msg.data.new_priority}`);
      } else if (msg.event === 'case.assignee_changed' && msg.data) {
        setCases((prev) =>
          prev.map((c) =>
            c.case_id === msg.case_id || c.case_number === msg.case_id
              ? {
                  ...c,
                  assigned_investigator: msg.data.new_assignee || c.assigned_investigator,
                  updated_at: msg.data.updated_at || new Date().toISOString()
                }
              : c
          )
        );
      } else if (msg.event === 'case.evidence_added') {
        setCases((prev) =>
          prev.map((c) =>
            c.case_id === msg.case_id || c.case_number === msg.case_id
              ? {
                  ...c,
                  evidence_count: (c.evidence_count || 0) + 1,
                  updated_at: new Date().toISOString()
                }
              : c
          )
        );
        showSyncBadge(`Evidence attached to ${msg.case_id}`);
      } else if (msg.event === 'case.evidence_removed') {
        setCases((prev) =>
          prev.map((c) =>
            c.case_id === msg.case_id || c.case_number === msg.case_id
              ? {
                  ...c,
                  evidence_count: Math.max(0, (c.evidence_count || 1) - 1),
                  updated_at: new Date().toISOString()
                }
              : c
          )
        );
      } else if (msg.event === 'case.created' && msg.data) {
        showSyncBadge(`New case created: ${msg.case_id}`);
      }

      // Reconcile with database silently in the background
      fetchCasesAndSummary(true);
    };

    const unsubscribe = wsService.subscribe(handleCaseEvent);
    return () => unsubscribe();
  }, [fetchCasesAndSummary]);

  const showSyncBadge = (msg) => {
    setSyncNotice(msg);
    setTimeout(() => setSyncNotice(null), 3000);
  };

  const handleOpenCase = (caseId) => {
    if (setSelectedCaseId) setSelectedCaseId(caseId);
    setCurrentPage('case-details');
  };

  const handleTraceFundFlow = (e, accountId) => {
    e.stopPropagation();
    if (!accountId) return;
    if (onAccountSelect) onAccountSelect(accountId);
    setCurrentPage('money-trail');
  };

  const handleInspectGraph = (e, accountId) => {
    e.stopPropagation();
    if (!accountId) return;
    if (onAccountSelect) onAccountSelect(accountId);
    setCurrentPage('graph');
  };

  const handleCopyCaseNumber = (e, caseNumber) => {
    e.stopPropagation();
    if (!caseNumber) return;
    navigator.clipboard.writeText(caseNumber);
    setCopiedId(caseNumber);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Quick In-Place Status Change (Instant Sync to DB & Dossier)
  const handleQuickStatusChange = async (e, caseId, newStatus) => {
    e.stopPropagation();
    try {
      // Optimistic local update
      setCases((prev) =>
        prev.map((c) => (c.case_id === caseId ? { ...c, status: newStatus, updated_at: new Date().toISOString() } : c))
      );
      await api.updateCaseStatus(caseId, newStatus);
      wsService.broadcastLocalEvent('case.status_changed', caseId, {
        case_id: caseId,
        new_status: newStatus,
        updated_at: new Date().toISOString()
      });
      showSyncBadge(`Status synced: ${newStatus.replace('_', ' ')}`);
      fetchCasesAndSummary(true);
    } catch (err) {
      console.error('Quick status update failed:', err);
      fetchCasesAndSummary(true);
    }
  };

  // Quick In-Place Priority Change (Instant Sync to DB & Dossier)
  const handleQuickPriorityChange = async (e, caseId, newPriority) => {
    e.stopPropagation();
    try {
      // Optimistic local update
      setCases((prev) =>
        prev.map((c) => (c.case_id === caseId ? { ...c, priority: newPriority, updated_at: new Date().toISOString() } : c))
      );
      await api.updateCasePriority(caseId, newPriority);
      wsService.broadcastLocalEvent('case.priority_changed', caseId, {
        case_id: caseId,
        new_priority: newPriority,
        updated_at: new Date().toISOString()
      });
      showSyncBadge(`Priority synced: ${newPriority}`);
      fetchCasesAndSummary(true);
    } catch (err) {
      console.error('Quick priority update failed:', err);
      fetchCasesAndSummary(true);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setSourceFilter('ALL');
    setInvestigatorFilter('ALL');
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    sourceFilter !== 'ALL' ||
    investigatorFilter !== 'ALL';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & New Case Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8C2BB]/80 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-[#4A4A4A] tracking-tight flex items-center gap-2.5">
              <Briefcase className="w-6 h-6 text-[#B86B7A]" />
              <span>Investigation Case Management Docket</span>
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#93C5FD]/15/90 border border-[#93C5FD]/40 text-xs font-mono font-bold text-[#6E6264]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Synced</span>
            </span>
          </div>
          <p className="text-sm text-[#6E6264] font-medium mt-1.5 leading-relaxed max-w-3xl">
            Centralized judicial case management connecting forensic transaction tracing, GNN mule detections, evidentiary lockers, and audit trails.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Real-time synchronization notice pill */}
          {syncNotice && (
            <div className="px-3 py-1.5 rounded-none bg-electric-950 border border-[#E2B4BD] text-[#B86B7A] text-xs font-mono font-semibold flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#6E6264]" />
              <span>{syncNotice}</span>
            </div>
          )}

          {/* Ease of Access: Quick Help Guide Toggle */}
          <button
            onClick={() => setShowQuickGuide(!showQuickGuide)}
            className={`px-3.5 py-2 rounded-none border text-xs font-semibold flex items-center gap-2 transition ${
              showQuickGuide
                ? 'bg-amber-500/20 text-[#6E6264] border-[#93C5FD]/60 shadow-sm'
                : 'bg-[#FFFFFF] text-[#6E6264] hover:text-[#4A4A4A] hover:bg-[#FFFFFF] border-[#E8C2BB]'
            }`}
            title="Toggle Investigator Workflow Guide"
          >
            <HelpCircle className="w-4 h-4 text-[#6E6264]" />
            <span>How to Investigate</span>
            {showQuickGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Refresh Action */}
          <button
            onClick={() => fetchCasesAndSummary()}
            disabled={loading}
            className="p-2.5 rounded-none bg-[#FFFFFF] hover:bg-[#FFFFFF] text-[#4A4A4A] hover:text-[#4A4A4A] border border-[#E8C2BB] transition text-xs font-semibold flex items-center gap-2"
            title="Refresh Cases Docket"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#B86B7A]' : 'text-[#6E6264]'}`} />
            <span>Refresh</span>
          </button>

          {/* Create New Case Action */}
          <button
            onClick={() => {
              if (onOpenCreateCase) onOpenCreateCase({});
            }}
            className="px-4 py-2.5 rounded-none bg-electric-600 hover:bg-[#B86B7A] text-white font-bold text-xs shadow-glow-rose transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Investigation Case</span>
          </button>
        </div>
      </div>

      {/* Ease of Access: Quick Help Guide Banner */}
      {showQuickGuide && (
        <div className="p-5 rounded-none bg-gradient-to-r from-navy-900 via-navy-850 to-navy-900 border border-[#E2B4BD] shadow-lg space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#E8C2BB] pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm tracking-wide">
              <Info className="w-4 h-4 text-[#B86B7A]" />
              <span>4-Step Investigation Lifecycle & Live Synchronization</span>
            </div>
            <button
              onClick={() => setShowQuickGuide(false)}
              className="text-xs text-[#6E6264] hover:text-[#4A4A4A] font-mono flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Dismiss</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-none bg-[#FFF5F5]/80 border border-[#E8C2BB] space-y-1.5">
              <div className="font-bold text-[#B86B7A] flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#B86B7A]/20 text-[#B86B7A] flex items-center justify-center text-[11px] font-mono font-bold">1</span>
                <span>Case Intake & Docket</span>
              </div>
              <p className="text-[#6E6264] text-[11px] leading-relaxed">
                Cases originate from <strong>GNN Mule Alerts</strong>, <strong>1930 Cybercrime Complaints</strong>, or manual creation. Every case receives a unique ID.
              </p>
            </div>

            <div className="p-3.5 rounded-none bg-[#FFF5F5]/80 border border-[#E8C2BB] space-y-1.5">
              <div className="font-bold text-[#6E6264] flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-[#6E6264] flex items-center justify-center text-[11px] font-mono font-bold">2</span>
                <span>Fund Trail & Graph Canvas</span>
              </div>
              <p className="text-[#6E6264] text-[11px] leading-relaxed">
                Click <strong>"Trail"</strong> or <strong>"Graph"</strong> on any case card to immediately inspect multi-hop fund routing and syndicate networks.
              </p>
            </div>

            <div className="p-3.5 rounded-none bg-[#FFF5F5]/80 border border-[#E8C2BB] space-y-1.5">
              <div className="font-bold text-sky-300 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[11px] font-mono font-bold">3</span>
                <span>Evidentiary Locker</span>
              </div>
              <p className="text-[#6E6264] text-[11px] leading-relaxed">
                Inside the Dossier, attach suspect accounts, transfers, and FIRs. FINTRACE seals every item with a <strong>SHA-256 integrity hash</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-none bg-[#FFF5F5]/80 border border-[#E8C2BB] space-y-1.5">
              <div className="font-bold text-[#6E6264] flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#93C5FD]/20 text-[#6E6264] flex items-center justify-center text-[11px] font-mono font-bold">4</span>
                <span>Escalate & Export JSON</span>
              </div>
              <p className="text-[#6E6264] text-[11px] leading-relaxed">
                Refer legal decisions to qualified counsel and authorized investigators. Export the case data as a working report for review.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Metrics Summary Bar (Interactive 1-Click Quick Filter Presets) */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Total Cases */}
          <button
            onClick={() => {
              handleClearFilters();
            }}
            className={`p-4 rounded-none border text-left transition flex items-center gap-3.5 ${
              statusFilter === 'ALL' && priorityFilter === 'ALL'
                ? 'bg-[#FFFFFF] border-[#E2B4BD] shadow-glow-rose/10 ring-1 ring-electric-500/30'
                : 'bg-[#FFFFFF]/90 border-[#E8C2BB] hover:border-[#E8C2BB] hover:bg-navy-850'
            }`}
            title="Click to view all cases"
          >
            <div className="w-10 h-10 rounded-none bg-[#B86B7A]/15 border border-[#E2B4BD] flex items-center justify-center text-[#B86B7A] shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase font-mono font-bold text-[#6E6264]">Total Cases</div>
              <div className="text-2xl font-black text-[#4A4A4A] font-mono leading-none mt-1">
                {summary.total_cases || 0}
              </div>
            </div>
          </button>

          {/* Card 2: Active Investigations */}
          <button
            onClick={() => {
              setStatusFilter('Under_Investigation');
            }}
            className={`p-4 rounded-none border text-left transition flex items-center gap-3.5 ${
              statusFilter === 'Under_Investigation'
                ? 'bg-[#FFFFFF] border-[#93C5FD]/60 shadow-sm ring-1 ring-amber-500/40'
                : 'bg-[#FFFFFF]/90 border-[#E8C2BB] hover:border-[#E8C2BB] hover:bg-navy-850'
            }`}
            title="Click to filter Active Investigations"
          >
            <div className="w-10 h-10 rounded-none bg-amber-500/15 border border-[#93C5FD]/40 flex items-center justify-center text-[#6E6264] shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase font-mono font-bold text-[#6E6264]">Active Inquiries</div>
              <div className="text-2xl font-black text-[#6E6264] font-mono leading-none mt-1">
                {summary.active_cases || 0}
              </div>
            </div>
          </button>

          {/* Card 3: Critical Priority */}
          <button
            onClick={() => {
              setPriorityFilter('Critical');
            }}
            className={`p-4 rounded-none border text-left transition flex items-center gap-3.5 ${
              priorityFilter === 'Critical'
                ? 'bg-[#FFFFFF] border-[#FF3B4E]/70 shadow-glow-danger ring-1 ring-rose-500/50'
                : 'bg-[#FFFFFF]/90 border-[#E8C2BB] hover:border-[#E8C2BB] hover:bg-navy-850'
            }`}
            title="Click to filter Critical Priority"
          >
            <div className="w-10 h-10 rounded-none bg-[#FF3B4E]/15 border border-[#FF3B4E]/40 flex items-center justify-center text-[#FF3B4E] shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase font-mono font-bold text-[#6E6264]">Critical Priority</div>
              <div className="text-2xl font-black text-[#FF3B4E] font-mono leading-none mt-1">
                {summary.critical_priority || 0}
              </div>
            </div>
          </button>

          {/* Card 4: High Priority */}
          <button
            onClick={() => {
              setPriorityFilter('High');
            }}
            className={`p-4 rounded-none border text-left transition flex items-center gap-3.5 ${
              priorityFilter === 'High'
                ? 'bg-[#FFFFFF] border-[#E2B4BD] shadow-sm ring-1 ring-[#3B82F6]'
                : 'bg-[#FFFFFF]/90 border-[#E8C2BB] hover:border-[#E8C2BB] hover:bg-navy-850'
            }`}
            title="Click to filter High Priority"
          >
            <div className="w-10 h-10 rounded-none bg-[#F7D6D0] border border-[#E2B4BD] flex items-center justify-center text-[#B86B7A] shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase font-mono font-bold text-[#6E6264]">High Priority</div>
              <div className="text-2xl font-black text-[#B86B7A] font-mono leading-none mt-1">
                {summary.high_priority || 0}
              </div>
            </div>
          </button>

          {/* Card 5: Closed / Frozen */}
          <button
            onClick={() => {
              setStatusFilter('Closed');
            }}
            className={`p-4 rounded-none border text-left transition flex items-center gap-3.5 ${
              statusFilter === 'Closed'
                ? 'bg-[#FFFFFF] border-[#93C5FD]/60 shadow-sm ring-1 ring-emerald-500/40'
                : 'bg-[#FFFFFF]/90 border-[#E8C2BB] hover:border-[#E8C2BB] hover:bg-navy-850'
            }`}
            title="Click to filter Closed / Frozen cases"
          >
            <div className="w-10 h-10 rounded-none bg-[#93C5FD]/15 border border-[#93C5FD]/40 flex items-center justify-center text-[#6E6264] shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase font-mono font-bold text-[#6E6264]">Closed / Frozen</div>
              <div className="text-2xl font-black text-[#6E6264] font-mono leading-none mt-1">
                {summary.closed_cases || 0}
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Main Filter & Search Bar */}
      <div className="p-4 rounded-none bg-[#FFFFFF]/70 backdrop-blur-2xl border border-[#E8C2BB] space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E6264]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Case Number, Title, Subject Account, Assigned Investigator..."
              className="w-full pl-10 pr-9 py-2.5 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white font-mono text-xs focus:outline-none focus:border-[#E2B4BD] focus:ring-1 focus:ring-electric-400 transition placeholder:text-[#6E6264]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6264] hover:text-[#4A4A4A]"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Stage Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[#6E6264] font-mono font-bold text-xs uppercase mr-1">STAGE:</span>
            {[
              { id: 'ALL', label: 'All Cases' },
              { id: 'New', label: 'New' },
              { id: 'Under_Investigation', label: 'Active' },
              { id: 'Escalated', label: 'Escalated' },
              { id: 'Closed', label: 'Closed' }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-none text-xs font-bold font-mono transition ${
                  statusFilter === st.id
                    ? 'bg-[#B86B7A]/25 text-[#B86B7A] border border-[#E2B4BD] shadow-sm'
                    : 'bg-[#FFF5F5] text-[#6E6264] hover:text-[#4A4A4A] hover:bg-[#FFFFFF] border border-[#E8C2BB]/80'
                }`}
              >
                {st.label}
              </button>
            ))}

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3 py-1.5 rounded-none border text-xs font-mono font-semibold transition flex items-center gap-1.5 ml-2 ${
                showAdvancedFilters || hasActiveFilters
                  ? 'bg-[#B86B7A]/15 text-[#B86B7A] border-[#E2B4BD]'
                  : 'bg-[#FFF5F5] text-[#6E6264] border-[#E8C2BB] hover:text-[#4A4A4A] hover:bg-[#FFFFFF]'
              }`}
              title="Toggle Advanced Filters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>More Filters</span>
            </button>
          </div>
        </div>

        {/* Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="pt-3.5 border-t border-[#E8C2BB] grid grid-cols-1 sm:grid-cols-3 gap-3.5 animate-fadeIn">
            <div>
              <label className="block text-xs font-mono font-bold text-[#6E6264] mb-1.5">PRIORITY RATING</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white font-mono text-xs focus:outline-none focus:border-[#E2B4BD]"
              >
                <option value="ALL">All Priority Ratings</option>
                <option value="Critical">Critical Priority</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-[#6E6264] mb-1.5">INTELLIGENCE SOURCE</label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white font-mono text-xs focus:outline-none focus:border-[#E2B4BD]"
              >
                <option value="ALL">All Intake Sources</option>
                <option value="GNN Alert">GNN Graph Neural Net Alert</option>
                <option value="Money Trail">Money Trail Flow Engine</option>
                <option value="Complaint">1930 Cyber Crime Complaint</option>
                <option value="Manual">Manual Intake Inquiry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-[#6E6264] mb-1.5">ASSIGNED INVESTIGATOR</label>
              <select
                value={investigatorFilter}
                onChange={(e) => setInvestigatorFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF5F5] border border-[#E8C2BB] rounded-none text-white font-mono text-xs focus:outline-none focus:border-[#E2B4BD]"
              >
                <option value="ALL">All Investigators</option>
                {investigatorsList.map((inv) => (
                  <option key={inv.id || inv.badge_id} value={inv.name}>
                    {inv.name} ({inv.badge_id || 'Officer'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Filter Breadcrumbs & Reset */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2.5 border-t border-[#E8C2BB] text-xs text-[#6E6264] font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-electric-400" />
              <span>Showing <strong>{cases.length}</strong> matching investigation records</span>
            </span>
            <button
              onClick={handleClearFilters}
              className="text-[#FF3B4E] hover:text-[#FF3B4E] flex items-center gap-1 font-bold transition hover:underline"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-20 rounded-none bg-[#FFFFFF]/70 backdrop-blur-2xl border border-[#E8C2BB] flex flex-col items-center justify-center gap-3 text-[#6E6264]">
          <RefreshCw className="w-8 h-8 animate-spin text-[#B86B7A]" />
          <span className="text-sm font-mono font-medium">Synchronizing investigation dockets from database...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-6 rounded-none bg-[#FF3B4E]/15/70 border border-[#FF3B4E]/50 text-rose-200 text-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-[#FF3B4E] shrink-0" />
            <div>
              <div className="font-bold text-[#4A4A4A] text-base">Failed to load investigation cases</div>
              <div className="text-xs text-[#FF3B4E] mt-0.5">{error}</div>
            </div>
          </div>
          <button
            onClick={() => fetchCasesAndSummary()}
            className="px-4 py-2 rounded-none bg-[#FF3B4E]/20 hover:bg-rose-800 text-white font-mono font-bold text-xs"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Cases Cards Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((c) => {
            const stageCfg = STAGE_CONFIG[c.status] || STAGE_CONFIG.New;
            const prioStyle = PRIORITY_BADGES[c.priority] || PRIORITY_BADGES.Medium;
            const SourceIcon = SOURCE_ICONS[c.source_type] || Briefcase;
            const isCopied = copiedId === (c.case_number || c.case_id);
            const isSelected = selectedCaseId === c.case_id || selectedCaseId === c.case_number;

            return (
              <div
                key={c.case_id}
                onClick={() => handleOpenCase(c.case_id)}
                aria-current={isSelected ? 'true' : undefined}
                className={`p-5 rounded-none bg-[#FFFFFF] border ${isSelected ? 'border-[#E2B4BD] ring-1 ring-electric-400/40' : 'border-[#E8C2BB]'} hover:border-[#E2B4BD] cursor-pointer transition flex flex-col justify-between space-y-4 shadow-sm group hover:shadow-glow-rose/10 hover:bg-navy-850/60`}
              >
                <div className="space-y-3.5">
                  {/* Top Badges & Case Identifier */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-[#B86B7A] bg-[#FFF5F5] px-2.5 py-1 rounded border border-[#E8C2BB] flex items-center gap-1.5">
                        <span>{c.case_number || c.case_id}</span>
                        <button
                          onClick={(e) => handleCopyCaseNumber(e, c.case_number || c.case_id)}
                          className="text-[#8A7D7F] hover:text-[#4A4A4A] transition"
                          title="Copy Case Number"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-[#6E6264]" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </span>

                      {c.version && (
                        <span className="text-[11px] font-mono text-[#6E6264] bg-[#FFFFFF] px-1.5 py-0.5 rounded border border-[#E8C2BB]" title="Case Version">
                          v{c.version}
                        </span>
                      )}
                    </div>

                    {/* Quick In-Place Stage & Priority Switchers */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {/* Priority selector */}
                      <select
                        value={c.priority || 'Medium'}
                        onChange={(e) => handleQuickPriorityChange(e, c.case_id, e.target.value)}
                        className={`px-2 py-0.5 rounded text-[11px] uppercase font-mono font-bold cursor-pointer focus:outline-none ${prioStyle}`}
                        title="Click to quickly adjust case priority"
                      >
                        {PRIORITY_DROPDOWN_OPTIONS.map((p) => (
                          <option key={p} value={p} className="bg-[#FFF5F5] text-white font-mono normal-case">
                            {p}
                          </option>
                        ))}
                      </select>

                      {/* Status / Stage selector */}
                      <select
                        value={c.status || 'New'}
                        onChange={(e) => handleQuickStatusChange(e, c.case_id, e.target.value)}
                        className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold border cursor-pointer focus:outline-none ${stageCfg.badge}`}
                        title="Click to quickly transition case stage"
                      >
                        {STAGE_DROPDOWN_OPTIONS.map((s) => (
                          <option key={s} value={s} className="bg-[#FFF5F5] text-white font-mono normal-case">
                            {s.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-[#4A4A4A] group-hover:text-[#B86B7A] transition leading-snug line-clamp-2">
                    {c.title}
                  </h3>

                  {/* Primary Subject Account */}
                  {c.primary_account_id ? (
                    <div className="flex items-center justify-between text-xs bg-[#FFF5F5] p-2 rounded-none border border-[#E8C2BB]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-[#6E6264]">SUBJECT:</span>
                        <span className="font-mono font-bold text-[#FF3B4E] bg-[#FF3B4E]/15/60 px-2 py-0.5 rounded border border-[#FF3B4E]/40 text-xs">
                          {c.primary_account_id}
                        </span>
                      </div>

                      {/* Instant Jump Buttons to Trail & Graph */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleTraceFundFlow(e, c.primary_account_id)}
                          className="px-2 py-1 bg-navy-850 hover:bg-slate-700 text-[#4A4A4A] border border-[#E8C2BB] rounded text-[11px] font-mono font-semibold flex items-center gap-1 transition"
                          title="Jump directly to Fund Trail flow for this subject"
                        >
                          <GitCommit className="w-3 h-3 text-[#6E6264]" />
                          <span>Trail</span>
                        </button>
                        <button
                          onClick={(e) => handleInspectGraph(e, c.primary_account_id)}
                          className="px-2 py-1 bg-navy-850 hover:bg-slate-700 text-[#4A4A4A] border border-[#E8C2BB] rounded text-[11px] font-mono font-semibold flex items-center gap-1 transition"
                          title="Jump directly to Graph Network Canvas"
                        >
                          <Network className="w-3 h-3 text-[#B86B7A]" />
                          <span>Graph</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-[#6E6264] bg-[#FFF5F5] p-2 rounded-none border border-[#E8C2BB]">
                      <span>SUBJECT: </span>
                      <span className="text-[#6E6264] font-semibold">Multi-Account Syndicate Network</span>
                    </div>
                  )}

                  {/* Source Badge */}
                  <div className="flex items-center gap-2 text-xs font-mono text-[#6E6264]">
                    <SourceIcon className="w-3.5 h-3.5 text-[#B86B7A] shrink-0" />
                    <span>Source: <strong className="text-[#4A4A4A]">{c.source_type || 'Manual Intake'}</strong></span>
                    {c.source_reference_id && (
                      <span className="text-[#6E6264] truncate max-w-[150px]">
                        ({c.source_reference_id})
                      </span>
                    )}
                  </div>

                  {/* Summary Snippet */}
                  <p className="text-xs text-[#6E6264] line-clamp-2 leading-relaxed font-sans">
                    {c.summary || "Investigation docket pending initial evidentiary submission."}
                  </p>

                  {/* Meta details list */}
                  <div className="space-y-1.5 pt-2.5 border-t border-[#E8C2BB]/80 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[#6E6264]">Assigned Investigator:</span>
                      <span className="text-[#4A4A4A] font-sans font-semibold truncate max-w-[170px]">
                        {c.assigned_investigator || 'Special Investigator'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#6E6264]">Evidentiary Locker:</span>
                      <span className="text-[#B86B7A] font-bold bg-electric-950/40 px-1.5 py-0.2 rounded border border-[#E2B4BD]">
                        {c.evidence_count ?? (c.evidence_items?.length || 0)} secured items
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#6E6264]">Last Docket Update:</span>
                      <span className="text-[#6E6264]">
                        {c.updated_at ? new Date(c.updated_at).toLocaleString() : 'Recent'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Action button */}
                <div className="pt-3 border-t border-[#E8C2BB] flex items-center justify-between text-xs font-bold text-[#B86B7A] group-hover:text-[#B86B7A]">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Open Dossier & Evidence</span>
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {cases.length === 0 && (
            <div className="col-span-full p-16 text-center rounded-none bg-[#FFFFFF]/70 backdrop-blur-2xl border border-[#E8C2BB] text-[#6E6264] space-y-4">
              <Briefcase className="w-10 h-10 text-[#8A7D7F] mx-auto" />
              <div className="font-bold text-[#4A4A4A] text-lg">No Investigation Cases Found</div>
              <p className="text-sm max-w-md mx-auto text-[#6E6264]">
                {hasActiveFilters
                  ? "No cases matched your current filter or search criteria. Try clearing search filters to see all cases."
                  : "No cases exist in the database docket yet. Create a new case from any flagged account or click the button below."}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-[#FFFFFF] hover:bg-slate-700 text-white rounded-none text-xs font-mono font-bold"
                >
                  Clear All Filters
                </button>
              ) : (
                <button
                  onClick={() => onOpenCreateCase && onOpenCreateCase({})}
                  className="px-5 py-2.5 bg-electric-600 hover:bg-[#B86B7A] text-white font-bold rounded-none text-xs shadow-glow-rose"
                >
                  Create First Investigation Case
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
