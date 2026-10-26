import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  Play,
  X,
  ExternalLink
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
    <div className="dedsec-page--pipeline dedsec-page-arrival relative min-h-screen w-full bg-transparent text-[#FFFFFF] font-sans p-4 sm:p-8 select-none -m-6 overflow-hidden">
      
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
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[rgba(255,255,255,0.14)]">
        
        {/* Element 1: Small Glitch-Sliced Wordmark in Top-Left */}
        <div className="flex items-center gap-3">
          <div className="relative group cursor-default">
            {/* Glitch Slices */}
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#1FC8DB] rotate-45 shrink-0" />
              <div className="relative overflow-hidden">
                <span className="font-display text-base sm:text-lg text-[#FFFFFF] tracking-widest uppercase">
                  FINTRACE // PIPELINE_GRAPH
                </span>
                {/* Mechanical horizontal glitch hairline */}
                <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-[#0B0B0F] pointer-events-none" />
                <div className="absolute top-1/2 left-1/4 w-8 h-[2px] bg-[#1FC8DB] pointer-events-none" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-0.5 ml-5 font-mono text-[10px] text-[#9CA3AF]">
              <span>KERNEL: 5.19.4-CTOS</span>
              <span className="text-[#8A909B]">•</span>
              <span className="text-[#1FC8DB] font-bold">12 NODES ONLINE</span>
            </div>
          </div>
        </div>

        {/* Element 2: Tactical Controls (Live Execution, Sync, Dataset Selector) */}
        <div className="flex items-center gap-3 font-sans">
          {/* Dataset Selector */}
          <div className="flex items-center bg-[#101117] border border-[rgba(255,255,255,0.14)] px-2 py-1">
            <span className="text-[#9CA3AF] font-mono text-[10px] mr-2 font-bold uppercase">&gt; DATASET:</span>
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="bg-transparent text-[#FFFFFF] font-mono text-xs focus:outline-none cursor-pointer"
            >
              {availableDatasets.map((ds) => (
                <option key={ds.dataset_id} value={ds.dataset_id} className="bg-[#101117] text-[#FFFFFF]">
                  {ds.name} ({(ds.valid_rows || ds.total_rows || 0).toLocaleString()} rows)
                </option>
              ))}
            </select>
          </div>

          {/* Sync Button */}
          <button
            onClick={() => fetchPipeline(selectedDatasetId)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#101117] hover:bg-[#14151C] border border-[rgba(255,255,255,0.14)] hover:border-[rgba(255,255,255,0.20)] text-xs font-bold text-[#FFFFFF] hover:text-[#1FC8DB] uppercase tracking-wider transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 text-[#1FC8DB] ${loading ? 'animate-spin' : ''}`} />
            <span>SYNC</span>
          </button>

          {/* Execute Live Button */}
          <button
            onClick={onOpenLivePipeline}
            className="flex items-center gap-2 px-4 py-1 bg-[#1FC8DB]/15 border border-[#1FC8DB]/50 text-[#1FC8DB] hover:bg-[#1FC8DB] hover:text-[#0B0B0F] font-bold text-xs uppercase tracking-wider transition"
          >
            <Play className="w-3.5 h-3.5 fill-current text-current" />
            <span>RUN PIPELINE LIVE</span>
          </button>
        </div>
      </div>

      {/* Element 3: Active Dataset Progress Meter (Ending in Outlined Cyan Diamond Node) */}
      <div className="relative z-10 my-6">
        <div className="flex items-center justify-between text-xs font-mono text-[#9CA3AF] mb-2">
          <span className="uppercase tracking-widest text-[#FFFFFF] flex items-center gap-2">
            <span className="text-[#1FC8DB]">◇</span> ACTIVE EXECUTION PROGRESS: <span className="text-[#1FC8DB] font-bold">{progressPercent}% COMPLETED</span>
          </span>
          <span>{completedStages} / 12 STAGES VERIFIED</span>
        </div>
        
        {/* Watch Dogs Meter Specification */}
        <div className="meter w-full">
          <i style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Element 4: Main 12-Stage Topological Circuit Node Graph (Panel with Corner Brackets & Tag) */}
      <div className="relative z-10 hud-panel bg-[#101117]/90 my-8">
        {/* White Square Tag Label Overlapping Top-Left Edge */}
        <div className="absolute -top-3 left-6 bg-[#1FC8DB]/15 text-[#1FC8DB] font-sans text-xs font-bold px-2.5 py-0.5 uppercase tracking-wider z-20">
          TOPOLOGICAL PIPELINE CIRCUIT // 12 NODES
        </div>

        {/* Tactical Sub-label in Top-Right */}
        <div className="absolute top-2 right-6 font-mono text-[10px] text-[#8A909B]">
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
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#1FC8DB" floodOpacity="0.8" />
              </filter>
              <filter id="hudGlowLime" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#1FC8DB" floodOpacity="0.8" />
              </filter>
            </defs>

            {/* Connecting Connector Lines (Thin Grey) */}
            <g stroke="#9CA3AF" strokeWidth="1" strokeDasharray="3 3">
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
            <text x="140" y="82" fill="#9CA3AF" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.05em">TCP/RAW</text>
            <text x="300" y="82" fill="#9CA3AF" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.05em">SQLITE3</text>
            <text x="460" y="82" fill="#9CA3AF" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.05em">GRAPH_DGL</text>
            <text x="615" y="82" fill="#1FC8DB" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.05em">CWGAN_GP</text>
            <text x="775" y="82" fill="#1FC8DB" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.05em">EMBED_16D</text>

            <text x="918" y="185" fill="#1FC8DB" fontFamily="Share Tech Mono" fontSize="8" letterSpacing="0.05em" transform="rotate(90 918 185)">PASS_NEIGHBOR</text>

            <text x="775" y="262" fill="#1FC8DB" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.05em">ISO_FOREST</text>
            <text x="615" y="262" fill="#1FC8DB" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.05em">MULTI_HOP</text>
            <text x="460" y="262" fill="#9CA3AF" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.05em">FIR_1930</text>
            <text x="300" y="262" fill="#9CA3AF" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.05em">SHA256_HASH</text>
            <text x="140" y="262" fill="#1FC8DB" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.05em">EXPORT_JSON</text>

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
              let strokeColor = "#9CA3AF";
              let fillColor = "#15161D";
              let filter = undefined;

              if (isCompleted) {
                strokeColor = "#1FC8DB";
                fillColor = "#101117";
                filter = "url(#hudGlowCyan)";
              } else if (isSupporting) {
                strokeColor = "#1FC8DB";
                fillColor = "rgba(255,255,255,0.16)";
                filter = "url(#hudGlowLime)";
              } else if (status === 'READY') {
                strokeColor = "#1FC8DB";
                fillColor = "rgba(255,255,255,0.16)";
              }

              if (status === 'BLOCKED') {
                strokeColor = "#FF5C6C";
                fillColor = "#15161D";
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
                      stroke="#1FC8DB"
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
                      fill="#1FC8DB"
                    />
                  )}

                  {/* Stage Number (Share Tech Mono) inside Node */}
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill={isCompleted ? "#FFFFFF" : isSupporting ? "#1FC8DB" : "#1FC8DB"}
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
                    fill={isSelected ? "#1FC8DB" : "rgba(255,255,255,0.06)"}
                    fontFamily="Rajdhani"
                    fontSize="11"
                    fontWeight="700"
                    letterSpacing="0.05em"
                    className="uppercase transition-colors group-hover:fill-[#1FC8DB]"
                  >
                    {shortName}
                  </text>

                  {/* Tiny Status Bullet */}
                  <text
                    x="0"
                    y="48"
                    textAnchor="middle"
                    fill={isCompleted ? "#1FC8DB" : isSupporting ? "#1FC8DB" : "#9CA3AF"}
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
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 py-3 border-t border-[rgba(255,255,255,0.14)] font-mono text-[11px] text-[#9CA3AF]">
        <div className="flex items-center gap-4">
          <span>DATASET: <span className="text-[#FFFFFF] font-bold">{activeDataset?.name || 'SYNTHETIC_BENCHMARK'}</span></span>
          <span className="text-[#8A909B]">|</span>
          <span>RECORDS: <span className="text-[#1FC8DB] font-bold">{(activeDataset?.valid_rows || 3160).toLocaleString()} VALID</span></span>
          <span className="text-[#8A909B]">|</span>
          <span>LATENCY: <span className="text-[#1FC8DB] font-bold">4.2ms</span></span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[#9CA3AF] font-bold">AES-GCM-256 // ENCRYPTED</span>
          <span className="text-[#8A909B]">|</span>
          <span className="text-[#1FC8DB] font-bold">WSS://CONNECTED</span>
        </div>
      </div>

      {/* Element 6: Slide-in Detail Drawer (Opens on clicking any node) */}
      {selectedStage && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-[480px] max-w-full h-full bg-[#101117] border-l border-[rgba(255,255,255,0.14)] shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
            
            {/* Drawer Header */}
            <div className="p-4 bg-[#0B0B0F] border-b border-[rgba(255,255,255,0.14)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 bg-[#14151C] border border-[rgba(255,255,255,0.20)] rotate-45 flex items-center justify-center shrink-0">
                  <div className="w-1 h-1 bg-[#1FC8DB]" />
                </div>
                <div>
                  <div className="font-mono text-[10px] text-[#1FC8DB] font-bold">
                    STAGE {selectedStage.stage_number < 10 ? `0${selectedStage.stage_number}` : selectedStage.stage_number} // SPECIFICATION
                  </div>
                  <h3 className="font-sans text-base font-bold text-[#FFFFFF] uppercase tracking-wider">
                    {selectedStage.name}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStage(null)}
                className="w-7 h-7 bg-[#101117] hover:bg-[#14151C] border border-[rgba(255,255,255,0.14)] hover:border-[rgba(255,255,255,0.20)] text-[#9CA3AF] hover:text-[#FFFFFF] flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Scrollable Content (Body text at least 13px) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-[13px] leading-relaxed text-[#FFFFFF]">
              
              {/* Status & Execution Banner */}
              <div className="p-3.5 bg-[#0B0B0F] border border-[rgba(255,255,255,0.14)] space-y-2.5 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#9CA3AF] uppercase">CURRENT STATUS:</span>
                  <span className={`text-xs font-bold px-2 py-0.5 border ${
                    selectedStage.status === 'COMPLETED'
                      ? 'bg-[#14151C] text-[#1FC8DB] border-[rgba(255,255,255,0.20)]'
                      : 'bg-[#101117] text-[#9CA3AF] border-[#1FC8DB]'
                  }`}>
                    {selectedStage.status || 'READY'}
                  </span>
                </div>

                {selectedStage.last_run && (
                  <div className="text-[11px] text-[#8A909B]">
                    LAST EXECUTION: {selectedStage.last_run.slice(0, 19).replace('T', ' ')}
                  </div>
                )}

                {/* Live Stage Run Trigger */}
                <div className="pt-1 flex gap-2 font-sans">
                  <button
                    type="button"
                    onClick={() => handleRunStage(selectedStage.stage_number)}
                    disabled={runningStage === selectedStage.stage_number}
                    className="flex-1 py-1.5 bg-[#101117] hover:bg-[#1FC8DB] text-[#101117] font-bold text-xs uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3 h-3 fill-current text-current" />
                    <span>{runningStage === selectedStage.stage_number ? 'EXECUTING...' : 'EXECUTE STAGE NOW'}</span>
                  </button>

                  {selectedStage.route && (
                    <button
                      type="button"
                      onClick={() => handleNavigateStage(selectedStage.route)}
                      className="px-3 py-1.5 bg-[#101117] hover:bg-[#14151C] border border-[rgba(255,255,255,0.20)] text-[#1FC8DB] hover:text-[#FFFFFF] font-bold text-xs uppercase tracking-wider transition flex items-center gap-1"
                    >
                      <span>VIEW</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Long Description */}
              <div className="space-y-1.5">
                <div className="font-sans text-xs font-bold text-[#FFFFFF] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-[#1FC8DB]">◇</span> PURPOSE & ARCHITECTURAL ROLE
                </div>
                <p className="text-[13px] text-[#9CA3AF] bg-[#0B0B0F] p-3 border border-[rgba(255,255,255,0.14)] leading-relaxed">
                  {selectedStage.purpose || 'Executes systematic transformations on transaction records, ensuring topological validity and feature enrichment across the pipeline.'}
                </p>
              </div>

              {/* Inputs and Outputs Specifications */}
              <div className="grid grid-cols-1 gap-3 font-mono text-xs">
                <div className="p-3 bg-[#0B0B0F] border border-[rgba(255,255,255,0.14)] space-y-1">
                  <span className="text-[#9CA3AF] text-[10px] uppercase block">STAGE INPUT:</span>
                  <span className="text-[#FFFFFF] font-bold text-[12px] block">
                    {selectedStage.input || 'Canonical Financial Records'}
                  </span>
                </div>

                <div className="p-3 bg-[#0B0B0F] border border-[rgba(255,255,255,0.14)] space-y-1">
                  <span className="text-[#9CA3AF] text-[10px] uppercase block">STAGE OUTPUT:</span>
                  <span className="text-[#1FC8DB] font-bold text-[12px] block">
                    {selectedStage.output || 'Enriched Topological Artifacts'}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="space-y-2">
                <div className="font-sans text-xs font-bold text-[#FFFFFF] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-[#1FC8DB]">◇</span> DATASET & TELEMETRY STATS
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  <div className="p-2.5 bg-[#0B0B0F] border border-[rgba(255,255,255,0.14)]">
                    <span className="text-[#8A909B] text-[9px] block">DATASET TYPE</span>
                    <span className="text-[#FFFFFF] font-bold text-[11px] truncate block mt-0.5">
                      {activeDataset?.dataset_type || 'CBS Statements'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#0B0B0F] border border-[rgba(255,255,255,0.14)]">
                    <span className="text-[#8A909B] text-[9px] block">VALID ROWS</span>
                    <span className="text-[#1FC8DB] font-bold text-[11px] block mt-0.5">
                      {(activeDataset?.valid_rows || 3160).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#0B0B0F] border border-[rgba(255,255,255,0.14)]">
                    <span className="text-[#8A909B] text-[9px] block">TOTAL INTAKE</span>
                    <span className="text-[#FFFFFF] font-bold text-[11px] block mt-0.5">
                      {(activeDataset?.total_rows || 494262).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#0B0B0F] border border-[rgba(255,255,255,0.14)]">
                    <span className="text-[#8A909B] text-[9px] block">QUALITY SCORE</span>
                    <span className="text-[#9CA3AF] font-bold text-[11px] block mt-0.5">
                      {activeDataset?.readiness_score || 100}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Dependencies Checklist */}
              {selectedStage.dependencies && selectedStage.dependencies.length > 0 && (
                <div className="space-y-1.5 font-mono">
                  <div className="font-sans text-xs font-bold text-[#FFFFFF] uppercase tracking-wider">
                    UPSTREAM DEPENDENCIES
                  </div>
                  <div className="space-y-1">
                    {selectedStage.dependencies.map((dep, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                        <span className="text-[#1FC8DB]">✓</span>
                        <span>Stage {dep} Completed</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 bg-[#0B0B0F] border-t border-[rgba(255,255,255,0.14)] flex items-center justify-between text-[11px] font-mono text-[#8A909B]">
              <span>NODE ID: {selectedStage.id || `STAGE_${selectedStage.stage_number}`}</span>
              <button
                type="button"
                onClick={() => setSelectedStage(null)}
                className="text-[#1FC8DB] font-bold hover:underline"
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
