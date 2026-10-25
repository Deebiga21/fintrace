import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Activity,
  FileText,
  ChevronRight,
  ExternalLink,
  Zap,
  CreditCard,
  RefreshCw
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
import { api } from '../services/api';

const CURRENCY = '₹';
const TIMEFRAME_HOURS = { '24H': 24, '7D': 168, '30D': 720, '90D': 2160, '1Y': 8760 };

const formatAmount = (value) => {
  const amount = Number(value) || 0;
  return `${CURRENCY}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const splitAmount = (value) => {
  const [whole, fraction] = (Number(value) || 0).toFixed(2).split('.');
  return { whole: `${CURRENCY}${Number(whole).toLocaleString('en-IN')}`, fraction: `.${fraction}` };
};

const formatCompact = (value) => {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1e7) return `${CURRENCY}${(amount / 1e7).toFixed(2)} Cr`;
  if (Math.abs(amount) >= 1e5) return `${CURRENCY}${(amount / 1e5).toFixed(2)} L`;
  if (Math.abs(amount) >= 1e3) return `${CURRENCY}${(amount / 1e3).toFixed(1)}K`;
  return `${CURRENCY}${amount.toFixed(0)}`;
};

// Aggregate the real transaction stream into day buckets (hour buckets for 24H).
// The window is anchored to the newest loaded transaction, not to wall-clock time,
// so a static benchmark dataset never renders an empty chart.
const buildChartSeries = (transactions, timeframe) => {
  const parsed = transactions
    .map((tx) => ({ tx, stamp: new Date(tx.timestamp).getTime() }))
    .filter(({ stamp }) => Number.isFinite(stamp));
  if (!parsed.length) return [];

  const latest = Math.max(...parsed.map(({ stamp }) => stamp));
  const cutoff = latest - (TIMEFRAME_HOURS[timeframe] ?? 720) * 3600 * 1000;
  const hourly = timeframe === '24H';
  const buckets = new Map();

  parsed.forEach(({ tx, stamp }) => {
    if (stamp < cutoff) return;
    // Timestamps are stored without a zone, so bucket on the literal date/hour
    // instead of converting through the browser's local timezone.
    const raw = String(tx.timestamp);
    const key = hourly
      ? `${raw.slice(5, 10)} ${raw.slice(11, 13)}h`
      : raw.slice(0, 10);
    const bucket = buckets.get(key) || { date: key, volume: 0, suspicious: 0, count: 0 };
    bucket.volume += Number(tx.amount) || 0;
    bucket.count += 1;
    if (tx.is_suspicious) bucket.suspicious += Number(tx.amount) || 0;
    buckets.set(key, bucket);
  });

  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
};

export default function DashboardPage({
  setCurrentPage,
  onAccountSelect,
  onOpenCreateCase,
  refreshTrigger,
  onOpenLivePipeline
}) {
  const { isDark } = useTheme();

  // Timeframe / chart selectors
  const [timeframe, setTimeframe] = useState('30D');
  const [flowType, setFlowType] = useState('volume'); // 'volume' | 'suspicious' | 'count'
  const [txSearch, setTxSearch] = useState('');
  const [txFilter, setTxFilter] = useState('ALL'); // 'ALL' | 'FLAGGED' | 'CLEARED'

  // Live data from the Rust API
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryResponse, transactionRows] = await Promise.all([
        api.getDashboardSummary(),
        api.getTransactions({ limit: 500 })
      ]);
      setSummary(summaryResponse);
      setTransactions(Array.isArray(transactionRows) ? transactionRows : []);
      setLastUpdated(new Date());
      setFetchError(null);
    } catch (err) {
      setFetchError(err?.message || 'Cannot reach the FinTrace API on port 8000.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, refreshTrigger]);

  // Totals straight from /dashboard/summary; flagged accounts derived from the ledger
  const totals = useMemo(() => {
    const volume = summary?.transactions?.total_volume ?? 0;
    const suspiciousVolume = summary?.transactions?.suspicious_volume ?? 0;
    const totalCount = summary?.transactions?.total_count ?? 0;
    const suspiciousCount = summary?.transactions?.suspicious_count ?? 0;
    const accounts = summary?.accounts?.total ?? 0;
    const highRiskAccounts = summary?.accounts?.high_risk ?? 0;
    const flaggedAccounts = new Set();

    transactions.forEach((tx) => {
      if (tx.is_suspicious) {
        flaggedAccounts.add(tx.sender_account);
        flaggedAccounts.add(tx.receiver_account);
      }
    });

    return {
      volume,
      suspiciousVolume,
      totalCount,
      suspiciousCount,
      accounts,
      highRiskAccounts,
      flaggedAccounts: flaggedAccounts.size,
      cleanVolume: Math.max(volume - suspiciousVolume, 0),
      cleanShare: volume > 0 ? ((volume - suspiciousVolume) / volume) * 100 : 0,
      suspiciousShare: volume > 0 ? (suspiciousVolume / volume) * 100 : 0
    };
  }, [summary, transactions]);

  const chartData = useMemo(() => buildChartSeries(transactions, timeframe), [transactions, timeframe]);

  const chartMetricKey = flowType === 'suspicious' ? 'suspicious' : flowType === 'count' ? 'count' : 'volume';
  const chartMetricLabel =
    flowType === 'suspicious' ? 'Suspicious volume' : flowType === 'count' ? 'Transaction count' : 'Total volume';
  const chartPeak = chartData.reduce((max, point) => Math.max(max, point[chartMetricKey] || 0), 0);

  // Map API records onto the ledger table's presentation shape
  const ledgerRows = useMemo(() => transactions.map((tx) => ({
    id: tx.transaction_id,
    sender: tx.sender_account,
    receiver: tx.receiver_account,
    description: tx.description || 'No description',
    method: tx.transaction_type || 'N/A',
    date: (tx.timestamp || '').replace('T', ' ').slice(0, 19),
    status: tx.status || 'UNKNOWN',
    flagged: Boolean(tx.is_suspicious),
    amount: Number(tx.amount) || 0
  })), [transactions]);

  const filteredTransactions = useMemo(() => {
    const query = txSearch.trim().toLowerCase();
    return ledgerRows.filter((tx) => {
      if (query) {
        const haystack = `${tx.id} ${tx.sender} ${tx.receiver} ${tx.description}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (txFilter === 'FLAGGED') return tx.flagged;
      if (txFilter === 'CLEARED') return !tx.flagged;
      return true;
    });
  }, [ledgerRows, txSearch, txFilter]);

  const visibleTransactions = filteredTransactions.slice(0, 10);


  // Primary brand turquoise based on active theme
  const brandTurquoise = isDark ? '#1FC8DB' : '#0E9FB3';

  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto pb-16 font-sans">

      {/* API status banner */}
      {fetchError && (
        <div className="fixed top-16 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#FF5C6C]/15 border border-[#FF5C6C]/40 text-[#FF5C6C] text-xs font-semibold shadow-lg backdrop-blur-md animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-[#FF5C6C] shrink-0" />
          <span>{fetchError}</span>
          <button onClick={loadDashboard} className="underline font-mono">Retry</button>
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
              Live transaction monitoring, multi-hop money-trail tracing, and GNN anomaly scoring over the loaded benchmark dataset.
            </p>
            <p className="text-[11px] font-mono text-fintech-muted mt-1">
              {loading
                ? 'Synchronising with /api/v1/dashboard/summary…'
                : lastUpdated
                ? `Last synced ${lastUpdated.toLocaleTimeString('en-IN')} • Dataset: ${summary?.dataset_name || 'n/a'}`
                : 'Awaiting first sync'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenCreateCase && (
              <button
                onClick={onOpenCreateCase}
                className="btn-accent px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Open New Case</span>
              </button>
            )}

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

            <button
              onClick={loadDashboard}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-fintech-surface hover:bg-fintech-elevated border border-fintech-border text-fintech-text transition flex items-center gap-1.5 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-fintech-muted ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Syncing' : 'Refresh'}</span>
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
                TOTAL TRANSACTION VOLUME
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                <span>{summary?.currency || 'INR'} • LIVE</span>
              </span>
            </div>

            {/* Large Bold Numbers (Fintech rule) */}
            <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-fintech-text">
              {splitAmount(totals.volume).whole}
              <span className="text-fintech-muted text-3xl font-bold">{splitAmount(totals.volume).fraction}</span>
            </div>

            <p className="text-xs text-fintech-muted mt-2">
              {totals.totalCount.toLocaleString('en-IN')} transactions across {totals.accounts.toLocaleString('en-IN')} accounts • {totals.suspiciousCount.toLocaleString('en-IN')} flagged in the dataset
            </p>
          </div>

          {/* Sub-Metric Breakdown (70% neutral design, no gradients in data table) */}
          <div className="grid grid-cols-3 gap-3 pt-6 mt-6 border-t border-fintech-border">
            <div className="p-3 rounded-xl bg-fintech-surface border border-fintech-borderSubtle">
              <span className="text-[11px] font-mono font-medium text-fintech-muted block">
                TOTAL TRANSACTIONS
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-fintech-text mt-0.5 block">
                {totals.totalCount.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-fintech-muted font-bold flex items-center gap-0.5 mt-1">
                <span>Ingested &amp; normalised</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-fintech-surface border border-fintech-borderSubtle">
              <span className="text-[11px] font-mono font-medium text-fintech-muted block">
                FLAGGED TRANSACTIONS
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-fintech-text mt-0.5 block">
                {totals.suspiciousCount.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-[#FF5C6C] font-bold flex items-center gap-0.5 mt-1">
                <span>{totals.suspiciousShare.toFixed(1)}% of volume</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-fintech-surface border border-fintech-borderSubtle">
              <span className="text-[11px] font-mono font-medium text-fintech-muted block">
                FLAGGED VOLUME
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-fintech-text mt-0.5 block">
                {formatCompact(totals.suspiciousVolume)}
              </span>
              <span className="text-[10px] text-[#FF5C6C] font-bold flex items-center gap-0.5 mt-1">
                <span>▲ Needs review</span>
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
              {/* New case: Yellow accent with black text */}
              <button
                onClick={() => {
                  if (onOpenCreateCase) onOpenCreateCase();
                  else setCurrentPage('cases');
                }}
                className="btn-accent p-3.5 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 shadow-sm group"
              >
                <div className="w-8 h-8 rounded-full bg-[#0B0B0F] text-[#FFD23F] flex items-center justify-center transition-transform group-hover:scale-110">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold leading-tight">New Case</span>
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
        {/* KPI 1: Ingested volume */}
        <div className="fintech-card p-4">
          <div className="flex items-center justify-between text-fintech-muted text-xs font-mono">
            <span>INGESTED VOLUME</span>
            <ArrowDownLeft className="w-4 h-4 text-[#22C55E]" />
          </div>
          <div className="text-2xl font-bold font-mono text-fintech-text mt-2">
            {formatCompact(totals.volume)}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-[#22C55E] font-bold font-mono flex items-center gap-1">
              <span>{totals.totalCount.toLocaleString('en-IN')} txns</span>
            </span>
            <span className="text-fintech-muted text-[11px]">full dataset</span>
          </div>
        </div>

        {/* KPI 2: Suspicious volume */}
        <div className="fintech-card p-4">
          <div className="flex items-center justify-between text-fintech-muted text-xs font-mono">
            <span>SUSPICIOUS VOLUME</span>
            <ArrowUpRight className="w-4 h-4 text-[#FF5C6C]" />
          </div>
          <div className="text-2xl font-bold font-mono text-fintech-text mt-2">
            {formatCompact(totals.suspiciousVolume)}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-[#FF5C6C] font-bold font-mono flex items-center gap-1">
              <span>{totals.suspiciousCount.toLocaleString('en-IN')} flows</span>
              <span className="text-[10px]">▼</span>
            </span>
            <span className="text-fintech-muted text-[11px]">{totals.suspiciousShare.toFixed(1)}% of total</span>
          </div>
        </div>

        {/* KPI 3: Accounts touching flagged flows */}
        <div className="fintech-card p-4">
          <div className="flex items-center justify-between text-fintech-muted text-xs font-mono">
            <span>ACCOUNTS IN FLAGGED FLOWS</span>
            <ShieldAlert className="w-4 h-4 text-[#FF5C6C]" />
          </div>
          <div className="text-2xl font-bold font-mono text-fintech-text mt-2">
            {totals.flaggedAccounts.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-[#FF5C6C] font-bold font-mono flex items-center gap-1">
              <span>{totals.highRiskAccounts.toLocaleString('en-IN')} high risk</span>
              <span className="text-[10px]">▼</span>
            </span>
            <span className="text-fintech-muted text-[11px]">{totals.accounts.toLocaleString('en-IN')} monitored</span>
          </div>
        </div>

        {/* KPI 4: Clean flow share */}
        <div className="fintech-card p-4">
          <div className="flex items-center justify-between text-fintech-muted text-xs font-mono">
            <span>CLEAN FLOW SHARE</span>
            <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
          </div>
          <div className="text-2xl font-bold font-mono text-fintech-text mt-2">
            {totals.cleanShare.toFixed(1)}<span className="text-sm font-normal text-fintech-muted">%</span>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-[#22C55E] font-bold font-mono flex items-center gap-1">
              <span>{formatCompact(totals.cleanVolume)} clean</span>
              <span className="text-[10px]">▲</span>
            </span>
            <span className="text-fintech-muted text-[11px]">balance of volume</span>
          </div>
        </div>
      </section>

      {/* 4. Cash Flow & Spending Chart with Gradient Line */}
      <section className="fintech-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-fintech-muted">
                TRANSACTION VELOCITY &amp; SUSPICION
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-fintech-surface border border-fintech-border text-fintech-primary">
                DATASET WINDOW
              </span>
            </div>
            <h3 className="text-lg font-bold text-fintech-text mt-0.5">
              Daily Volume vs Flagged Flow
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Mode Filter */}
            <div className="flex rounded-lg bg-fintech-surface p-1 border border-fintech-border text-xs">
              <button
                onClick={() => setFlowType('volume')}
                className={`px-2.5 py-1 rounded-md font-mono transition ${
                  flowType === 'volume'
                    ? 'bg-fintech-card text-fintech-text font-bold shadow-sm'
                    : 'text-fintech-muted hover:text-fintech-text'
                }`}
              >
                Total Volume
              </button>
              <button
                onClick={() => setFlowType('suspicious')}
                className={`px-2.5 py-1 rounded-md font-mono transition ${
                  flowType === 'suspicious'
                    ? 'bg-fintech-card text-[#FF5C6C] font-bold shadow-sm'
                    : 'text-fintech-muted hover:text-fintech-text'
                }`}
              >
                Flagged Volume
              </button>
              <button
                onClick={() => setFlowType('count')}
                className={`px-2.5 py-1 rounded-md font-mono transition ${
                  flowType === 'count'
                    ? 'bg-fintech-card text-[#FFD23F] font-bold shadow-sm'
                    : 'text-fintech-muted hover:text-fintech-text'
                }`}
              >
                Txn Count
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
        {chartData.length === 0 ? (
          <div className="h-72 w-full flex flex-col items-center justify-center gap-2 text-center text-fintech-muted font-mono text-xs">
            <Activity className="w-6 h-6" />
            <span>{loading ? 'Loading transaction history…' : 'No transactions in this window.'}</span>
          </div>
        ) : (
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
                tickFormatter={(val) => (flowType === 'count' ? `${val}` : formatCompact(val))}
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
                formatter={(val) => [
                  flowType === 'count' ? `${Number(val).toLocaleString('en-IN')} txns` : formatAmount(val),
                  chartMetricLabel
                ]}
                labelStyle={{ fontWeight: 'bold', color: isDark ? '#FFFFFF' : '#0B0B0F' }}
              />

              <Area
                type="monotone"
                dataKey={chartMetricKey}
                stroke="url(#fintechLineGrad)"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#fintechAreaGrad)"
                activeDot={{ r: 6, fill: '#FFD23F', stroke: brandTurquoise, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        )}

        <div className="flex items-center justify-between text-xs text-fintech-muted font-mono mt-4 pt-4 border-t border-fintech-border">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: brandTurquoise }} />
              <span>{chartMetricLabel} (daily)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFD23F]" />
              <span>Peak {flowType === 'count' ? chartPeak.toLocaleString('en-IN') : formatCompact(chartPeak)}</span>
            </span>
          </div>
          <span>
            {loading ? 'Syncing…' : `Source: /api/v1/transactions (${totals.totalCount.toLocaleString('en-IN')} records)`}
          </span>
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
              Live records from the Rust API • showing {visibleTransactions.length} of {filteredTransactions.length} matching entries
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
                onClick={() => setTxFilter('FLAGGED')}
                className={`px-2.5 py-1 rounded-md transition ${
                  txFilter === 'FLAGGED'
                    ? 'bg-fintech-card text-[#FF5C6C] font-bold shadow-sm'
                    : 'text-fintech-muted hover:text-fintech-text'
                }`}
              >
                Flagged
              </button>
              <button
                onClick={() => setTxFilter('CLEARED')}
                className={`px-2.5 py-1 rounded-md transition ${
                  txFilter === 'CLEARED'
                    ? 'bg-fintech-card text-[#22C55E] font-bold shadow-sm'
                    : 'text-fintech-muted hover:text-fintech-text'
                }`}
              >
                Cleared
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
              {loading && transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 px-3 text-center text-fintech-muted font-mono text-xs">
                    Loading ledger from /api/v1/transactions…
                  </td>
                </tr>
              ) : visibleTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 px-3 text-center text-fintech-muted font-mono text-xs">
                    No transactions match this filter. Clear the search or pick another tab.
                  </td>
                </tr>
              ) : visibleTransactions.map((tx) => {
                const isFlagged = tx.flagged;
                const isReview = tx.status === 'PENDING' || tx.status === 'REVIEW';

                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-fintech-surface transition group"
                  >
                    {/* ID */}
                    <td className="py-3 px-3 font-mono font-bold text-fintech-text">
                      {tx.id}
                    </td>

                    {/* Sender -> receiver */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isFlagged
                            ? 'bg-[#FF5C6C]/15 text-[#FF5C6C]'
                            : 'bg-fintech-surface border border-fintech-border text-fintech-muted'
                        }`}>
                          {isFlagged ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : (
                            <CreditCard className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-fintech-text flex items-center gap-1.5">
                            <span>{tx.sender}</span>
                            <span className="text-fintech-muted">→</span>
                            <span>{tx.receiver}</span>
                          </div>
                          <div className="text-[10px] font-mono text-fintech-muted">
                            {tx.description}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Channel */}
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
                        isFlagged ? 'text-[#FF5C6C]' : 'text-fintech-text'
                      }`}>
                        {formatAmount(tx.amount)}
                        {isFlagged && <span className="text-[10px] ml-1">▼</span>}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => {
                          if (onAccountSelect) onAccountSelect(tx.sender);
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

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-4 pt-4 border-t border-fintech-border text-[11px] font-mono text-fintech-muted">
          <span>
            Amounts in {summary?.currency || 'INR'} • flagged rows use the dataset&apos;s is_suspicious label
          </span>
          <button
            onClick={() => setCurrentPage('transactions')}
            className="text-fintech-primary font-bold hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Open full ledger</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </section>

    </div>
  );
}
