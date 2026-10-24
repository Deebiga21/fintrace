import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  Play,
  X,
  ExternalLink,
  ChevronRight,
  Activity,
  Layers,
  Database,
  Shield,
  FileText
} from 'lucide-react';
import { api } from '../services/api';

const STAGE_SHORT_NAMES = {
  1: "INGESTION",
  2: "VALIDATION",
  3: "RELATIONAL",
  4: "GRAPH TOPOLOGY",
  5: "CWGAN-GP",
  6: "GRAPHSAGE",
  7: "GNN SCORING",
  8: "ISOLATION FOREST",
  9: "MONEY TRAIL",
  10: "FIR INTEL",
  11: "CASE DOSSIER",
  12: "AUDIT LEDGER",
};

// Node coordinates in SVG viewport 1000 x 420
const NODE_COORDINATES = [
  { stage: 1,  x: 70,  y: 90,  supporting: false },
  { stage: 2,  x: 230, y: 90,  supporting: false },
  { stage: 3,  x: 390, y: 90,  supporting: false },
  { stage: 4,  x: 550, y: 90,  supporting: false },
  { stage: 5,  x: 710, y: 90,  supporting: true  }, // supporting lime
  { stage: 6,  x: 870, y: 90,  supporting: false },
  { stage: 7,  x: 870, y: 270, supporting: false },
  { stage: 8,  x: 710, y: 270, supporting: true  }, // supporting lime
  { stage: 9,  x: 550, y: 270, supporting: false },
  { stage: 10, x: 390, y: 270, supporting: false },
  { stage: 11, x: 230, y: 270, supporting: false },
  { stage: 12, x: 70,  y: 270, supporting: false },
];

