import React, { useState, useMemo } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  ShieldAlert,
  ShieldCheck,
  Send,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Activity,
  FileText,
  ChevronRight,
  ExternalLink,
  Zap,
  CreditCard
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { useTheme } from '../context/ThemeContext';

export default function DashboardPage({
  setCurrentPage,
  onAccountSelect,
  onOpenCreateCase,
  refreshTrigger,
  onOpenLivePipeline
}) {
  const { isDark } = useTheme();

  // Timeframe selector
  const [timeframe, setTimeframe] = useState('30D');
  const [flowType, setFlowType] = useState('all'); // 'all', 'inflow', 'outflow'
  const [txSearch, setTxSearch] = useState('');
  const [txFilter, setTxFilter] = useState('ALL'); // 'ALL', 'INFLOW', 'OUTFLOW', 'FLAGGED'

  // Send Money Modal State
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [sendForm, setSendForm] = useState({
    recipient: 'ACC-0048 (Benchmark Corp)',
    amount: '',
    note: 'Inter-desk liquidity allocation',
    category: 'Wire Transfer'
  });
  const [sendNotice, setSendNotice] = useState(null);

  // Cash Flow / Spending Chart Dataset
  const chartData = useMemo(() => {
    return [
      { date: 'Oct 01', inflow: 142000, outflow: 98000, balance: 2450000 },
      { date: 'Oct 04', inflow: 185000, outflow: 124000, balance: 2511000 },
      { date: 'Oct 08', inflow: 92000, outflow: 110000, balance: 2493000 },
      { date: 'Oct 11', inflow: 240000, outflow: 165000, balance: 2568000 },
      { date: 'Oct 15', inflow: 198000, outflow: 130000, balance: 2636000 },
      { date: 'Oct 18', inflow: 165000, outflow: 142000, balance: 2659000 },
      { date: 'Oct 21', inflow: 280000, outflow: 175000, balance: 2764000 },
      { date: 'Oct 24', inflow: 235000, outflow: 153080, balance: 2845920 },
    ];
  }, []);

  // Filtered Chart Metric
  const currentMetricKey = flowType === 'inflow' ? 'inflow' : flowType === 'outflow' ? 'outflow' : 'balance';

  // Transaction Ledger Data
  const initialTransactions = useMemo(() => [
    {
      id: 'TXN-9042',
      counterparty: 'Apex Global Liquidity Ltd',
      accountId: 'ACC-0048',
      type: 'INFLOW',
      method: 'SWIFT Wire',
      date: '2026-10-24 14:28:10',
      status: 'SUCCESS',
      amount: 145000.00,
      riskLevel: 'LOW',
      category: 'Treasury Settlement'
    },
    {
      id: 'TXN-9041',
      counterparty: 'Mule Nexus Alpha (Flagged Ring)',
      accountId: 'ACC-0012',
      type: 'OUTFLOW',
      method: 'Rapid Fan-Out P2P',
      date: '2026-10-24 12:14:07',
      status: 'FLAGGED',
      amount: 32400.00,
      riskLevel: 'HIGH',
      category: 'Layering Conduit'
    },
    {
      id: 'TXN-9040',
      counterparty: 'Cloud Infrastructure Services',
      accountId: 'ACC-0084',
      type: 'OUTFLOW',
      method: 'Corporate Card',
      date: '2026-10-23 18:45:00',
      status: 'SUCCESS',
      amount: 12450.00,
      riskLevel: 'LOW',
      category: 'Operational Cost'
    },
    {
      id: 'TXN-9039',
      counterparty: 'Vanguard Custody Escrow',
      accountId: 'ACC-0091',
      type: 'INFLOW',
      method: 'SEPA Instant',
      date: '2026-10-23 15:10:22',
      status: 'SUCCESS',
      amount: 89000.00,
      riskLevel: 'LOW',
      category: 'Inbound Inflow'
    },
    {
      id: 'TXN-9038',
      counterparty: 'Pacific Smurfing Cluster #4',
      accountId: 'ACC-0014',
      type: 'OUTFLOW',
      method: 'Micro-Structuring',
      date: '2026-10-22 20:05:14',
      status: 'FLAGGED',
      amount: 15800.00,
      riskLevel: 'HIGH',
      category: 'Smurfing Ring'
    },
    {
      id: 'TXN-9037',
      counterparty: 'Federal Clearing Settlement',
      accountId: 'ACC-0002',
      type: 'INFLOW',
      method: 'Fedwire Batch',
      date: '2026-10-22 11:30:00',
      status: 'SUCCESS',
      amount: 310500.00,
      riskLevel: 'LOW',
      category: 'Capital Inflow'
    },
    {
      id: 'TXN-9036',
      counterparty: 'Offshore Holding Node 07',
      accountId: 'ACC-0019',
      type: 'OUTFLOW',
      method: 'Cross-Border ACH',
      date: '2026-10-21 09:12:45',
      status: 'REVIEW',
      amount: 24300.00,
      riskLevel: 'MEDIUM',
      category: 'Pending Review'
    }
  ], []);

  const [transactions, setTransactions] = useState(initialTransactions);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch =
        t.counterparty.toLowerCase().includes(txSearch.toLowerCase()) ||
        t.accountId.toLowerCase().includes(txSearch.toLowerCase()) ||
        t.id.toLowerCase().includes(txSearch.toLowerCase());
      if (!matchSearch) return false;

      if (txFilter === 'INFLOW') return t.type === 'INFLOW';
      if (txFilter === 'OUTFLOW') return t.type === 'OUTFLOW';
      if (txFilter === 'FLAGGED') return t.status === 'FLAGGED' || t.riskLevel === 'HIGH';
      return true;
    });
  }, [transactions, txSearch, txFilter]);

  // Handle Send Money Submit
  const handleSendSubmit = (e) => {
    e.preventDefault();
    const parsedAmt = parseFloat(sendForm.amount);
    if (!parsedAmt || parsedAmt <= 0) return;

    const newTx = {
      id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
      counterparty: sendForm.recipient,
      accountId: 'ACC-0001 (Main Treasury)',
      type: 'OUTFLOW',
      method: sendForm.category,
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: 'SUCCESS',
      amount: parsedAmt,
      riskLevel: 'LOW',
      category: sendForm.note || 'Treasury Transfer'
    };

    setTransactions(prev => [newTx, ...prev]);
    setIsSendModalOpen(false);
    setSendForm({ recipient: 'ACC-0048 (Benchmark Corp)', amount: '', note: 'Inter-desk liquidity allocation', category: 'Wire Transfer' });
    setSendNotice(`Successfully authorized transfer of $${parsedAmt.toLocaleString()} to ${sendForm.recipient}`);
    setTimeout(() => setSendNotice(null), 4000);
  };

  // Primary brand turquoise based on active theme
  const brandTurquoise = isDark ? '#1FC8DB' : '#0E9FB3';

  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto pb-16 font-sans">

      {/* Floating Notice */}
      {sendNotice && (
        <div className="fixed top-16 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E] text-xs font-semibold shadow-lg backdrop-blur-md animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
          <span>{sendNotice}</span>
        </div>
      )}

      {/* 1. Hero Header & Quick Status Banner */}
      <section className="fintech-card p-5 sm:p-6 relative overflow-hidden">
        {/* Subtle Turquoise-to-Yellow Accent Highlight Bar (Rule: used only on hero header) */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{
            background: isDark
              ? 'linear-gradient(90deg, #1FC8DB 0%, #FFD23F 100%)'
              : 'linear-gradient(90deg, #0E9FB3 0%, #FFD23F 100%)'
          }}
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-fintech-muted">
                FINTECH DESK // COMMAND CORE
              </span>
              <span className="text-fintech-border">|</span>
              <span className="text-[11px] font-mono text-fintech-muted">
                WCAG AA COMPLIANT • 70/20/10 BALANCE
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-fintech-text">
              Capital Intelligence &amp;{' '}
              <span className="fintech-hero-gradient">
                Risk Surveillance
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-fintech-muted mt-1 max-w-2xl">
              Real-time balance settlement, multi-hop liquidity tracing, and GNN anomaly mitigation with full audit compliance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsSendModalOpen(true)}
              className="btn-accent px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send / Transfer</span>
            </button>

            {onOpenLivePipeline && (
              <button
                onClick={onOpenLivePipeline}
                className="btn-primary px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Run GNN Scan</span>
              </button>
            )}

            <button
              onClick={() => setCurrentPage('transactions')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-fintech-surface hover:bg-fintech-elevated border border-fintech-border text-fintech-text transition flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-fintech-muted" />
              <span>Ledger View</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Primary Balance Card & Quick Actions */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Large Main Balance Card */}
        <div className="lg:col-span-2 fintech-card p-6 relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider font-mono text-fintech-muted">
                TOTAL INSTITUTIONAL CAPITAL
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E]">
                <span>+14.8%</span>
                <span className="text-[10px]">▲</span>
              </span>
            </div>

            {/* Large Bold Numbers (Fintech rule) */}
            <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-fintech-text">
              $2,845,920<span className="text-fintech-muted text-3xl font-bold">.40</span>
            </div>

            <p className="text-xs text-fintech-muted mt-2">
              Audited across 4 primary liquidity nodes • Fully collateralized reserve
            </p>
          </div>

          {/* Sub-Metric Breakdown (70% neutral design, no gradients in data table) */}
          <div className="grid grid-cols-3 gap-3 pt-6 mt-6 border-t border-fintech-border">
            <div className="p-3 rounded-xl bg-fintech-surface border border-fintech-borderSubtle">
              <span className="text-[11px] font-mono font-medium text-fintech-muted block">
                AVAILABLE LIQUIDITY
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-fintech-text mt-0.5 block">
                $2,140,500.00
              </span>
              <span className="text-[10px] text-[#22C55E] font-bold flex items-center gap-0.5 mt-1">
                <span>+8.2%</span>
                <span>▲</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-fintech-surface border border-fintech-borderSubtle">
              <span className="text-[11px] font-mono font-medium text-fintech-muted block">
                IN-TRANSIT / ESCROW
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-fintech-text mt-0.5 block">
                $580,220.40
              </span>
              <span className="text-[10px] text-fintech-muted font-bold flex items-center gap-0.5 mt-1">
                <span>Settling today</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-fintech-surface border border-fintech-borderSubtle">
              <span className="text-[11px] font-mono font-medium text-fintech-muted block">
                FLAGGED HOLDINGS
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-fintech-text mt-0.5 block">
                $125,200.00
              </span>
              <span className="text-[10px] text-[#FF5C6C] font-bold flex items-center gap-0.5 mt-1">
                <span>-3.4%</span>
                <span>▼</span>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="fintech-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider font-mono text-fintech-muted">
                QUICK ACTIONS
              </h2>
              <span className="text-[11px] font-mono text-fintech-muted">INSTANT ROUTE</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Transfer: Yellow accent with black text */}
              <button
                onClick={() => setIsSendModalOpen(true)}
                className="btn-accent p-3.5 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 shadow-sm group"
              >
                <div className="w-8 h-8 rounded-full bg-[#0B0B0F] text-[#FFD23F] flex items-center justify-center transition-transform group-hover:scale-110">
                  <Send className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold leading-tight">Send Capital</span>
              </button>

              {/* Receive / Ingest: Primary turquoise */}
              <button
                onClick={() => setCurrentPage('upload')}
                className="btn-primary p-3.5 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 shadow-sm group"
              >
                <div className="w-8 h-8 rounded-full bg-[#0B0B0F] text-[#1FC8DB] flex items-center justify-center transition-transform group-hover:scale-110">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold leading-tight">Ingest CSV</span>
              </button>

              {/* Graph Investigation */}
              <button
                onClick={() => setCurrentPage('graph')}
                className="p-3.5 rounded-xl bg-fintech-surface hover:bg-fintech-elevated border border-fintech-border flex flex-col items-center justify-center text-center gap-1.5 text-fintech-text transition group"
              >
                <div className="w-8 h-8 rounded-full bg-fintech-elevated text-fintech-primary flex items-center justify-center transition-transform group-hover:scale-110">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold leading-tight">3D Topology</span>
              </button>

              {/* Money Trail */}
              <button
                onClick={() => setCurrentPage('money-trail')}
                className="p-3.5 rounded-xl bg-fintech-surface hover:bg-fintech-elevated border border-fintech-border flex flex-col items-center justify-center text-center gap-1.5 text-fintech-text transition group"
              >
                <div className="w-8 h-8 rounded-full bg-fintech-elevated text-fintech-primary flex items-center justify-center transition-transform group-hover:scale-110">
                  <Activity className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold leading-tight">Money Trail</span>
              </button>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-fintech-border flex items-center justify-between text-xs">
            <span className="text-fintech-muted font-mono text-[11px]">AML KERNEL: ACTIVE</span>
            <button
              onClick={() => setCurrentPage('cases')}
              className="text-xs font-bold font-mono text-fintech-primary hover:underline flex items-center gap-1"
            >
              <span>View Dossiers</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. Four Telemetry KPI Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Inflow */}
        <div className="fintech-card p-4">
          <div className="flex items-center justify-between text-fintech-muted text-xs font-mono">
            <span>MONTHLY INFLOW</span>
            <ArrowDownLeft className="w-4 h-4 text-[#22C55E]" />
          </div>
          <div className="text-2xl font-bold font-mono text-fintech-text mt-2">
            +$1,480,250<span className="text-sm font-normal text-fintech-muted">.00</span>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-[#22C55E] font-bold font-mono flex items-center gap-1">
              <span>+8.4%</span>
              <span className="text-[10px]">▲</span>
            </span>
            <span className="text-fintech-muted text-[11px]">1,248 receipts</span>
          </div>
        </div>

        {/* KPI 2: Outflow */}
        <div className="fintech-card p-4">
          <div className="flex items-center justify-between text-fintech-muted text-xs font-mono">
            <span>MONTHLY OUTFLOW</span>
            <ArrowUpRight className="w-4 h-4 text-[#FF5C6C]" />
          </div>
          <div className="text-2xl font-bold font-mono text-fintech-text mt-2">
            -$920,410<span className="text-sm font-normal text-fintech-muted">.00</span>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-[#FF5C6C] font-bold font-mono flex items-center gap-1">
              <span>-3.2%</span>
              <span className="text-[10px]">▼</span>
            </span>
            <span className="text-fintech-muted text-[11px]">832 settlements</span>
          </div>
        </div>

        {/* KPI 3: Mule Exposure */}
        <div className="fintech-card p-4">
          <div className="flex items-center justify-between text-fintech-muted text-xs font-mono">
            <span>MULE ANOMALY EXP.</span>
            <ShieldAlert className="w-4 h-4 text-[#FF5C6C]" />
          </div>
          <div className="text-2xl font-bold font-mono text-fintech-text mt-2">
            $48,200<span className="text-sm font-normal text-fintech-muted">.00</span>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-[#FF5C6C] font-bold font-mono flex items-center gap-1">
              <span>3 Rings</span>
              <span className="text-[10px]">▼</span>
            </span>
            <span className="text-fintech-muted text-[11px]">Under surveillance</span>
          </div>
        </div>

        {/* KPI 4: Capital Health Index */}
        <div className="fintech-card p-4">
          <div className="flex items-center justify-between text-fintech-muted text-xs font-mono">
            <span>CAPITAL HEALTH SCORE</span>
            <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
          </div>
          <div className="text-2xl font-bold font-mono text-fintech-text mt-2">
            98.6<span className="text-sm font-normal text-fintech-muted"> / 100</span>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-[#22C55E] font-bold font-mono flex items-center gap-1">
              <span>Optimal</span>
              <span className="text-[10px]">▲</span>
            </span>
            <span className="text-fintech-muted text-[11px]">Zero chargeback</span>
          </div>
        </div>
      </section>

      {/* 4. Cash Flow & Spending Chart with Gradient Line */}
      <section className="fintech-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-fintech-muted">
                FINANCIAL LIQUIDITY &amp; CASH FLOW
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-fintech-surface border border-fintech-border text-fintech-primary">
                DYNAMIC VELOCITY
              </span>
            </div>
            <h3 className="text-lg font-bold text-fintech-text mt-0.5">
              Net Capital Flow &amp; Liquidity Horizon
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Mode Filter */}
            <div className="flex rounded-lg bg-fintech-surface p-1 border border-fintech-border text-xs">
              <button
                onClick={() => setFlowType('all')}
                className={`px-2.5 py-1 rounded-md font-mono transition ${
                  flowType === 'all'
                    ? 'bg-fintech-card text-fintech-text font-bold shadow-sm'
                    : 'text-fintech-muted hover:text-fintech-text'
                }`}
              >
                Portfolio Balance
              </button>
              <button
                onClick={() => setFlowType('inflow')}
                className={`px-2.5 py-1 rounded-md font-mono transition ${
                  flowType === 'inflow'
                    ? 'bg-fintech-card text-[#22C55E] font-bold shadow-sm'
                    : 'text-fintech-muted hover:text-fintech-text'
                }`}
              >
                Inflow (+▲)
              </button>
              <button
                onClick={() => setFlowType('outflow')}
                className={`px-2.5 py-1 rounded-md font-mono transition ${
                  flowType === 'outflow'
                    ? 'bg-fintech-card text-[#FF5C6C] font-bold shadow-sm'
                    : 'text-fintech-muted hover:text-fintech-text'
                }`}
              >
                Outflow (-▼)
              </button>
            </div>

            {/* Timeframe Switcher */}
            <div className="flex rounded-lg bg-fintech-surface p-1 border border-fintech-border text-xs font-mono">
              {['24H', '7D', '30D', '90D', '1Y'].map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-1 rounded-md transition ${
                    timeframe === tf
                      ? 'bg-fintech-card text-fintech-text font-bold shadow-sm'
                      : 'text-fintech-muted hover:text-fintech-text'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recharts Area Chart with Turquoise to Yellow Line Gradient */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                {/* Rule: Use turquoise-to-yellow gradient ONLY on hero & chart lines */}
                <linearGradient id="fintechLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={brandTurquoise} />
                  <stop offset="100%" stopColor="#FFD23F" />
                </linearGradient>

                <linearGradient id="fintechAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={brandTurquoise} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={brandTurquoise} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={isDark ? '#262833' : '#E5E7EB'}
              />

              <XAxis
                dataKey="date"
                stroke={isDark ? '#9CA3AF' : '#6B7280'}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                fontFamily="monospace"
              />

              <YAxis
                stroke={isDark ? '#9CA3AF' : '#6B7280'}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                fontFamily="monospace"
                tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#15161D' : '#FFFFFF',
                  borderColor: isDark ? '#262833' : '#E5E7EB',
                  borderRadius: '12px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: isDark ? '#FFFFFF' : '#0B0B0F'
                }}
                formatter={(val) => [`$${Number(val).toLocaleString()}`, 'Amount']}
                labelStyle={{ fontWeight: 'bold', color: isDark ? '#FFFFFF' : '#0B0B0F' }}
              />

              <Area
                type="monotone"
                dataKey={currentMetricKey}
                stroke="url(#fintechLineGrad)"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#fintechAreaGrad)"
                activeDot={{ r: 6, fill: '#FFD23F', stroke: brandTurquoise, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-xs text-fintech-muted font-mono mt-4 pt-4 border-t border-fintech-border">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: brandTurquoise }} />
              <span>Capital Velocity Baseline</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFD23F]" />
              <span>Peak Target Projection</span>
            </span>
          </div>
          <span>Updated realtime via WebSocket</span>
        </div>
      </section>

      {/* 5. Recent Financial Transactions Ledger */}
      <section className="fintech-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-fintech-text">
              Recent Transactions Ledger
            </h3>
            <p className="text-xs text-fintech-muted mt-0.5">
              70% neutral design compliant • Instant counterparty settlement validation
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Tabs */}
            <div className="flex rounded-lg bg-fintech-surface p-1 border border-fintech-border text-xs font-mono">
              <button
                onClick={() => setTxFilter('ALL')}
                className={`px-2.5 py-1 rounded-md transition ${
                  txFilter === 'ALL'
                    ? 'bg-fintech-card text-fintech-text font-bold shadow-sm'
                    : 'text-fintech-muted hover:text-fintech-text'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTxFilter('INFLOW')}
                className={`px-2.5 py-1 rounded-md transition ${
                  txFilter === 'INFLOW'
                    ? 'bg-fintech-card text-[#22C55E] font-bold shadow-sm'
                    : 'text-fintech-muted hover:text-fintech-text'
                }`}
              >
                Inflow (+▲)
              </button>
              <button
                onClick={() => setTxFilter('OUTFLOW')}
                className={`px-2.5 py-1 rounded-md transition ${
                  txFilter === 'OUTFLOW'
                    ? 'bg-fintech-card text-[#FF5C6C] font-bold shadow-sm'
                    : 'text-fintech-muted hover:text-fintech-text'
                }`}
              >
                Outflow (-▼)
              </button>
              <button
                onClick={() => setTxFilter('FLAGGED')}
                className={`px-2.5 py-1 rounded-md transition ${
                  txFilter === 'FLAGGED'
                    ? 'bg-fintech-card text-[#FF5C6C] font-bold shadow-sm'
                    : 'text-fintech-muted hover:text-fintech-text'
                }`}
              >
                Flagged (Mules)
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-fintech-muted absolute left-3 top-2.5" />
              <input
                type="text"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="Search counterparty or ID..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-fintech-surface border border-fintech-border text-xs text-fintech-text placeholder-fintech-muted focus:outline-none focus:border-fintech-primary w-48 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table (Clean 70% neutrals, no gradients on data table) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-fintech-border text-fintech-muted font-mono font-bold tracking-wider">
                <th className="py-3 px-3">TXN IDENTIFIER</th>
                <th className="py-3 px-3">COUNTERPARTY / ACCOUNT</th>
                <th className="py-3 px-3">METHOD &amp; TYPE</th>
                <th className="py-3 px-3">TIMESTAMP</th>
                <th className="py-3 px-3">STATUS</th>
                <th className="py-3 px-3 text-right">AMOUNT</th>
                <th className="py-3 px-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fintech-borderSubtle">
              {filteredTransactions.map((tx) => {
                const isInflow = tx.type === 'INFLOW';
                const isFlagged = tx.status === 'FLAGGED' || tx.riskLevel === 'HIGH';
                const isReview = tx.status === 'REVIEW';

                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-fintech-surface transition group"
                  >
                    {/* ID */}
                    <td className="py-3 px-3 font-mono font-bold text-fintech-text">
                      {tx.id}
                    </td>

                    {/* Counterparty */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isInflow
                            ? 'bg-[#22C55E]/15 text-[#22C55E]'
                            : isFlagged
                            ? 'bg-[#FF5C6C]/15 text-[#FF5C6C]'
                            : 'bg-fintech-surface border border-fintech-border text-fintech-muted'
                        }`}>
                          {isInflow ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : isFlagged ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : (
                            <CreditCard className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-fintech-text">
                            {tx.counterparty}
                          </div>
                          <div className="text-[10px] font-mono text-fintech-muted">
                            {tx.accountId} • {tx.category}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Method */}
                    <td className="py-3 px-3 font-mono text-fintech-muted">
                      {tx.method}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-3 font-mono text-fintech-muted text-[11px]">
                      {tx.date}
                    </td>

                    {/* Status Badge (Rule: Gains use #22C55E with ▲, Losses use #FF5C6C with ▼, Accent yellow with black text) */}
                    <td className="py-3 px-3">
                      {isFlagged ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[#FF5C6C]/15 border border-[#FF5C6C]/30 text-[#FF5C6C]">
                          <span>ALERT</span>
                          <span>▼</span>
                        </span>
                      ) : isReview ? (
                        /* Yellow accent fill with black text */
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[#FFD23F] text-[#0B0B0F]">
                          <span>REVIEW</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E]">
                          <span>CLEARED</span>
                          <span>▲</span>
                        </span>
                      )}
                    </td>

                    {/* Amount: Large bold figures with WCAG AA compliance */}
                    <td className="py-3 px-3 text-right">
                      <div className={`font-mono font-bold text-sm sm:text-base ${
                        isInflow ? 'text-[#22C55E]' : 'text-[#FF5C6C]'
                      }`}>
                        {isInflow ? `+$${tx.amount.toLocaleString()}` : `-$${tx.amount.toLocaleString()}`}
                        <span className="text-[10px] ml-1">{isInflow ? '▲' : '▼'}</span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => {
                          if (onAccountSelect) onAccountSelect(tx.accountId);
                          setCurrentPage('money-trail');
                        }}
                        className="px-2 py-1 rounded bg-fintech-surface hover:bg-fintech-elevated border border-fintech-border text-fintech-primary text-[10px] font-mono font-bold transition inline-flex items-center gap-1"
                        title="Trace in Money Trail"
                      >
                        <span>Trace</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. Send Money / Capital Transfer Modal */}
      {isSendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="fintech-card w-full max-w-md p-6 bg-fintech-card border border-fintech-border shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-fintech-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#FFD23F] text-[#0B0B0F] flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-fintech-text">Authorize Capital Transfer</h3>
                  <p className="text-xs text-fintech-muted">Immediate Settlement with AML Pre-Clearance</p>
                </div>
              </div>
              <button
                onClick={() => setIsSendModalOpen(false)}
                className="text-fintech-muted hover:text-fintech-text text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendSubmit} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-mono font-bold text-fintech-muted mb-1">
                  RECIPIENT INSTITUTION / ACCOUNT
                </label>
                <select
                  value={sendForm.recipient}
                  onChange={(e) => setSendForm({ ...sendForm, recipient: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-fintech-surface border border-fintech-border text-xs text-fintech-text focus:outline-none focus:border-fintech-primary"
                >
                  <option value="ACC-0048 (Apex Global Liquidity)">ACC-0048 (Apex Global Liquidity)</option>
                  <option value="ACC-0002 (Federal Clearing)">ACC-0002 (Federal Clearing)</option>
                  <option value="ACC-0084 (Infrastructure Node)">ACC-0084 (Infrastructure Node)</option>
                  <option value="ACC-0091 (Vanguard Escrow)">ACC-0091 (Vanguard Escrow)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-fintech-muted mb-1">
                  TRANSFER AMOUNT (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-fintech-muted font-mono font-bold">$</span>
                  <input
                    type="number"
                    step="any"
                    required
                    value={sendForm.amount}
                    onChange={(e) => setSendForm({ ...sendForm, amount: e.target.value })}
                    placeholder="25,000.00"
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-fintech-surface border border-fintech-border text-sm font-mono font-bold text-fintech-text focus:outline-none focus:border-fintech-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-fintech-muted mb-1">
                  SETTLEMENT METHOD
                </label>
                <select
                  value={sendForm.category}
                  onChange={(e) => setSendForm({ ...sendForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-fintech-surface border border-fintech-border text-xs text-fintech-text focus:outline-none focus:border-fintech-primary"
                >
                  <option value="SWIFT Wire">SWIFT Wire (Real-Time Gross Settlement)</option>
                  <option value="Fedwire Batch">Fedwire Batch Transfer</option>
                  <option value="SEPA Instant">SEPA Instant Settlement</option>
                  <option value="Internal Escrow">Internal Vault Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-fintech-muted mb-1">
                  REFERENCE NOTE
                </label>
                <input
                  type="text"
                  value={sendForm.note}
                  onChange={(e) => setSendForm({ ...sendForm, note: e.target.value })}
                  placeholder="e.g. Treasury liquidity rebalance"
                  className="w-full px-3 py-2 rounded-xl bg-fintech-surface border border-fintech-border text-xs text-fintech-text focus:outline-none focus:border-fintech-primary"
                />
              </div>

              <div className="p-3 rounded-xl bg-fintech-surface border border-fintech-borderSubtle text-[11px] text-fintech-muted flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                <span>
                  Transactions above $10,000 are automatically hashed and registered into the immutable audit trail.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSendModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-fintech-surface hover:bg-fintech-elevated border border-fintech-border text-fintech-text"
                >
                  Cancel
                </button>
                {/* Yellow Accent button with black text */}
                <button
                  type="submit"
                  className="btn-accent px-5 py-2 rounded-xl text-xs flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirm &amp; Authorize</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
