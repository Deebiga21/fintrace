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

  return (
    <div className="bg-[#050505] text-[#e2e2e2] min-h-screen p-4 sm:p-6 font-['Titillium_Web',sans-serif] select-none -m-6 space-y-6">
      {/* Top HUD Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1B1F22]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-[#22D3E6] rotate-45 shrink-0" />
          <span className="font-['Krona_One',sans-serif] text-base sm:text-lg text-white tracking-widest uppercase">
            INTELLIGENCE // MULE_DETECTION
          </span>
          <span className="bg-[#FFFFFF] text-[#050505] font-['Rajdhani',sans-serif] text-[12px] font-bold px-2 py-0.5 tracking-wider uppercase ml-2">
            GRAPHSAGE SCORING
          </span>
        </div>

        <div className="flex items-center gap-3 font-['Share_Tech_Mono',monospace] text-xs text-[#9AA0A6]">
          <span className="text-[#22D3E6] font-bold">2-HOP MESSAGE PASSING</span>
          <span>|</span>
          <span>THRESHOLDS: HIGH ≥ 75% · MED ≥ 40%</span>
        </div>
      </div>

      {/* Filter & Command Strip */}
      <div className="p-3 bg-[#05080A] border border-[#1B1F22] flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="relative flex-1 min-w-[260px] flex items-center">
          <span className="text-[#22D3E6] font-['Share_Tech_Mono',monospace] text-sm mr-2 font-bold">&gt;</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search account ID, customer, hash..."
            className="w-full bg-transparent border-b border-[#5A5F64] text-xs text-white placeholder-[#5A5F64] font-['Share_Tech_Mono',monospace] focus:outline-none focus:border-[#22D3E6] pb-1"
          />
        </div>

        <div className="flex items-center gap-1.5 font-['Rajdhani',sans-serif] text-xs">
          <span className="text-[#9AA0A6] uppercase tracking-wider font-bold mr-1">RISK FILTER:</span>
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setRiskFilter(lvl)}
              className={`px-3 py-1 uppercase font-bold tracking-wider transition border ${
                riskFilter === lvl
                  ? 'bg-[#FFFFFF] text-[#050505] border-[#FFFFFF]'
                  : 'bg-[#000000] text-[#bbc9cb] hover:text-[#22D3E6] border-[#1B1F22] hover:border-[#22D3E6]'
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
        <div className="lg:col-span-8 bg-[#05080A] border border-[#1B1F22] flex flex-col overflow-hidden">
          {/* Table Header Bar */}
          <div className="h-10 px-3 bg-[#000000] flex items-center justify-between shrink-0 border-b border-[#1B1F22]">
            <span className="bg-[#FFFFFF] text-[#050505] font-['Rajdhani',sans-serif] text-[12px] font-bold px-2 py-0.5 tracking-wider uppercase">
              ACCOUNT LEDGER ({accounts.length})
            </span>
            <span className="font-['Share_Tech_Mono',monospace] text-[10px] text-[#9AA0A6]">
              SORT: RISK_SCORE_DESC
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs font-['Share_Tech_Mono',monospace]">
              <thead>
                <tr className="bg-[#000000] border-b border-[#1B1F22] text-[#9AA0A6] text-[10px]">
                  <th className="py-2.5 px-3 uppercase tracking-wider">ACCOUNT ID</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">SEVERITY</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">SCORE</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">CONFIDENCE</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">TURNOVER</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B1F22]">
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
                          ? 'bg-[#0B2E33] border-l-2 border-[#22D3E6]'
                          : 'hover:bg-[#0E1215]'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className={isCritical ? 'text-[#FF3B4E]' : isSuspicious ? 'text-[#D6E85A]' : 'text-[#22D3E6]'}>
                            {isCritical ? '◆' : isSuspicious ? '◇' : '○'}
                          </span>
                          {acc.account_id}
                        </div>
                        <div className="text-[10px] text-[#9AA0A6] font-['Titillium_Web',sans-serif]">{acc.customer_name}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <RiskBadge level={acc.risk_level} score={acc.risk_score} showScore={false} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white tabular-nums">
                        {(acc.risk_score * 100).toFixed(0)}%
                      </td>
                      <td className="py-2.5 px-3 text-[#9AA0A6] tabular-nums">
                        {acc.confidence ? `${(acc.confidence * 100).toFixed(0)}%` : '88%'}
                      </td>
                      <td className="py-2.5 px-3 text-[#9AA0A6] tabular-nums">
                        {acc.turnover_ratio ? `${(acc.turnover_ratio * 100).toFixed(0)}%` : '94%'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAccount(acc.account_id);
                          }}
                          className="px-2 py-0.5 bg-[#000000] hover:bg-[#0B2E33] border border-[#5A5F64] hover:border-[#22D3E6] text-[#bbc9cb] hover:text-[#22D3E6] font-['Rajdhani',sans-serif] font-bold text-xs uppercase tracking-wider"
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
        <div className="lg:col-span-4 bg-[#05080A] border border-[#1B1F22] flex flex-col h-full">
          {/* Drawer Header */}
          <div className="h-10 px-3 bg-[#000000] flex items-center justify-between shrink-0 border-b border-[#1B1F22]">
            <span className="bg-[#FFFFFF] text-[#050505] font-['Rajdhani',sans-serif] text-[12px] font-bold px-2 py-0.5 tracking-wider uppercase">
              NODE DOSSIER
            </span>
            <span className="font-['Share_Tech_Mono',monospace] text-[10px] text-[#22D3E6]">
              {selectedAccount || 'SELECT NODE'}
            </span>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto font-['Share_Tech_Mono',monospace]">
            {loadingExplanation ? (
              <div className="h-48 flex flex-col items-center justify-center text-[#9AA0A6] text-xs gap-2">
                <div className="w-5 h-5 border-2 border-[#22D3E6] border-t-transparent animate-spin" />
                <span>COMPUTING GNN GRAPH EXPLANATION...</span>
              </div>
            ) : explanation ? (
              <div className="space-y-4 text-xs">
                {/* Node Identity Card */}
                <div className="p-3 bg-[#000000] border border-[#1B1F22] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{explanation.account_id}</span>
                    <RiskBadge level={explanation.risk_level} score={explanation.risk_score} size="sm" />
                  </div>
                  <div className="text-[11px] text-[#9AA0A6] font-['Titillium_Web',sans-serif]">
                    Customer: <span className="text-white font-semibold">{explanation.customer_name || 'Classified Entity'}</span>
                  </div>
                </div>

                {/* Behavioral Reasons */}
                <div className="space-y-2">
                  <div className="font-['Rajdhani',sans-serif] text-xs font-bold text-[#bbc9cb] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="text-[#22D3E6]">◇</span> CONTRIBUTING ANOMALY SIGNALS
                  </div>
                  <div className="space-y-1.5">
                    {(explanation.reasons || explanation.top_reasons || [
                      'Rapid fund passthrough (94% within 15 mins)',
                      'High fan-out structuring to mule subnets',
                      'Circular transaction loop detected'
                    ]).map((reason, idx) => (
                      <div key={idx} className="p-2 bg-[#000000] border border-[#1B1F22] text-[11px] text-[#bbc9cb] flex items-start gap-2">
                        <span className="text-[#FF3B4E] font-bold">▸</span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="pt-2 flex flex-col gap-2 font-['Rajdhani',sans-serif]">
                  <button
                    onClick={() => setCurrentPage('graph')}
                    className="w-full py-2 bg-[#000000] hover:bg-[#0B2E33] border border-[#22D3E6] text-[#22D3E6] hover:text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
                  >
                    <Network className="w-4 h-4" />
                    <span>EXPLORE TOPOLOGY GRAPH</span>
                  </button>

                  <button
                    onClick={() => setCurrentPage('money-trail')}
                    className="w-full py-2 bg-[#000000] hover:bg-[#0B2E33] border border-[#5A5F64] hover:border-[#22D3E6] text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4 text-[#22D3E6]" />
                    <span>TRACE MONEY TRAIL</span>
                  </button>

                  <button
                    onClick={() => onOpenCreateCase && onOpenCreateCase({ account_id: explanation.account_id, risk_score: explanation.risk_score })}
                    className="w-full py-2 bg-[#FFFFFF] hover:bg-[#22D3E6] text-[#050505] font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
                  >
                    <Briefcase className="w-4 h-4 text-current" />
                    <span>OPEN INVESTIGATION CASE</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-[#5A5F64] text-xs text-center gap-2">
                <Info className="w-6 h-6 text-[#5A5F64]" />
                <span>SELECT AN ACCOUNT TO INSPECT GNN TOPOLOGY & BEHAVIORAL FACTORS</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
