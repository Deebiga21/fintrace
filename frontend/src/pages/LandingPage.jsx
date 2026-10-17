import React from 'react';
import {
  ShieldAlert,
  Network,
  Share2,
  FileSpreadsheet,
  Briefcase,
  Cpu,
  ArrowRight,
  CheckCircle,
  Database,
  Lock,
  Zap,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

export default function LandingPage({ setCurrentPage, onAccountSelect }) {
  const steps = [
    {
      num: "01",
      title: "Data Ingestion",
      desc: "Upload CSV transaction feeds with automated schema validation, deduplication, and entity normalization.",
      icon: Database,
      page: "upload"
    },
    {
      num: "02",
      title: "Graph Construction",
      desc: "Model financial entities as directed nodes and transactions as weighted edges with rich structural features.",
      icon: Network,
      page: "graph"
    },
    {
      num: "03",
      title: "GNN Risk Scoring",
      desc: "GraphSAGE neural message-passing evaluates multi-hop neighborhood dynamics to predict mule probabilities.",
      icon: Cpu,
      page: "mule-detection"
    },
    {
      num: "04",
      title: "Pattern Detection",
      desc: "Uncover circular layering loops, rapid pass-through conduits, and fan-in smurfing aggregators.",
      icon: Zap,
      page: "mule-detection"
    },
    {
      num: "05",
      title: "Money Trail Tracing",
      desc: "Trace multi-hop fund dissemination backwards from cash-out points to cyber victim sources.",
      icon: Share2,
      page: "money-trail"
    },
    {
      num: "06",
      title: "Complaint Correlation",
      desc: "Correlate cyber fraud complaints with flagged accounts to establish verified criminal nexus.",
      icon: AlertTriangle,
      page: "complaints"
    },
    {
      num: "07",
      title: "Case Action",
      desc: "Compile legally admissible evidence dossiers, audit trails, and freeze recommendations.",
      icon: Briefcase,
      page: "cases"
    }
  ];

  return (
    <div className="space-y-12 max-w-7xl mx-auto py-4">
      {/* Hero Section */}
      <div className="relative rounded-2xl bg-gradient-to-b from-navy-900 to-navy-950 border border-slate-800 p-8 md:p-12 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-electric-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-500/15 border border-electric-500/30 text-electric-300 text-xs font-semibold font-mono">
            <Cpu className="w-3.5 h-3.5 text-electric-400" />
            POWERED BY PYTORCH GEOMETRIC GRAPHSAGE
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Intelligent Mule Account Detection & Financial Crime Investigation Platform
          </h1>

          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            FinTrace AI leverages deep Graph Neural Networks (GraphSAGE) over transactional networks to detect complex money laundering rings, smurfing aggregators, rapid layering conduits, and correlated cyber fraud complaints.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => setCurrentPage("dashboard")}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 text-white font-bold text-sm shadow-glow-electric transition"
            >
              <span>Enter Investigation Console</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage("graph")}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-navy-850 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm transition"
            >
              <Network className="w-4 h-4 text-electric-400" />
              <span>Explore Transaction Graph</span>
            </button>

            <button
              onClick={() => {
                if (onAccountSelect) onAccountSelect("MULE_AGG_01");
                setCurrentPage("money-trail");
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-500/40 font-semibold text-sm transition"
            >
              <Share2 className="w-4 h-4 text-rose-400" />
              <span>Inspect Demo Mule Ring</span>
            </button>
          </div>
        </div>
      </div>

      {/* System Highlights / Differentiator */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-navy-900 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-electric-500/20 text-electric-400 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">GraphSAGE vs XGBoost</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Unlike isolated tabular classifiers, our 2-layer GraphSAGE architecture aggregates relational topological signals from 1-hop and 2-hop counterparties, catching layered mule chains that disguise individual transaction amounts.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-navy-900 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Heuristic & Neural Synergy</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Detects rapid fund velocity, circular money loops (layering cycles), and fan-in smurfing patterns while maintaining strict distinction between model-generated risk signals and verified evidence.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-navy-900 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Full Investigation Docket</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Complete audit-trailed case lifecycle management: convert suspicious accounts, transactions, and cybercrime complaints into formal cases with attached evidence and exportable legal dossiers.
          </p>
        </div>
      </div>

      {/* End-to-End Workflow Stepper */}
      <div className="space-y-6">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">End-to-End Investigation Lifecycle</h2>
            <p className="text-xs text-slate-400">Step-by-step intelligence workflow implemented across FinTrace AI</p>
          </div>
          <span className="text-xs font-mono text-electric-400">7 Connected Stages</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                onClick={() => setCurrentPage(s.page)}
                className="p-5 rounded-xl bg-navy-900/80 border border-slate-800 hover:border-electric-500/50 hover:bg-navy-850 cursor-pointer transition group flex flex-col justify-between space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-electric-400 bg-electric-500/10 px-2 py-0.5 rounded">
                    {s.num}
                  </span>
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-electric-400 transition" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-electric-300 transition">{s.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{s.desc}</p>
                </div>
                <div className="text-[10px] font-mono text-slate-500 group-hover:text-electric-400 flex items-center gap-1">
                  <span>Explore view</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
