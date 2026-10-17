import React, { useEffect, useState } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

const STAGE_COLORS = {
  New: 'bg-sky-950/70 text-sky-400 border-sky-500/40',
  Under_Investigation: 'bg-amber-950/70 text-amber-300 border-amber-500/40',
  Escalated: 'bg-rose-950/70 text-rose-300 border-rose-500/50 shadow-glow-danger',
  Closed: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
};

const PRIORITY_BADGES = {
  Critical: 'bg-rose-600 text-white font-black',
  High: 'bg-rose-950 text-rose-300 border border-rose-500/50',
  Medium: 'bg-amber-950 text-amber-300 border border-amber-500/40',
  Low: 'bg-slate-800 text-slate-300 border border-slate-700'
};

export default function CasesPage({
  setCurrentPage,
  setSelectedCaseId,
  onOpenCreateCase,
  refreshTrigger
}) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const data = await api.getCases(params);
      setCases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [search, statusFilter, refreshTrigger]);

  const handleOpenCase = (caseId) => {
    if (setSelectedCaseId) setSelectedCaseId(caseId);
    setCurrentPage('case-details');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-electric-400" />
            <span>Step 8: Investigation Case Management Docket</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Formal investigative cases tracking flagged financial crime networks, evidentiary items, and audit trails.
          </p>
        </div>

        <button
          onClick={() => {
            if (onOpenCreateCase) onOpenCreateCase({});
          }}
          className="px-4 py-2 rounded-lg bg-electric-600 hover:bg-electric-500 text-white font-bold text-xs shadow-glow-electric transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Investigation Case</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Case ID, Title, Subject Account..."
            className="w-full pl-9 pr-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-electric-400"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-mono text-[11px]">STAGE:</span>
          {['ALL', 'New', 'Under_Investigation', 'Escalated', 'Closed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition ${
                statusFilter === st
                  ? 'bg-electric-500/20 text-electric-300 border border-electric-500/50'
                  : 'bg-navy-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Cases List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cases.map((c) => {
          const stageStyle = STAGE_COLORS[c.status] || STAGE_COLORS.New;
          const prioStyle = PRIORITY_BADGES[c.priority] || PRIORITY_BADGES.Medium;

          return (
            <div
              key={c.case_id}
              onClick={() => handleOpenCase(c.case_id)}
              className="p-5 rounded-xl bg-navy-900 border border-slate-800 hover:border-electric-500/50 cursor-pointer transition flex flex-col justify-between space-y-4 shadow-sm group"
            >
              <div className="space-y-3 text-xs">
                {/* Header & Badges */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-electric-300 bg-navy-950 px-2 py-0.5 rounded border border-slate-800">
                    {c.case_id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${prioStyle}`}>
                      {c.priority}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${stageStyle}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-white group-hover:text-electric-300 transition leading-snug">
                  {c.title}
                </h3>

                {/* Subject Account Link */}
                {c.primary_account_id && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="font-mono text-[10px]">PRIMARY SUBJECT:</span>
                    <span className="font-mono font-bold text-rose-400 bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-500/30">
                      {c.primary_account_id}
                    </span>
                  </div>
                )}

                {/* Summary Snippet */}
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {c.summary || "Investigation docket pending initial evidentiary submission."}
                </p>

                {/* Meta details */}
                <div className="space-y-1 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
                  <div className="flex items-center justify-between">
                    <span>Investigator:</span>
                    <span className="text-slate-300 font-sans">{c.assigned_investigator}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Evidence Items:</span>
                    <span className="text-electric-300 font-bold">{c.evidence_items?.length || 0} pieces</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last Updated:</span>
                    <span>{new Date(c.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-electric-400 font-semibold group-hover:text-electric-300">
                <span>View Full Case Dossier</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}

        {cases.length === 0 && !loading && (
          <div className="col-span-full p-12 text-center rounded-xl bg-navy-900 border border-slate-800 text-slate-400 space-y-3">
            <Briefcase className="w-8 h-8 text-slate-500 mx-auto" />
            <div className="font-semibold text-white">No Investigation Cases Found</div>
            <p className="text-xs">Create a new case from any suspicious account or click the New Case button.</p>
          </div>
        )}
      </div>
    </div>
  );
}
