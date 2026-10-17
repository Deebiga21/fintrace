import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  Search,
  Filter,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Share2,
  DollarSign
} from 'lucide-react';
import { api } from '../services/api';

export default function TransactionsPage({
  setCurrentPage,
  onAccountSelect,
  refreshTrigger
}) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isSuspiciousOnly, setIsSuspiciousOnly] = useState(false);
  const [minAmount, setMinAmount] = useState('');
  const [selectedTxn, setSelectedTxn] = useState(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (search) params.search = search;
      if (isSuspiciousOnly) params.is_suspicious = true;
      if (minAmount) params.min_amount = minAmount;

      const data = await api.getTransactions(params);
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [search, isSuspiciousOnly, minAmount, refreshTrigger]);

  const totalFilteredVolume = transactions.reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            Step 2: Financial Transaction Ledger Explorer
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Query and filter directional transaction edges with real-time heuristic fraud flags and party linkages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-navy-900 border border-slate-800 text-xs text-slate-300">
            <span className="text-slate-500 mr-2 font-mono">RECORDS:</span>
            <span className="font-bold text-white font-mono">{transactions.length}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-navy-900 border border-slate-800 text-xs text-slate-300">
            <span className="text-slate-500 mr-2 font-mono">VOLUME:</span>
            <span className="font-bold text-electric-300 font-mono">₹{totalFilteredVolume.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by Txn ID, Sender, Receiver..."
              className="w-full pl-9 pr-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-electric-400"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-mono text-[11px]">MIN ₹:</span>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="0"
              className="w-24 px-2.5 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-electric-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
            <input
              type="checkbox"
              checked={isSuspiciousOnly}
              onChange={(e) => setIsSuspiciousOnly(e.target.checked)}
              className="rounded bg-navy-950 border-slate-700 text-electric-500 focus:ring-0"
            />
            <span className="text-xs font-semibold text-rose-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Flagged Suspicious Only
            </span>
          </label>

          <button
            onClick={fetchTransactions}
            className="p-2 bg-navy-850 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-electric-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl bg-navy-900 border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-navy-950 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="py-3 px-4">TXN ID</th>
                <th className="py-3 px-4">TIMESTAMP</th>
                <th className="py-3 px-4">SENDER ACCOUNT</th>
                <th className="py-3 px-4"></th>
                <th className="py-3 px-4">RECEIVER ACCOUNT</th>
                <th className="py-3 px-4">AMOUNT (INR)</th>
                <th className="py-3 px-4">CHANNEL</th>
                <th className="py-3 px-4">INVESTIGATION STATUS</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {transactions.map((t) => (
                <tr key={t.transaction_id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-bold text-electric-300">
                    {t.transaction_id}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    {new Date(t.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => {
                        if (onAccountSelect) onAccountSelect(t.sender_account);
                        setCurrentPage("mule-detection");
                      }}
                      className="font-bold text-slate-200 hover:text-electric-400 hover:underline"
                    >
                      {t.sender_account}
                    </button>
                  </td>
                  <td className="py-3 px-1 text-slate-500">
                    <ArrowRight className="w-3.5 h-3.5 inline text-slate-600" />
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => {
                        if (onAccountSelect) onAccountSelect(t.receiver_account);
                        setCurrentPage("mule-detection");
                      }}
                      className="font-bold text-slate-200 hover:text-electric-400 hover:underline"
                    >
                      {t.receiver_account}
                    </button>
                  </td>
                  <td className="py-3 px-4 font-bold text-white">
                    ₹{t.amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                      {t.transaction_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-sans">
                    {t.is_suspicious ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-500/40">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span>{t.flag_reason || "Suspicious Flow"}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">Normal</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    <button
                      onClick={() => {
                        if (onAccountSelect) onAccountSelect(t.receiver_account);
                        setCurrentPage("money-trail");
                      }}
                      className="px-2 py-1 bg-navy-850 hover:bg-slate-800 text-electric-300 border border-slate-700 rounded text-[11px] transition inline-flex items-center gap-1"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Trace Trail</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
