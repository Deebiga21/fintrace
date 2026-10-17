import React, { useEffect, useState } from 'react';
import {
  Users,
  CreditCard,
  AlertTriangle,
  Briefcase,
  FileWarning,
  Activity,
  ArrowUpRight,
  ArrowRight,
  TrendingUp,
  Cpu,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  AreaChart,
  Area
} from 'recharts';
import { api } from '../services/api';
import RiskBadge from '../components/RiskBadge';

const RISK_COLORS = {
  High: '#EF4444',
  Medium: '#F59E0B',
  Low: '#10B981'
};

export default function DashboardPage({
  setCurrentPage,
  onAccountSelect,
  onOpenCreateCase,
  refreshTrigger
}) {
  const [overview, setOverview] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [ovData, logs] = await Promise.all([
        api.getOverview(),
        api.getAuditLogs(8)
      ]);
      setOverview(ovData);
      setAuditLogs(logs);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [refreshTrigger]);

  if (loading && !overview) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-electric-400" />
        <span className="text-xs font-mono">Aggregating Graph & Transaction Intelligence...</span>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="p-6 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 space-y-3">
        <h3 className="font-bold">Error loading dashboard</h3>
        <p className="text-xs">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  const riskPieData = [
    { name: 'High Risk', value: overview?.high_risk_accounts || 0, color: '#EF4444' },
    { name: 'Medium Risk', value: overview?.medium_risk_accounts || 0, color: '#F59E0B' },
    { name: 'Low Risk', value: overview?.low_risk_accounts || 0, color: '#10B981' }
  ];

  const patternData = Object.entries(overview?.top_suspicious_patterns || {}).map(([key, val]) => ({
    name: key.replace(" Flow", "").replace(" Transfer", ""),
    count: val
  }));

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-navy-900 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <div>
            <div className="text-xs font-bold text-white tracking-wide">
              GRAPH SURVEILLANCE ACTIVE
            </div>
            <div className="text-[11px] text-slate-400">
              GraphSAGE monitoring multi-hop flow across {overview?.total_accounts || 0} financial nodes
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage("landing")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-electric-950/70 hover:bg-electric-900 text-electric-300 border border-electric-500/40 text-xs font-semibold transition"
            title="Jump to the 3D Relational Network Sphere and Forensic Surveillance HUD Video"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-electric-400 animate-ping"></span>
            <span>3D Globe & Video HUD</span>
          </button>
          <button
            onClick={() => setCurrentPage("upload")}
            className="px-3 py-1.5 rounded-lg bg-navy-850 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium transition"
          >
            Upload Data
          </button>
          <button
            onClick={() => setCurrentPage("graph")}
            className="px-3 py-1.5 rounded-lg bg-electric-600 hover:bg-electric-500 text-white text-xs font-semibold shadow-glow-electric transition"
          >
            Open Graph Canvas
          </button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Accounts</span>
            <Users className="w-4 h-4 text-electric-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-white font-mono">{overview?.total_accounts}</div>
            <div className="text-[10px] text-slate-400">Total Analyzed</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Transactions</span>
            <CreditCard className="w-4 h-4 text-electric-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-white font-mono">{overview?.total_transactions}</div>
            <div className="text-[10px] text-slate-400">₹{(overview?.total_volume || 0).toLocaleString()} vol</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-300 text-xs">
            <span className="font-bold">High Risk Mules</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-rose-300 font-mono">{overview?.high_risk_accounts}</div>
            <div className="text-[10px] text-rose-400 font-medium">Flagged for freeze</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-300 text-xs">
            <span>Medium Risk</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-amber-300 font-mono">{overview?.medium_risk_accounts}</div>
            <div className="text-[10px] text-amber-400">Under observation</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Cases</span>
            <Briefcase className="w-4 h-4 text-electric-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-white font-mono">{overview?.open_cases}</div>
            <div className="text-[10px] text-slate-400">{overview?.closed_cases} closed</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Complaints</span>
            <FileWarning className="w-4 h-4 text-electric-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-white font-mono">{overview?.total_complaints}</div>
            <div className="text-[10px] text-slate-400">₹{(overview?.total_complaint_amount || 0).toLocaleString()} lost</div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Donut */}
        <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold text-white tracking-wide">Account Risk Classification</h3>
              <p className="text-[11px] text-slate-400">GraphSAGE inference breakdown</p>
            </div>
            <Cpu className="w-4 h-4 text-electric-400" />
          </div>

          <div className="h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-white font-mono">{overview?.flagged_accounts}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Flagged</span>
            </div>
          </div>

          <div className="flex items-center justify-around pt-2 border-t border-slate-800 text-[11px]">
            {riskPieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                <span className="text-slate-300">{d.name}</span>
                <span className="font-mono font-bold text-white">({d.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Suspicious Fraud Patterns */}
        <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold text-white tracking-wide">Top Detected Fraud Patterns</h3>
              <p className="text-[11px] text-slate-400">Heuristic & Graph Ring Alerts</p>
            </div>
            <Activity className="w-4 h-4 text-electric-400" />
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patternData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <XAxis type="number" stroke="#64748B" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={10} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#38BDF8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Transaction Volume Timeline */}
        <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold text-white tracking-wide">Transaction Velocity Flow</h3>
              <p className="text-[11px] text-slate-400">Temporal Volume Curve (₹)</p>
            </div>
            <TrendingUp className="w-4 h-4 text-electric-400" />
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview?.transaction_volume_by_day || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#64748B" fontSize={9} />
                <YAxis stroke="#64748B" fontSize={9} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="volume" stroke="#38BDF8" fillOpacity={1} fill="url(#volGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Suspicious Mule Accounts Table */}
      <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Highest Risk Flagged Accounts (GraphSAGE Leads)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Accounts flagged with highest mule score based on topology, turnover ratio, and rapid movement.
            </p>
          </div>

          <button
            onClick={() => setCurrentPage("mule-detection")}
            className="text-xs text-electric-400 hover:text-electric-300 font-semibold flex items-center gap-1"
          >
            <span>View All Accounts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="py-2.5 px-3">ACCOUNT ID</th>
                <th className="py-2.5 px-3">ENTITY NAME</th>
                <th className="py-2.5 px-3">GNN RISK LEVEL</th>
                <th className="py-2.5 px-3">SCORE</th>
                <th className="py-2.5 px-3">INFLOW / OUTFLOW</th>
                <th className="py-2.5 px-3">DETECTED SIGNALS</th>
                <th className="py-2.5 px-3 text-right">INVESTIGATION ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {(overview?.recent_suspicious_accounts || []).map((acc) => (
                <tr key={acc.account_id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-bold text-electric-300">
                    {acc.account_id}
                  </td>
                  <td className="py-3 px-3 text-slate-300 font-sans">
                    {acc.customer_name || acc.account_id}
                  </td>
                  <td className="py-3 px-3">
                    <RiskBadge level={acc.risk_level} score={acc.risk_score} showScore={false} size="sm" />
                  </td>
                  <td className="py-3 px-3 font-bold text-white">
                    {(acc.risk_score * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-slate-300 text-[11px]">
                    <span className="text-emerald-400">↓₹{(acc.total_incoming || 0).toLocaleString()}</span>
                    <span className="mx-1.5 text-slate-600">/</span>
                    <span className="text-rose-400">↑₹{(acc.total_outgoing || 0).toLocaleString()}</span>
                  </td>
                  <td className="py-3 px-3 font-sans">
                    <div className="flex flex-wrap gap-1">
                      {(acc.flags || []).slice(0, 2).map((fl, i) => (
                        <span key={i} className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded">
                          {fl}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-sans">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          if (onAccountSelect) onAccountSelect(acc.account_id);
                          setCurrentPage("graph");
                        }}
                        className="px-2 py-1 bg-navy-850 hover:bg-slate-800 text-electric-300 border border-slate-700 rounded text-[11px] transition"
                      >
                        Graph
                      </button>
                      <button
                        onClick={() => {
                          if (onAccountSelect) onAccountSelect(acc.account_id);
                          setCurrentPage("money-trail");
                        }}
                        className="px-2 py-1 bg-navy-850 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded text-[11px] transition"
                      >
                        Trail
                      </button>
                      <button
                        onClick={() => {
                          if (onOpenCreateCase) onOpenCreateCase(acc);
                        }}
                        className="px-2 py-1 bg-electric-600/30 hover:bg-electric-600/50 text-electric-300 border border-electric-500/40 rounded text-[11px] transition font-semibold"
                      >
                        + Case
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Audit Stream */}
      <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-white tracking-wide uppercase font-mono text-slate-400">
          INVESTIGATION AUDIT & TELEMETRY STREAM
        </h3>
        <div className="space-y-2">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-2.5 rounded-lg bg-navy-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-electric-400 font-bold bg-electric-500/10 px-2 py-0.5 rounded">
                  {log.action}
                </span>
                <span className="text-slate-300">{log.details}</span>
              </div>
              <span className="font-mono text-[10px] text-slate-500 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
