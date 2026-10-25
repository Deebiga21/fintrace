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
import { api } from '../services/api';
import { palette, chartTheme } from '../theme';

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

  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto pb-16 font-sans">

      {/* API status banner */}
      {fetchError && (
        <div
          role="alert"
          className="fixed top-16 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-canvas-raised border border-[rgba(255,92,108,0.4)] shadow-2xl"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[var(--status-loss)]" />
          <span className="text-[11px] font-mono text-[var(--status-loss)]">{fetchError}</span>
          <button
            onClick={loadDashboard}
            className="text-[11px] font-mono text-ink underline decoration-rule-strong underline-offset-2 hover:decoration-ink"
          >
            Retry
          </button>
        </div>
      )}

      {/* 1. Hero */}
      <header className="pt-2 pb-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5">
            <span className="ft-dot bg-[var(--status-gain)] animate-pulse" />
            <span className="ft-label">Fintech desk · Command core</span>
          </span>
          <span className="hidden sm:block h-3 w-px bg-rule-strong" />
          <span className="ft-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
            WCAG AA · 70/20/10 balance
          </span>
        </div>

        <h1 className="ft-display text-3xl sm:text-4xl mt-4">
          Capital Intelligence &amp;{' '}
          <span className="ft-serif font-normal">Risk Surveillance</span>
        </h1>

        <p className="text-[13px] text-ink-muted mt-3 max-w-2xl leading-relaxed">
          Live transaction monitoring, multi-hop money-trail tracing, and GNN anomaly scoring over
          the loaded benchmark dataset.
        </p>
        <p className="ft-mono text-[10px] text-ink-faint mt-2">
          {loading
            ? 'Synchronising with /api/v1/dashboard/summary…'
            : lastUpdated
              ? `Last synced ${lastUpdated.toLocaleTimeString('en-IN')} · dataset ${summary?.dataset_name || 'n/a'}`
              : 'Awaiting first sync'}
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-5">
          {onOpenCreateCase && (
            <button onClick={onOpenCreateCase} className="ft-btn-primary">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Open new case</span>
            </button>
          )}

          {onOpenLivePipeline && (
            <button onClick={onOpenLivePipeline} className="ft-btn-cyan">
              <Zap className="w-3.5 h-3.5" />
              <span>Run GNN scan</span>
            </button>
          )}

          <button onClick={() => setCurrentPage('transactions')} className="ft-btn-ghost">
            <FileText className="w-3.5 h-3.5" />
            <span>Ledger view</span>
          </button>

          <button onClick={loadDashboard} disabled={loading} className="ft-btn-ghost">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Syncing' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* 2. Volume & quick actions */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Total volume */}
        <div className="lg:col-span-2 ft-panel p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="ft-label">Total transaction volume</span>
              <span className="ft-pill">
                <span className="ft-dot bg-[var(--status-gain)] animate-pulse" />
                {summary?.currency || 'INR'} · Live
              </span>
            </div>

            <div className="ft-mono text-4xl sm:text-5xl font-semibold tracking-tight text-ink mt-4">
              {splitAmount(totals.volume).whole}
              <span className="text-ink-faint text-3xl font-normal">
                {splitAmount(totals.volume).fraction}
              </span>
            </div>

            <p className="text-[11px] text-ink-muted mt-2.5">
              {totals.totalCount.toLocaleString('en-IN')} transactions across{' '}
              {totals.accounts.toLocaleString('en-IN')} accounts ·{' '}
              {totals.suspiciousCount.toLocaleString('en-IN')} flagged
            </p>
          </div>

          <div className="grid grid-cols-3 divide-x divide-rule border-t border-rule mt-6 pt-4">
            <div className="pr-4">
              <span className="ft-label">Transactions</span>
              <span className="ft-mono text-lg text-ink block mt-1.5">
                {totals.totalCount.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-ink-faint block mt-1">Ingested &amp; normalised</span>
            </div>

            <div className="px-4">
              <span className="ft-label">Flagged</span>
              <span className="ft-mono text-lg text-ink block mt-1.5">
                {totals.suspiciousCount.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-[var(--status-loss)] block mt-1">
                {totals.suspiciousShare.toFixed(1)}% of volume
              </span>
            </div>

            <div className="pl-4">
              <span className="ft-label">Flagged volume</span>
              <span className="ft-mono text-lg text-ink block mt-1.5">
                {formatCompact(totals.suspiciousVolume)}
              </span>
              <span className="text-[10px] text-[var(--status-loss)] block mt-1">Needs review</span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="ft-panel-flat p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="ft-label">Quick actions</span>
              <span className="ft-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                Instant route
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => {
                  if (onOpenCreateCase) onOpenCreateCase();
                  else setCurrentPage('cases');
                }}
                className="group border border-rule rounded-lg p-3 flex flex-col items-start gap-2.5 text-left transition-colors hover:border-rule-strong hover:bg-white/[0.03]"
              >
                <span className="w-7 h-7 rounded-md border border-rule flex items-center justify-center text-[var(--status-loss)]">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] font-semibold text-ink leading-tight">New case</span>
              </button>

              <button
                onClick={() => setCurrentPage('upload')}
                className="group border border-rule rounded-lg p-3 flex flex-col items-start gap-2.5 text-left transition-colors hover:border-rule-strong hover:bg-white/[0.03]"
              >
                <span className="w-7 h-7 rounded-md border border-rule flex items-center justify-center text-[var(--focus)]">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] font-semibold text-ink leading-tight">Ingest CSV</span>
              </button>

              <button
                onClick={() => setCurrentPage('graph')}
                className="group border border-rule rounded-lg p-3 flex flex-col items-start gap-2.5 text-left transition-colors hover:border-rule-strong hover:bg-white/[0.03]"
              >
                <span className="w-7 h-7 rounded-md border border-rule flex items-center justify-center text-ink-muted">
                  <Layers className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] font-semibold text-ink leading-tight">3D topology</span>
              </button>

              <button
                onClick={() => setCurrentPage('money-trail')}
                className="group border border-rule rounded-lg p-3 flex flex-col items-start gap-2.5 text-left transition-colors hover:border-rule-strong hover:bg-white/[0.03]"
              >
                <span className="w-7 h-7 rounded-md border border-rule flex items-center justify-center text-ink-muted">
                  <Activity className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] font-semibold text-ink leading-tight">Money trail</span>
              </button>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-rule flex items-center justify-between gap-2">
            <span className="ft-label">AML kernel · active</span>
            <button
              onClick={() => setCurrentPage('cases')}
              className="text-[11px] text-ink-muted hover:text-ink inline-flex items-center gap-1 transition-colors"
            >
              View dossiers
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. Telemetry */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-rule border border-rule rounded-xl overflow-hidden">
        {/* Ingested volume */}
        <div className="bg-canvas-raised p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="ft-label">Ingested volume</span>
            <ArrowDownLeft className="w-3.5 h-3.5 shrink-0 text-[var(--status-gain)]" />
          </div>
          <div className="ft-mono text-2xl text-ink mt-2.5">{formatCompact(totals.volume)}</div>
          <div className="flex items-baseline justify-between gap-2 mt-2">
            <span className="ft-mono text-[10px] text-[var(--status-gain)]">
              {totals.totalCount.toLocaleString('en-IN')} txns
            </span>
            <span className="text-[10px] text-ink-faint">full dataset</span>
          </div>
        </div>

        {/* Suspicious volume */}
        <div className="bg-canvas-raised p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="ft-label">Suspicious volume</span>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-[var(--status-loss)]" />
          </div>
          <div className="ft-mono text-2xl text-ink mt-2.5">{formatCompact(totals.suspiciousVolume)}</div>
          <div className="flex items-baseline justify-between gap-2 mt-2">
            <span className="ft-mono text-[10px] text-[var(--status-loss)]">
              {totals.suspiciousCount.toLocaleString('en-IN')} flows
            </span>
            <span className="text-[10px] text-ink-faint">
              {totals.suspiciousShare.toFixed(1)}% of total
            </span>
          </div>
        </div>

        {/* Accounts touching flagged flows */}
        <div className="bg-canvas-raised p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="ft-label">Accounts in flagged flows</span>
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-[var(--status-loss)]" />
          </div>
          <div className="ft-mono text-2xl text-ink mt-2.5">
            {totals.flaggedAccounts.toLocaleString('en-IN')}
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-2">
            <span className="ft-mono text-[10px] text-[var(--status-loss)]">
              {totals.highRiskAccounts.toLocaleString('en-IN')} high risk
            </span>
            <span className="text-[10px] text-ink-faint">
              {totals.accounts.toLocaleString('en-IN')} monitored
            </span>
          </div>
        </div>

        {/* Clean flow share */}
        <div className="bg-canvas-raised p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="ft-label">Clean flow share</span>
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[var(--status-gain)]" />
          </div>
          <div className="ft-mono text-2xl text-ink mt-2.5">
            {totals.cleanShare.toFixed(1)}
            <span className="text-sm text-ink-faint">%</span>
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-2">
            <span className="ft-mono text-[10px] text-[var(--status-gain)]">
              {formatCompact(totals.cleanVolume)} clean
            </span>
            <span className="text-[10px] text-ink-faint">balance of volume</span>
          </div>
        </div>
      </section>

      {/* 4. Transaction velocity */}
      <section className="ft-panel p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="ft-label">Transaction velocity &amp; suspicion</span>
              <span className="ft-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint border border-rule rounded px-1.5 py-px">
                Dataset window
              </span>
            </div>
            <h3 className="text-[15px] font-semibold tracking-tight text-ink mt-1.5">
              Daily volume vs flagged flow
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFlowType('volume')}
              data-active={flowType === 'volume'}
              className="ft-pill"
            >
              Total volume
            </button>
            <button
              type="button"
              onClick={() => setFlowType('suspicious')}
              data-active={flowType === 'suspicious'}
              className="ft-pill"
            >
              Flagged volume
            </button>
            <button
              type="button"
              onClick={() => setFlowType('count')}
              data-active={flowType === 'count'}
              className="ft-pill"
            >
              Txn count
            </button>

            <span className="hidden sm:block h-4 w-px bg-rule mx-1" />

            {['24H', '7D', '30D', '90D', '1Y'].map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                data-active={timeframe === tf}
                className="ft-pill ft-mono px-2.5"
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-72 w-full flex flex-col items-center justify-center gap-2 text-center">
            <Activity className="w-5 h-5 text-ink-faint" />
            <span className="text-[11px] font-mono text-ink-muted">
              {loading ? 'Loading transaction history…' : 'No transactions in this window.'}
            </span>
          </div>
        ) : (
          <div className="h-72 w-full mt-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="ftAreaCyan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={palette.accent} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={palette.accent} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ftAreaLoss" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={palette.loss} stopOpacity={0.16} />
                    <stop offset="100%" stopColor={palette.loss} stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="2 4" vertical={false} />

                <XAxis
                  dataKey="date"
                  tick={chartTheme.tick}
                  tickLine={false}
                  axisLine={{ stroke: chartTheme.axisLine }}
                />

                <YAxis
                  tick={chartTheme.tick}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(val) => (flowType === 'count' ? `${val}` : formatCompact(val))}
                />

                <Tooltip
                  contentStyle={chartTheme.tooltip}
                  cursor={chartTheme.cursor}
                  itemStyle={{ color: palette.ink }}
                  labelStyle={{ color: palette.ink, fontWeight: 600, marginBottom: 2 }}
                  formatter={(val) => [
                    flowType === 'count' ? `${Number(val).toLocaleString('en-IN')} txns` : formatAmount(val),
                    chartMetricLabel
                  ]}
                />

                <Area
                  type="monotone"
                  dataKey={chartMetricKey}
                  stroke={flowType === 'suspicious' ? chartTheme.strokeFlagged : chartTheme.stroke}
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill={flowType === 'suspicious' ? 'url(#ftAreaLoss)' : 'url(#ftAreaCyan)'}
                  activeDot={{ r: 3, fill: palette.ink, stroke: palette.canvas, strokeWidth: 1.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t border-rule text-[10px] font-mono text-ink-faint">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="ft-dot"
                style={{
                  backgroundColor:
                    flowType === 'suspicious' ? chartTheme.strokeFlagged : chartTheme.stroke
                }}
              />
              {chartMetricLabel} (daily)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="ft-dot bg-ink-faint" />
              Peak {flowType === 'count' ? chartPeak.toLocaleString('en-IN') : formatCompact(chartPeak)}
            </span>
          </div>
          <span>
            {loading
              ? 'Syncing…'
              : `Source /api/v1/transactions · ${totals.totalCount.toLocaleString('en-IN')} records`}
          </span>
        </div>
      </section>

      {/* 5. Recent ledger */}
      <section className="ft-panel overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 p-5 sm:p-6 border-b border-rule">
          <div>
            <span className="ft-label">Ledger · live</span>
            <h3 className="text-[15px] font-semibold tracking-tight text-ink mt-1.5">
              Recent transactions
            </h3>
            <p className="text-[11px] text-ink-muted mt-1">
              Records from the Rust API · showing {visibleTransactions.length} of{' '}
              {filteredTransactions.length} matching entries
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'FLAGGED', label: 'Flagged' },
              { id: 'CLEARED', label: 'Cleared' }
            ].map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setTxFilter(filter.id)}
                data-active={txFilter === filter.id}
                className="ft-pill"
              >
                {filter.label}
              </button>
            ))}

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="Search counterparty or ID…"
                aria-label="Search transactions"
                className="ft-field rounded-full pl-8 py-1.5 w-52 text-[11px] font-mono"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="ft-table min-w-[880px]">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Route</th>
                <th>Method</th>
                <th>Timestamp</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[11px] font-mono text-ink-muted">
                    Loading ledger from /api/v1/transactions…
                  </td>
                </tr>
              ) : visibleTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[11px] font-mono text-ink-muted">
                    No transactions match this filter. Clear the search or pick another tab.
                  </td>
                </tr>
              ) : (
                visibleTransactions.map((tx) => {
                  const isFlagged = tx.flagged;
                  const isReview = tx.status === 'PENDING' || tx.status === 'REVIEW';
                  const statusLabel = isFlagged ? 'Flagged' : isReview ? 'Review' : 'Cleared';
                  const statusClass = isFlagged
                    ? 'text-[var(--status-loss)]'
                    : isReview
                      ? 'text-[var(--spec)]'
                      : 'text-[var(--status-gain)]';

                  return (
                    <tr key={tx.id}>
                      <td className="ft-mono text-[11px] text-ink-muted whitespace-nowrap">
                        {tx.id}
                      </td>

                      <td>
                        <div className="flex items-center gap-1.5 text-[12px] whitespace-nowrap">
                          <span className="ft-mono text-[11px]">{tx.sender}</span>
                          <span className="text-ink-faint" aria-hidden="true">
                            →
                          </span>
                          <span className="ft-mono text-[11px]">{tx.receiver}</span>
                        </div>
                        <div className="text-[10px] text-ink-faint mt-0.5 truncate max-w-[240px]">
                          {tx.description}
                        </div>
                      </td>

                      <td className="ft-mono text-[10px] uppercase tracking-wider text-ink-muted whitespace-nowrap">
                        {tx.method}
                      </td>

                      <td className="ft-mono text-[10px] text-ink-faint whitespace-nowrap">
                        {tx.date}
                      </td>

                      <td>
                        <span className={`inline-flex items-center gap-1.5 text-[11px] ${statusClass}`}>
                          <span className="ft-dot" style={{ backgroundColor: 'currentColor' }} />
                          {statusLabel}
                        </span>
                      </td>

                      <td
                        className={`ft-mono text-right text-[12px] whitespace-nowrap ${
                          isFlagged ? 'text-[var(--status-loss)]' : 'text-ink'
                        }`}
                      >
                        {formatAmount(tx.amount)}
                      </td>

                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (onAccountSelect) onAccountSelect(tx.sender);
                            setCurrentPage('money-trail');
                          }}
                          title="Trace in money trail"
                          className="ft-btn-ghost py-1 px-2.5 text-[10px]"
                        >
                          <span>Trace</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 sm:px-6 py-4 border-t border-rule text-[10px] font-mono text-ink-faint">
          <span>
            Amounts in {summary?.currency || 'INR'} · flagged rows use the dataset&apos;s is_suspicious
            label
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage('transactions')}
            className="inline-flex items-center gap-1 text-ink-muted hover:text-ink transition-colors self-start sm:self-auto"
          >
            <span>Open full ledger</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </section>

    </div>
  );
}
