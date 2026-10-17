import React, { useEffect, useState } from 'react';
import {
  Share2,
  Search,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Briefcase,
  AlertTriangle,
  RefreshCw,
  Layers,
  ShieldCheck,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { api } from '../services/api';
import CytoscapeGraph from '../components/CytoscapeGraph';
import RiskBadge from '../components/RiskBadge';

export default function MoneyTrailPage({
  selectedAccount,
  onAccountSelect,
  setCurrentPage,
  onOpenCreateCase,
  refreshTrigger
}) {
  const [targetAccount, setTargetAccount] = useState(selectedAccount || 'MULE_AGG_01');
  const [trailData, setTrailData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' or 'graph'
  const [maxHops, setMaxHops] = useState(4);

  const fetchMoneyTrail = async (accId) => {
    if (!accId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMoneyTrail(accId, maxHops);
      setTrailData(data);
    } catch (err) {
      setError(err.message || "Failed to trace money trail.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAccount) {
      setTargetAccount(selectedAccount);
      fetchMoneyTrail(selectedAccount);
    } else {
      fetchMoneyTrail(targetAccount);
    }
  }, [selectedAccount, maxHops, refreshTrigger]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (targetAccount.trim()) {
      if (onAccountSelect) onAccountSelect(targetAccount.trim().toUpperCase());
      fetchMoneyTrail(targetAccount.trim().toUpperCase());
    }
  };

  const demoAccounts = ['MULE_AGG_01', 'RAPID_CONDUIT_77', 'CIRC_MULE_A', 'DISP_SMURF_88'];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Share2 className="w-5 h-5 text-rose-400" />
            <span>Step 6: Multi-Hop Money Trail & Layering Flow Analysis</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Trace the chronological dissemination of illicit proceeds backward to victim sources and forward to cash-out destinations.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-navy-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition ${
              activeTab === 'timeline'
                ? 'bg-electric-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Chronological Timeline
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition ${
              activeTab === 'graph'
                ? 'bg-electric-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Trail Graph Topology
          </button>
        </div>
      </div>

      {/* Target Account Selector Bar */}
      <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 flex-1 min-w-[300px]">
          <span className="font-mono text-slate-400 font-semibold shrink-0">TARGET SUBJECT:</span>
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={targetAccount}
              onChange={(e) => setTargetAccount(e.target.value)}
              placeholder="Enter Account ID (e.g. MULE_AGG_01)..."
              className="w-full pl-9 pr-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-electric-400"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-electric-600 hover:bg-electric-500 text-white font-semibold rounded-lg text-xs transition"
          >
            Trace Trail
          </button>
        </form>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[11px] font-mono">DEMO SUBJECTS:</span>
          {demoAccounts.map((dAcc) => (
            <button
              key={dAcc}
              onClick={() => {
                setTargetAccount(dAcc);
                if (onAccountSelect) onAccountSelect(dAcc);
                fetchMoneyTrail(dAcc);
              }}
              className={`px-2 py-1 rounded text-[11px] font-mono transition ${
                targetAccount === dAcc
                  ? 'bg-rose-950 text-rose-300 border border-rose-500/50 font-bold'
                  : 'bg-navy-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {dAcc}
            </button>
          ))}
        </div>
      </div>

      {/* Layering Analysis Summary Card */}
      {trailData && trailData.layering_analysis && (
        <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-electric-400" />
              <span>LAYERING & CONDUIT DISSECTION: {trailData.target_account}</span>
            </h3>
            {trailData.layering_analysis.is_potential_conduit && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/70 text-rose-300 border border-rose-500/50 shadow-glow-danger flex items-center gap-1 font-mono">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                CONDUIT MULE DETECTED
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-navy-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-mono">INFLOW SOURCE ENTITIES</div>
              <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
                {trailData.layering_analysis.total_inflow_nodes} Nodes
              </div>
            </div>
            <div className="p-3 rounded-lg bg-navy-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-mono">OUTFLOW DESTINATION ENTITIES</div>
              <div className="text-lg font-mono font-bold text-rose-400 mt-1">
                {trailData.layering_analysis.total_outflow_nodes} Nodes
              </div>
            </div>
            <div className="p-3 rounded-lg bg-navy-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-mono">DETECTED LAYERING DEPTH</div>
              <div className="text-lg font-mono font-bold text-amber-400 mt-1">
                {trailData.layering_analysis.detected_layering_hops} Hops
              </div>
            </div>
            <div className="p-3 rounded-lg bg-navy-950 border border-slate-800 flex items-center justify-end">
              <button
                onClick={() => {
                  if (onOpenCreateCase) {
                    onOpenCreateCase({
                      account_id: trailData.target_account,
                      title: `Layering Case on Conduit ${trailData.target_account}`,
                      summary: `Multi-hop money trail traced across ${trailData.layering_analysis.detected_layering_hops} hops involving ${trailData.layering_analysis.total_inflow_nodes} sources and ${trailData.layering_analysis.total_outflow_nodes} destinations.`
                    });
                  }
                }}
                className="px-4 py-2 bg-electric-600 hover:bg-electric-500 text-white font-bold rounded-lg shadow-glow-electric text-xs transition flex items-center gap-1.5"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Open Case on Trail</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main View Area */}
      {loading ? (
        <div className="h-72 flex flex-col items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-electric-400" />
          <span className="text-xs font-mono">Tracing multi-hop fund dissemination paths...</span>
        </div>
      ) : activeTab === 'graph' ? (
        <div className="h-[550px] rounded-xl overflow-hidden border border-slate-800 bg-navy-950">
          {trailData?.graph ? (
            <CytoscapeGraph
              graphData={trailData.graph}
              selectedNodeId={trailData.target_account}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              No graph trail available
            </div>
          )}
        </div>
      ) : (
        /* Timeline View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inflow Trail (Backward Source) */}
          <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  INFLOW TRAIL (FUNDS ORIGINATING INTO SUBJECT)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                {trailData?.backward_steps?.length || 0} Inbound Steps
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {(trailData?.backward_steps || []).map((step, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-navy-950 border border-slate-800 hover:border-slate-700 transition space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="text-emerald-400 font-bold">HOP #{step.hop} (INFLOW)</span>
                    <span className="text-slate-500">{new Date(step.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-white text-xs">
                    <button
                      onClick={() => {
                        setTargetAccount(step.sender);
                        fetchMoneyTrail(step.sender);
                      }}
                      className="text-slate-300 hover:text-electric-400 hover:underline"
                    >
                      {step.sender}
                    </button>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-electric-300">{step.receiver}</span>
                    <span className="text-emerald-400 font-black">₹{step.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-sans pt-1">
                    <span>Txn: <strong className="font-mono text-slate-400">{step.transaction_id}</strong> ({step.type})</span>
                    {step.is_suspicious && (
                      <span className="text-rose-400 font-semibold font-mono text-[9px] bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-500/40">
                        FLAGGED STEP
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {(!trailData?.backward_steps || trailData.backward_steps.length === 0) && (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No upstream sources found in current dataset.
                </div>
              )}
            </div>
          </div>

          {/* Outflow Trail (Forward Dispersion) */}
          <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  OUTFLOW TRAIL (FUNDS DISSEMINATING OUTWARD)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-500/30">
                {trailData?.forward_steps?.length || 0} Outbound Steps
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {(trailData?.forward_steps || []).map((step, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-navy-950 border border-slate-800 hover:border-slate-700 transition space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="text-rose-400 font-bold">HOP #{step.hop} (OUTFLOW)</span>
                    <span className="text-slate-500">{new Date(step.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-white text-xs">
                    <span className="text-electric-300">{step.sender}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                    <button
                      onClick={() => {
                        setTargetAccount(step.receiver);
                        fetchMoneyTrail(step.receiver);
                      }}
                      className="text-slate-300 hover:text-electric-400 hover:underline"
                    >
                      {step.receiver}
                    </button>
                    <span className="text-rose-400 font-black">₹{step.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-sans pt-1">
                    <span>Txn: <strong className="font-mono text-slate-400">{step.transaction_id}</strong> ({step.type})</span>
                    {step.is_suspicious && (
                      <span className="text-rose-400 font-semibold font-mono text-[9px] bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-500/40">
                        FLAGGED PASS-THROUGH
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {(!trailData?.forward_steps || trailData.forward_steps.length === 0) && (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No downstream outbound transfers recorded from this account.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
