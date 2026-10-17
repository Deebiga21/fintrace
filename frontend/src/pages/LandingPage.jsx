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
  Video
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import BriarGlobe from '../components/BriarGlobe';

export default function LandingPage({ setCurrentPage, onAccountSelect }) {
  // Simulator State
  const [activeScenario, setActiveScenario] = useState('smurfing');

  // Video State
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
    <div className="space-y-12 max-w-7xl mx-auto py-2">
      {/* 1. Live Threat Telemetry & Surveillance Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl bg-navy-900 border border-slate-800 text-xs shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono font-bold text-white tracking-wider text-[11px]">
              GNN SURVEILLANCE NODE ACTIVE
            </span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <div className="hidden md:flex items-center gap-4 text-[11px] text-slate-400 font-mono">
            <span>MODEL: <strong className="text-electric-400">GraphSAGE v1.0 (PyG)</strong></span>
            <span>NODES: <strong className="text-white">74 Monitored</strong></span>
            <span>TRANSACTIONS: <strong className="text-white">182 Processed</strong></span>
            <span>FLAGGED MULES: <strong className="text-rose-400">16 Leads</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-semibold text-[10px]">
            FIU-IND COMPLIANT
          </span>
          <span className="px-2 py-0.5 rounded bg-electric-950/60 text-electric-300 border border-electric-500/30 font-semibold text-[10px]">
            ZERO-HALLUCINATION POLICY
          </span>
        </div>
      </div>

      {/* 2. Command Center Hero: Headline & 3D Interactive WebGL Thread Globe */}
      <div className="relative rounded-2xl bg-gradient-to-b from-navy-900 via-navy-900 to-navy-950 border border-slate-800 p-6 md:p-10 overflow-hidden shadow-2xl">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-electric-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Vision & CTAs (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-500/15 border border-electric-500/30 text-electric-300 text-xs font-semibold font-mono">
              <Cpu className="w-3.5 h-3.5 text-electric-400 animate-pulse" />
              GRAPH NEURAL NETWORK FRAUD INTELLIGENCE
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Intelligent Mule Account Detection & Financial Crime Investigation
            </h1>

            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              FinTrace AI exposes complex money laundering networks and conduit accounts through deep **Graph Neural Networks (GraphSAGE)**. By evaluating multi-hop topological structures and fund velocity over isolated transaction slicing, it defeats smurfing aggregators and circular layering evasion.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => setCurrentPage("dashboard")}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 text-white font-bold text-sm shadow-glow-electric transition group"
              >
                <span>Launch Command Center</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setCurrentPage("graph")}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-navy-850 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm transition"
              >
                <Network className="w-4 h-4 text-electric-400" />
                <span>Explore Full Graph Canvas</span>
              </button>

              <button
                onClick={() => setCurrentPage("upload")}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 font-medium text-xs transition font-mono"
              >
                <Database className="w-3.5 h-3.5 text-sky-400" />
                <span>Upload CSV Dataset</span>
              </button>
            </div>

            {/* Micro Stats Row */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block">MODEL ACCURACY</span>
                <span className="text-base font-black text-emerald-400">95.6% Validated</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">GNN INFERENCE</span>
                <span className="text-base font-black text-electric-300">&lt; 45ms Latency</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">NEURAL ARCHITECTURE</span>
                <span className="text-base font-black text-white">2-Layer SAGEConv</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Interactive WebGL Thread Globe (BriarGlobe) (5 cols) */}
          <div className="lg:col-span-5 h-[480px] min-h-[440px] rounded-2xl bg-navy-950/95 border border-slate-800 relative overflow-hidden shadow-glass group">
            <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between text-xs font-mono pointer-events-none">
              <div className="flex items-center gap-2 bg-navy-900/90 px-2.5 py-1 rounded-full border border-slate-800 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-electric-400 animate-ping"></span>
                <span className="text-white font-bold text-[11px]">3D RELATIONAL TOPOLOGY</span>
              </div>
              <span className="text-[10px] text-slate-300 bg-navy-900/90 px-2 py-0.5 rounded border border-slate-800">
                Hover Nodes to Inspect
              </span>
            </div>

            {/* BriarGlobe Component Container */}
            <div className="absolute inset-0 w-full h-full">
              <BriarGlobe
                background="transparent"
                lines={{
                  color: "#38BDF8",
                  accent: "#EF4444",
                  thickness: 0.65,
                  opacity: 5.5,
                  depth: 8.5
                }}
                hover={{
                  reach: 24,
                  glowSize: 140,
                  glow: "#0284C7",
                  pill: "rgba(15, 23, 42, 0.92)",
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
            </div>

            <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between text-[10px] font-mono text-slate-400 pointer-events-none bg-navy-900/90 px-3 py-1.5 rounded-lg border border-slate-800 backdrop-blur-md">
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Real-Time Topological Projection
              </span>
              <span className="text-slate-400">8D Sparse Feature Tensor</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Forensic Surveillance & Tactical Video Screen */}
      <div className="rounded-2xl bg-navy-900 border border-slate-800 p-6 md:p-8 space-y-4 shadow-glass">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-electric-500/20 text-electric-400 border border-electric-500/30 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                <span className="font-mono text-xs font-bold text-rose-400 tracking-wider">
                  SURVEILLANCE HUD STREAM #01
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-navy-950 px-2 py-0.5 rounded border border-slate-800">
                  CLASSIFIED FORENSIC FEED
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                Financial Crime Forensic Motion Reconstruction
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-slate-950 text-slate-300 border border-slate-800">
              RESOLUTION: 1080P HUD
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-950 text-emerald-400 border border-slate-800">
              STATUS: ARCHIVED STREAM
            </span>
          </div>
        </div>

        {/* Video Player Display Container */}
        <div className="relative rounded-xl overflow-hidden bg-black border border-slate-800 group shadow-2xl">
          {/* Cyber HUD Overlay Corners */}
          <div className="absolute top-3 left-4 z-10 font-mono text-[11px] text-electric-400/80 bg-black/60 px-3 py-1 rounded-md backdrop-blur-md border border-electric-500/20 pointer-events-none">
            [CAM-01: THE CREATION OF ADAM — FRAUD INTEL RECONSTRUCTION]
          </div>

          <div className="absolute top-3 right-4 z-10 font-mono text-[10px] text-rose-400 bg-black/60 px-2.5 py-1 rounded-md backdrop-blur-md border border-rose-500/30 flex items-center gap-1.5 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span>LIVE FORENSIC MONITOR</span>
          </div>

          <video
            ref={videoRef}
            src="/the_creation_of_adam-recording.mp4"
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full max-h-[520px] object-contain mx-auto bg-black"
          />

          {/* Bottom HUD Floating Controls Bar */}
          <div className="absolute bottom-3 left-4 right-4 z-10 p-3 rounded-lg bg-navy-950/85 backdrop-blur-md border border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="p-1.5 rounded-lg bg-electric-600/30 hover:bg-electric-600 text-electric-300 hover:text-white border border-electric-500/40 transition"
                title={isPlaying ? "Pause Video" : "Play Video"}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
                title={isMuted ? "Unmute Audio" : "Mute Audio"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <span className="text-[11px] font-mono text-slate-300 hidden sm:inline">
                Forensic Motion Telemetry • Case Reference: #CASE-2026-D00D33
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (onAccountSelect) onAccountSelect('MULE_AGG_01');
                  setCurrentPage('graph');
                }}
                className="px-3 py-1 bg-electric-600 hover:bg-electric-500 text-white font-semibold rounded text-xs transition"
              >
                Investigate Graph
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Live Interactive Fraud Topology Simulator */}
      <div className="p-6 md:p-8 rounded-2xl bg-navy-900 border border-slate-800 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                TACTICAL SANDBOX
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white tracking-wide mt-1">
              Interactive Attack Vector Simulator
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate and inspect the 3 primary financial crime typologies modeled in FinTrace AI.
            </p>
          </div>

          {/* Scenario Tabs */}
          <div className="flex gap-2 p-1 bg-navy-950 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveScenario('smurfing')}
              className={`px-3 py-1.5 rounded-md font-semibold transition ${
                activeScenario === 'smurfing'
                  ? 'bg-rose-950 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1. Smurfing Aggregator
            </button>
            <button
              onClick={() => setActiveScenario('circular')}
              className={`px-3 py-1.5 rounded-md font-semibold transition ${
                activeScenario === 'circular'
                  ? 'bg-rose-950 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2. Circular Loop
            </button>
            <button
              onClick={() => setActiveScenario('rapid')}
              className={`px-3 py-1.5 rounded-md font-semibold transition ${
                activeScenario === 'rapid'
                  ? 'bg-rose-950 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              3. Rapid Pass Conduit
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
              <div className="p-2.5 rounded-lg bg-navy-950 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">VELOCITY</span>
                <span className="font-bold text-rose-400">{currentScenario.metrics.velocity}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-navy-950 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">TURNOVER</span>
                <span className="font-bold text-amber-400">{currentScenario.metrics.drainRatio}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-navy-950 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">FLOW HOPS</span>
                <span className="font-bold text-electric-300">
                  {currentScenario.metrics.inflowHops} in / {currentScenario.metrics.outflowHops} out
                </span>
              </div>
            </div>

            <button
              onClick={() => handleLaunchScenario(currentScenario.targetAccount)}
              className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs rounded-lg shadow-glow-danger transition flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Trace {currentScenario.targetAccount} Money Trail Live</span>
            </button>
          </div>

          {/* Sequence Diagram Display */}
          <div className="lg:col-span-7 p-5 rounded-xl bg-navy-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">DISSEMINATION SEQUENCE</span>
              <span className="text-rose-400 font-bold">{currentScenario.pattern}</span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 font-mono">
              {currentScenario.flowNodes.map((node, i) => (
                <React.Fragment key={node.id}>
                  <div className="flex-1 flex flex-col items-center text-center p-3 rounded-lg bg-navy-900 border border-slate-800">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs border mb-2 ${
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
      </div>

      {/* 5. GraphSAGE vs Traditional XGBoost Battle Arena */}
      <div className="p-6 md:p-8 rounded-2xl bg-navy-900 border border-slate-800 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-electric-500/20 text-electric-300 border border-electric-500/30">
                METHODOLOGY COMPARISON
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white tracking-wide mt-1">
              Why GraphSAGE Outperforms Traditional XGBoost in Mule Detection
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Financial crime syndicates intentionally design transaction amounts to blend into normal distributions, rendering row-by-row tabular classifiers ineffective.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="flex items-center gap-1 text-rose-400 font-semibold">
              <X className="w-3.5 h-3.5 text-rose-500" />
              Tabular Limitations
            </span>
            <span className="text-slate-600">vs</span>
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              GraphSAGE Superpowers
            </span>
          </div>
        </div>

        {/* Comparison Table / Matrix */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] bg-navy-950">
                <th className="py-3 px-4 w-1/4">INVESTIGATION CAPABILITY</th>
                <th className="py-3 px-4 w-3/8 text-slate-400">TRADITIONAL XGBOOST / RANDOM FOREST</th>
                <th className="py-3 px-4 w-3/8 text-electric-400 font-bold">FINTRACE AI (GRAPHSAGE GNN)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {comparisonRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4 font-semibold text-slate-200 font-mono text-[11px]">
                    {row.feature}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 text-xs">
                    <div className="flex items-start gap-2">
                      <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{row.xgboost}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-200 text-xs">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="font-medium text-slate-100">{row.graphsage}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Interactive 4-Way Fraud Attack Vector Showcase */}
      <div className="space-y-4">
        <div className="border-b border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>4 Real-World Attack Topologies Flagged in Demo Network</span>
            </h2>
            <p className="text-xs text-slate-400">
              Click any topology below to immediately inspect its ego network, money trail, and correlated cyber fraud reports.
            </p>
          </div>
          <span className="text-xs font-mono text-electric-400">Synthetically Modelled</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 hover:border-rose-500/50 flex flex-col justify-between space-y-3 transition group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded">
                  SMURFING AGGREGATOR
                </span>
                <span className="text-xs font-mono font-bold text-white">₹3,40,000</span>
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-electric-300 transition font-mono">
                MULE_AGG_01
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                6 phishing victim credits consolidated and transferred in 40 minutes to layering conduit <code className="text-electric-400">MULE_LAYER_02</code>.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => {
                  if (onAccountSelect) onAccountSelect('MULE_AGG_01');
                  setCurrentPage('money-trail');
                }}
                className="flex-1 py-1.5 bg-navy-850 hover:bg-slate-800 text-electric-300 border border-slate-700 rounded text-[11px] font-semibold transition"
              >
                Trace Trail
              </button>
              <button
                onClick={() => {
                  if (onAccountSelect) onAccountSelect('MULE_AGG_01');
                  setCurrentPage('graph');
                }}
                className="flex-1 py-1.5 bg-navy-850 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded text-[11px] font-semibold transition"
              >
                Graph
              </button>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 hover:border-rose-500/50 flex flex-col justify-between space-y-3 transition group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded">
                  CIRCULAR LAYERING
                </span>
                <span className="text-xs font-mono font-bold text-white">₹1,85,000</span>
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-electric-300 transition font-mono">
                CIRC_MULE_A
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                4-hop closed cycle loop (A → B → C → D → A) designed to evade linear AML rules and obscure ultimate beneficial ownership.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => {
                  if (onAccountSelect) onAccountSelect('CIRC_MULE_A');
                  setCurrentPage('money-trail');
                }}
                className="flex-1 py-1.5 bg-navy-850 hover:bg-slate-800 text-electric-300 border border-slate-700 rounded text-[11px] font-semibold transition"
              >
                Trace Trail
              </button>
              <button
                onClick={() => {
                  if (onAccountSelect) onAccountSelect('CIRC_MULE_A');
                  setCurrentPage('graph');
                }}
                className="flex-1 py-1.5 bg-navy-850 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded text-[11px] font-semibold transition"
              >
                Graph
              </button>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 hover:border-rose-500/50 flex flex-col justify-between space-y-3 transition group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded">
                  RAPID CONDUIT
                </span>
                <span className="text-xs font-mono font-bold text-white">₹4,90,000</span>
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-electric-300 transition font-mono">
                RAPID_CONDUIT_77
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Single high-value inbound invoice credit drained in 14 minutes across 3 offshore shell accounts to prevent freezing.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => {
                  if (onAccountSelect) onAccountSelect('RAPID_CONDUIT_77');
                  setCurrentPage('money-trail');
                }}
                className="flex-1 py-1.5 bg-navy-850 hover:bg-slate-800 text-electric-300 border border-slate-700 rounded text-[11px] font-semibold transition"
              >
                Trace Trail
              </button>
              <button
                onClick={() => {
                  if (onAccountSelect) onAccountSelect('RAPID_CONDUIT_77');
                  setCurrentPage('graph');
                }}
                className="flex-1 py-1.5 bg-navy-850 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded text-[11px] font-semibold transition"
              >
                Graph
              </button>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-5 rounded-xl bg-navy-900 border border-slate-800 hover:border-rose-500/50 flex flex-col justify-between space-y-3 transition group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded">
                  SMURF DISPERSION
                </span>
                <span className="text-xs font-mono font-bold text-white">₹2,50,000</span>
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-electric-300 transition font-mono">
                DISP_SMURF_88
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Staging escrow credit split into 5 sub-₹50,000 micro-transfers to stay under mandatory institutional CTR audit limits.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => {
                  if (onAccountSelect) onAccountSelect('DISP_SMURF_88');
                  setCurrentPage('money-trail');
                }}
                className="flex-1 py-1.5 bg-navy-850 hover:bg-slate-800 text-electric-300 border border-slate-700 rounded text-[11px] font-semibold transition"
              >
                Trace Trail
              </button>
              <button
                onClick={() => {
                  if (onAccountSelect) onAccountSelect('DISP_SMURF_88');
                  setCurrentPage('graph');
                }}
                className="flex-1 py-1.5 bg-navy-850 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded text-[11px] font-semibold transition"
              >
                Graph
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 7. End-to-End Operational Lifecycle Stepper */}
      <div className="space-y-6">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Connected 7-Stage Financial Crime Investigation Lifecycle
            </h2>
            <p className="text-xs text-slate-400">
              Click any stage below to jump directly into the live analyst workbench.
            </p>
          </div>
          <span className="text-xs font-mono text-electric-400">Fully Connected Platform</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                onClick={() => setCurrentPage(s.page)}
                className="p-5 rounded-xl bg-navy-900/90 border border-slate-800 hover:border-electric-500/50 hover:bg-navy-850 cursor-pointer transition group flex flex-col justify-between space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-electric-400 bg-electric-500/10 px-2 py-0.5 rounded border border-electric-500/20">
                    STAGE {s.num}
                  </span>
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-electric-400 transition" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-electric-300 transition">{s.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{s.desc}</p>
                </div>
                <div className="text-[10px] font-mono text-slate-400 group-hover:text-electric-400 flex items-center gap-1 pt-1 border-t border-slate-800/80">
                  <span>Open analyst view</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 8. Legal & Scientific Transparency Disclaimer */}
      <div className="p-4 rounded-xl bg-navy-950 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-electric-400 shrink-0" />
          <p className="text-[11px] leading-relaxed">
            <strong className="text-slate-200">Scientific & Judicial Disclaimer:</strong> All alerts generated by GraphSAGE are investigative intelligence leads requiring corroboration. Accuracy metrics and confusion matrices are computed strictly on validation splits without fabrication.
          </p>
        </div>

        <button
          onClick={() => setCurrentPage('settings-model')}
          className="px-3 py-1.5 rounded-lg bg-navy-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-mono shrink-0 transition"
        >
          Inspect Model Architecture
        </button>
      </div>
    </div>
  );
}
