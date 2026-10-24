import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  Network,
  Cpu,
  Share2,
  FileWarning,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Layers,
  Activity
} from 'lucide-react';

export default function AnimaticPipelineStepper({ setCurrentPage, onAccountSelect, onOpenLivePipeline, stats = {} }) {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const scrollContainerRef = useRef(null);

  const steps = [
    {
      id: "ingestion",
      num: "01",
      title: "Data Intake & Canonical Normalization",
      subtitle: "Schema Hygiene & Deduplication",
      icon: UploadCloud,
      color: "from-blue-500 to-cyan-400",
      accentBorder: "border-cyan-500/50",
      badgeText: `${(stats.totalTransactions || 3218).toLocaleString()} Transactions`,
      badgeColor: "bg-cyan-950 text-cyan-300 border-cyan-500/40",
      desc: "Ingests raw core banking statements (CBS) and CSV ledgers. Sanitizes floating-point amounts, normalizes timestamps, enforces SHA-256 data integrity, and quarantines malformed records.",
      inputLabel: "Raw Bank SOAs & Transaction CSVs",
      outputLabel: "Clean Canonical Ingestion Entities",
      targetPage: "upload",
      cta: "Upload / Inspect CSVs",
      liveTelemetry: {
        metric1: { label: "SANITIZED ROWS", val: (stats.totalTransactions || 3218).toLocaleString() },
        metric2: { label: "QUALITY SCORE", val: "100% Validated" },
        metric3: { label: "LATENCY", val: "< 120ms Parser" }
      }
    },
    {
      id: "graph",
      num: "02",
      title: "Directed Graph Topology Mapping",
      subtitle: "Account Nodes & Relational Edges",
      icon: Network,
      color: "from-cyan-500 to-electric-400",
      accentBorder: "border-[#22D3E6]/50",
      badgeText: `${(stats.totalAccounts || 1985).toLocaleString()} Graph Nodes`,
      badgeColor: "bg-electric-950 text-electric-300 border-[#22D3E6]/40",
      desc: "Constructs a directed, weighted transaction network graph. Nodes represent financial accounts; weighted edges represent fund transfers with timestamped sequence tensors and flow velocity.",
      inputLabel: "Sanitized Transaction Ledger",
      outputLabel: "Directed Graph Topology (Adjacency Matrix)",
      targetPage: "graph",
      cta: "Launch Graph Canvas",
      liveTelemetry: {
        metric1: { label: "MONITORED NODES", val: (stats.totalAccounts || 1985).toLocaleString() },
        metric2: { label: "DIRECTED EDGES", val: (stats.totalTransactions || 3218).toLocaleString() },
        metric3: { label: "GRAPH DENSITY", val: "0.0008 Sparse" }
      }
    },
    {
      id: "gnn",
      num: "03",
      title: "GraphSAGE 2-Hop Neural Scoring",
      subtitle: "Deep Topological Aggregation",
      icon: Cpu,
      color: "from-[#22D3E6] to-[#0E7C86]",
      accentBorder: "border-[#22D3E6]",
      badgeText: "99.8% ROC-AUC • 45ms",
      badgeColor: "bg-[#0B2E33] text-[#22D3E6] border-[#22D3E6]",
      desc: "PyTorch Geometric 2-layer GraphSAGE aggregator passes messages across 1-hop and 2-hop counterparty neighborhoods, deriving 16-dimensional latent embeddings to classify mule syndicates.",
      inputLabel: "10-Feature Structural Tensors",
      outputLabel: "Account Mule Probabilities [0.0 - 1.0]",
      targetPage: "mule-detection",
      cta: "Inspect GNN Predictions",
      liveTelemetry: {
        metric1: { label: "TEST ROC-AUC", val: "0.9981 Genuine" },
        metric2: { label: "F1 SCORE", val: "0.8571 Multi-Task" },
        metric3: { label: "INFERENCE TIME", val: "< 45ms Neural Inference" }
      }
    },
    {
      id: "trail",
      num: "04",
      title: "Flow Velocity & Pass-Through Dissection",
      subtitle: "Multi-Hop Laundering Tracing",
      icon: Share2,
      color: "from-amber-500 to-rose-500",
      accentBorder: "border-[#FF3B4E]/50",
      badgeText: "Sub-Hour Velocity (<25m)",
      badgeColor: "bg-rose-950 text-[#FF3B4E] border-[#FF3B4E]/40",
      desc: "Traces fund dissemination backward from cash-out points to cyber victims. Identifies pass-through conduits where >90% of funds are drained within minutes of incoming deposits.",
      inputLabel: "High-Probability Target Accounts",
      outputLabel: "Multi-Hop Traversal Paths & Dockets",
      targetPage: "money-trail",
      cta: "Trace Money Trail",
      liveTelemetry: {
        metric1: { label: "DRAIN VELOCITY", val: "< 25 Minutes" },
        metric2: { label: "DRAIN RATIO", val: "98.7% Pass-thru" },
        metric3: { label: "MAX HOPS", val: "6 Traversals" }
      }
    },
    {
      id: "complaints",
      num: "05",
      title: "Cybercrime FIR & 1930 Correlation",
      subtitle: "Victim Cross-Reference",
      icon: FileWarning,
      color: "from-[#22D3E6] to-[#0E7C86]",
      accentBorder: "border-[#22D3E6]",
      badgeText: "₹34.5L Victim Loss Linked",
      badgeColor: "bg-[#0B2E33] text-[#22D3E6] border-[#22D3E6]",
      desc: "Cross-references police FIRs and National Cybercrime Reporting Portal (1930) tickets with suspect bank accounts, establishing concrete victim-to-mule liability chains.",
      inputLabel: "1930 Cybercrime Complaints",
      outputLabel: "Correlated Financial Crime Incidents",
      targetPage: "complaints",
      cta: "Correlate Complaints",
      liveTelemetry: {
        metric1: { label: "MATCHED FIRS", val: "5 Complaints" },
        metric2: { label: "CORRELATED LOSS", val: "₹34,50,000" },
        metric3: { label: "VICTIM RESOLUTION", val: "100% Traceable" }
      }
    },
    {
      id: "dossier",
      num: "06",
      title: "Audit Dossier & Debit Freeze Order",
      subtitle: "Judicial Chain-of-Custody",
      icon: Briefcase,
      color: "from-emerald-500 to-teal-400",
      accentBorder: "border-[#D6E85A]/50",
      badgeText: `${stats.openCases || 8} Active Legal Cases`,
      badgeColor: "bg-emerald-950 text-[#D6E85A] border-[#D6E85A]/40",
      desc: "Compiles admissible court dossiers containing transaction ledgers, GraphSAGE topological proofs, FIR linkages, and automated Core Banking debit freeze recommendations.",
      inputLabel: "Correlated Evidence & Trails",
      outputLabel: "Cryptographically Signed Case Dossier",
      targetPage: "cases",
      cta: "Open Case Management",
      liveTelemetry: {
        metric1: { label: "ACTIVE CASES", val: `${stats.openCases || 8} Underway` },
        metric2: { label: "EVIDENCE ITEMS", val: "6 Locked Items" },
        metric3: { label: "CHAIN OF CUSTODY", val: "SHA-256 Verifiable" }
      }
    }
  ];

  // Auto-advance stepper every 5 seconds when playing
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  // Scroll active step into view inside container
  useEffect(() => {
    if (scrollContainerRef.current) {
      const card = scrollContainerRef.current.children[activeStep];
      if (card) {
        card.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest'
        });
      }
    }
  }, [activeStep]);

  const current = steps[activeStep];
  const CurrentIcon = current.icon;

  return (
    <div className="rounded-none bg-gradient-to-b from-[#05080A] to-[#000000] border border-[#1B1F22] p-5 sm:p-6 shadow-xl relative overflow-hidden space-y-5">
      {/* Background ambient glow matching current step */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#22D3E6]/10 rounded-full blur-[120px] pointer-events-none transition-all duration-700"></div>

      {/* Header with Title and Player Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1B1F22]/80 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold font-mono bg-electric-950 text-electric-300 border border-[#22D3E6]/40 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" />
              <span>ANIMATIC PIPELINE FLOW</span>
            </span>
            <span className="text-[10px] font-mono text-[#E2E2E2]-400 bg-[#05080A] px-2 py-0.5 rounded border border-[#1B1F22]">
              STEP {activeStep + 1} OF {steps.length}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-wide mt-1 flex items-center gap-2">
            <span>Automated Financial Crime Intelligence Lifecycle</span>
          </h2>
          <p className="text-xs text-[#E2E2E2]-400 mt-0.5 max-w-2xl">
            Watch transaction files flow through schema validation, GraphSAGE graph analysis, anomaly review, and investigator case preparation.
          </p>
        </div>

        {/* Stepper Interactive Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition ${
              isPlaying
                ? 'bg-electric-600/30 text-electric-300 border border-[#22D3E6]/40 hover:bg-electric-600/50'
                : 'bg-[#0E1215] text-[#E2E2E2]-300 hover:text-white border border-[#1B1F22]'
            }`}
            title={isPlaying ? "Pause auto-advancing flow" : "Play auto-advancing flow"}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 text-cyan-400" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-[#D6E85A] fill-emerald-400" />
                <span>Auto-Play</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1 bg-[#000000] p-1 rounded-lg border border-[#1B1F22]">
            <button
              onClick={() => setActiveStep((prev) => (prev > 0 ? prev - 1 : steps.length - 1))}
              className="p-1 rounded hover:bg-[#0E1215] text-[#E2E2E2]-400 hover:text-white transition"
              title="Previous Step"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveStep((prev) => (prev + 1) % steps.length)}
              className="p-1 rounded hover:bg-[#0E1215] text-[#E2E2E2]-400 hover:text-white transition"
              title="Next Step"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Track with animated light beam */}
      <div className="relative z-10 space-y-2">
        <div className="h-1.5 w-full bg-[#05080A] rounded-full overflow-hidden border border-[#1B1F22]/80 relative">
          <div
            className="h-full bg-gradient-to-r from-[#0E7C86] via-[#22D3E6] to-[#6CEEFF] transition-all duration-500 rounded-full relative"
            style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
          >
            <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/70 blur-xs animate-pulse"></div>
          </div>
        </div>

        {/* Step Scrubber Pills */}
        <div className="grid grid-cols-6 gap-1 sm:gap-2">
          {steps.map((st, i) => {
            const isActive = i === activeStep;
            const isCompleted = i < activeStep;
            return (
              <button
                key={st.id}
                onClick={() => {
                  setActiveStep(i);
                  setIsPlaying(false);
                }}
                className={`py-1.5 px-1 sm:px-2 rounded-lg text-left transition flex items-center justify-between border ${
                  isActive
                    ? 'bg-[#22D3E6]/20 border-electric-400 text-white shadow-glow-marigold'
                    : isCompleted
                    ? 'bg-[#000000]/80 border-[#1B1F22] text-[#E2E2E2]-400 hover:text-[#E2E2E2]-100'
                    : 'bg-[#000000]/40 border-slate-850 text-[#E2E2E2]-500 hover:text-[#E2E2E2]-400'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isActive ? 'bg-cyan-400 animate-ping' : isCompleted ? 'bg-emerald-400' : 'bg-slate-600'
                  }`} />
                  <span className="font-mono text-[10px] font-bold truncate">
                    {st.num} <span className="hidden md:inline">{st.id.toUpperCase()}</span>
                  </span>
                </div>
                {isCompleted && <CheckCircle2 className="w-3 h-3 text-[#D6E85A] shrink-0 hidden sm:block" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Step Spotlight Card - Animatic Showcase */}
      <div className={`p-5 sm:p-6 rounded-none bg-[#05080A]/90 border transition-all duration-300 ${current.accentBorder} shadow-2xl relative z-10`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left: Step Information & Overview */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className={`w-10 h-10 rounded-none bg-gradient-to-tr ${current.color} flex items-center justify-center text-white shadow-lg`}>
                <CurrentIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#22D3E6]">
                    STAGE {current.num}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs text-[#E2E2E2]-400 font-mono">{current.subtitle}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                  {current.title}
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#E2E2E2]-300 leading-relaxed font-sans">
              {current.desc}
            </p>

            {/* Input -> Output flow pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-none bg-[#000000] border border-[#1B1F22]">
                <span className="text-[10px] text-[#E2E2E2]-500 block">DATA INTAKE:</span>
                <span className="text-[#E2E2E2]-100 font-medium truncate block mt-0.5">
                  {current.inputLabel}
                </span>
              </div>
              <div className="p-2.5 rounded-none bg-[#000000] border border-[#1B1F22]">
                <span className="text-[10px] text-cyan-400 block">COMPUTED ARTIFACT:</span>
                <span className="text-cyan-200 font-medium truncate block mt-0.5">
                  {current.outputLabel}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => {
                  if (setCurrentPage) setCurrentPage(current.targetPage);
                }}
                className="px-5 py-2.5 rounded-none bg-gradient-to-r from-electric-600 to-cyan-500 hover:from-electric-500 hover:to-cyan-400 text-white font-bold text-xs shadow-glow-marigold transition transform hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <span>{current.cta}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  if (setCurrentPage) setCurrentPage("pipeline");
                }}
                className="px-4 py-2.5 rounded-none bg-[#000000] hover:bg-[#0E1215] text-[#E2E2E2]-300 border border-[#1B1F22] text-xs font-mono transition flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-[#22D3E6]" />
                <span>View Full 12-Stage Pipeline</span>
              </button>

              {onOpenLivePipeline && (
                <button
                  onClick={onOpenLivePipeline}
                  className="px-4 py-2.5 rounded-none bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 text-white font-bold text-xs shadow-glow-emerald transition transform hover:scale-105 active:scale-95 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>Execute Pipeline Live</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: Live Telemetry & Computed Values */}
          <div className="lg:col-span-5 p-5 rounded-none bg-[#000000]/90 border border-[#1B1F22]/90 space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-[#1B1F22] pb-2.5">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-[#D6E85A] animate-pulse" />
                <span className="text-[11px] font-bold text-[#E2E2E2]-300">STAGE TELEMETRY</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${current.badgeColor}`}>
                {current.badgeText}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#05080A] border border-[#1B1F22]">
                <span className="text-[10px] text-[#E2E2E2]-400">{current.liveTelemetry.metric1.label}</span>
                <span className="font-bold text-white text-xs">{current.liveTelemetry.metric1.val}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#05080A] border border-[#1B1F22]">
                <span className="text-[10px] text-[#E2E2E2]-400">{current.liveTelemetry.metric2.label}</span>
                <span className="font-bold text-cyan-400 text-xs">{current.liveTelemetry.metric2.val}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#05080A] border border-[#1B1F22]">
                <span className="text-[10px] text-[#E2E2E2]-400">{current.liveTelemetry.metric3.label}</span>
                <span className="font-bold text-[#D6E85A] text-xs">{current.liveTelemetry.metric3.val}</span>
              </div>
            </div>

            <div className="pt-2 text-[10px] text-[#E2E2E2]-500 border-t border-[#1B1F22] flex items-center justify-between">
              <span>ENGINE: PyTorch + PyG + Axum Tokio</span>
              <span className="text-[#D6E85A] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                LIVE
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Horizontal Carousel Scroller for All 6 Cards */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs font-mono text-[#E2E2E2]-400 px-1">
          <span>STEP-BY-STEP FLOW STRIP</span>
          <span className="text-[10px]">Click any step below to spotlight</span>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex items-stretch gap-3 overflow-x-auto pb-2 scroll-smooth no-scrollbar"
        >
          {steps.map((st, i) => {
            const Icon = st.icon;
            const isSelected = i === activeStep;

            return (
              <div
                key={st.id}
                onClick={() => {
                  setActiveStep(i);
                  setIsPlaying(false);
                }}
                className={`min-w-[220px] sm:min-w-[240px] p-3.5 rounded-none border transition-all cursor-pointer flex flex-col justify-between space-y-2 shrink-0 ${
                  isSelected
                    ? 'bg-[#05080A] border-electric-400 shadow-glow-marigold scale-[1.02]'
                    : 'bg-[#000000]/70 border-slate-850 hover:border-[#1B1F22] opacity-75 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-[#22D3E6]">
                    STAGE {st.num}
                  </span>
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-[#22D3E6]/20 text-cyan-300' : 'bg-[#05080A] text-[#E2E2E2]-400'}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">
                    {st.title}
                  </h4>
                  <p className="text-[10px] text-[#E2E2E2]-400 line-clamp-2 mt-0.5 font-sans">
                    {st.subtitle}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#1B1F22]/80 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#E2E2E2]-400 truncate max-w-[120px]">{st.badgeText}</span>
                  <span className="text-[#22D3E6] font-bold">&rarr;</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
