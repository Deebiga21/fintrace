import React, { useEffect, useState } from 'react';
import {
  Network,
  Share2,
  Briefcase,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import RiskBadge from '../components/RiskBadge';

export default function MuleDetectionPage({
  setCurrentPage,
  selectedAccount,
  onAccountSelect,
  onOpenCreateCase,
  refreshTrigger
}) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [explanation, setExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const params = { limit: 150 };
      if (search) params.search = search;
      if (riskFilter !== 'ALL') params.risk_level = riskFilter;

      const data = await api.getAccounts(params);
      setAccounts(Array.isArray(data) ? data : (data.accounts || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExplanation = async (accId) => {
    setLoadingExplanation(true);
    try {
      const data = await api.getAccountExplanation(accId);
      setExplanation(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingExplanation(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [search, riskFilter, refreshTrigger]);

  useEffect(() => {
    if (selectedAccount) {
      fetchExplanation(selectedAccount);
    }
  }, [selectedAccount]);

  const handleSelectAccount = (accId) => {
    if (onAccountSelect) onAccountSelect(accId);
    fetchExplanation(accId);
  };

  // Only render evidence the API actually returned. The explanation endpoint
  // supplies `supporting_evidence` (objects with signal_name/description/
  // metrics/severity) and `detected_patterns` (plain flag strings).
  const evidenceItems = Array.isArray(explanation?.supporting_evidence)
    ? explanation.supporting_evidence.filter(Boolean)
    : [];
  const detectedPatterns = Array.isArray(explanation?.detected_patterns)
    ? explanation.detected_patterns.filter(
        (pattern) => pattern != null && String(pattern).trim() !== ''
      )
    : [];
  const hasEvidence = evidenceItems.length > 0 || detectedPatterns.length > 0;

  return (
    <div className="bg-[#0B0B0F] text-[#FFFFFF] min-h-screen p-4 sm:p-6 font-sans select-none -m-6 space-y-6">
      {/* Top HUD Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[rgba(255,255,255,0.14)]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-[#1FC8DB] rotate-45 shrink-0" />
          <span className="font-display text-base sm:text-lg text-[#FFFFFF] tracking-widest uppercase">
            INTELLIGENCE // MULE_DETECTION
          </span>
          <span className="bg-[#1FC8DB]/15 text-[#1FC8DB] font-sans text-[12px] font-bold px-2 py-0.5 tracking-wider uppercase ml-2">
            GRAPHSAGE SCORING
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-[#9CA3AF]">
          <span className="text-[#1FC8DB] font-bold">2-HOP MESSAGE PASSING</span>
          <span>|</span>
          <span>THRESHOLDS: HIGH ≥ 75% · MED ≥ 40%</span>
        </div>
      </div>

      {/* Filter & Command Strip */}
      <div className="p-3 bg-[#101117] border border-[rgba(255,255,255,0.14)] flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="relative flex-1 min-w-[260px] flex items-center">
          <span className="text-[#1FC8DB] font-mono text-sm mr-2 font-bold">&gt;</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search account ID, customer, hash..."
            className="w-full bg-transparent border-b border-[rgba(255,255,255,0.14)] text-xs text-[#FFFFFF] placeholder-[#8A909B] font-mono focus:outline-none focus:border-[rgba(255,255,255,0.20)] pb-1"
          />
        </div>

        <div className="flex items-center gap-1.5 font-sans text-xs">
          <span className="text-[#9CA3AF] uppercase tracking-wider font-bold mr-1">RISK FILTER:</span>
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setRiskFilter(lvl)}
              className={`px-3 py-1 uppercase font-bold tracking-wider transition border ${
                riskFilter === lvl
                  ? 'bg-[#1FC8DB]/15 text-[#1FC8DB] border-[rgba(255,255,255,0.16)]'
                  : 'bg-[#0B0B0F] text-[#9CA3AF] hover:text-[#1FC8DB] border-[rgba(255,255,255,0.14)] hover:border-[rgba(255,255,255,0.20)]'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Accounts Table + Detail Inspection Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Accounts Table (8 cols) */}
        <div className="lg:col-span-8 bg-[#101117] border border-[rgba(255,255,255,0.14)] flex flex-col overflow-hidden">
          {/* Table Header Bar */}
          <div className="h-10 px-3 bg-[#0B0B0F] flex items-center justify-between shrink-0 border-b border-[rgba(255,255,255,0.14)]">
            <span className="bg-[#1FC8DB]/15 text-[#1FC8DB] font-sans text-[12px] font-bold px-2 py-0.5 tracking-wider uppercase">
              ACCOUNT LEDGER ({accounts.length})
            </span>
            <span className="font-mono text-[10px] text-[#9CA3AF]">
              SORT: RISK_SCORE_DESC
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-[#0B0B0F] border-b border-[rgba(255,255,255,0.14)] text-[#9CA3AF] text-[10px]">
                  <th className="py-2.5 px-3 uppercase tracking-wider">ACCOUNT ID</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">SEVERITY</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">SCORE</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">CONFIDENCE</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">TURNOVER</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#6B7280]">
                {loading && accounts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 px-3 text-center text-[#9CA3AF]">
                      Loading accounts from the core ledger…
                    </td>
                  </tr>
                )}
                {!loading && accounts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 px-3 text-center text-[#9CA3AF]">
                      No accounts match this filter.
                    </td>
                  </tr>
                )}
                {accounts.map((acc) => {
                  const isSelected = selectedAccount === acc.account_id;
                  const isCritical = acc.risk_level === 'High' || acc.risk_level === 'HIGH';
                  const isSuspicious = acc.risk_level === 'Medium' || acc.risk_level === 'MEDIUM';

                  return (
                    <tr
                      key={acc.account_id}
                      onClick={() => handleSelectAccount(acc.account_id)}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? 'bg-[#14151C] border-l-2 border-[rgba(255,255,255,0.20)]'
                          : 'hover:bg-[#101117]'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-[#FFFFFF] flex items-center gap-1.5">
                          <span className={isCritical ? 'text-[#FF5C6C]' : isSuspicious ? 'text-[#9CA3AF]' : 'text-[#1FC8DB]'}>
                            {isCritical ? '◆' : isSuspicious ? '◇' : '○'}
                          </span>
                          {acc.account_id}
                        </div>
                        <div className="text-[10px] text-[#9CA3AF] font-sans">{acc.customer_name}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <RiskBadge level={acc.risk_level} score={acc.risk_score} showScore={false} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#FFFFFF] tabular-nums">
                        {(acc.risk_score * 100).toFixed(0)}%
                      </td>
                      <td className="py-2.5 px-3 text-[#9CA3AF] tabular-nums" title={acc.score_source === 'model' ? 'Model confidence' : 'Cold-start scores come from dataset labels, so no model confidence exists'}>
                        {acc.score_source === 'model' && acc.prediction_confidence != null
                          ? `${(acc.prediction_confidence * 100).toFixed(0)}%`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-[#9CA3AF] tabular-nums">
                        {acc.turnover_ratio ? `${(acc.turnover_ratio * 100).toFixed(0)}%` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAccount(acc.account_id);
                          }}
                          className="px-2 py-0.5 bg-[#0B0B0F] hover:bg-[#14151C] border border-[rgba(255,255,255,0.14)] hover:border-[rgba(255,255,255,0.20)] text-[#9CA3AF] hover:text-[#1FC8DB] font-sans font-bold text-xs uppercase tracking-wider"
                        >
                          EXAMINE
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Risk Explanation Drawer (4 cols) */}
        <div className="lg:col-span-4 bg-[#101117] border border-[rgba(255,255,255,0.14)] flex flex-col h-full">
          {/* Drawer Header */}
          <div className="h-10 px-3 bg-[#0B0B0F] flex items-center justify-between shrink-0 border-b border-[rgba(255,255,255,0.14)]">
            <span className="bg-[#1FC8DB]/15 text-[#1FC8DB] font-sans text-[12px] font-bold px-2 py-0.5 tracking-wider uppercase">
              NODE DOSSIER
            </span>
            <span className="font-mono text-[10px] text-[#1FC8DB]">
              {selectedAccount || 'SELECT NODE'}
            </span>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto font-mono">
            {loadingExplanation ? (
              <div className="h-48 flex flex-col items-center justify-center text-[#9CA3AF] text-xs gap-2">
                <div className="w-5 h-5 border-2 border-[rgba(255,255,255,0.20)] border-t-transparent animate-spin" />
                <span>COMPUTING GNN GRAPH EXPLANATION...</span>
              </div>
            ) : explanation ? (
              <div className="space-y-4 text-xs">
                {/* Node Identity Card */}
                <div className="p-3 bg-[#0B0B0F] border border-[rgba(255,255,255,0.14)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#FFFFFF] text-sm">{explanation.account_id}</span>
                    <RiskBadge level={explanation.risk_level} score={explanation.risk_score} size="sm" />
                  </div>
                  <div className="text-[11px] text-[#9CA3AF] font-sans">
                    Customer: <span className="text-[#FFFFFF] font-semibold">{explanation.customer_name || 'Classified Entity'}</span>
                  </div>
                </div>

                {/* Supporting Evidence */}
                <div className="space-y-2">
                  <div className="font-sans text-xs font-bold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="text-[#1FC8DB]">◇</span> CONTRIBUTING ANOMALY SIGNALS
                  </div>
                  <div className="space-y-1.5">
                    {evidenceItems.map((item, idx) => {
                      const isStructured = item !== null && typeof item === 'object';
                      const title = isStructured
                        ? (item.signal_name || item.pattern || 'Supporting evidence')
                        : String(item);
                      const severity = isStructured ? item.severity : null;
                      const description = isStructured ? item.description : null;
                      const metrics = isStructured ? item.metrics : null;

                      return (
                        <div key={`evidence-${idx}`} className="p-2 bg-[#0B0B0F] border border-[rgba(255,255,255,0.14)] text-[11px] text-[#9CA3AF] flex items-start gap-2">
                          <span className="text-[#FF5C6C] font-bold">▸</span>
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-[#FFFFFF]">{title}</span>
                              {severity && (
                                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-[rgba(255,255,255,0.20)] text-[#1FC8DB] bg-[#101117]">
                                  {severity}
                                </span>
                              )}
                            </div>
                            {description && <p className="leading-snug">{description}</p>}
                            {metrics && (
                              <p className="text-[10px] font-mono text-[#8A909B]">
                                {metrics}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {detectedPatterns.map((pattern, idx) => (
                      <div key={`pattern-${idx}`} className="p-2 bg-[#0B0B0F] border border-[rgba(255,255,255,0.14)] text-[11px] text-[#9CA3AF] flex items-start gap-2">
                        <span className="text-[#FF5C6C] font-bold">▸</span>
                        <span>{pattern}</span>
                      </div>
                    ))}

                    {!hasEvidence && (
                      <div className="p-2 bg-[#0B0B0F] border border-[rgba(255,255,255,0.14)] text-[11px] text-[#9CA3AF]">
                        No supporting evidence available.
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="pt-2 flex flex-col gap-2 font-sans">
                  <button
                    onClick={() => setCurrentPage('graph')}
                    className="w-full py-2 bg-[#0B0B0F] hover:bg-[#14151C] border border-[rgba(255,255,255,0.20)] text-[#1FC8DB] hover:text-[#FFFFFF] font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
                  >
                    <Network className="w-4 h-4" />
                    <span>EXPLORE TOPOLOGY GRAPH</span>
                  </button>

                  <button
                    onClick={() => setCurrentPage('money-trail')}
                    className="w-full py-2 bg-[#0B0B0F] hover:bg-[#14151C] border border-[rgba(255,255,255,0.14)] hover:border-[rgba(255,255,255,0.20)] text-[#FFFFFF] font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4 text-[#1FC8DB]" />
                    <span>TRACE MONEY TRAIL</span>
                  </button>

                  <button
                    onClick={() => onOpenCreateCase && onOpenCreateCase({ account_id: explanation.account_id, risk_score: explanation.risk_score })}
                    className="w-full py-2 bg-[#1FC8DB]/15 border border-[#1FC8DB]/50 text-[#1FC8DB] hover:bg-[#1FC8DB] hover:text-[#0B0B0F] font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
                  >
                    <Briefcase className="w-4 h-4 text-current" />
                    <span>OPEN INVESTIGATION CASE</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-[#8A909B] text-xs text-center gap-2">
                <Info className="w-6 h-6 text-[#8A909B]" />
                <span>SELECT AN ACCOUNT TO INSPECT GNN TOPOLOGY & BEHAVIORAL FACTORS</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
