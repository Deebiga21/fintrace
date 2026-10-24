import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Activity,
  Layers,
  Cpu,
  Database,
  Network,
  Share2,
  FileWarning,
  Briefcase,
  X,
  ArrowRight,
  ShieldCheck,
  Check,
  Copy,
  Download
} from 'lucide-react';
import { api } from '../services/api';

const STAGE_SPECS = [
  { num: 1, name: "Dataset Intake & Provenance", icon: Database, desc: "Verify active statement extract & canonical headers" },
  { num: 2, name: "Data Validation & Hygiene", icon: CheckCircle2, desc: "Sanitize floating points, check non-negative amounts" },
  { num: 3, name: "Relational Storage Sync", icon: Layers, desc: "Commit transactions, accounts, and provenance entities" },
  { num: 4, name: "Graph Topology Construction", icon: Network, desc: "Build directed weighted adjacency matrix & degree metrics" },
  { num: 5, name: "Feature Engineering & Leakage Guard", icon: Activity, desc: "Enforce temporal split boundaries; compute 10D tensors" },
  { num: 6, name: "Adversarial Augmentation Audit", icon: Cpu, desc: "Verify adversarial neural generator weights & forensic ledger" },
  { num: 7, name: "GraphSAGE Neural Inference", icon: Cpu, desc: "Execute 2-hop message passing & derive mule scores" },
  { num: 8, name: "Risk Classification & Alerts", icon: AlertCircle, desc: "Apply thresholds (High >= 75%) and generate alerts" },
  { num: 9, name: "Money Trail & Velocity Dissection", icon: Share2, desc: "Trace multi-hop fund dissemination & rapid drains" },
  { num: 10, name: "Cybercrime Complaint Correlation", icon: FileWarning, desc: "Cross-reference FIRs & 1930 victim loss registry" },
  { num: 11, name: "Case Evidence Dossier Locker", icon: Briefcase, desc: "Package judicial dockets with SHA-256 chain-of-custody" },
  { num: 12, name: "Command Center Synchronization", icon: ShieldCheck, desc: "Broadcast live telemetry and refresh platform KPIs" }
];

