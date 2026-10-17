import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Cpu,
  AlertTriangle,
  ArrowRight,
  Network,
  Share2,
  Briefcase,
  X,
  FileWarning,
  Activity,
  CheckCircle2,
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
      setAccounts(data);
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

  return (
    <div className="space-y-6">
      {/* Title & Description */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <span>Steps 3 & 4: GNN-Based Mule Account Detection & Pattern Signals</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Accounts scored via GraphSAGE message passing over 2-hop topological transaction neighborhoods.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400">
            Thresholds: High ≥ 75% | Med ≥ 40%
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Account ID or Entity Name..."
            className="w-full pl-9 pr-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-electric-400"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-mono text-[11px]">RISK FILTER:</span>
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setRiskFilter(lvl)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition ${
                riskFilter === lvl
                  ? 'bg-electric-500/20 text-electric-300 border border-electric-500/50'
                  : 'bg-navy-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Accounts Table + Risk Explanation Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts Table (2 cols) */}
        <div className="lg:col-span-2 rounded-xl bg-navy-900 border border-slate-800 overflow-hidden shadow-sm flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-navy-950 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                  <th className="py-3 px-3">ACCOUNT ID</th>
                  <th className="py-3 px-3">RISK LEVEL</th>
                  <th className="py-3 px-3">SCORE</th>
                  <th className="py-3 px-3">CONFIDENCE</th>
                  <th className="py-3 px-3">TURNOVER</th>
                  <th className="py-3 px-3">GRAPH SIGNALS</th>
                  <th className="py-3 px-3 text-right">EXAMINE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {accounts.map((acc) => {
                  const isSelected = selectedAccount === acc.account_id;
                  return (
                    <tr
                      key={acc.account_id}
                      onClick={() => handleSelectAccount(acc.account_id)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-electric-500/10 border-l-4 border-electric-400' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{acc.account_id}</div>
                        <div className="text-[10px] text-slate-400 font-sans">{acc.customer_name}</div>
                      </td>
                      <td className="py-3 px-3">
                        <RiskBadge level={acc.risk_level} score={acc.risk_score} showScore={false} size="sm" />
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        {(acc.risk_score * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {((acc.prediction_confidence || 0) * 100).toFixed(0)}%
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {(acc.turnover_ratio || 0).toFixed(2)}x
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {(acc.flags || []).slice(0, 2).map((fl, i) => (
                            <span key={i} className="text-[9px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded">
                              {fl}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-sans">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAccount(acc.account_id);
                          }}
                          className="px-2 py-1 rounded bg-navy-850 hover:bg-slate-800 text-electric-300 border border-slate-700 text-[11px]"
                        >
                          Explain
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Risk Explanation Side-Card (1 col) */}
        <div className="rounded-xl bg-navy-900 border border-slate-800 p-5 flex flex-col justify-between space-y-4">
          {explanation ? (
            <div className="space-y-4 text-xs">
              {/* Header */}
              <div className="border-b border-slate-800 pb-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white font-mono">{explanation.account_id}</h3>
                    <RiskBadge level={explanation.risk_level} score={explanation.risk_score} size="sm" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{explanation.customer_name}</p>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {explanation.is_simulated ? "Heuristic Simulation" : "Trained GraphSAGE"}
                </span>
              </div>

              {/* Structural Metrics */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase font-mono">
                  GRAPH STRUCTURAL ATTRIBUTES
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="p-2 rounded bg-navy-950 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">In-Degree / Senders</span>
                    <span className="font-bold text-emerald-400">{explanation.structural_features.in_degree}</span>
                  </div>
                  <div className="p-2 rounded bg-navy-950 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Out-Degree / Targets</span>
                    <span className="font-bold text-rose-400">{explanation.structural_features.out_degree}</span>
                  </div>
                  <div className="p-2 rounded bg-navy-950 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Turnover Velocity</span>
                    <span className="font-bold text-amber-400">{explanation.structural_features.turnover_ratio}x</span>
                  </div>
                  <div className="p-2 rounded bg-navy-950 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Unique Peers</span>
                    <span className="font-bold text-electric-300">{explanation.structural_features.unique_counterparties}</span>
                  </div>
                </div>
              </div>

              {/* Detected Heuristic Graph Patterns */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase font-mono">
                  DETECTED BEHAVIORAL PATTERNS
                </div>
                {explanation.detected_patterns && explanation.detected_patterns.length > 0 ? (
                  <div className="space-y-1.5">
                    {explanation.detected_patterns.map((pat, idx) => (
                      <div key={idx} className="p-2 rounded bg-rose-950/40 border border-rose-500/30 flex items-center gap-2 text-rose-300">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                        <span className="font-medium text-[11px]">{pat}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2 rounded bg-navy-950 border border-slate-800 text-slate-500 text-[11px]">
                    No heuristic anomaly signals flagged.
                  </div>
                )}
              </div>

              {/* Connected High-Risk Accounts */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase font-mono">
                  CONNECTED HIGH-RISK COUNTERPARTIES
                </div>
                {explanation.connected_high_risk_accounts && explanation.connected_high_risk_accounts.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {explanation.connected_high_risk_accounts.map((peer) => (
                      <button
                        key={peer}
                        onClick={() => handleSelectAccount(peer)}
                        className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 font-mono text-[10px] transition"
                      >
                        {peer}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500">None in direct 1-hop radius</div>
                )}
              </div>

              {/* Investigation Notice */}
              <div className="p-2.5 rounded bg-navy-950 border border-slate-800 text-[10px] text-slate-400 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-electric-400 shrink-0 mt-0.5" />
                <span>
                  Alerts represent machine intelligence leads for investigator review, not criminal proof.
                </span>
              </div>

              {/* Quick Action Buttons */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (onAccountSelect) onAccountSelect(explanation.account_id);
                      setCurrentPage('graph');
                    }}
                    className="p-2 rounded-lg bg-navy-850 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Network className="w-3.5 h-3.5 text-electric-400" />
                    <span>Ego Graph</span>
                  </button>
                  <button
                    onClick={() => {
                      if (onAccountSelect) onAccountSelect(explanation.account_id);
                      setCurrentPage('money-trail');
                    }}
                    className="p-2 rounded-lg bg-navy-850 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Share2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Money Trail</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (onOpenCreateCase) onOpenCreateCase(explanation);
                  }}
                  className="w-full py-2 rounded-lg bg-electric-600 hover:bg-electric-500 text-white font-bold text-xs shadow-glow-electric transition flex items-center justify-center gap-2"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Initiate Investigation Case</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center text-slate-500 text-center space-y-2 p-6">
              <ShieldAlert className="w-10 h-10 text-slate-600" />
              <div className="text-xs font-semibold text-slate-300">Select an Account</div>
              <p className="text-[11px]">Click any row in the table to inspect its GraphSAGE risk explanation and structural graph context.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
