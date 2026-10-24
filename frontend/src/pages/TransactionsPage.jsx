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
    <div className="bg-transparent text-[#F3F4F6] min-h-screen p-4 sm:p-6 font-['Titillium_Web',sans-serif] select-none -m-6 space-y-6">
      {/* Top HUD Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#333D50]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-[#3B82F6] rotate-45 shrink-0" />
          <span className="font-['Krona_One',sans-serif] text-base sm:text-lg text-white tracking-widest uppercase">
            EXPLORER // TRANSACTION_LEDGER
          </span>
          <span className="bg-[#FFFFFF] text-[#171B23] font-['Rajdhani',sans-serif] text-[12px] font-bold px-2 py-0.5 tracking-wider uppercase ml-2">
            DIRECTIONAL EDGES
          </span>
        </div>

        <div className="flex items-center gap-3 font-['Share_Tech_Mono',monospace] text-xs text-[#93C5FD]">
          <span>ENTRIES: <span className="text-white font-bold">{transactions.length}</span></span>
          <span>|</span>
          <span>VOLUME: <span className="text-[#3B82F6] font-bold">₹{totalFilteredVolume.toLocaleString()}</span></span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 bg-[#252B37] border border-[#333D50] flex flex-wrap items-center justify-between gap-4 text-xs font-['Share_Tech_Mono',monospace]">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 flex items-center">
            <span className="text-[#3B82F6] text-sm mr-2 font-bold">&gt;</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="filter transaction ID, sender, receiver..."
              className="w-full bg-transparent border-b border-[#64748B] text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] pb-1"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#93C5FD] text-[10px]">MIN ₹:</span>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="0"
              className="w-24 bg-transparent border-b border-[#64748B] text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] pb-1"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 font-['Rajdhani',sans-serif]">
          <label className="flex items-center gap-2 cursor-pointer bg-[#1F242E] px-3 py-1 border border-[#333D50]">
            <input
              type="checkbox"
              checked={isSuspiciousOnly}
              onChange={(e) => setIsSuspiciousOnly(e.target.checked)}
              className="hidden"
            />
            <div className="w-3.5 h-3.5 bg-[#1F242E] flex items-center justify-center border border-[#3B82F6]">
              {isSuspiciousOnly && <div className="w-1.5 h-1.5 bg-[#3B82F6]" />}
            </div>
            <span className="text-xs font-bold text-[#FF3B4E] tracking-wider uppercase">
              SUSPICIOUS ONLY
            </span>
          </label>

          <button
            type="button"
            onClick={fetchTransactions}
            className="px-3 py-1 bg-[#1F242E] hover:bg-[#1E3A5F] border border-[#64748B] hover:border-[#3B82F6] text-[#93C5FD] hover:text-[#3B82F6] text-xs font-bold uppercase tracking-wider transition"
          >
            REFRESH
          </button>
        </div>
      </div>

      {/* Main Grid: Transactions Table + Detail Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-[#252B37] border border-[#333D50] flex flex-col overflow-hidden">
          <div className="h-10 px-3 bg-[#1F242E] flex items-center justify-between shrink-0 border-b border-[#333D50]">
            <span className="bg-[#FFFFFF] text-[#171B23] font-['Rajdhani',sans-serif] text-[12px] font-bold px-2 py-0.5 tracking-wider uppercase">
              TRANSACTION STREAM
            </span>
            <span className="font-['Share_Tech_Mono',monospace] text-[10px] text-[#93C5FD]">
              CHRONOLOGICAL_STREAM
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs font-['Share_Tech_Mono',monospace]">
              <thead>
                <tr className="bg-[#1F242E] border-b border-[#333D50] text-[#93C5FD] text-[10px]">
                  <th className="py-2.5 px-3 uppercase tracking-wider">TXN ID</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">ORIGINATOR</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">BENEFICIARY</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">AMOUNT (₹)</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">STATUS</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider text-right">TIMESTAMP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333D50]">
                {transactions.map((t) => {
                  const isSelected = selectedTxn?.transaction_id === t.transaction_id;
                  const isFlagged = t.is_suspicious;

                  return (
                    <tr
                      key={t.transaction_id}
                      onClick={() => setSelectedTxn(t)}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? 'bg-[#1E3A5F] border-l-2 border-[#3B82F6]'
                          : 'hover:bg-[#252B37]'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-white">
                        {t.transaction_id}
                      </td>
                      <td className="py-2.5 px-3 text-[#3B82F6] hover:underline" onClick={(e) => { e.stopPropagation(); onAccountSelect && onAccountSelect(t.sender_account); }}>
                        {t.sender_account}
                      </td>
                      <td className="py-2.5 px-3 text-[#3B82F6] hover:underline" onClick={(e) => { e.stopPropagation(); onAccountSelect && onAccountSelect(t.receiver_account); }}>
                        {t.receiver_account}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white tabular-nums">
                        ₹{t.amount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        {isFlagged ? (
                          <span className="inline-flex items-center gap-1 font-['Rajdhani',sans-serif] text-[10px] font-bold bg-[#FF3B4E] text-white px-1.5 py-0.2 uppercase tracking-wide">
                            <span>◆</span> ANOMALOUS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-['Rajdhani',sans-serif] text-[10px] font-bold bg-[#2D3545] text-[#93C5FD] px-1.5 py-0.2 uppercase tracking-wide">
                            <span>○</span> CLEARED
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#93C5FD] text-[11px]">
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
        <div className="lg:col-span-4 bg-[#252B37] border border-[#333D50] flex flex-col h-full font-['Share_Tech_Mono',monospace]">
          <div className="h-10 px-3 bg-[#1F242E] flex items-center justify-between shrink-0 border-b border-[#333D50]">
            <span className="bg-[#FFFFFF] text-[#171B23] font-['Rajdhani',sans-serif] text-[12px] font-bold px-2 py-0.5 tracking-wider uppercase">
              TXN TELEMETRY
            </span>
            <span className="text-[10px] text-[#3B82F6]">
              {selectedTxn ? selectedTxn.transaction_id : 'STANDBY'}
            </span>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
            {selectedTxn ? (
              <div className="space-y-4">
                <div className="p-3 bg-[#1F242E] border border-[#333D50] space-y-2">
                  <div className="text-[#93C5FD] text-[10px]">TOTAL SETTLEMENT VALUE</div>
                  <div className="text-xl font-bold text-white font-['Share_Tech_Mono',monospace]">
                    ₹{selectedTxn.amount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#3B82F6]">
                    CHANNEL: {selectedTxn.payment_channel || 'UPI / IMPS'}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-['Rajdhani',sans-serif] text-xs font-bold text-[#93C5FD] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="text-[#3B82F6]">◇</span> DIRECTIONAL ROUTING
                  </div>
                  <div className="p-2.5 bg-[#1F242E] border border-[#333D50] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#93C5FD] text-[10px]">FROM:</span>
                      <span className="text-[#3B82F6] font-bold cursor-pointer" onClick={() => onAccountSelect && onAccountSelect(selectedTxn.sender_account)}>
                        {selectedTxn.sender_account}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#93C5FD] text-[10px]">TO:</span>
                      <span className="text-[#3B82F6] font-bold cursor-pointer" onClick={() => onAccountSelect && onAccountSelect(selectedTxn.receiver_account)}>
                        {selectedTxn.receiver_account}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#333D50] pt-1.5">
                      <span className="text-[#93C5FD] text-[10px]">FLAG:</span>
                      <span className={selectedTxn.is_suspicious ? "text-[#FF3B4E] font-bold" : "text-[#3B82F6]"}>
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
                  className="w-full py-2 bg-[#FFFFFF] hover:bg-[#3B82F6] text-[#171B23] font-['Rajdhani',sans-serif] font-bold text-xs uppercase tracking-wider transition"
                >
                  PLOT ROUTE ON GRAPH
                </button>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-[#64748B] text-xs text-center">
                SELECT A TRANSACTION ROW TO VIEW ROUTE TELEMETRY & BEHAVIORAL DETAILS
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
