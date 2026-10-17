import React, { useState, useRef } from 'react';
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
  AlertTriangle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Sliders,
  Check,
  X,
  Layers,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Shield,
  Eye,
  FileText,
  Search,
  Maximize2,
  Video,
  BarChart3,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import BriarGlobe from '../components/BriarGlobe';

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
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
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

export default function LandingPage({ setCurrentPage, onAccountSelect }) {
  // Simulator State
  const [activeScenario, setActiveScenario] = useState('smurfing');

  // Video State for Full-Screen Background Animation
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const scenarios = {
    smurfing: {
      id: 'smurfing',
      title: 'Fan-In Smurfing Ring (Phishing Aggregator)',
      targetAccount: 'MULE_AGG_01',
      description: 'Multiple victim accounts deceived via phishing calls deposit funds within hours into an aggregator mule, which immediately consolidates and forwards ₹3,40,000 to a layering account.',
      riskScore: 0.88,
      riskLevel: 'High',
      pattern: 'Fan-In Fan-Out + Rapid Pass-Through',
      flowNodes: [
        { id: 'VICTIM_01..06', type: 'victim', label: '6 Phishing Victims', sub: 'Inflow: ₹3,45,000' },
        { id: 'MULE_AGG_01', type: 'target', label: 'MULE_AGG_01', sub: 'Consolidation Node' },
        { id: 'MULE_LAYER_02', type: 'layer', label: 'MULE_LAYER_02', sub: 'Layering Hop 1' },
        { id: 'CASHOUT_CRYPTO_09', type: 'cashout', label: 'CASHOUT_CRYPTO_09', sub: 'Offshore OTC Exit' }
      ],
      metrics: {
        inflowHops: 6,
        outflowHops: 2,
        velocity: '38 minutes',
        drainRatio: '98.5%'
      }
    },
    circular: {
      id: 'circular',
      title: 'Circular Layering Loop (Directed Cycle)',
      targetAccount: 'CIRC_MULE_A',
      description: 'Funds cycle through a ring of 4 shell accounts (A → B → C → D → A) with slight fee shaving to obscure ownership and simulate legitimate trading activity.',
      riskScore: 0.94,
      riskLevel: 'High',
      pattern: 'Circular Money Transfer (Directed Cycle)',
      flowNodes: [
        { id: 'CIRC_MULE_A', type: 'target', label: 'CIRC_MULE_A', sub: 'Start & Terminal' },
        { id: 'CIRC_MULE_B', type: 'layer', label: 'CIRC_MULE_B', sub: 'Cycle Hop 1' },
        { id: 'CIRC_MULE_C', type: 'layer', label: 'CIRC_MULE_C', sub: 'Cycle Hop 2' },
        { id: 'CIRC_MULE_D', type: 'layer', label: 'CIRC_MULE_D', sub: 'Cycle Hop 3' }
      ],
      metrics: {
        inflowHops: 4,
        outflowHops: 4,
        velocity: '180 minutes',
        drainRatio: '99.1%'
      }
    },
    rapid: {
      id: 'rapid',
      title: 'High-Velocity Rapid Pass-Through Conduit',
      targetAccount: 'RAPID_CONDUIT_77',
      description: 'A massive corporate debit of ₹4,90,000 is diverted into a dormant conduit account and split into 3 offshore transfers in less than 18 minutes.',
      riskScore: 0.91,
      riskLevel: 'High',
      pattern: 'High Turnover Drain + Velocity Burst',
      flowNodes: [
        { id: 'VICTIM_CORP_HEIST', type: 'victim', label: 'Corporate Victim', sub: 'Inflow: ₹4,90,000' },
        { id: 'RAPID_CONDUIT_77', type: 'target', label: 'RAPID_CONDUIT_77', sub: 'Zero-Balance Pass' },
        { id: 'OFFSHORE_SHELL_X1', type: 'cashout', label: 'SHELL_X1 (₹1.6L)', sub: 'Disbursed in 6m' },
        { id: 'OFFSHORE_SHELL_X2', type: 'cashout', label: 'SHELL_X2 (₹1.6L)', sub: 'Disbursed in 10m' }
      ],
      metrics: {
        inflowHops: 1,
        outflowHops: 3,
        velocity: '14 minutes',
        drainRatio: '99.8%'
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
      desc: "2-layer SAGEConv aggregates 1-hop & 2-hop topological signals to generate latent node embeddings and mule risk scores.",
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
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 selection:bg-rose-500 selection:text-white relative overflow-x-hidden font-sans">
      
      {/* 1. Full-Screen Elegant Watermark Animation Background */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 select-none">
        <video
          ref={videoRef}
          src="/the_creation_of_adam-recording.mp4"
          autoPlay
          loop
          muted={true}
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-[0.09] filter grayscale contrast-125 brightness-75 mix-blend-screen transform scale-105"
        />
        {/* Soft Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F19]/95 via-[#0B0F19]/80 to-[#0B0F19]"></div>
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#0B0F19]/50 to-[#0B0F19]"></div>
      </div>

      {/* Floating Ambient Corner Glows (Matching Reference Mockup ca9a92ff.png) */}
      <div className="fixed -top-40 -left-40 w-[600px] h-[600px] bg-rose-500/12 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="fixed -bottom-40 -right-40 w-[650px] h-[650px] bg-orange-500/10 rounded-full blur-[150px] pointer-events-none z-0"></div>

      {/* 2. Standalone Modern SaaS Top Navbar (Matching Reference Image) */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0B0F19]/80 border-b border-slate-800/80 px-6 lg:px-12 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-6 bg-gradient-to-b from-rose-500 to-orange-500 rounded-full transform -skew-x-12"></span>
              <span className="w-1.5 h-6 bg-gradient-to-b from-rose-500 to-orange-500 rounded-full transform -skew-x-12 opacity-80"></span>
              <span className="w-1.5 h-6 bg-gradient-to-b from-rose-500 to-orange-500 rounded-full transform -skew-x-12 opacity-50"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-xl tracking-tight">FinTrace</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  GNN AI
                </span>
              </div>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#overview" className="hover:text-white transition">Overview</a>
            <a href="#topology-3d" className="hover:text-white transition">3D Topology Box</a>
            <a href="#simulator" className="hover:text-white transition">Attack Simulator</a>
            <a href="#battle-arena" className="hover:text-white transition">GNN vs XGBoost</a>
            <a href="#pipeline" className="hover:text-white transition">Workflow</a>
          </nav>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentPage('login')}
              className="text-xs font-semibold text-slate-300 hover:text-white transition hidden sm:inline-block"
            >
              Investigator Login
            </button>
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white font-bold text-xs shadow-glow-danger transition transform hover:scale-105"
            >
              Launch Command Center →
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-8 space-y-20">
        
        {/* Telemetry Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-2xl bg-[#0E1424]/90 border border-slate-800/90 text-xs shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-mono font-bold text-white tracking-wider text-[11px]">
                GNN SURVEILLANCE NODE ACTIVE
              </span>
            </div>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <div className="hidden md:flex items-center gap-4 text-[11px] text-slate-400 font-mono">
              <span>MODEL: <strong className="text-rose-400">GraphSAGE v1.0 (PyG)</strong></span>
              <span>NODES: <strong className="text-white">74 Monitored</strong></span>
              <span>TRANSACTIONS: <strong className="text-white">182 Processed</strong></span>
              <span>FLAGGED MULES: <strong className="text-rose-400">16 Leads</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-semibold text-[10px]">
              FIU-IND COMPLIANT
            </span>
            <span className="px-2.5 py-1 rounded-full bg-rose-950/60 text-rose-300 border border-rose-500/30 font-semibold text-[10px]">
              ZERO-HALLUCINATION POLICY
            </span>
          </div>
        </div>

        {/* 3. Hero Section (Styled Exactly After the Reference Image) */}
        <section id="overview" className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-4">
          
          {/* Left Column: Headline, Subtitle & CTAs (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold font-mono tracking-wide">
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              <span>Here's the apps for you</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12]">
              The new era of{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300">
                finance technology
              </span>{' '}
              intelligence.
            </h1>

            <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-xl">
              Managing your financial business in easy way. FinTrace unmasks smurfing rings, circular laundering loops, and conduit accounts through deep Graph Neural Networks (GraphSAGE).
            </p>

            {/* Action Buttons (Matching Reference Image Style: [Try it free] & [▶ Show me the demo]) */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => setCurrentPage("dashboard")}
                className="px-8 py-3.5 rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white font-bold text-sm shadow-glow-danger transition transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Try it free →
              </button>

              <button
                onClick={() => {
                  const el = document.getElementById('topology-3d');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-navy-900/90 hover:bg-navy-850 text-slate-200 border border-rose-500/40 hover:border-rose-500 font-semibold text-sm transition group"
              >
                <div className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                  <Play className="w-2.5 h-2.5 fill-rose-400" />
                </div>
                <span>Show me the demo</span>
              </button>

              <button
                onClick={() => setCurrentPage("graph")}
                className="flex items-center gap-2 px-5 py-3.5 rounded-full bg-slate-900/70 hover:bg-slate-800 text-slate-300 border border-slate-800 font-mono text-xs transition"
              >
                <Network className="w-3.5 h-3.5 text-sky-400" />
                <span>Explore Full Canvas</span>
              </button>
            </div>

            {/* Micro Stats Row */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/80 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">MODEL ACCURACY</span>
                <span className="text-lg font-black text-emerald-400">95.6% Validated</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">GNN INFERENCE</span>
                <span className="text-lg font-black text-rose-400">&lt; 45ms Latency</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">NEURAL ARCHITECTURE</span>
                <span className="text-lg font-black text-white">2-Layer SAGEConv</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Model in Elevated Isometric Device Box (Matching the Box in Reference Mockup ca9a92ff.png) */}
          <div id="topology-3d" className="lg:col-span-5 relative">
            {/* The 3D Box Container */}
            <div className="relative h-[530px] lg:h-[570px] rounded-3xl bg-gradient-to-br from-[#111827] via-[#0E1424] to-[#0A0E17] border-2 border-rose-500/40 shadow-[0_25px_60px_-15px_rgba(244,63,94,0.35)] overflow-hidden group">
              
              {/* Box Top Toolbar (Modeled like High-Tech Device Header in Reference Image) */}
              <div className="absolute top-0 left-0 right-0 z-30 px-5 py-3.5 border-b border-slate-800/90 bg-[#0B0F19]/85 backdrop-blur-md flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                  </div>
                  <span className="text-white font-bold text-[11px] ml-2">3D RELATIONAL NETWORK BOX</span>
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
                      "Mule Ring: Aggregator 01",
                      "Phishing Smurfing Funnel",
                      "Rapid Pass Conduit (₹4.9L)",
                      "Circular Loop (A→B→C→D→A)",
                      "Offshore Shell Transit",
                      "Cybercrime Portal (1930) Link",
                      "Crypto OTC Cashout Node",
                      "Turnover Drain Ratio: 98.5%"
                    ]}
                    textColor="#38BDF8"
                    speed={2.2}
                    tilt={16}
                    parallax={7}
                  />
                </GlobeErrorBoundary>
              </div>

              {/* Floating Isometric 3D Cards inside the Box (Exact Replicas of Reference Image Elements) */}
              
              {/* Floating Card 1: 3D Inflow Convergence Vertical Bars */}
              <div className="absolute top-20 right-4 z-20 p-3 rounded-2xl bg-[#0B0F19]/90 border border-slate-800/90 shadow-2xl backdrop-blur-md font-mono text-[11px] pointer-events-none transform group-hover:-translate-y-1 transition-transform">
                <div className="flex items-center justify-between gap-3 text-slate-400 mb-2">
                  <span className="text-[10px] font-bold text-rose-400">INFLOW CONVERGENCE</span>
                  <span className="text-[9px] text-slate-500">6 HOPS</span>
                </div>
                {/* 5 Vertical Colorful Isometric Bars (Exact Match of Reference Image) */}
                <div className="flex items-end gap-1.5 h-12 w-28 px-1">
                  <div className="flex-1 bg-gradient-to-t from-sky-500 to-sky-300 rounded-t h-4"></div>
                  <div className="flex-1 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t h-7"></div>
                  <div className="flex-1 bg-gradient-to-t from-purple-600 to-purple-400 rounded-t h-9"></div>
                  <div className="flex-1 bg-gradient-to-t from-pink-600 to-pink-400 rounded-t h-11"></div>
                  <div className="flex-1 bg-gradient-to-t from-rose-600 to-rose-400 rounded-t h-12 shadow-glow-danger"></div>
                </div>
                <div className="text-[9px] text-slate-400 mt-1 truncate">MULE_AGG_01 Consolidation</div>
              </div>

              {/* Floating Card 2: 70% / 98% Donut Meter */}
              <div className="absolute bottom-16 left-4 z-20 p-3 rounded-2xl bg-[#0B0F19]/90 border border-slate-800/90 shadow-2xl backdrop-blur-md font-mono text-[11px] pointer-events-none transform group-hover:translate-y-1 transition-transform">
                <div className="flex items-center gap-3">
                  <div className="relative w-11 h-11 rounded-full border-4 border-slate-800 border-t-rose-500 border-r-orange-400 flex items-center justify-center">
                    <span className="text-[11px] font-bold text-white">98%</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold">TURNOVER DRAIN</span>
                    <span className="text-xs font-bold text-rose-400">38m Velocity</span>
                  </div>
                </div>
              </div>

              {/* Floating Card 3: Rapid Pass Conduit Badge */}
              <div className="absolute bottom-16 right-4 z-20 p-2.5 rounded-2xl bg-[#0B0F19]/90 border border-rose-500/30 shadow-2xl backdrop-blur-md font-mono text-[10px] text-slate-200 pointer-events-none flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <span>₹4,90,000 Conduit</span>
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">0.94</span>
              </div>

              {/* Box Footer Status Bar */}
              <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between text-[10px] font-mono text-slate-400 pointer-events-none bg-[#0B0F19]/90 px-3.5 py-1.5 rounded-xl border border-slate-800 backdrop-blur-md">
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  3D Topological Projection Engine
                </span>
                <span className="text-slate-400">8D Sparse Feature Tensor</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Interactive Fraud Topology Simulator */}
        <section id="simulator" className="space-y-6 rounded-3xl bg-[#0E1424]/90 border border-slate-800 p-6 md:p-8 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-400" />
                <span className="font-mono text-xs font-bold text-rose-400 tracking-wider">
                  TOPOLOGY SIMULATOR
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                Simulate Known Financial Crime Typologies
              </h2>
            </div>

            <div className="flex items-center gap-2 p-1 rounded-xl bg-black/60 border border-slate-800">
              <button
                onClick={() => setActiveScenario('smurfing')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium font-mono transition ${
                  activeScenario === 'smurfing'
                    ? 'bg-rose-600 text-white shadow-glow-danger'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Fan-In Smurfing
              </button>
              <button
                onClick={() => setActiveScenario('circular')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium font-mono transition ${
                  activeScenario === 'circular'
                    ? 'bg-rose-600 text-white shadow-glow-danger'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Circular Loop
              </button>
              <button
                onClick={() => setActiveScenario('rapid')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium font-mono transition ${
                  activeScenario === 'rapid'
                    ? 'bg-rose-600 text-white shadow-glow-danger'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Rapid Pass
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
                  <span className="font-bold text-rose-400">{currentScenario.metrics.velocity}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/60 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">TURNOVER</span>
                  <span className="font-bold text-amber-400">{currentScenario.metrics.drainRatio}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/60 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">FLOW HOPS</span>
                  <span className="font-bold text-rose-300">
                    {currentScenario.metrics.inflowHops} in / {currentScenario.metrics.outflowHops} out
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleLaunchScenario(currentScenario.targetAccount)}
                className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-orange-400 text-white font-bold text-xs rounded-xl shadow-glow-danger transition flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Trace {currentScenario.targetAccount} Money Trail Live</span>
              </button>
            </div>

            {/* Sequence Diagram Display */}
            <div className="lg:col-span-7 p-5 rounded-2xl bg-black/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">DISSEMINATION SEQUENCE</span>
                <span className="text-rose-400 font-bold">{currentScenario.pattern}</span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 font-mono">
                {currentScenario.flowNodes.map((node, i) => (
                  <React.Fragment key={node.id}>
                    <div className="flex-1 flex flex-col items-center text-center p-3 rounded-xl bg-[#0E1424] border border-slate-800">
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

        {/* 5. GraphSAGE vs Traditional XGBoost Battle Arena */}
        <section id="battle-arena" className="p-6 md:p-8 rounded-3xl bg-[#0E1424]/90 border border-slate-800 space-y-6 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-rose-400" />
                <span className="font-mono text-xs font-bold text-rose-400 tracking-wider">
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

        {/* 6. End-to-End Operational Lifecycle Stepper */}
        <section id="pipeline" className="space-y-6">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-rose-400" />
                <span className="font-mono text-xs font-bold text-rose-400 tracking-wider">
                  INVESTIGATION PIPELINE
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                7-Stage End-to-End Operational Lifecycle
              </h2>
            </div>
            <button
              onClick={() => setCurrentPage('upload')}
              className="text-xs font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1"
            >
              <span>Begin Ingestion</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((st) => {
              const Icon = st.icon;
              return (
                <div
                  key={st.num}
                  onClick={() => setCurrentPage(st.page)}
                  className="p-5 rounded-2xl bg-[#0E1424]/90 border border-slate-800 hover:border-rose-500/50 transition cursor-pointer group flex flex-col justify-between shadow-lg"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-rose-400">STAGE {st.num}</span>
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-rose-400 transition-colors" />
                    </div>
                    <h3 className="font-bold text-sm text-white group-hover:text-rose-300 transition-colors">
                      {st.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {st.desc}
                    </p>
                  </div>
                  <div className="pt-4 flex items-center text-[11px] font-mono text-rose-400 group-hover:translate-x-1 transition-transform">
                    <span>Access Tool</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 7. Institutional Trust & Compliance Notice */}
        <section className="p-5 rounded-2xl bg-black/60 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-rose-400 shrink-0" />
            <span>
              <strong>Regulatory Integrity & Evidentiary Standard:</strong> FinTrace AI strictly distinguishes heuristic pattern alerts from verified judicial evidence. Designed for FIU-IND compliance, STR generation, and cybercrime taskforces under the Prevention of Money Laundering Act (PMLA).
            </span>
          </div>
          <button
            onClick={() => setCurrentPage("settings-model")}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-[#0E1424] hover:bg-slate-800 text-slate-300 border border-slate-800 font-mono text-[11px] transition"
          >
            Review GNN Weights
          </button>
        </section>

        {/* 8. Modern Fintech SaaS Footer */}
        <footer className="pt-8 pb-12 border-t border-slate-800/80 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              <span className="w-1 h-4 bg-rose-500 rounded-full transform -skew-x-12"></span>
              <span className="w-1 h-4 bg-orange-500 rounded-full transform -skew-x-12"></span>
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
            <button onClick={() => setCurrentPage('login')} className="hover:text-white transition">
              Investigator Login
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
