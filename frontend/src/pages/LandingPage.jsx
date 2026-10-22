import React, { useState, useRef, useEffect } from 'react';
import {
  Network,
  Share2,
  Briefcase,
  Cpu,
  ArrowRight,
  Database,
  Zap,
  AlertTriangle,
  Play,
  Activity,
  ChevronRight,
  Shield,
  Video,
  Layers,
  ExternalLink,
  ArrowUpRight,
  BarChart3,
  Search,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  Maximize2,
  Workflow
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import BriarGlobe from '../components/BriarGlobe';
import AnimaticPipelineStepper from '../components/AnimaticPipelineStepper';
import AnimatedContent from '../components/AnimatedContent';

class GlobeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err) {
    console.warn("GlobeErrorBoundary caught error:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center font-mono">
          <div className="w-12 h-12 rounded-xl bg-electric-500/20 text-electric-400 flex items-center justify-center mb-3">
            <Network className="w-6 h-6 animate-pulse" />
          </div>
          <span className="text-white text-sm font-bold">3D Relational Topology</span>
          <span className="text-slate-400 text-xs mt-1">WebGL Network Stream Active</span>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function LandingPage({
  setCurrentPage,
  onAccountSelect,
  onOpenCreateCase,
  onOpenLivePipeline,
  refreshTrigger
}) {
  // Typology Analyzer State
  const [activeScenario, setActiveScenario] = useState('cbs_freeze');

  // Video ref for background 3D model animation
  const videoRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.defaultMuted = true;
      v.muted = true;
      const tryPlay = () => {
        v.play().catch(() => {});
      };
      tryPlay();
      window.addEventListener('pointerdown', tryPlay, { once: true });
      window.addEventListener('scroll', tryPlay, { once: true });
      return () => {
        window.removeEventListener('pointerdown', tryPlay);
        window.removeEventListener('scroll', tryPlay);
      };
    }
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scenarios = {
    cbs_freeze: {
      id: 'cbs_freeze',
      title: 'Illustrative rapid-transfer scenario (DEMO_ACCOUNT_03)',
      targetAccount: 'DEMO_ACCOUNT_03',
      description: 'Illustrative synthetic scenario: a dormant account receives and forwards funds rapidly. Use this example to explore the investigation workflow; it is not a real case or verified finding.',
      riskScore: 0.98,
      riskLevel: 'Critical',
      pattern: 'Synthetic rapid-transfer pattern',
      flowNodes: [
        { id: 'VICTIMS_11K', type: 'victim', label: '11,446 Counterparties', sub: 'Inflow: ₹8.67 Cr' },
        { id: 'DEMO_ACCOUNT_03', type: 'target', label: 'DEMO_ACCOUNT_03 (Synthetic Account 03)', sub: 'Dormant Total Freeze' },
        { id: 'DEMO_ACCOUNT_02', type: 'layer', label: 'DEMO_ACCOUNT_02 (Synthetic Account 02)', sub: 'Layering Hop 1' },
        { id: 'FREEZE_EXIT', type: 'cashout', label: 'Review point', sub: 'Illustrative only; no legal action taken' }
      ],
      metrics: {
        inflowHops: 11446,
        outflowHops: 32,
        velocity: '< 18 minutes',
        drainRatio: '99.8%'
      }
    },
    rapid: {
      id: 'rapid',
      title: 'High-Turnover Pass-Through Conduit (DEMO_ACCOUNT_48 • Synthetic Account 48)',
      targetAccount: 'DEMO_ACCOUNT_48',
      description: 'Illustrative synthetic example of a high-turnover account with rapidly dispersed outflows. Values shown are demonstration data, not verified findings.',
      riskScore: 0.92,
      riskLevel: 'High',
      pattern: 'Pass-Through Conduit (>98% Turnover Drain)',
      flowNodes: [
        { id: 'INFLOW_CORP', type: 'victim', label: 'Corporate Diversions', sub: 'Inflow: ₹55.09 Cr' },
        { id: 'DEMO_ACCOUNT_48', type: 'target', label: 'DEMO_ACCOUNT_48 (Synthetic Account 48)', sub: '98.7% Drain Ratio' },
        { id: 'DEMO_ACCOUNT_28', type: 'layer', label: 'DEMO_ACCOUNT_28 (Synthetic Account 28)', sub: 'Layering Conduit' },
        { id: 'DEMO_ACCOUNT_06', type: 'cashout', label: 'DEMO_ACCOUNT_06 (Synthetic Account 06)', sub: 'Zero Residual Exit' }
      ],
      metrics: {
        inflowHops: 820,
        outflowHops: 14,
        velocity: '14 minutes',
        drainRatio: '98.7%'
      }
    },
    closure: {
      id: 'closure',
      title: 'Abrupt Account Closure Syndicate (DEMO_ACCOUNT_02 • Synthetic Account 02)',
      targetAccount: 'DEMO_ACCOUNT_02',
      description: 'Illustrative synthetic example of an account with rapid fund movement before closure. It does not describe a verified account or finding.',
      riskScore: 0.95,
      riskLevel: 'Critical',
      pattern: 'Abrupt Account Closure + Layering Exit',
      flowNodes: [
        { id: 'MULTI_INFLOW', type: 'victim', label: '11,109 Transactions', sub: 'Inflow: ₹10.91 Cr' },
        { id: 'DEMO_ACCOUNT_02', type: 'target', label: 'DEMO_ACCOUNT_02 (Synthetic Account 02)', sub: 'Primary Conduit (Closed)' },
        { id: 'DEMO_ACCOUNT_05', type: 'layer', label: 'DEMO_ACCOUNT_05 (Synthetic Account 05)', sub: 'Layering Conduit' },
        { id: 'OFFSHORE_EXIT', type: 'cashout', label: 'Offshore OTC Exit', sub: 'Cleared Pre-Closure' }
      ],
      metrics: {
        inflowHops: 11109,
        outflowHops: 24,
        velocity: '< 25 minutes',
        drainRatio: '99.5%'
      }
    }
  };

  const currentScenario = scenarios[activeScenario];

  const steps = [
    {
      num: "01",
      title: "Data Ingestion & Normalization",
      desc: "Ingest institutional transaction CSVs with mandatory header validation, deduplication, and automated graph node creation.",
      icon: Database,
      page: "upload"
    },
    {
      num: "02",
      title: "Directed Graph Construction",
      desc: "Model financial entities as directed nodes and transactions as weighted edges with 8-dimensional structural feature tensors.",
      icon: Network,
      page: "graph"
    },
    {
      num: "03",
      title: "GraphSAGE Neural Inference",
      desc: "2-layer Graph Neural Network aggregates 1-hop & 2-hop topological signals to generate latent node embeddings and mule risk scores.",
      icon: Cpu,
      page: "mule-detection"
    },
    {
      num: "04",
      title: "Behavioral Pattern Detection",
      desc: "Detect circular layering loops, rapid pass-through conduits, and fan-in smurfing aggregators using algorithmic heuristics.",
      icon: Zap,
      page: "mule-detection"
    },
    {
      num: "05",
      title: "Multi-Hop Money Trail Tracing",
      desc: "Trace fund dissemination backwards from cash-out points to cyber victim sources with hop counts and timestamps.",
      icon: Share2,
      page: "money-trail"
    },
    {
      num: "06",
      title: "Complaint Cross-Correlation",
      desc: "Cross-reference cyber fraud complaints from the 1930 portal and police FIRs with suspect accounts and transactions.",
      icon: AlertTriangle,
      page: "complaints"
    },
    {
      num: "07",
      title: "Audit-Ready Case Dossiers",
      desc: "Compile legally admissible evidence dossiers, chain-of-custody lockers, audit trails, and freeze recommendations.",
      icon: Briefcase,
      page: "cases"
    }
  ];

  const comparisonRows = [
    {
      feature: "Relational Multi-Hop Topological Reasoning",
      xgboost: "Fails: evaluates isolated row features or simple 1-degree tabular statistics",
      graphsage: "Native 2-hop neighborhood message-passing aggregates deep counterparty structural embeddings"
    },
    {
      feature: "Resistance to Sliced Amount Evasion (Smurfing)",
      xgboost: "Vulnerable: transactions split below threshold limits look normal to tabular classifiers",
      graphsage: "Robust: topological fan-in structure and convergence patterns flag aggregator nodes immediately"
    },
    {
      feature: "Circular Money Transfer Loops (A → B → C → A)",
      xgboost: "Blind: cannot detect cyclic dependencies across distinct database rows",
      graphsage: "Algorithmic & Neural: NetworkX cycle detection fused with GraphSAGE loop embeddings"
    },
    {
      feature: "Temporal Pass-Through Velocity (< 2 Hours)",
      xgboost: "Requires rigid hand-crafted rolling window features that degrade on irregular intervals",
      graphsage: "Turnover ratio, burst frequency, and edge temporal weights fused in 8D node feature tensors"
    },
    {
      feature: "Latent Account Embedding Representations",
      xgboost: "Outputs only a scalar probability without continuous representation of structural roles",
      graphsage: "Produces 16-dimensional latent vectors enabling semantic clustering of syndicate rings"
    }
  ];

  const handleLaunchScenario = (accId) => {
    if (onAccountSelect) onAccountSelect(accId);
    setCurrentPage('money-trail');
  };

  return (
    <div className="min-h-screen w-full bg-[#070B14] text-slate-100 selection:bg-electric-500 selection:text-white relative overflow-x-hidden font-sans">
      
      {/* 1. Full-Screen 3D Model Background (The Creation of Adam 3D Render) */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 select-none">
        <video
          ref={videoRef}
          src="/the_creation_of_adam-recording.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-35 filter contrast-110 saturate-125 transform scale-105 pointer-events-none select-none"
        />
        {/* Soft Vignette Overlay ensuring text readability while 3D model animation is visible in the background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#070B14]/85 via-[#070B14]/65 to-[#070B14]/85 pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#070B14_85%)] pointer-events-none"></div>
      </div>

      {/* Ambient Blue & Cyan Glows */}
      <div className="fixed -top-40 -left-40 w-[650px] h-[650px] bg-electric-600/10 rounded-full blur-[160px] pointer-events-none z-0"></div>
      <div className="fixed top-1/3 -right-40 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[160px] pointer-events-none z-0"></div>
      <div className="fixed -bottom-40 left-1/4 w-[700px] h-[700px] bg-blue-700/8 rounded-full blur-[180px] pointer-events-none z-0"></div>

      {/* 2. Top Navigation Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#070B14]/80 border-b border-slate-800/80 px-6 lg:px-12 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-6 bg-gradient-to-b from-electric-400 to-blue-600 rounded-full transform -skew-x-12"></span>
              <span className="w-1.5 h-6 bg-gradient-to-b from-electric-400 to-blue-600 rounded-full transform -skew-x-12 opacity-80"></span>
              <span className="w-1.5 h-6 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full transform -skew-x-12 opacity-50"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-xl tracking-tight">FinTrace</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-electric-500/15 text-electric-300 border border-electric-500/30">
                  GNN AI
                </span>
              </div>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-300">
            <button onClick={() => scrollToSection('dashboard-preview')} className="transition hover:text-white flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-electric-400"></span>
              <span>Live Dashboard</span>
            </button>
            <button onClick={() => setCurrentPage('pipeline')} className="transition text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 font-semibold">
              <Workflow className="w-3.5 h-3.5" />
              <span>System Pipeline</span>
            </button>
            <button onClick={() => scrollToSection('simulator')} className="transition hover:text-white">Typology Analyzer</button>
            <button onClick={() => scrollToSection('battle-arena')} className="transition hover:text-white">GNN vs XGBoost</button>
            <button onClick={() => scrollToSection('topology-3d')} className="transition hover:text-white">3D Canvas</button>
            <button onClick={() => scrollToSection('pipeline')} className="transition hover:text-white">Workflow</button>
          </nav>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-electric-600 via-electric-500 to-cyan-500 hover:from-electric-500 hover:to-cyan-400 text-white font-bold text-xs shadow-glow-electric transition transform hover:scale-105 active:scale-95"
            >
              <span>Open Full Dashboard</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-6 pb-20 space-y-16 lg:space-y-24">
        
        {/* Telemetry Status Bar */}
        <AnimatedContent trigger="mount" distance={25} duration={0.7} ease="power3.out">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#0B1120]/90 border border-slate-800 text-xs shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-mono font-bold text-white tracking-wider text-[11px]">
                  GNN SURVEILLANCE NODE ACTIVE
                </span>
              </div>
              <span className="text-slate-700 hidden sm:inline">|</span>
              <div className="hidden md:flex items-center gap-4 text-[11px] text-slate-400 font-mono">
                <span>ENGINE: <strong className="text-electric-300">Axum + SQLx (Tokio)</strong></span>
                <span>MODEL: <strong className="text-cyan-400">GraphSAGE v2.1 (PyG)</strong></span>
                <span>MONITORED: <strong className="text-white">1,948 Nodes</strong></span>
                <span>INFERENCE: <strong className="text-emerald-400">&lt; 45ms</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-semibold text-[10px]">
                SYNTHETIC DEMO • HUMAN REVIEW REQUIRED
              </span>
              <span className="px-2.5 py-1 rounded-full bg-electric-950/60 text-electric-300 border border-electric-500/30 font-semibold text-[10px]">
                ZERO-HALLUCINATION
              </span>
            </div>
          </div>
        </AnimatedContent>

        {/* 3. High-Impact Institutional Hero Section (Fast, Responsive & Direct) */}
        <AnimatedContent trigger="mount" distance={35} delay={0.15} duration={0.8} ease="power3.out">
          <section className="text-center max-w-4xl mx-auto space-y-6 pt-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-electric-500/15 border border-electric-500/40 text-electric-300 text-xs font-semibold font-mono tracking-wide shadow-glow-electric">
              <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Autonomous Mule Account Detection &amp; Network Intelligence</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              Intelligent Fraud Detection.{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-electric-400 to-blue-500 bg-clip-text text-transparent">
                Clearer Financial Insights.
              </span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto font-normal">
              Institutional AML investigation platform unmasking fan-in smurfing rings, circular laundering loops, and rapid pass-through conduits through deep 2-hop GraphSAGE neighborhood aggregation.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className="flex items-center gap-2 px-7 py-3 rounded-full bg-gradient-to-r from-electric-600 via-electric-500 to-cyan-500 hover:from-electric-500 hover:to-cyan-400 text-white font-bold text-sm shadow-glow-electric transition transform hover:scale-105 active:scale-95"
              >
                <span>Open Full Dashboard</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>

              {onOpenLivePipeline && (
                <button
                  onClick={onOpenLivePipeline}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-glow-emerald transition transform hover:scale-105 active:scale-95 border border-emerald-400/50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Run Live Pipeline (⚡ Real-Time)</span>
                </button>
              )}

              <button
                onClick={() => setCurrentPage('graph')}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-navy-900/90 hover:bg-navy-850 text-slate-200 border border-slate-700 hover:border-electric-500/50 font-semibold text-sm transition group"
              >
                <Network className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>Explore Graph Canvas</span>
              </button>
            </div>

            {/* Live Micro Metric Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-800/80 text-xs font-mono max-w-2xl mx-auto">
              <div className="p-3 rounded-xl bg-[#0B1120]/90 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">MONITORED NODES</span>
                <span className="text-base font-bold text-white">1,985 Accounts</span>
              </div>
              <div className="p-3 rounded-xl bg-[#0B1120]/90 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">FLAGGED MULES</span>
                <span className="text-base font-bold text-rose-400">29 High Risk</span>
              </div>
              <div className="p-3 rounded-xl bg-[#0B1120]/90 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">LATENCY</span>
                <span className="text-base font-bold text-emerald-400">&lt; 45ms Neural Inference</span>
              </div>
              <div className="p-3 rounded-xl bg-[#0B1120]/90 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">ROC-AUC</span>
                <span className="text-base font-bold text-cyan-400">0.9981 Genuine</span>
              </div>
            </div>
          </section>
        </AnimatedContent>

        {/* 4. ANIMATIC STEP-BY-STEP PROCESSING SHOWCASE */}
        <AnimatedContent distance={40} threshold={0.1} duration={0.8} ease="power3.out">
          <section id="dashboard-preview" className="scroll-mt-24 space-y-4">
            {/* Section Header with Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-2">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-electric-400 font-bold tracking-wider">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span>INTERACTIVE PROCESSING LIFECYCLE</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5 tracking-tight">
                  Step-by-Step Financial Crime Intelligence
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                  Experience how FINTRACE ingests transaction ledgers, constructs multi-hop graphs, and executes GraphSAGE inference.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-electric-600 to-cyan-500 hover:from-electric-500 hover:to-cyan-400 text-white font-bold text-xs shadow-glow-electric transition transform hover:scale-105 active:scale-95"
                >
                  <span>Enter Full Command Center</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Interactive Stepper inside Clean Console Frame */}
            <div className="rounded-3xl border-2 border-slate-800/90 bg-[#070B14] shadow-[0_25px_70px_-15px_rgba(2,132,199,0.22)] overflow-hidden">
              {/* Console Window Chrome Header */}
              <div className="px-5 py-3.5 bg-[#0B1120] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
                    <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                  </div>
                  <span className="text-slate-700">|</span>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-bold text-white text-[11px]">fintrace-ai://pipeline-runner</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>LIVE REPOSITORIES CONNECTED</span>
                  </div>
                </div>
              </div>

              {/* EMBEDDED ANIMATIC PIPELINE STEPPER */}
              <div className="p-3 sm:p-5 bg-[#080E1B]/95 backdrop-blur-xl">
                <AnimaticPipelineStepper
                  setCurrentPage={setCurrentPage}
                  onAccountSelect={onAccountSelect}
                  onOpenLivePipeline={onOpenLivePipeline}
                  stats={{
                    totalAccounts: 1985,
                    totalTransactions: 3218,
                    openCases: 8
                  }}
                />
              </div>
            </div>
          </section>
        </AnimatedContent>

        {/* 5. Interactive Financial Crime Typology Analyzer */}
        <AnimatedContent distance={40} threshold={0.1} duration={0.8} ease="power3.out">
          <section id="simulator" className="scroll-mt-24 space-y-6 rounded-3xl bg-[#0B1120]/90 border border-slate-800 p-6 md:p-8 backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono text-xs font-bold text-cyan-400 tracking-wider">
                    TYPOLOGY ANALYZER
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mt-1">
                  Analyze Known Financial Crime Typologies
                </h2>
              </div>

              <div className="flex items-center gap-2 p-1 rounded-xl bg-black/60 border border-slate-800">
                <button
                  onClick={() => setActiveScenario('cbs_freeze')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium font-mono transition ${
                    activeScenario === 'cbs_freeze'
                      ? 'bg-electric-600 text-white shadow-glow-electric'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Core Banking Freeze
                </button>
                <button
                  onClick={() => setActiveScenario('rapid')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium font-mono transition ${
                    activeScenario === 'rapid'
                      ? 'bg-electric-600 text-white shadow-glow-electric'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pass-Through Drain
                </button>
                <button
                  onClick={() => setActiveScenario('closure')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium font-mono transition ${
                    activeScenario === 'closure'
                      ? 'bg-electric-600 text-white shadow-glow-electric'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Abrupt Closure
                </button>
              </div>
            </div>

            {/* Active Scenario Flow Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white font-mono">{currentScenario.title}</h3>
                  <RiskBadge level={currentScenario.riskLevel} score={currentScenario.riskScore} />
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentScenario.description}
                </p>

                <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-1">
                  <div className="p-2.5 rounded-xl bg-black/60 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">VELOCITY</span>
                    <span className="font-bold text-cyan-400">{currentScenario.metrics.velocity}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/60 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">TURNOVER</span>
                    <span className="font-bold text-amber-400">{currentScenario.metrics.drainRatio}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/60 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">FLOW HOPS</span>
                    <span className="font-bold text-electric-300">
                      {currentScenario.metrics.inflowHops} in / {currentScenario.metrics.outflowHops} out
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleLaunchScenario(currentScenario.targetAccount)}
                  className="w-full py-2.5 bg-gradient-to-r from-electric-600 to-cyan-600 hover:from-electric-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl shadow-glow-electric transition flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Trace {currentScenario.targetAccount} Money Trail Live</span>
                </button>
              </div>

              {/* Sequence Diagram Display */}
              <div className="lg:col-span-7 p-5 rounded-2xl bg-black/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">DISSEMINATION SEQUENCE</span>
                  <span className="text-cyan-400 font-bold">{currentScenario.pattern}</span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 font-mono">
                  {currentScenario.flowNodes.map((node, i) => (
                    <React.Fragment key={node.id}>
                      <div className="flex-1 flex flex-col items-center text-center p-3 rounded-xl bg-[#0B1120] border border-slate-800">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border mb-2 ${
                          node.type === 'victim'
                            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                            : node.type === 'target'
                            ? 'bg-rose-950 text-rose-200 border-rose-500 shadow-glow-danger animate-pulse'
                            : node.type === 'layer'
                            ? 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                            : 'bg-purple-950/70 text-purple-300 border-purple-500/40'
                        }`}>
                          {i + 1}
                        </div>
                        <span className="text-xs font-bold text-slate-200 truncate w-full">
                          {node.label}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate w-full mt-0.5">
                          {node.sub}
                        </span>
                      </div>
                      {i < currentScenario.flowNodes.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </AnimatedContent>

        {/* 6. GraphSAGE vs Traditional XGBoost Battle Arena */}
        <AnimatedContent distance={40} threshold={0.1} duration={0.8} ease="power3.out">
          <section id="battle-arena" className="scroll-mt-24 p-6 md:p-8 rounded-3xl bg-[#0B1120]/90 border border-slate-800 space-y-6 backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-electric-400" />
                  <span className="font-mono text-xs font-bold text-electric-400 tracking-wider">
                    ARCHITECTURAL COMPARISON
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mt-1">
                  Why GraphSAGE GNN Outperforms Traditional XGBoost
                </h2>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-3 py-1 rounded-full bg-emerald-950/70 text-emerald-400 border border-emerald-500/30">
                  PyTorch Geometric Native
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase">
                    <th className="py-3 px-4">Financial Crime Topology</th>
                    <th className="py-3 px-4 text-rose-400">XGBoost (Tabular Row-by-Row)</th>
                    <th className="py-3 px-4 text-emerald-400">FinTrace GraphSAGE (GNN)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {comparisonRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {row.feature}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        <span className="inline-block px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 font-mono text-[11px] mr-1.5">
                          Limit
                        </span>
                        {row.xgboost}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-300 font-medium">
                        <span className="inline-block px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-300 font-mono text-[11px] mr-1.5">
                          Native
                        </span>
                        {row.graphsage}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </AnimatedContent>

        {/* 7. 3D Topology Box with WebGL Canvas */}
        <AnimatedContent distance={40} threshold={0.1} duration={0.8} ease="power3.out">
          <section id="topology-3d" className="scroll-mt-24 space-y-6">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono text-xs font-bold text-cyan-400 tracking-wider">
                    3D RELATIONAL TOPOLOGY
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mt-1">
                  Spatial Network Topology &amp; Flow Clustering
                </h2>
              </div>
              <button
                onClick={() => setCurrentPage('graph')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
              >
                <span>Explore 2D/3D Graph Canvas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="relative h-[480px] lg:h-[520px] rounded-3xl bg-gradient-to-br from-[#0B1120] via-[#080E1B] to-[#05070E] border-2 border-slate-800 shadow-[0_25px_60px_-15px_rgba(2,132,199,0.2)] overflow-hidden group">
              {/* Box Top Toolbar */}
              <div className="absolute top-0 left-0 right-0 z-30 px-5 py-3.5 border-b border-slate-800 bg-[#070B14]/85 backdrop-blur-md flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                  </div>
                  <span className="text-white font-bold text-[11px] ml-2">3D SPHERICAL PROJECTION</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-[10px] text-slate-300 bg-black/60 px-2 py-0.5 rounded border border-slate-800">
                    Live WebGL
                  </span>
                </div>
              </div>

              {/* 3D WebGL Model Component inside the Box */}
              <div className="absolute inset-0 pt-12 w-full h-full">
                <GlobeErrorBoundary>
                  <BriarGlobe
                    background="transparent"
                    lines={{
                      color: "#38BDF8",
                      accent: "#F43F5E",
                      thickness: 0.7,
                      opacity: 6,
                      depth: 8.5
                    }}
                    hover={{
                      reach: 24,
                      glowSize: 140,
                      glow: "#0284C7",
                      pill: "rgba(15, 23, 42, 0.95)",
                      lag: 4.2
                    }}
                    network={{
                      nodes: 850,
                      hubs: 26,
                      links: 5
                    }}
                    labels={[
                      "DEMO_ACCOUNT_03: Synthetic demonstration account",
                      "DEMO_ACCOUNT_48: Synthetic demonstration account",
                      "DEMO_ACCOUNT_02: Synthetic demonstration account",
                      "DEMO_ACCOUNT_28: Synthetic demonstration account",
                      "DEMO_ACCOUNT_06: Synthetic demonstration account",
                      "Synthetic benchmark account network",
                      "Cybercrime Portal (1930) Link",
                      "Illustrative turnover pattern"
                    ]}
                    textColor="#38BDF8"
                    speed={1.0}
                    direction={1}
                    motion={{ style: "both", amount: 6, pace: 5 }}
                    tilt={16}
                    parallax={7}
                  />
                </GlobeErrorBoundary>
              </div>

              {/* Box Footer Status Bar */}
              <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between text-[10px] font-mono text-slate-400 pointer-events-none bg-[#070B14]/90 px-3.5 py-1.5 rounded-xl border border-slate-800 backdrop-blur-md">
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Interactive 3D Network: Drag to Rotate • Real-Time Physics
                </span>
                <span className="text-cyan-400 font-bold">8-Feature Tensor Embeddings</span>
              </div>
            </div>
          </section>
        </AnimatedContent>

        {/* 8. Quick Module Navigation Bar */}
        <AnimatedContent distance={40} threshold={0.1} duration={0.8} ease="power3.out">
          <section id="pipeline" className="scroll-mt-24 p-6 rounded-3xl bg-gradient-to-r from-[#0B1120] to-[#070B14] border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">DIRECT MODULE ACCESS</span>
                <h3 className="text-lg font-bold text-white mt-0.5">Jump Straight into Any Forensic Workspace</h3>
              </div>
              <button
                onClick={() => setCurrentPage('pipeline')}
                className="px-4 py-2 rounded-xl bg-electric-600 hover:bg-electric-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-glow-electric"
              >
                <Workflow className="w-3.5 h-3.5" />
                <span>Full 12-Stage Pipeline Specification</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-1">
              {[
                { label: "Data Ingestion", page: "upload", icon: Database },
                { label: "Graph Canvas", page: "graph", icon: Network },
                { label: "Mule GNN", page: "mule-detection", icon: Cpu },
                { label: "Money Trail", page: "money-trail", icon: Share2 },
                { label: "Complaints", page: "complaints", icon: AlertTriangle },
                { label: "Investigation Cases", page: "cases", icon: Briefcase }
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.page}
                    onClick={() => setCurrentPage(m.page)}
                    className="p-3 rounded-xl bg-navy-950/80 border border-slate-800 hover:border-electric-400 hover:bg-slate-800/60 transition group flex flex-col items-center text-center space-y-1.5"
                  >
                    <div className="p-2 rounded-lg bg-navy-900 text-slate-400 group-hover:text-cyan-400 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </AnimatedContent>

        {/* 9. Institutional Trust & Compliance Notice */}
        <AnimatedContent distance={30} threshold={0.1} duration={0.7} ease="power3.out">
          <section className="p-5 rounded-2xl bg-[#0B1120]/90 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                <strong>Regulatory Integrity & Evidentiary Standard:</strong> FinTrace AI strictly distinguishes heuristic pattern alerts from verified judicial evidence. Intended as a prototype workflow; outputs are investigative leads and require independent verification before any operational use.
              </span>
            </div>
            <button
              onClick={() => setCurrentPage("settings-model")}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-navy-850 hover:bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[11px] transition"
            >
              Review GNN Weights
            </button>
          </section>
        </AnimatedContent>

        {/* 10. Modern Fintech SaaS Footer */}
        <AnimatedContent distance={20} threshold={0.1} duration={0.6} ease="power3.out">
          <footer className="pt-8 pb-12 border-t border-slate-800/80 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                <span className="w-1 h-4 bg-electric-500 rounded-full transform -skew-x-12"></span>
                <span className="w-1 h-4 bg-cyan-400 rounded-full transform -skew-x-12"></span>
              </div>
              <span className="font-bold text-white text-sm">FinTrace AI</span>
              <span className="text-slate-600">|</span>
              <span>Intelligent Mule Account Detection Platform</span>
            </div>

            <div className="flex items-center gap-6">
              <button onClick={() => setCurrentPage('dashboard')} className="hover:text-white transition">
                Dashboard
              </button>
              <button onClick={() => setCurrentPage('graph')} className="hover:text-white transition">
                Graph Canvas
              </button>
              <button onClick={() => setCurrentPage('money-trail')} className="hover:text-white transition">
                Money Trail
              </button>
              <button onClick={() => setCurrentPage('cases')} className="hover:text-white transition">
                Case Dossiers
              </button>
            </div>
          </footer>
        </AnimatedContent>
      </div>
    </div>
  );
}