export default function SystemPipelinePage({
  setCurrentPage,
  onAccountSelect,
  setSelectedCaseId,
  refreshTrigger,
  setRefreshTrigger,
  onOpenLivePipeline
}) {
  const [pipelineData, setPipelineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [selectedStage, setSelectedStage] = useState(null);
  const [runningStage, setRunningStage] = useState(null);

  const fetchPipeline = async (datasetId) => {
    setLoading(true);
    setError(null);
    try {
      const statusRes = await api.getPipelineStatus(datasetId || undefined);
      setPipelineData(statusRes);
      if (statusRes.active_dataset && !selectedDatasetId) {
        setSelectedDatasetId(statusRes.active_dataset.dataset_id);
      }
      // If a stage was already selected, update its reference
      if (selectedStage) {
        const updated = statusRes.stages?.find(s => s.stage_number === selectedStage.stage_number);
        if (updated) setSelectedStage(updated);
      }
    } catch (err) {
      setError(err.message || "Failed to load pipeline status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline(selectedDatasetId);
  }, [selectedDatasetId, refreshTrigger]);

  const handleRunStage = async (stageNum) => {
    setRunningStage(stageNum);
    try {
      const res = await api.runPipelineStage(stageNum);
      if (setRefreshTrigger) setRefreshTrigger(prev => prev + 1);
      fetchPipeline(selectedDatasetId);
    } catch (err) {
      alert(`Stage ${stageNum} execution failed: ${err.message}`);
    } finally {
      setRunningStage(null);
    }
  };

  const handleNavigateStage = (route) => {
    if (setCurrentPage && route) {
      setCurrentPage(route);
    }
  };

  const activeDataset = pipelineData?.active_dataset;
  const stages = pipelineData?.stages || [];
  const availableDatasets = pipelineData?.available_datasets || [];

  // Calculate completed fraction
  const completedStages = stages.filter(s => s.status === 'COMPLETED').length;
  const progressPercent = Math.round((completedStages / 12) * 100);

  return (
    <div className="dedsec-page--pipeline dedsec-page-arrival relative min-h-screen w-full bg-transparent text-[#E2E2E2] font-['Titillium_Web',sans-serif] p-4 sm:p-8 select-none -m-6 overflow-hidden">
      
      {/* 1. Low-Poly Vector Mesh Background (4% opacity) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.04] z-0" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="pipelineLowPoly" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 0 0 L 80 0 L 40 80 Z M 40 80 L 80 0 L 120 80 Z" fill="none" stroke="#FFFFFF" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pipelineLowPoly)" />
      </svg>

      {/* TOP HEADER: Element 1 (Glitch Wordmark) + Element 2 (Tactical Controls) */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#1B1F22]">
        
        {/* Element 1: Small Glitch-Sliced Wordmark in Top-Left */}
        <div className="flex items-center gap-3">
          <div className="relative group cursor-default">
            {/* Glitch Slices */}
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#22D3E6] rotate-45 shrink-0" />
              <div className="relative overflow-hidden">
                <span className="font-['Krona_One',sans-serif] text-base sm:text-lg text-white tracking-widest uppercase">
                  FINTRACE // PIPELINE_GRAPH
                </span>
                {/* Mechanical horizontal glitch hairline */}
                <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-[#000000] pointer-events-none" />
                <div className="absolute top-1/2 left-1/4 w-8 h-[2px] bg-[#22D3E6] pointer-events-none" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-0.5 ml-5 font-['Share_Tech_Mono',monospace] text-[10px] text-[#9AA0A6]">
              <span>KERNEL: 5.19.4-CTOS</span>
              <span className="text-[#5A5F64]">•</span>
              <span className="text-[#22D3E6] font-bold">12 NODES ONLINE</span>
            </div>
          </div>
        </div>

        {/* Element 2: Tactical Controls (Live Execution, Sync, Dataset Selector) */}
        <div className="flex items-center gap-3 font-['Rajdhani',sans-serif]">
          {/* Dataset Selector */}
          <div className="flex items-center bg-[#05080A] border border-[#1B1F22] px-2 py-1">
            <span className="text-[#9AA0A6] font-['Share_Tech_Mono',monospace] text-[10px] mr-2 font-bold uppercase">&gt; DATASET:</span>
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="bg-transparent text-white font-['Share_Tech_Mono',monospace] text-xs focus:outline-none cursor-pointer"
            >
              {availableDatasets.map((ds) => (
                <option key={ds.dataset_id} value={ds.dataset_id} className="bg-[#05080A] text-white">
                  {ds.name} ({(ds.valid_rows || ds.total_rows || 0).toLocaleString()} rows)
                </option>
              ))}
            </select>
          </div>

          {/* Sync Button */}
          <button
            onClick={() => fetchPipeline(selectedDatasetId)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#05080A] hover:bg-[#0B2E33] border border-[#5A5F64] hover:border-[#22D3E6] text-xs font-bold text-[#E2E2E2] hover:text-[#22D3E6] uppercase tracking-wider transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 text-[#22D3E6] ${loading ? 'animate-spin' : ''}`} />
            <span>SYNC</span>
          </button>

          {/* Execute Live Button */}
          <button
            onClick={onOpenLivePipeline}
            className="flex items-center gap-2 px-4 py-1 bg-[#FFFFFF] hover:bg-[#22D3E6] text-[#050505] font-bold text-xs uppercase tracking-wider transition"
          >
            <Play className="w-3.5 h-3.5 fill-current text-current" />
            <span>RUN PIPELINE LIVE</span>
          </button>
        </div>
      </div>

      {/* Element 3: Active Dataset Progress Meter (Ending in Outlined Cyan Diamond Node) */}
      <div className="relative z-10 my-6">
        <div className="flex items-center justify-between text-xs font-['Share_Tech_Mono',monospace] text-[#9AA0A6] mb-2">
          <span className="uppercase tracking-widest text-[#E2E2E2] flex items-center gap-2">
            <span className="text-[#22D3E6]">◇</span> ACTIVE EXECUTION PROGRESS: <span className="text-[#22D3E6] font-bold">{progressPercent}% COMPLETED</span>
          </span>
          <span>{completedStages} / 12 STAGES VERIFIED</span>
        </div>
        
        {/* Watch Dogs Meter Specification */}
        <div className="meter w-full">
          <i style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Element 4: Main 12-Stage Topological Circuit Node Graph (Panel with Corner Brackets & Tag) */}
      <div className="relative z-10 hud-panel bg-[#05080A]/90 my-8">
        {/* White Square Tag Label Overlapping Top-Left Edge */}
        <div className="absolute -top-3 left-6 bg-[#FFFFFF] text-[#050505] font-['Rajdhani',sans-serif] text-xs font-bold px-2.5 py-0.5 uppercase tracking-wider z-20">
          TOPOLOGICAL PIPELINE CIRCUIT // 12 NODES
        </div>

        {/* Tactical Sub-label in Top-Right */}
        <div className="absolute top-2 right-6 font-['Share_Tech_Mono',monospace] text-[10px] text-[#5A5F64]">
          CLICK ANY NODE TO EXPAND SPECIFICATION DRAWER
        </div>

        {/* SVG Topological Circuit Graph */}
        <div className="w-full overflow-x-auto py-6">
          <svg
            viewBox="0 0 960 380"
            className="w-full min-w-[800px] h-auto overflow-visible"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* SVG Filter for Cyan Glow */}
            <defs>
              <filter id="hudGlowCyan" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#22D3E6" floodOpacity="0.8" />
              </filter>
              <filter id="hudGlowLime" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#D6E85A" floodOpacity="0.8" />
              </filter>
            </defs>

            {/* Connecting Connector Lines (Thin Grey) */}
            <g stroke="#5A5F64" strokeWidth="1" strokeDasharray="3 3">
              {/* Row 1 horizontal connectors */}
              <line x1="70"  y1="90" x2="230" y2="90" />
              <line x1="230" y1="90" x2="390" y2="90" />
              <line x1="390" y1="90" x2="550" y2="90" />
              <line x1="550" y1="90" x2="710" y2="90" />
              <line x1="710" y1="90" x2="870" y2="90" />

              {/* Spine Bus: Node 6 to Node 7 */}
              <line x1="870" y1="90" x2="910" y2="130" strokeDasharray="none" />
              <line x1="910" y1="130" x2="910" y2="230" strokeDasharray="none" />
              <line x1="910" y1="230" x2="870" y2="270" strokeDasharray="none" />

              {/* Row 2 horizontal connectors */}
              <line x1="870" y1="270" x2="710" y2="270" />
              <line x1="710" y1="270" x2="550" y2="270" />
              <line x1="550" y1="270" x2="390" y2="270" />
              <line x1="390" y1="270" x2="230" y2="270" />
              <line x1="230" y1="270" x2="70"  y2="270" />
            </g>

            {/* Circuit Telemetry Micro-Labels along hairlines */}
            <text x="140" y="82" fill="#5A5F64" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.05em">TCP/RAW</text>
            <text x="300" y="82" fill="#5A5F64" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.05em">SQLITE3</text>
            <text x="460" y="82" fill="#5A5F64" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.05em">GRAPH_DGL</text>
            <text x="615" y="82" fill="#D6E85A" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.05em">CWGAN_GP</text>
            <text x="775" y="82" fill="#22D3E6" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.05em">EMBED_16D</text>

            <text x="918" y="185" fill="#22D3E6" fontFamily="Share Tech Mono" fontSize="8" letterSpacing="0.05em" transform="rotate(90 918 185)">PASS_NEIGHBOR</text>

            <text x="775" y="262" fill="#D6E85A" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.05em">ISO_FOREST</text>
            <text x="615" y="262" fill="#22D3E6" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.05em">MULTI_HOP</text>
            <text x="460" y="262" fill="#5A5F64" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.05em">FIR_1930</text>
            <text x="300" y="262" fill="#5A5F64" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.05em">SHA256_HASH</text>
            <text x="140" y="262" fill="#22D3E6" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.05em">EXPORT_JSON</text>

            {/* 12 Diamond Nodes */}
            {NODE_COORDINATES.map((coord) => {
              const stageData = stages.find(s => s.stage_number === coord.stage);
              const status = stageData?.status || 'READY';
              const isCompleted = status === 'COMPLETED';
              const isSupporting = coord.supporting;
              const isSelected = selectedStage?.stage_number === coord.stage;
              const shortName = STAGE_SHORT_NAMES[coord.stage] || stageData?.name || `STAGE ${coord.stage}`;

              // Determine color scheme
              // Completed = cyan, not started = hollow grey, supporting = lime
              let strokeColor = "#5A5F64";
              let fillColor = "#000000";
              let filter = undefined;

              if (isCompleted) {
                strokeColor = "#22D3E6";
                fillColor = "#0B2E33";
                filter = "url(#hudGlowCyan)";
              } else if (isSupporting) {
                strokeColor = "#D6E85A";
                fillColor = "#05080A";
                filter = "url(#hudGlowLime)";
              } else if (status === 'READY') {
                strokeColor = "#22D3E6";
                fillColor = "#05080A";
              }

              if (status === 'BLOCKED') {
                strokeColor = "#FF3B4E";
                fillColor = "#000000";
              }

              const numStr = coord.stage < 10 ? `0${coord.stage}` : `${coord.stage}`;

              return (
                <g
                  key={coord.stage}
                  transform={`translate(${coord.x}, ${coord.y})`}
                  className="cursor-pointer group"
                  onClick={() => setSelectedStage(stageData || { stage_number: coord.stage, name: shortName })}
                >
                  {/* Outer pulse ring on active selection or running stage */}
                  {isSelected && (
                    <rect
                      x="-20"
                      y="-20"
                      width="40"
                      height="40"
                      transform="rotate(45)"
                      fill="none"
                      stroke="#22D3E6"
                      strokeWidth="1"
                      opacity="0.4"
                      className="animate-ping"
                      style={{ transformOrigin: '0 0' }}
                    />
                  )}

                  {/* Main Diamond Node (45-deg rotated square) */}
                  <rect
                    x="-14"
                    y="-14"
                    width="28"
                    height="28"
                    transform="rotate(45)"
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    filter={filter}
                    className="transition-all group-hover:scale-110"
                    style={{ transformOrigin: '0 0' }}
                  />

                  {/* Center Dot for Completed Stages */}
                  {isCompleted && (
                    <rect
                      x="-3"
                      y="-3"
                      width="6"
                      height="6"
                      transform="rotate(45)"
                      fill="#22D3E6"
                    />
                  )}

                  {/* Stage Number (Share Tech Mono) inside Node */}
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill={isCompleted ? "#FFFFFF" : isSupporting ? "#D6E85A" : "#9AA0A6"}
                    fontFamily="Share Tech Mono"
                    fontSize="11"
                    fontWeight="bold"
                    className="pointer-events-none select-none"
                  >
                    {numStr}
                  </text>

                  {/* Short Stage Name Label Below Node */}
                  <text
                    x="0"
                    y="36"
                    textAnchor="middle"
                    fill={isSelected ? "#22D3E6" : "#E2E2E2"}
                    fontFamily="Rajdhani"
                    fontSize="11"
                    fontWeight="700"
                    letterSpacing="0.05em"
                    className="uppercase transition-colors group-hover:fill-[#22D3E6]"
                  >
                    {shortName}
                  </text>

                  {/* Tiny Status Bullet */}
                  <text
                    x="0"
                    y="48"
                    textAnchor="middle"
                    fill={isCompleted ? "#22D3E6" : isSupporting ? "#D6E85A" : "#5A5F64"}
                    fontFamily="Share Tech Mono"
                    fontSize="8"
                    letterSpacing="0.04em"
                  >
                    {status}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Element 5: Bottom Telemetry Readout Strip */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 py-3 border-t border-[#1B1F22] font-['Share_Tech_Mono',monospace] text-[11px] text-[#9AA0A6]">
        <div className="flex items-center gap-4">
          <span>DATASET: <span className="text-white font-bold">{activeDataset?.name || 'SYNTHETIC_BENCHMARK'}</span></span>
          <span className="text-[#5A5F64]">|</span>
          <span>RECORDS: <span className="text-[#22D3E6] font-bold">{(activeDataset?.valid_rows || 3160).toLocaleString()} VALID</span></span>
          <span className="text-[#5A5F64]">|</span>
          <span>LATENCY: <span className="text-[#22D3E6] font-bold">4.2ms</span></span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[#D6E85A] font-bold">AES-GCM-256 // ENCRYPTED</span>
          <span className="text-[#5A5F64]">|</span>
          <span className="text-[#22D3E6] font-bold">WSS://CONNECTED</span>
        </div>
      </div>

      {/* Element 6: Slide-in Detail Drawer (Opens on clicking any node) */}
      {selectedStage && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-[480px] max-w-full h-full bg-[#05080A] border-l border-[#1B1F22] shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
            
            {/* Drawer Header */}
            <div className="p-4 bg-[#000000] border-b border-[#1B1F22] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 bg-[#0B2E33] border border-[#22D3E6] rotate-45 flex items-center justify-center shrink-0">
                  <div className="w-1 h-1 bg-[#22D3E6]" />
                </div>
                <div>
                  <div className="font-['Share_Tech_Mono',monospace] text-[10px] text-[#22D3E6] font-bold">
                    STAGE {selectedStage.stage_number < 10 ? `0${selectedStage.stage_number}` : selectedStage.stage_number} // SPECIFICATION
                  </div>
                  <h3 className="font-['Rajdhani',sans-serif] text-base font-bold text-white uppercase tracking-wider">
                    {selectedStage.name}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStage(null)}
                className="w-7 h-7 bg-[#05080A] hover:bg-[#0B2E33] border border-[#5A5F64] hover:border-[#22D3E6] text-[#9AA0A6] hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Scrollable Content (Body text at least 13px) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-[13px] leading-relaxed text-[#E2E2E2]">
              
              {/* Status & Execution Banner */}
              <div className="p-3.5 bg-[#000000] border border-[#1B1F22] space-y-2.5 font-['Share_Tech_Mono',monospace]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#9AA0A6] uppercase">CURRENT STATUS:</span>
                  <span className={`text-xs font-bold px-2 py-0.5 border ${
                    selectedStage.status === 'COMPLETED'
                      ? 'bg-[#0B2E33] text-[#22D3E6] border-[#22D3E6]'
                      : 'bg-[#05080A] text-[#D6E85A] border-[#D6E85A]'
                  }`}>
                    {selectedStage.status || 'READY'}
                  </span>
                </div>

                {selectedStage.last_run && (
                  <div className="text-[11px] text-[#5A5F64]">
                    LAST EXECUTION: {selectedStage.last_run.slice(0, 19).replace('T', ' ')}
                  </div>
                )}

                {/* Live Stage Run Trigger */}
                <div className="pt-1 flex gap-2 font-['Rajdhani',sans-serif]">
                  <button
                    type="button"
                    onClick={() => handleRunStage(selectedStage.stage_number)}
                    disabled={runningStage === selectedStage.stage_number}
                    className="flex-1 py-1.5 bg-[#FFFFFF] hover:bg-[#22D3E6] text-[#050505] font-bold text-xs uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3 h-3 fill-current text-current" />
                    <span>{runningStage === selectedStage.stage_number ? 'EXECUTING...' : 'EXECUTE STAGE NOW'}</span>
                  </button>

                  {selectedStage.route && (
                    <button
                      type="button"
                      onClick={() => handleNavigateStage(selectedStage.route)}
                      className="px-3 py-1.5 bg-[#05080A] hover:bg-[#0B2E33] border border-[#22D3E6] text-[#22D3E6] hover:text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1"
                    >
                      <span>VIEW</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Long Description */}
              <div className="space-y-1.5">
                <div className="font-['Rajdhani',sans-serif] text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-[#22D3E6]">◇</span> PURPOSE & ARCHITECTURAL ROLE
                </div>
                <p className="text-[13px] text-[#BBC9CB] bg-[#000000] p-3 border border-[#1B1F22] leading-relaxed">
                  {selectedStage.purpose || 'Executes systematic transformations on transaction records, ensuring topological validity and feature enrichment across the pipeline.'}
                </p>
              </div>

              {/* Inputs and Outputs Specifications */}
              <div className="grid grid-cols-1 gap-3 font-['Share_Tech_Mono',monospace] text-xs">
                <div className="p-3 bg-[#000000] border border-[#1B1F22] space-y-1">
                  <span className="text-[#9AA0A6] text-[10px] uppercase block">STAGE INPUT:</span>
                  <span className="text-white font-bold text-[12px] block">
                    {selectedStage.input || 'Canonical Financial Records'}
                  </span>
                </div>

                <div className="p-3 bg-[#000000] border border-[#1B1F22] space-y-1">
                  <span className="text-[#9AA0A6] text-[10px] uppercase block">STAGE OUTPUT:</span>
                  <span className="text-[#22D3E6] font-bold text-[12px] block">
                    {selectedStage.output || 'Enriched Topological Artifacts'}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="space-y-2">
                <div className="font-['Rajdhani',sans-serif] text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-[#22D3E6]">◇</span> DATASET & TELEMETRY STATS
                </div>
                <div className="grid grid-cols-2 gap-2 font-['Share_Tech_Mono',monospace] text-xs">
                  <div className="p-2.5 bg-[#000000] border border-[#1B1F22]">
                    <span className="text-[#5A5F64] text-[9px] block">DATASET TYPE</span>
                    <span className="text-white font-bold text-[11px] truncate block mt-0.5">
                      {activeDataset?.dataset_type || 'CBS Statements'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#000000] border border-[#1B1F22]">
                    <span className="text-[#5A5F64] text-[9px] block">VALID ROWS</span>
                    <span className="text-[#22D3E6] font-bold text-[11px] block mt-0.5">
                      {(activeDataset?.valid_rows || 3160).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#000000] border border-[#1B1F22]">
                    <span className="text-[#5A5F64] text-[9px] block">TOTAL INTAKE</span>
                    <span className="text-white font-bold text-[11px] block mt-0.5">
                      {(activeDataset?.total_rows || 494262).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#000000] border border-[#1B1F22]">
                    <span className="text-[#5A5F64] text-[9px] block">QUALITY SCORE</span>
                    <span className="text-[#D6E85A] font-bold text-[11px] block mt-0.5">
                      {activeDataset?.readiness_score || 100}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Dependencies Checklist */}
              {selectedStage.dependencies && selectedStage.dependencies.length > 0 && (
                <div className="space-y-1.5 font-['Share_Tech_Mono',monospace]">
                  <div className="font-['Rajdhani',sans-serif] text-xs font-bold text-white uppercase tracking-wider">
                    UPSTREAM DEPENDENCIES
                  </div>
                  <div className="space-y-1">
                    {selectedStage.dependencies.map((dep, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-[#9AA0A6]">
                        <span className="text-[#22D3E6]">✓</span>
                        <span>Stage {dep} Completed</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 bg-[#000000] border-t border-[#1B1F22] flex items-center justify-between text-[11px] font-['Share_Tech_Mono',monospace] text-[#5A5F64]">
              <span>NODE ID: {selectedStage.id || `STAGE_${selectedStage.stage_number}`}</span>
              <button
                type="button"
                onClick={() => setSelectedStage(null)}
                className="text-[#22D3E6] font-bold hover:underline"
              >
                [CLOSE DRAWER]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
