import React, { useEffect, useState } from 'react';
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
      setTransactions(Array.isArray(data) ? data : (data.transactions || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [search, isSuspiciousOnly, minAmount, refreshTrigger]);

  const totalFilteredVolume = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);

  return (
    <div className="bg-transparent text-[#FFFFFF] min-h-screen p-4 sm:p-6 font-sans select-none -m-6 space-y-6">
      {/* Top HUD Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[rgba(255,255,255,0.14)]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-[#1FC8DB] rotate-45 shrink-0" />
          <span className="font-display text-base sm:text-lg text-[#FFFFFF] tracking-widest uppercase">
            EXPLORER // TRANSACTION_LEDGER
          </span>
          <span className="bg-[#1FC8DB]/15 text-[#1FC8DB] font-sans text-[12px] font-bold px-2 py-0.5 tracking-wider uppercase ml-2">
            DIRECTIONAL EDGES
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-[#9CA3AF]">
          <span>ENTRIES: <span className="text-[#FFFFFF] font-bold">{transactions.length}</span></span>
          <span>|</span>
          <span>VOLUME: <span className="text-[#1FC8DB] font-bold">₹{totalFilteredVolume.toLocaleString()}</span></span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 bg-[#101117] border border-[rgba(255,255,255,0.14)] flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 flex items-center">
            <span className="text-[#1FC8DB] text-sm mr-2 font-bold">&gt;</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="filter transaction ID, sender, receiver..."
              className="w-full bg-transparent border-b border-[rgba(255,255,255,0.14)] text-xs text-[#FFFFFF] placeholder-[#8A909B] focus:outline-none focus:border-[rgba(255,255,255,0.20)] pb-1"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#9CA3AF] text-[10px]">MIN ₹:</span>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="0"
              className="w-24 bg-transparent border-b border-[rgba(255,255,255,0.14)] text-xs text-[#FFFFFF] placeholder-[#8A909B] focus:outline-none focus:border-[rgba(255,255,255,0.20)] pb-1"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 font-sans">
          <label className="flex items-center gap-2 cursor-pointer bg-[#0B0B0F] px-3 py-1 border border-[rgba(255,255,255,0.14)]">
            <input
              type="checkbox"
              checked={isSuspiciousOnly}
              onChange={(e) => setIsSuspiciousOnly(e.target.checked)}
              className="hidden"
            />
            <div className="w-3.5 h-3.5 bg-[#0B0B0F] flex items-center justify-center border border-[rgba(255,255,255,0.20)]">
              {isSuspiciousOnly && <div className="w-1.5 h-1.5 bg-[#1FC8DB]" />}
            </div>
            <span className="text-xs font-bold text-[#FF5C6C] tracking-wider uppercase">
              SUSPICIOUS ONLY
            </span>
          </label>

          <button
            type="button"
            onClick={fetchTransactions}
            className="px-3 py-1 bg-[#0B0B0F] hover:bg-[#14151C] border border-[rgba(255,255,255,0.14)] hover:border-[rgba(255,255,255,0.20)] text-[#9CA3AF] hover:text-[#1FC8DB] text-xs font-bold uppercase tracking-wider transition"
          >
            REFRESH
          </button>
        </div>
      </div>

      {/* Main Grid: Transactions Table + Detail Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-[#101117] border border-[rgba(255,255,255,0.14)] flex flex-col overflow-hidden">
          <div className="h-10 px-3 bg-[#0B0B0F] flex items-center justify-between shrink-0 border-b border-[rgba(255,255,255,0.14)]">
            <span className="bg-[#1FC8DB]/15 text-[#1FC8DB] font-sans text-[12px] font-bold px-2 py-0.5 tracking-wider uppercase">
              TRANSACTION STREAM
            </span>
            <span className="font-mono text-[10px] text-[#9CA3AF]">
              CHRONOLOGICAL_STREAM
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-[#0B0B0F] border-b border-[rgba(255,255,255,0.14)] text-[#9CA3AF] text-[10px]">
                  <th className="py-2.5 px-3 uppercase tracking-wider">TXN ID</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">ORIGINATOR</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">BENEFICIARY</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">AMOUNT (₹)</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">STATUS</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider text-right">TIMESTAMP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#6B7280]">
                {transactions.map((t) => {
                  const isSelected = selectedTxn?.transaction_id === t.transaction_id;
                  const isFlagged = t.is_suspicious;

                  return (
                    <tr
                      key={t.transaction_id}
                      onClick={() => setSelectedTxn(t)}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? 'bg-[#14151C] border-l-2 border-[rgba(255,255,255,0.20)]'
                          : 'hover:bg-[#101117]'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-[#FFFFFF]">
                        {t.transaction_id}
                      </td>
                      <td className="py-2.5 px-3 text-[#1FC8DB] hover:underline" onClick={(e) => { e.stopPropagation(); if (onAccountSelect) onAccountSelect(t.sender_account); }}>
                        {t.sender_account}
                      </td>
                      <td className="py-2.5 px-3 text-[#1FC8DB] hover:underline" onClick={(e) => { e.stopPropagation(); if (onAccountSelect) onAccountSelect(t.receiver_account); }}>
                        {t.receiver_account}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#FFFFFF] tabular-nums">
                        ₹{t.amount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        {isFlagged ? (
                          <span className="inline-flex items-center gap-1 font-sans text-[10px] font-bold bg-[#FF5C6C] text-[#FFFFFF] px-1.5 py-0.2 uppercase tracking-wide">
                            <span>◆</span> ANOMALOUS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-sans text-[10px] font-bold bg-[#0B0B0F] text-[#9CA3AF] px-1.5 py-0.2 uppercase tracking-wide">
                            <span>○</span> CLEARED
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#9CA3AF] text-[11px]">
                        {t.timestamp ? t.timestamp.replace('T', ' ').slice(0, 19) : 'LIVE_FEED'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Transaction Telemetry (4 cols) */}
        <div className="lg:col-span-4 bg-[#101117] border border-[rgba(255,255,255,0.14)] flex flex-col h-full font-mono">
          <div className="h-10 px-3 bg-[#0B0B0F] flex items-center justify-between shrink-0 border-b border-[rgba(255,255,255,0.14)]">
            <span className="bg-[#1FC8DB]/15 text-[#1FC8DB] font-sans text-[12px] font-bold px-2 py-0.5 tracking-wider uppercase">
              TXN TELEMETRY
            </span>
            <span className="text-[10px] text-[#1FC8DB]">
              {selectedTxn ? selectedTxn.transaction_id : 'STANDBY'}
            </span>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
            {selectedTxn ? (
              <div className="space-y-4">
                <div className="p-3 bg-[#0B0B0F] border border-[rgba(255,255,255,0.14)] space-y-2">
                  <div className="text-[#9CA3AF] text-[10px]">TOTAL SETTLEMENT VALUE</div>
                  <div className="text-xl font-bold text-[#FFFFFF] font-mono">
                    ₹{selectedTxn.amount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#1FC8DB]">
                    CHANNEL: {selectedTxn.payment_channel || 'UPI / IMPS'}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-sans text-xs font-bold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="text-[#1FC8DB]">◇</span> DIRECTIONAL ROUTING
                  </div>
                  <div className="p-2.5 bg-[#0B0B0F] border border-[rgba(255,255,255,0.14)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#9CA3AF] text-[10px]">FROM:</span>
                      <span className="text-[#1FC8DB] font-bold cursor-pointer" onClick={() => onAccountSelect && onAccountSelect(selectedTxn.sender_account)}>
                        {selectedTxn.sender_account}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#9CA3AF] text-[10px]">TO:</span>
                      <span className="text-[#1FC8DB] font-bold cursor-pointer" onClick={() => onAccountSelect && onAccountSelect(selectedTxn.receiver_account)}>
                        {selectedTxn.receiver_account}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.14)] pt-1.5">
                      <span className="text-[#9CA3AF] text-[10px]">FLAG:</span>
                      <span className={selectedTxn.is_suspicious ? "text-[#FF5C6C] font-bold" : "text-[#1FC8DB]"}>
                        {selectedTxn.is_suspicious ? "ANOMALY (HIGH VELOCITY)" : "ROUTINE WIRE"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onAccountSelect) onAccountSelect(selectedTxn.sender_account);
                    setCurrentPage('graph');
                  }}
                  className="w-full py-2 bg-[#1FC8DB]/15 border border-[#1FC8DB]/50 text-[#1FC8DB] hover:bg-[#1FC8DB] hover:text-[#0B0B0F] font-sans font-bold text-xs uppercase tracking-wider transition"
                >
                  PLOT ROUTE ON GRAPH
                </button>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-[#8A909B] text-xs text-center">
                SELECT A TRANSACTION ROW TO VIEW ROUTE TELEMETRY & BEHAVIORAL DETAILS
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
