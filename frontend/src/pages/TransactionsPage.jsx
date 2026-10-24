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
    <div className="bg-transparent text-[#4A4A4A] min-h-screen p-4 sm:p-6 font-['Titillium_Web',sans-serif] select-none -m-6 space-y-6">
      {/* Top HUD Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E8C2BB]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-[#B86B7A] rotate-45 shrink-0" />
          <span className="font-['Krona_One',sans-serif] text-base sm:text-lg text-[#4A4A4A] tracking-widest uppercase">
            EXPLORER // TRANSACTION_LEDGER
          </span>
          <span className="bg-[#FFFFFF] text-[#171B23] font-['Rajdhani',sans-serif] text-[12px] font-bold px-2 py-0.5 tracking-wider uppercase ml-2">
            DIRECTIONAL EDGES
          </span>
        </div>

        <div className="flex items-center gap-3 font-['Share_Tech_Mono',monospace] text-xs text-[#6E6264]">
          <span>ENTRIES: <span className="text-[#4A4A4A] font-bold">{transactions.length}</span></span>
          <span>|</span>
          <span>VOLUME: <span className="text-[#B86B7A] font-bold">₹{totalFilteredVolume.toLocaleString()}</span></span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 bg-[#FFFFFF] border border-[#E8C2BB] flex flex-wrap items-center justify-between gap-4 text-xs font-['Share_Tech_Mono',monospace]">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 flex items-center">
            <span className="text-[#B86B7A] text-sm mr-2 font-bold">&gt;</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="filter transaction ID, sender, receiver..."
              className="w-full bg-transparent border-b border-[#E8C2BB] text-xs text-[#4A4A4A] placeholder-[#8A7D7F] focus:outline-none focus:border-[#E2B4BD] pb-1"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#6E6264] text-[10px]">MIN ₹:</span>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="0"
              className="w-24 bg-transparent border-b border-[#E8C2BB] text-xs text-[#4A4A4A] placeholder-[#8A7D7F] focus:outline-none focus:border-[#E2B4BD] pb-1"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 font-['Rajdhani',sans-serif]">
          <label className="flex items-center gap-2 cursor-pointer bg-[#FFF5F5] px-3 py-1 border border-[#E8C2BB]">
            <input
              type="checkbox"
              checked={isSuspiciousOnly}
              onChange={(e) => setIsSuspiciousOnly(e.target.checked)}
              className="hidden"
            />
            <div className="w-3.5 h-3.5 bg-[#FFF5F5] flex items-center justify-center border border-[#E2B4BD]">
              {isSuspiciousOnly && <div className="w-1.5 h-1.5 bg-[#B86B7A]" />}
            </div>
            <span className="text-xs font-bold text-[#FF3B4E] tracking-wider uppercase">
              SUSPICIOUS ONLY
            </span>
          </label>

          <button
            type="button"
            onClick={fetchTransactions}
            className="px-3 py-1 bg-[#FFF5F5] hover:bg-[#F7D6D0] border border-[#E8C2BB] hover:border-[#E2B4BD] text-[#6E6264] hover:text-[#B86B7A] text-xs font-bold uppercase tracking-wider transition"
          >
            REFRESH
          </button>
        </div>
      </div>

      {/* Main Grid: Transactions Table + Detail Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#E8C2BB] flex flex-col overflow-hidden">
          <div className="h-10 px-3 bg-[#FFF5F5] flex items-center justify-between shrink-0 border-b border-[#E8C2BB]">
            <span className="bg-[#FFFFFF] text-[#171B23] font-['Rajdhani',sans-serif] text-[12px] font-bold px-2 py-0.5 tracking-wider uppercase">
              TRANSACTION STREAM
            </span>
            <span className="font-['Share_Tech_Mono',monospace] text-[10px] text-[#6E6264]">
              CHRONOLOGICAL_STREAM
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs font-['Share_Tech_Mono',monospace]">
              <thead>
                <tr className="bg-[#FFF5F5] border-b border-[#E8C2BB] text-[#6E6264] text-[10px]">
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
                          ? 'bg-[#F7D6D0] border-l-2 border-[#E2B4BD]'
                          : 'hover:bg-[#FFFFFF]'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-white">
                        {t.transaction_id}
                      </td>
                      <td className="py-2.5 px-3 text-[#B86B7A] hover:underline" onClick={(e) => { e.stopPropagation(); onAccountSelect && onAccountSelect(t.sender_account); }}>
                        {t.sender_account}
                      </td>
                      <td className="py-2.5 px-3 text-[#B86B7A] hover:underline" onClick={(e) => { e.stopPropagation(); onAccountSelect && onAccountSelect(t.receiver_account); }}>
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
                          <span className="inline-flex items-center gap-1 font-['Rajdhani',sans-serif] text-[10px] font-bold bg-[#F8E8E6] text-[#6E6264] px-1.5 py-0.2 uppercase tracking-wide">
                            <span>○</span> CLEARED
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#6E6264] text-[11px]">
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
        <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#E8C2BB] flex flex-col h-full font-['Share_Tech_Mono',monospace]">
          <div className="h-10 px-3 bg-[#FFF5F5] flex items-center justify-between shrink-0 border-b border-[#E8C2BB]">
            <span className="bg-[#FFFFFF] text-[#171B23] font-['Rajdhani',sans-serif] text-[12px] font-bold px-2 py-0.5 tracking-wider uppercase">
              TXN TELEMETRY
            </span>
            <span className="text-[10px] text-[#B86B7A]">
              {selectedTxn ? selectedTxn.transaction_id : 'STANDBY'}
            </span>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
            {selectedTxn ? (
              <div className="space-y-4">
                <div className="p-3 bg-[#FFF5F5] border border-[#E8C2BB] space-y-2">
                  <div className="text-[#6E6264] text-[10px]">TOTAL SETTLEMENT VALUE</div>
                  <div className="text-xl font-bold text-[#4A4A4A] font-['Share_Tech_Mono',monospace]">
                    ₹{selectedTxn.amount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#B86B7A]">
                    CHANNEL: {selectedTxn.payment_channel || 'UPI / IMPS'}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-['Rajdhani',sans-serif] text-xs font-bold text-[#6E6264] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="text-[#B86B7A]">◇</span> DIRECTIONAL ROUTING
                  </div>
                  <div className="p-2.5 bg-[#FFF5F5] border border-[#E8C2BB] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#6E6264] text-[10px]">FROM:</span>
                      <span className="text-[#B86B7A] font-bold cursor-pointer" onClick={() => onAccountSelect && onAccountSelect(selectedTxn.sender_account)}>
                        {selectedTxn.sender_account}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#6E6264] text-[10px]">TO:</span>
                      <span className="text-[#B86B7A] font-bold cursor-pointer" onClick={() => onAccountSelect && onAccountSelect(selectedTxn.receiver_account)}>
                        {selectedTxn.receiver_account}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#E8C2BB] pt-1.5">
                      <span className="text-[#6E6264] text-[10px]">FLAG:</span>
                      <span className={selectedTxn.is_suspicious ? "text-[#FF3B4E] font-bold" : "text-[#B86B7A]"}>
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
                  className="w-full py-2 bg-[#FFFFFF] hover:bg-[#B86B7A] text-[#171B23] font-['Rajdhani',sans-serif] font-bold text-xs uppercase tracking-wider transition"
                >
                  PLOT ROUTE ON GRAPH
                </button>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-[#8A7D7F] text-xs text-center">
                SELECT A TRANSACTION ROW TO VIEW ROUTE TELEMETRY & BEHAVIORAL DETAILS
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
