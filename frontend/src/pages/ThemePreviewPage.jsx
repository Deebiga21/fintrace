import React from 'react';
import {
  ArrowUpRight,
  Check,
  Search,
  ShieldAlert,
  Activity,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { palette, chartTheme, contrast } from '../theme';

/**
 * Phase A approval gate.
 *
 * Not a product screen: this renders the editorial-dark primitives so the
 * tokens can be reviewed on real hardware before any page is repainted.
 * Static data on purpose — nothing here talks to the API.
 */

const SWATCHES = [
  { name: 'canvas', value: palette.canvas, role: 'App background' },
  { name: 'canvas.raised', value: palette.raised, role: 'Panels, table headers' },
  { name: 'ink', value: palette.ink, role: 'Primary text' },
  { name: 'ink.muted', value: palette.inkMuted, role: 'Labels, secondary copy' },
  { name: 'ink.faint', value: palette.inkFaint, role: 'Column headers, meta' },
  { name: 'rule', value: 'rgba(255,255,255,.12)', role: '1px dividers' },
  { name: 'accent', value: palette.accent, role: 'Focus, links, live state' },
  { name: 'spec', value: palette.spec, role: 'Reserved: risk only' },
  { name: 'gain', value: palette.gain, role: 'Cleared, inflow' },
  { name: 'loss', value: palette.loss, role: 'Flagged, outflow' }
];

const ROWS = [
  {
    id: 'TXN_10182',
    from: 'DISP_SMURF_88',
    to: 'MULE_SUB_05',
    amount: '₹48,500.00',
    level: 'High',
    status: 'Flagged'
  },
  {
    id: 'TXN_10169',
    from: 'CIRC_MULE_A',
    to: 'CIRC_MULE_B',
    amount: '₹1,85,000.00',
    level: 'High',
    status: 'Flagged'
  },
  {
    id: 'TXN_10042',
    from: 'PAYROLL_TECHCORP',
    to: 'ACC_NORM_012',
    amount: '₹92,957.01',
    level: 'Low',
    status: 'Cleared'
  },
  {
    id: 'TXN_10167',
    from: 'MULE_AGG_01',
    to: 'MULE_LAYER_02',
    amount: '₹3,40,000.00',
    level: 'Medium',
    status: 'Review'
  }
];

const SERIES = [
  { day: '10 Oct', volume: 3868589 },
  { day: '11 Oct', volume: 45557 },
  { day: '12 Oct', volume: 1065893 },
  { day: '13 Oct', volume: 422744 },
  { day: '14 Oct', volume: 1420639 },
  { day: '15 Oct', volume: 513318 }
];

const compact = (value) => `₹${(value / 1e5).toFixed(2)} L`;

function Section({ index, title, note, children }) {
  return (
    <section className="border-t border-rule pt-8 mt-10 first:border-t-0 first:pt-0 first:mt-0">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-6">
        <span className="ft-label">{index}</span>
        <h2 className="text-lg font-semibold text-ink tracking-tight">{title}</h2>
        {note && <span className="text-[11px] text-ink-faint font-mono">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function StatusDot({ tone }) {
  const color =
    tone === 'high'
      ? palette.loss
      : tone === 'medium'
        ? palette.spec
        : tone === 'gain'
          ? palette.gain
          : palette.inkFaint;
  return <span className="ft-dot" style={{ backgroundColor: color }} />;
}

export default function ThemePreviewPage({ setCurrentPage }) {
  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Header */}
      <header className="pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="ft-label">Phase A · Design system</span>
          <div className="flex items-center gap-2">
            <span className="ft-pill" data-active="true">
              <span className="ft-dot bg-[var(--focus)]" />
              Editorial dark
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('dashboard')}
              className="ft-btn-ghost"
            >
              Back to dashboard
            </button>
          </div>
        </div>

        <h1 className="ft-display text-4xl sm:text-5xl mt-6">
          One <span className="ft-serif font-normal">dark</span> language
        </h1>
        <p className="text-sm text-ink-muted mt-3 max-w-2xl leading-relaxed">
          The landing page palette, extracted into tokens and primitives. Nothing has been
          repainted yet — this page is the approval gate before any product screen changes.
        </p>
      </header>

      {/* 01 Foundations */}
      <Section index="01" title="Foundations" note={`canvas ${palette.canvas}`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {SWATCHES.map((swatch) => (
            <div key={swatch.name} className="ft-panel p-3">
              <div
                className="h-12 rounded-md border border-rule"
                style={{ backgroundColor: swatch.value }}
              />
              <div className="ft-mono text-[11px] text-ink mt-2 truncate">{swatch.name}</div>
              <div className="text-[10px] text-ink-faint font-mono truncate">{swatch.value}</div>
              <div className="text-[10px] text-ink-muted mt-1 leading-snug">{swatch.role}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="ft-label">Contrast vs canvas</span>
          {contrast.map((item) => (
            <span key={item.token} className="text-[10px] font-mono text-ink-muted">
              <span className="ft-dot mr-1.5" style={{ backgroundColor: item.value }} />
              {item.token} {item.ratio}
            </span>
          ))}
        </div>
      </Section>

      {/* 02 Typography */}
      <Section index="02" title="Type roles" note="serif in titles only">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-5">
            <div>
              <div className="ft-label mb-2">Display · Inter 800 / -3.5%</div>
              <div className="ft-display text-3xl">Trace, Suspicious Flows</div>
            </div>
            <div>
              <div className="ft-label mb-2">Serif accent · Instrument Serif italic</div>
              <div className="ft-serif text-3xl text-ink">Investigation workspace</div>
            </div>
            <div>
              <div className="ft-label mb-2">Body · Inter 400</div>
              <p className="text-sm text-ink-muted leading-relaxed max-w-md">
                Review transactions, explore account connections, inspect anomaly signals and
                manage investigation cases in one workspace.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <div className="ft-label mb-2">Label · JetBrains Mono 10 / +18%</div>
              <div className="ft-label">Accounts in flagged flows</div>
            </div>
            <div>
              <div className="ft-label mb-2">Data · JetBrains Mono tabular</div>
              <div className="ft-mono text-2xl text-ink">₹73,36,740.90</div>
              <div className="ft-mono text-[11px] text-ink-faint mt-1">
                TXN_10182 · 2026-10-15 19:20:00
              </div>
            </div>
            <div>
              <div className="ft-label mb-2">Never</div>
              <p className="text-xs text-ink-muted leading-relaxed max-w-sm">
                Serif in tables, numerals or buttons. Mono for prose. Yellow as a
                general-purpose action colour.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* 03 Controls */}
      <Section index="03" title="Controls" note="white pill primary · yellow reserved for risk">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="ft-btn-primary">
            <ShieldAlert className="w-3.5 h-3.5" />
            Open New Case
          </button>
          <button type="button" className="ft-btn-ghost">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button type="button" className="ft-btn-cyan">
            <Activity className="w-3.5 h-3.5" />
            Run GNN Scan
          </button>
          <button type="button" className="ft-risk ft-btn-primary">
            Freeze Account
          </button>
          <button type="button" className="ft-btn-ghost" disabled>
            Disabled
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" className="ft-pill" data-active="true">
            All
          </button>
          <button type="button" className="ft-pill">
            Flagged
          </button>
          <button type="button" className="ft-pill">
            Cleared
          </button>
          <span className="ft-pill">
            <span className="ft-dot" style={{ backgroundColor: palette.accent }} />
            Live
          </span>
          <span className="ft-pill">
            <span className="ft-dot" style={{ backgroundColor: palette.inkFaint }} />
            Reconnecting
          </span>
        </div>

        <div className="mt-6">
          <div className="ft-label mb-2">Status · dot + label, no filled badge</div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-ink">
              <StatusDot tone="high" /> High risk
            </span>
            <span className="inline-flex items-center gap-1.5 text-ink">
              <StatusDot tone="medium" /> Medium risk
            </span>
            <span className="inline-flex items-center gap-1.5 text-ink">
              <StatusDot tone="low" /> Low risk
            </span>
            <span className="inline-flex items-center gap-1.5 text-[var(--status-gain)]">
              <StatusDot tone="gain" /> Cleared
            </span>
            <span className="inline-flex items-center gap-1.5 text-[var(--status-loss)]">
              <StatusDot tone="high" /> Flagged
            </span>
          </div>
        </div>
      </Section>

      {/* 04 Table */}
      <Section index="04" title="Hairline table" note="no fills, no zebra, no shadows">
        <div className="overflow-x-auto">
          <table className="ft-table min-w-[720px]">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Route</th>
                <th>Risk</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.id}>
                  <td className="ft-mono text-[11px] text-ink-muted">{row.id}</td>
                  <td>
                    <div className="flex items-center gap-1.5 text-[12px]">
                      <span>{row.from}</span>
                      <ArrowUpRight className="w-3 h-3 text-ink-faint" />
                      <span>{row.to}</span>
                    </div>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
                      <StatusDot tone={row.level === 'High' ? 'high' : row.level === 'Medium' ? 'medium' : 'low'} />
                      {row.level}
                    </span>
                  </td>
                  <td className="ft-mono text-right text-[12px]">{row.amount}</td>
                  <td>
                    <span
                      className="text-[11px]"
                      style={{
                        color:
                          row.status === 'Flagged'
                            ? palette.loss
                            : row.status === 'Review'
                              ? palette.spec
                              : palette.gain
                      }}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 05 Inputs */}
      <Section index="05" title="Fields" note="cyan focus ring, hairline rest state">
        <div className="grid sm:grid-cols-3 gap-3 max-w-3xl">
          <div>
            <label className="ft-label block mb-2" htmlFor="ft-demo-search">
              Search
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="ft-demo-search"
                className="ft-field pl-8"
                placeholder="Account, txn or case ID"
              />
            </div>
          </div>
          <div>
            <label className="ft-label block mb-2" htmlFor="ft-demo-subject">
              Subject account
            </label>
            <input id="ft-demo-subject" className="ft-field" placeholder="ACC_..." />
          </div>
          <div>
            <label className="ft-label block mb-2" htmlFor="ft-demo-priority">
              Priority
            </label>
            <select id="ft-demo-priority" className="ft-field">
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
        </div>
      </Section>

      {/* 06 Chart */}
      <Section index="06" title="Chart" note="1.5px cyan stroke · hairline grid · mono ticks">
        <div className="ft-panel p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <div className="ft-label">Daily volume</div>
              <div className="ft-mono text-xl text-ink mt-1">
                ₹73.37 <span className="text-sm text-ink-muted">L total</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--status-gain)] font-mono">
              <TrendingUp className="w-3 h-3" /> 182 records
            </span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SERIES} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="ftPreviewArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartTheme.fillFrom} />
                    <stop offset="100%" stopColor={chartTheme.fillTo} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={chartTheme.tick}
                  tickLine={false}
                  axisLine={{ stroke: chartTheme.axisLine }}
                />
                <YAxis
                  tick={chartTheme.tick}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => compact(value)}
                  width={54}
                />
                <Tooltip
                  contentStyle={chartTheme.tooltip}
                  cursor={chartTheme.cursor}
                  formatter={(value) => [compact(value), 'Volume']}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke={chartTheme.stroke}
                  strokeWidth={1.5}
                  fill="url(#ftPreviewArea)"
                  activeDot={{ r: 3, fill: chartTheme.stroke, stroke: palette.canvas }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>

      {/* 07 Feedback */}
      <Section index="07" title="Feedback states" note="never let empty and broken look alike">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="ft-panel-flat p-5 text-center">
            <div className="w-8 h-8 rounded-full border border-rule flex items-center justify-center mx-auto mb-3">
              <Search className="w-3.5 h-3.5 text-ink-faint" />
            </div>
            <div className="text-sm text-ink">No transactions match</div>
            <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
              Clear the search or pick another filter.
            </p>
            <button type="button" className="ft-btn-ghost mt-3">
              Reset filters
            </button>
          </div>

          <div className="ft-panel-flat p-5 border-[rgba(255,92,108,0.35)]">
            <div className="flex items-center gap-2 text-[var(--status-loss)] text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              Cannot reach the API
            </div>
            <p className="text-[11px] text-ink-muted mt-2 leading-relaxed">
              Rust API on :8000 did not respond. Cached rows are shown below.
            </p>
            <button type="button" className="ft-btn-ghost mt-3">
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>

          <div className="ft-panel-flat p-5">
            <div className="ft-label mb-3">Loading</div>
            <div className="space-y-2.5">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-center gap-2">
                  <div className="h-2 rounded-full bg-[rgba(255,255,255,0.08)] animate-pulse w-16" />
                  <div className="h-2 rounded-full bg-[rgba(255,255,255,0.06)] animate-pulse flex-1" />
                  <div className="h-2 rounded-full bg-[rgba(255,255,255,0.05)] animate-pulse w-10" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* 08 Density */}
      <Section index="08" title="Density" note="airy chrome · compact data">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="ft-panel p-6">
            <div className="ft-label mb-1">Chrome · airy</div>
            <div className="ft-display text-2xl mt-2">Capital Command</div>
            <p className="text-xs text-ink-muted mt-2 max-w-sm leading-relaxed">
              1.5rem padding, 8px label-to-value gaps, one idea per block.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <button type="button" className="ft-btn-primary">
                <Check className="w-3.5 h-3.5" /> Confirm
              </button>
              <span className="text-[10px] font-mono text-ink-faint">8pt rhythm</span>
            </div>
          </div>

          <div className="ft-panel p-4">
            <div className="ft-label mb-3">Data · compact</div>
            <table className="ft-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Score</th>
                  <th className="text-right">Turnover</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="ft-mono text-[11px]">DISP_SMURF_88</td>
                  <td>
                    <span className="inline-flex items-center gap-1.5">
                      <StatusDot tone="high" /> 94%
                    </span>
                  </td>
                  <td className="ft-mono text-right">97%</td>
                </tr>
                <tr>
                  <td className="ft-mono text-[11px]">MULE_LAYER_02</td>
                  <td>
                    <span className="inline-flex items-center gap-1.5">
                      <StatusDot tone="high" /> 90%
                    </span>
                  </td>
                  <td className="ft-mono text-right">99%</td>
                </tr>
                <tr>
                  <td className="ft-mono text-[11px]">CASHOUT_CRYPTO_09</td>
                  <td>
                    <span className="inline-flex items-center gap-1.5">
                      <StatusDot tone="medium" /> 58%
                    </span>
                  </td>
                  <td className="ft-mono text-right">94%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <footer className="border-t border-rule mt-10 pt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-ink-muted max-w-xl leading-relaxed">
          Phase A only: tokens, type roles, primitives and the shared chart palette. Existing
          pages are unchanged and will be repainted one file at a time from Phase B.
        </p>
        <span className="ft-label">
          <TrendingDown className="w-3 h-3 inline mr-1" />
          static preview
        </span>
      </footer>
    </div>
  );
}