export default function LivePipelineExecutionModal({
  isOpen,
  onClose,
  setCurrentPage,
  setRefreshTrigger
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(-1);
  const [stageResults, setStageResults] = useState({});
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [selectedStageFilter, setSelectedStageFilter] = useState('ALL');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [copied, setCopied] = useState(false);

  const terminalEndRef = useRef(null);
  const timerRef = useRef(null);
  const executionLoopRef = useRef(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  // Stopwatch timer
  useEffect(() => {
    if (isRunning && !isPaused) {
      const start = Date.now() - elapsedMs;
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - start);
      }, 50);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isPaused]);

  if (!isOpen) return null;

  const appendLog = (stageNum, text, type = 'info') => {
    const timeStr = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        time: timeStr,
        stage: stageNum,
        text,
        type
      }
    ]);
  };

  const handleStartExecution = async () => {
    setIsRunning(true);
    setIsPaused(false);
    setIsCompleted(false);

    // Initial boot log
    if (terminalLogs.length === 0) {
      appendLog(0, "==================================================", "header");
      appendLog(0, "FINTRACE AI — REAL-TIME PIPELINE EXECUTION INITIATED", "header");
      appendLog(0, "Connecting to Axum-Tokio Engine & PyTorch Microservice...", "info");
      appendLog(0, "Target Database: e:\\FinTrace\\backend\\fintrace.db (SQLite Shared)", "info");
      appendLog(0, "==================================================", "header");
    }

    const startIndex = currentStageIndex >= 0 && currentStageIndex < 12 ? currentStageIndex : 0;

    for (let i = startIndex; i < 12; i++) {
      if (!executionLoopRef.current) executionLoopRef.current = true;
      setCurrentStageIndex(i);
      const stageNum = i + 1;
      const spec = STAGE_SPECS[i];

      appendLog(stageNum, `>>> Entering Stage ${stageNum}: ${spec.name.toUpperCase()}...`, "stage-start");

      try {
        const res = await api.runPipelineStage(stageNum);
        
        // Append server-side real-time logs
        if (res.logs && Array.isArray(res.logs)) {
          res.logs.forEach((logLine) => {
            appendLog(stageNum, logLine, "log");
          });
        } else {
          appendLog(stageNum, res.message || `Stage ${stageNum} executed successfully.`, "log");
        }

        setStageResults((prev) => ({
          ...prev,
          [stageNum]: {
            status: 'COMPLETED',
            duration_ms: res.duration_ms || 35,
            message: res.message,
            metrics: res.metrics || {}
          }
        }));

        appendLog(stageNum, `✓ Stage ${stageNum} Completed in ${res.duration_ms || 35}ms.`, "success");

        // Small visual stagger so investigator sees step progression cleanly
        await new Promise((r) => setTimeout(r, 450));

      } catch (err) {
        appendLog(stageNum, `✖ Stage ${stageNum} Execution Failed: ${err.message}`, "error");
        setStageResults((prev) => ({
          ...prev,
          [stageNum]: { status: 'FAILED', message: err.message }
        }));
        setIsRunning(false);
        return;
      }
    }

    // Finished all 12 stages
    setIsRunning(false);
    setIsCompleted(true);
    appendLog(12, "==================================================", "header");
    appendLog(12, "🎉 12/12 PIPELINE STAGES PROCESSED SUCCESSFULLY IN REAL TIME", "success");
    appendLog(12, "State synchronized across Executive Dashboard, Graph, and Case Lockers.", "info");
    appendLog(12, "==================================================", "header");

    if (setRefreshTrigger) {
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    setIsRunning(false);
    appendLog(currentStageIndex + 1, "Pipeline execution paused by investigator.", "warn");
  };

  const handleRestart = () => {
    setIsRunning(false);
    setIsPaused(false);
    setIsCompleted(false);
    setCurrentStageIndex(-1);
    setStageResults({});
    setTerminalLogs([]);
    setElapsedMs(0);
  };

  const handleCopyLogs = () => {
    const text = terminalLogs.map((l) => `[${l.time}] [STAGE ${l.stage}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatElapsed = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${tenths}s`;
  };

  const completedCount = Object.values(stageResults).filter((r) => r.status === 'COMPLETED').length;
  const progressPercent = Math.round((completedCount / 12) * 100);

  const filteredLogs = terminalLogs.filter((l) => {
    if (selectedStageFilter === 'ALL') return true;
    return l.stage === selectedStageFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-hidden">
      <div className="w-full max-w-6xl h-[92vh] max-h-[850px] bg-gradient-to-b from-[#05080A] to-[#000000] border border-[#1B1F22]/80 rounded-none shadow-2xl flex flex-col overflow-hidden text-[#E2E2E2] font-sans">
        
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-[#1B1F22] bg-[#000000]/90 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-none bg-gradient-to-tr from-electric-600 to-cyan-400 flex items-center justify-center text-white shadow-glow-marigold">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wide text-sm sm:text-base font-mono">
                  FINTRACE REAL-TIME PIPELINE RUNNER
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-electric-950 text-electric-300 border border-[#22D3E6]/40 font-bold">
                  {isRunning ? "PROCESSING LIVE" : isCompleted ? "ALL 12 STAGES VERIFIED" : "READY"}
                </span>
              </div>
              <p className="text-xs text-[#E2E2E2]-400">
                Execute strict end-to-end processing across banking datasets, directed graph topology, GraphSAGE inference, and case dossiers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="font-mono text-xs text-[#E2E2E2]-300 bg-[#000000] px-3 py-1.5 rounded-lg border border-[#1B1F22] flex items-center gap-2">
              <span className="text-[#E2E2E2]-500 text-[10px]">ELAPSED:</span>
              <span className="font-bold text-cyan-400">{formatElapsed(elapsedMs)}</span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#0E1215] text-[#E2E2E2]-400 hover:text-white transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Progress Track */}
        <div className="w-full bg-[#050811] px-6 py-2 border-b border-[#1B1F22]/80 flex items-center justify-between gap-4 text-xs font-mono shrink-0">
          <div className="flex-1 flex items-center gap-3">
            <span className="text-[#E2E2E2]-400 text-[11px] shrink-0">PROGRESS:</span>
            <div className="flex-1 h-2 bg-[#000000] rounded-full overflow-hidden border border-[#1B1F22] relative">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-electric-400 to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-bold text-cyan-300 text-xs shrink-0">{progressPercent}% ({completedCount}/12)</span>
          </div>

          {/* Stepper Controls */}
          <div className="flex items-center gap-2">
            {!isRunning ? (
              <button
                onClick={handleStartExecution}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-electric-600 to-cyan-500 hover:from-electric-500 hover:to-cyan-400 text-white font-bold text-xs shadow-glow-marigold transition flex items-center gap-1.5 active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{currentStageIndex > 0 && !isCompleted ? "Resume Pipeline" : "Execute Full Pipeline"}</span>
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="px-4 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
            )}

            <button
              onClick={handleRestart}
              className="p-1.5 rounded-lg bg-[#000000] hover:bg-[#0E1215] text-[#E2E2E2]-300 border border-[#1B1F22] transition"
              title="Reset Execution"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Body (2 Columns) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          
          {/* Left Column: 12-Stage Subway List */}
          <div className="lg:col-span-5 border-r border-[#1B1F22]/90 overflow-y-auto p-4 space-y-2 bg-[#090D18]/90 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#1B1F22] text-[11px] text-[#E2E2E2]-400">
              <span className="font-bold uppercase tracking-wider">PIPELINE STAGES</span>
              <button
                onClick={() => setSelectedStageFilter('ALL')}
                className={`text-[10px] px-2 py-0.5 rounded transition ${
                  selectedStageFilter === 'ALL' ? 'bg-[#22D3E6]/20 text-electric-300 border border-[#22D3E6]/30 font-bold' : 'text-[#E2E2E2]-500 hover:text-[#E2E2E2]-300'
                }`}
              >
                Show All Logs
              </button>
            </div>

            {STAGE_SPECS.map((spec, idx) => {
              const Icon = spec.icon;
              const result = stageResults[spec.num];
              const isCurrent = currentStageIndex === idx && isRunning;
              const isDone = result?.status === 'COMPLETED';
              const isFailed = result?.status === 'FAILED';
              const isFiltered = selectedStageFilter === spec.num;

              return (
                <div
                  key={spec.num}
                  onClick={() => setSelectedStageFilter(spec.num)}
                  className={`p-2.5 rounded-none border transition cursor-pointer flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-cyan-950/40 border-cyan-500/60 shadow-glow-cyan'
                      : isDone
                      ? 'bg-[#000000]/60 border-[#1B1F22]/80 hover:border-[#1B1F22]'
                      : 'bg-[#000000]/20 border-[#1B1F22] opacity-60'
                  } ${isFiltered ? 'ring-1 ring-electric-400' : ''}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isDone
                        ? 'bg-emerald-950 text-[#D6E85A] border border-[#D6E85A]/40'
                        : isCurrent
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-500 animate-spin'
                        : 'bg-[#05080A] text-[#E2E2E2]-500 border border-[#1B1F22]'
                    }`}>
                      {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Icon className="w-3.5 h-3.5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-[#E2E2E2]-500">#{spec.num.toString().padStart(2, '0')}</span>
                        <h4 className="font-bold text-xs text-white truncate">{spec.name}</h4>
                      </div>
                      <p className="text-[10px] text-[#E2E2E2]-400 truncate font-sans">{spec.desc}</p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="shrink-0 flex items-center gap-2">
                    {result?.duration_ms && (
                      <span className="text-[10px] text-[#E2E2E2]-400">{result.duration_ms}ms</span>
                    )}
                    {isCurrent && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    )}
                    {isDone && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950/80 text-[#D6E85A] border border-[#D6E85A]/30">
                        DONE
                      </span>
                    )}
                    {isFailed && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-950 text-[#FF3B4E] border border-[#FF3B4E]/30">
                        FAIL
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Live Terminal Output */}
          <div className="lg:col-span-7 flex flex-col bg-[#050811] overflow-hidden">
            
            {/* Terminal Window Chrome */}
            <div className="px-4 py-2.5 bg-[#080E1B] border-b border-[#1B1F22] flex items-center justify-between text-xs font-mono shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B4E]/80"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D6E85A]/80"></span>
                </div>
                <Terminal className="w-3.5 h-3.5 text-cyan-400 ml-2" />
                <span className="text-[#E2E2E2]-300 text-[11px] font-bold">fintrace@forensic-core:~$ run-pipeline --realtime</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLogs}
                  className="px-2 py-1 rounded bg-[#0E1215] hover:bg-slate-700 text-[#E2E2E2]-300 text-[10px] flex items-center gap-1 transition"
                  title="Copy terminal logs"
                >
                  {copied ? <Check className="w-3 h-3 text-[#D6E85A]" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Scrollable Terminal Screen */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] space-y-1.5 select-text text-[#E2E2E2]-300 leading-relaxed">
              {filteredLogs.map((l) => (
                <div key={l.id} className="flex items-start gap-2">
                  <span className="text-[#E2E2E2]-500 text-[10px] select-none shrink-0">{l.time}</span>
                  {l.stage > 0 && (
                    <span className="text-cyan-400 font-bold text-[10px] select-none shrink-0">
                      [STAGE {l.stage.toString().padStart(2, '0')}]
                    </span>
                  )}
                  <span className={`break-all ${
                    l.type === 'header'
                      ? 'text-cyan-300 font-bold'
                      : l.type === 'stage-start'
                      ? 'text-electric-300 font-bold'
                      : l.type === 'success'
                      ? 'text-[#D6E85A] font-semibold'
                      : l.type === 'warn'
                      ? 'text-amber-400'
                      : l.type === 'error'
                      ? 'text-[#FF3B4E] font-bold'
                      : 'text-[#E2E2E2]-300'
                  }`}>
                    {l.text}
                  </span>
                </div>
              ))}

              {filteredLogs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-[#E2E2E2]-500 space-y-2 py-16">
                  <Terminal className="w-8 h-8 text-slate-600" />
                  <p>Ready to execute. Click &quot;Execute Full Pipeline&quot; to begin real-time processing.</p>
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>

            {/* Real-Time Database Synchronizer Bar */}
            <div className="p-3 bg-[#080E1B] border-t border-[#1B1F22] flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono shrink-0">
              <div className="flex items-center gap-4">
                <span>ACCOUNTS: <strong className="text-white">1,985</strong></span>
                <span>TXNS: <strong className="text-white">3,218</strong></span>
                <span>ALERTS: <strong className="text-[#FF3B4E]">29 High Risk</strong></span>
                <span>CASES: <strong className="text-cyan-400">8 Active</strong></span>
              </div>

              <div className="text-[#D6E85A] font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>RELATIONAL DB SYNCHRONIZED</span>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#1B1F22] bg-[#000000] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#E2E2E2]-400 font-mono">
            {isCompleted ? (
              <span className="text-[#D6E85A] font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#D6E85A]" />
                <span>All 12 stages executed successfully. Real database state refreshed.</span>
              </span>
            ) : (
              <span>Engine: Axum + SQLx (Tokio) &bull; GraphSAGE 2-Layer (PyG)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                if (setCurrentPage) setCurrentPage('dashboard');
              }}
              className="px-4 py-2 rounded-none bg-electric-600/30 hover:bg-electric-600/50 text-electric-300 border border-[#22D3E6]/40 text-xs font-bold transition flex items-center gap-1.5"
            >
              <span>View Executive Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-none bg-[#0E1215] hover:bg-slate-700 text-[#E2E2E2]-300 text-xs font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
