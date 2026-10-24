import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function DashboardPage({
  setCurrentPage,
  onAccountSelect,
  onOpenCreateCase,
  refreshTrigger,
  onOpenLivePipeline
}) {
  const [overview, setOverview] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [activeRange, setActiveRange] = useState('24H');
  const [groupBySubnet, setGroupBySubnet] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeTooltip, setActiveTooltip] = useState({ visible: true, x: 890, score: 94, time: '12:14 UTC', entity: '10.0.4.7 (CRITICAL)' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ovData, logs] = await Promise.all([
          api.getOverview().catch(() => null),
          api.getAuditLogs(10).catch(() => [])
        ]);
        if (ovData) setOverview(ovData);
        if (logs) setAuditLogs(logs);
      } catch (e) {
        console.error('Error fetching dashboard backend data:', e);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  // Derived or fallback data matching Stitch
  const totalAnomalies = overview?.metrics?.total_mules ?? overview?.high_risk_count ?? 14;
  const criticalOpen = overview?.metrics?.active_investigations ?? 2;

  const feedItems = [
    {
      id: 1,
      severity: 'CRITICAL',
      severityColor: '#FF3B4E',
      type: 'Data exfiltration',
      time: '12:14:07',
      details: '10.0.4.7 → 185.22.x.x · 4.2 GB out · score 94',
      active: true,
      account: 'ACC-0004'
    },
    {
      id: 2,
      severity: 'CRITICAL',
      severityColor: '#FF3B4E',
      type: 'Unusual lateral movement',
      time: '12:08:42',
      details: '10.0.3.12 → 10.0.4.7 · SMB admin probe · score 91',
      active: false,
      account: 'ACC-0012'
    },
    {
      id: 3,
      severity: 'SUSPICIOUS',
      severityColor: '#D6E85A',
      type: 'Brute-force SSH attempt',
      time: '12:02:19',
      details: '192.168.1.105 · 45 failed auth / min · score 78',
      active: false,
      account: 'ACC-0105'
    },
    {
      id: 4,
      severity: 'SUSPICIOUS',
      severityColor: '#D6E85A',
      type: 'Beaconing pattern detected',
      time: '11:55:04',
      details: '10.0.8.14 → 45.33.32.x · 60s jitter · score 72',
      active: false,
      account: 'ACC-0014'
    },
    {
      id: 5,
      severity: 'NORMAL',
      severityColor: '#bbc9cb',
      type: 'Certificate rotation complete',
      time: '11:42:00',
      details: "edge-proxy-01 · Let's Encrypt renewal · score 08",
      active: false,
      account: 'ACC-0001'
    }
  ];

  return (
    <div className="bg-[#050505] text-[#e2e2e2] min-h-screen p-4 sm:p-6 font-['Titillium_Web',sans-serif] select-none -m-6">
      {/* Top Telemetry / Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-[#1B1F22]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-[#22D3E6] rotate-45 shrink-0" />
          <span className="font-['Krona_One',sans-serif] text-base sm:text-lg text-white tracking-widest uppercase">
            SENTINEL_AI // CYBERPUNK HUD
          </span>
          <span className="bg-[#FFFFFF] text-[#050505] font-['Rajdhani',sans-serif] text-[12px] font-bold px-2 py-0.5 tracking-wider uppercase ml-2">
            OVERVIEW
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-['Share_Tech_Mono',monospace]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#22D3E6] animate-pulse" />
            <span className="text-[#22D3E6] tracking-wider uppercase font-bold">MONITORING</span>
          </div>
          <span className="text-[#5A5F64]">|</span>
          <span className="text-[#9AA0A6] tracking-widest">UTC 12:15:21</span>
          <span className="text-[#5A5F64]">|</span>
          <button
            onClick={() => onOpenLivePipeline && onOpenLivePipeline()}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0B2E33] border border-[#22D3E6] text-[#22D3E6] hover:bg-[#22D3E6] hover:text-[#050505] transition-all font-['Rajdhani',sans-serif] text-xs font-bold uppercase tracking-wider"
          >
            <span className="w-1.5 h-1.5 bg-current rotate-45" />
            RUN PIPELINE
          </button>
        </div>
      </div>

      <div className="flex flex-col w-full gap-6">
        {/* ROW 1: 4 KPI WIDGETS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* KPI 1 */}
          <div className="relative bg-[#05080A] h-24 p-3 flex flex-col justify-between border border-[#1B1F22]">
            <div className="w-1.5 h-1.5 bg-[#5A5F64] rotate-45 absolute top-2 right-2" />
            <div className="flex items-center gap-1.5">
              <span className="font-['Rajdhani',sans-serif] text-[12px] font-bold uppercase tracking-widest text-[#bbc9cb] flex items-center gap-1">
                <span className="text-[#22D3E6]">◇</span> ANOMALIES TODAY
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-['Share_Tech_Mono',monospace] text-[32px] leading-none text-white tracking-tight tabular-nums">
                {totalAnomalies}
              </span>
              <span className="font-['Share_Tech_Mono',monospace] text-[9px] text-[#6ceeff] uppercase tracking-widest">
                STATUS: ELEVATED
              </span>
            </div>
            <div>
              <div className="relative w-full h-1 bg-[#2A2D30] overflow-visible">
                <div
                  className="h-full bg-gradient-to-r from-[#007680] to-[#22D3E6]"
                  style={{ width: '65%' }}
                />
                <div
                  className="absolute -top-[5px] w-3 h-3 bg-[#050505] rotate-45 border-[1.5px] border-[#22D3E6]"
                  style={{ left: 'calc(65% - 6px)' }}
                />
              </div>
              <div className="flex justify-between items-center mt-1.5 font-['Share_Tech_Mono',monospace] text-[11px] text-[#9AA0A6]">
                <span>+3 vs yesterday · 98.2% analyzed</span>
              </div>
            </div>
          </div>

          {/* KPI 2 */}
          <div className="relative bg-[#05080A] h-24 p-3 flex flex-col justify-between border border-[#1B1F22]">
            <div className="w-1.5 h-1.5 bg-[#FF3B4E] rotate-45 absolute top-2 right-2 animate-ping" />
            <div className="w-1.5 h-1.5 bg-[#FF3B4E] rotate-45 absolute top-2 right-2" />
            <div className="flex items-center gap-1.5">
              <span className="font-['Rajdhani',sans-serif] text-[12px] font-bold uppercase tracking-widest text-[#FF3B4E] flex items-center gap-1">
                <span>◇</span> CRITICAL OPEN
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-['Share_Tech_Mono',monospace] text-[32px] leading-none text-[#FF3B4E] tracking-tight tabular-nums font-bold">
                {criticalOpen}
              </span>
              <span className="font-['Share_Tech_Mono',monospace] text-[9px] text-[#FF3B4E] uppercase tracking-widest animate-pulse">
                BREACH THREAT
              </span>
            </div>
            <div>
              <div className="relative w-full h-1 bg-[#2A2D30] overflow-visible">
                <div
                  className="h-full bg-[#FF3B4E]"
                  style={{ width: '82%' }}
                />
                <div
                  className="absolute -top-[5px] w-3 h-3 bg-[#050505] rotate-45 border-[1.5px] border-[#FF3B4E]"
                  style={{ left: 'calc(82% - 6px)' }}
                />
              </div>
              <div className="flex justify-between items-center mt-1.5 font-['Share_Tech_Mono',monospace] text-[11px] text-[#FF3B4E]">
                <span>SLA breach in 18m · 2 nodes isolated</span>
              </div>
            </div>
          </div>

          {/* KPI 3 */}
          <div className="relative bg-[#05080A] h-24 p-3 flex flex-col justify-between border border-[#1B1F22]">
            <div className="w-1.5 h-1.5 bg-[#5A5F64] rotate-45 absolute top-2 right-2" />
            <div className="flex items-center gap-1.5">
              <span className="font-['Rajdhani',sans-serif] text-[12px] font-bold uppercase tracking-widest text-[#bbc9cb] flex items-center gap-1">
                <span className="text-[#22D3E6]">◇</span> MEAN DETECT TIME
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-['Share_Tech_Mono',monospace] text-[32px] leading-none text-white tracking-tight tabular-nums">
                3m 20s
              </span>
              <span className="font-['Share_Tech_Mono',monospace] text-[9px] text-[#D6E85A] uppercase tracking-widest">
                STABLE
              </span>
            </div>
            <div>
              <div className="relative w-full h-1 bg-[#2A2D30] overflow-visible">
                <div
                  className="h-full bg-gradient-to-r from-[#007680] to-[#22D3E6]"
                  style={{ width: '44%' }}
                />
                <div
                  className="absolute -top-[5px] w-3 h-3 bg-[#050505] rotate-45 border-[1.5px] border-[#22D3E6]"
                  style={{ left: 'calc(44% - 6px)' }}
                />
              </div>
              <div className="flex justify-between items-center mt-1.5 font-['Share_Tech_Mono',monospace] text-[11px] text-[#9AA0A6]">
                <span>-42s vs 7-day average · optimal</span>
              </div>
            </div>
          </div>

          {/* KPI 4 */}
          <div className="relative bg-[#05080A] h-24 p-3 flex flex-col justify-between border border-[#1B1F22]">
            <div className="w-1.5 h-1.5 bg-[#5A5F64] rotate-45 absolute top-2 right-2" />
            <div className="flex items-center gap-1.5">
              <span className="font-['Rajdhani',sans-serif] text-[12px] font-bold uppercase tracking-widest text-[#bbc9cb] flex items-center gap-1">
                <span className="text-[#22D3E6]">◇</span> EVENTS / SEC
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-['Share_Tech_Mono',monospace] text-[32px] leading-none text-white tracking-tight tabular-nums">
                1,240
              </span>
              <span className="font-['Share_Tech_Mono',monospace] text-[9px] text-[#22D3E6] uppercase tracking-widest">
                SYNCED
              </span>
            </div>
            <div>
              <div className="relative w-full h-1 bg-[#2A2D30] overflow-visible">
                <div
                  className="h-full bg-gradient-to-r from-[#007680] to-[#22D3E6]"
                  style={{ width: '78%' }}
                />
                <div
                  className="absolute -top-[5px] w-3 h-3 bg-[#050505] rotate-45 border-[1.5px] border-[#22D3E6]"
                  style={{ left: 'calc(78% - 6px)' }}
                />
              </div>
              <div className="flex justify-between items-center mt-1.5 font-['Share_Tech_Mono',monospace] text-[11px] text-[#9AA0A6]">
                <span>Ingress 14.8 MB/s · 0 drop</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: HERO TOPOLOGY MAP (8 COLS) + LIVE ANOMALIES FEED (4 COLS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Hero Network Topology Map (8 cols) */}
          <div className="lg:col-span-8 h-[440px] bg-[#05080A] relative flex flex-col overflow-hidden border border-[#1B1F22]">
            {/* Panel Header Bar */}
            <div className="h-10 px-3 bg-[#050505]/70 flex items-center justify-between z-20 shrink-0 border-b border-[#1B1F22]">
              <div className="flex items-center gap-2">
                <span className="bg-[#FFFFFF] text-[#050505] font-['Rajdhani',sans-serif] text-[12px] font-bold px-2 py-0.5 tracking-wider uppercase">
                  NETWORK TOPOLOGY · LIVE GRAPH
                </span>
                <span className="font-['Share_Tech_Mono',monospace] text-[9px] text-[#9AA0A6] hidden sm:inline">
                  VIEWPORT: SUB-NET_04 // SECTOR_D
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 1.8))}
                  className="bg-[#050505] hover:bg-[#0B2E33] text-white hover:text-[#22D3E6] font-['Rajdhani',sans-serif] text-[14px] font-bold px-2 py-0.5 uppercase tracking-wider transition-all border border-[#5A5F64]"
                >
                  ZOOM +
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.6))}
                  className="bg-[#050505] hover:bg-[#0B2E33] text-white hover:text-[#22D3E6] font-['Rajdhani',sans-serif] text-[14px] font-bold px-2 py-0.5 uppercase tracking-wider transition-all border border-[#5A5F64]"
                >
                  ZOOM -
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="bg-[#050505] hover:bg-[#0B2E33] text-white hover:text-[#22D3E6] font-['Rajdhani',sans-serif] text-[14px] font-bold px-2 py-0.5 uppercase tracking-wider transition-all border border-[#5A5F64]"
                >
                  RESET
                </button>
              </div>
            </div>

            {/* Canvas / Graph Canvas */}
            <div className="relative flex-1 w-full h-full overflow-hidden">
              {/* Subtle Triangulated Mesh Background (4% opacity) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="meshPattern" patternUnits="userSpaceOnUse" width="60" height="60">
                    <path d="M 0 0 L 60 0 L 30 60 Z M 30 60 L 60 0 L 90 60 Z" fill="none" stroke="#FFFFFF" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#meshPattern)" />
              </svg>

              {/* Dynamic Network Graphic */}
              <div
                className="w-full h-full transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
              >
                <svg className="w-full h-full absolute inset-0" viewBox="0 0 740 350" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#22D3E6" floodOpacity="0.8" />
                    </filter>
                    <filter id="glowRed" x="-30%" y="-30%" width="160%" height="160%">
                      <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#FF3B4E" floodOpacity="0.9" />
                    </filter>
                  </defs>

                  {/* Normal Edge Lines */}
                  <g stroke="#1B1F22" strokeWidth="1">
                    <line x1="80" y1="90" x2="190" y2="130" />
                    <line x1="80" y1="90" x2="120" y2="230" />
                    <line x1="190" y1="130" x2="280" y2="70" />
                    <line x1="190" y1="130" x2="230" y2="240" />
                    <line x1="280" y1="70" x2="390" y2="110" />
                    <line x1="230" y1="240" x2="350" y2="270" />
                    <line x1="390" y1="110" x2="520" y2="90" />
                    <line x1="520" y1="90" x2="640" y2="120" />
                    <line x1="520" y1="90" x2="580" y2="250" />
                    <line x1="640" y1="120" x2="670" y2="240" />
                    <line x1="350" y1="270" x2="480" y2="280" />
                    <line x1="480" y1="280" x2="580" y2="250" />
                  </g>

                  {/* Connector Hairlines with Pulses */}
                  <g stroke="#5A5F64" strokeDasharray="3 3" strokeWidth="1">
                    <line x1="190" y1="130" x2="270" y2="175" />
                    <line x1="480" y1="190" x2="520" y2="90" />
                    <line x1="270" y1="175" x2="420" y2="185" />
                  </g>

                  {/* HIGHLIGHTED THREAT CONNECTOR (EXFILTRATION) */}
                  <line x1="270" y1="175" x2="420" y2="185" stroke="#22D3E6" strokeWidth="2" />
                  <line x1="420" y1="185" x2="580" y2="150" stroke="#FF3B4E" strokeWidth="2.5" filter="url(#glowRed)" />
                  <line x1="580" y1="150" x2="680" y2="80" stroke="#FF3B4E" strokeWidth="2" strokeDasharray="6 3" />

                  {/* Telemetry Tag along threat line */}
                  <rect x="470" y="148" width="106" height="15" fill="#000000" stroke="#FF3B4E" strokeWidth="1" />
                  <text x="474" y="159" fill="#FF3B4E" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.05em">
                    4.2 GB OUTBOUND ▸▸
                  </text>

                  {/* Lateral movement telemetry tag */}
                  <rect x="290" y="166" width="94" height="13" fill="#05080A" stroke="#22D3E6" strokeWidth="1" />
                  <text x="294" y="176" fill="#22D3E6" fontFamily="Share Tech Mono" fontSize="8" letterSpacing="0.04em">
                    SMB ADMIN PROBE
                  </text>

                  {/* NORMAL NODES (cyan circles) */}
                  <circle cx="80" cy="90" r="4" fill="#22D3E6" filter="url(#glowCyan)" />
                  <circle cx="120" cy="230" r="4" fill="#22D3E6" />
                  <circle cx="190" cy="130" r="4" fill="#22D3E6" />
                  <circle cx="280" cy="70" r="4" fill="#22D3E6" />
                  <circle cx="230" cy="240" r="4" fill="#22D3E6" />
                  <circle cx="390" cy="110" r="4" fill="#22D3E6" />
                  <circle cx="350" cy="270" r="4" fill="#22D3E6" />
                  <circle cx="480" cy="280" r="4" fill="#22D3E6" />
                  <circle cx="520" cy="90" r="4" fill="#22D3E6" />
                  <circle cx="580" cy="250" r="4" fill="#22D3E6" />
                  <circle cx="640" cy="120" r="4" fill="#22D3E6" />
                  <circle cx="670" cy="240" r="4" fill="#22D3E6" />
                  <circle cx="680" cy="80" r="4" fill="#7CD4DF" />

                  {/* Node labels */}
                  <text x="70" y="80" fill="#9AA0A6" fontFamily="Share Tech Mono" fontSize="9">edge-01</text>
                  <text x="270" y="60" fill="#9AA0A6" fontFamily="Share Tech Mono" fontSize="9">srv-app-02</text>
                  <text x="630" y="110" fill="#9AA0A6" fontFamily="Share Tech Mono" fontSize="9">ext-gw-b</text>

                  {/* SUSPICIOUS NODE 1 (Lime Diamond) */}
                  <g
                    transform="translate(190, 240)"
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedNode('192.168.1.105');
                      onAccountSelect && onAccountSelect('ACC-0105');
                    }}
                  >
                    <rect x="-7" y="-7" width="14" height="14" transform="rotate(45)" fill="#05080A" stroke="#D6E85A" strokeWidth="1.5" />
                    <text x="14" y="4" fill="#D6E85A" fontFamily="Share Tech Mono" fontSize="10" fontWeight="700">
                      192.168.1.105 (DEV-STATION)
                    </text>
                  </g>

                  {/* SUSPICIOUS NODE 2 (Lime Diamond) */}
                  <g
                    transform="translate(580, 250)"
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedNode('10.0.8.14');
                      onAccountSelect && onAccountSelect('ACC-0014');
                    }}
                  >
                    <rect x="-7" y="-7" width="14" height="14" transform="rotate(45)" fill="#05080A" stroke="#D6E85A" strokeWidth="1.5" />
                    <text x="-165" y="4" fill="#D6E85A" fontFamily="Share Tech Mono" fontSize="10" fontWeight="700">
                      10.0.8.14 (AUTH-GATEWAY)
                    </text>
                  </g>

                  {/* SUSPICIOUS SOURCE / LATERAL INTRUDER */}
                  <g
                    transform="translate(270, 175)"
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedNode('10.0.3.12');
                      onAccountSelect && onAccountSelect('ACC-0012');
                    }}
                  >
                    <circle cx="0" cy="0" r="5" fill="#7CD4DF" stroke="#22D3E6" strokeWidth="1.5" />
                    <text x="-70" y="-10" fill="#9AA0A6" fontFamily="Share Tech Mono" fontSize="9">10.0.3.12 (PROBE)</text>
                  </g>

                  {/* CRITICAL FOCUSED NODE: 10.0.4.7 (db-prod-master) */}
                  <g
                    transform="translate(420, 185)"
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedNode('10.0.4.7');
                      onAccountSelect && onAccountSelect('ACC-0004');
                    }}
                  >
                    <circle cx="0" cy="0" r="22" fill="none" stroke="#FF3B4E" strokeWidth="1" opacity="0.4" className="animate-ping" style={{ transformOrigin: '0 0' }} />
                    <circle cx="0" cy="0" r="15" fill="none" stroke="#FF3B4E" strokeWidth="1" strokeDasharray="4 2" opacity="0.7" />
                    <line x1="-28" y1="-3" x2="28" y2="-3" stroke="#FF3B4E" strokeWidth="1" opacity="0.8" />
                    <rect x="-9" y="-9" width="18" height="18" transform="rotate(45)" fill="#FF3B4E" stroke="#FFFFFF" strokeWidth="1.5" filter="url(#glowRed)" />
                    <rect x="-3" y="-3" width="6" height="6" transform="rotate(45)" fill="#050505" />

                    {/* White Tactical Label Tag */}
                    <g transform="translate(16, -26)">
                      <rect x="0" y="0" width="232" height="20" fill="#FFFFFF" />
                      <text x="6" y="14" fill="#050505" fontFamily="Rajdhani" fontSize="12" fontWeight="700" letterSpacing="0.04em">
                        10.0.4.7 · db-prod-master [EXFILTRATING]
                      </text>
                      <line x1="-16" y1="26" x2="0" y2="10" stroke="#FFFFFF" strokeWidth="1.5" />
                    </g>
                  </g>

                  {/* Egress Destination Marker */}
                  <g transform="translate(580, 150)">
                    <rect x="-6" y="-6" width="12" height="12" transform="rotate(45)" fill="#05080A" stroke="#FF3B4E" strokeWidth="1.5" />
                    <text x="14" y="4" fill="#FF3B4E" fontFamily="Share Tech Mono" fontSize="10">185.22.x.x [SHADOW_DROP]</text>
                  </g>
                </svg>
              </div>

              {/* Bottom Canvas Controls & State Overlay */}
              <div className="absolute bottom-3 left-3 z-20 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer bg-[#050505]/90 px-2.5 py-1 border border-[#1B1F22]">
                  <input
                    type="checkbox"
                    checked={groupBySubnet}
                    onChange={(e) => setGroupBySubnet(e.target.checked)}
                    className="hidden"
                  />
                  <div className="w-3.5 h-3.5 bg-[#050505] flex items-center justify-center border-[1.5px] border-[#22D3E6]">
                    {groupBySubnet && <div className="w-1.5 h-1.5 bg-[#22D3E6]" />}
                  </div>
                  <span className="font-['Rajdhani',sans-serif] text-[11px] font-bold text-white tracking-widest uppercase">
                    GROUP BY SUBNET
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setCurrentPage && setCurrentPage('graph')}
                  className="bg-[#050505] hover:bg-[#0B2E33] text-[#bbc9cb] hover:text-white font-['Rajdhani',sans-serif] text-[11px] font-bold px-2.5 py-1 uppercase tracking-widest transition-all border border-[#1B1F22]"
                >
                  VIEW AS GRAPH EXPLORER
                </button>
              </div>

              <div className="absolute bottom-3 right-3 z-20 hidden md:block">
                <div className="bg-[#050505]/90 px-3 py-1 font-['Share_Tech_Mono',monospace] text-[9px] text-[#9AA0A6] tracking-wider border border-[#1B1F22]">
                  Active Nodes: <span className="text-white">128</span> | Subnets: <span className="text-white">4</span> | Latency: <span className="text-[#22D3E6]">4.2ms</span> | Encryption: <span className="text-[#D6E85A]">AES-GCM-256</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Anomalies Feed (4 cols) */}
          <div className="lg:col-span-4 h-[440px] bg-[#05080A] flex flex-col border border-[#1B1F22]">
            {/* Feed Header */}
            <div className="h-10 px-3 bg-[#050505]/70 flex items-center justify-between shrink-0 border-b border-[#1B1F22]">
              <span className="bg-[#FFFFFF] text-[#050505] font-['Rajdhani',sans-serif] text-[12px] font-bold px-2 py-0.5 tracking-wider uppercase">
                LIVE ANOMALIES FEED
              </span>
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className={`font-['Share_Tech_Mono',monospace] text-[11px] px-2 py-0.5 tracking-wider transition-all border border-[#5A5F64] ${
                  isPaused ? 'bg-[#D6E85A] text-[#050505] font-bold' : 'bg-[#050505] hover:bg-[#0B2E33] text-[#9AA0A6] hover:text-[#22D3E6]'
                }`}
              >
                {isPaused ? '[▶ RESUME FEED]' : '[|| PAUSE FEED]'}
              </button>
            </div>

            {/* Feed List Stream */}
            <div className="flex-1 overflow-y-auto flex flex-col divide-y divide-[#1B1F22]">
              {feedItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (onAccountSelect) onAccountSelect(item.account);
                  }}
                  className={`p-3 relative transition-all cursor-pointer ${
                    item.active
                      ? 'bg-[#0B2E33] border-l-2 border-[#22D3E6]'
                      : 'bg-[#05080A] hover:bg-[#0B2E33]/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="inline-flex items-center gap-1 font-['Rajdhani',sans-serif] text-[12px] font-bold px-1.5 py-0.5 uppercase tracking-wide shrink-0"
                        style={{
                          backgroundColor: item.severity === 'CRITICAL' ? '#FF3B4E' : item.severity === 'SUSPICIOUS' ? '#D6E85A' : '#353535',
                          color: item.severity === 'SUSPICIOUS' ? '#050505' : '#FFFFFF'
                        }}
                      >
                        <span>{item.severity === 'CRITICAL' ? '◆' : item.severity === 'SUSPICIOUS' ? '◇' : '○'}</span> {item.severity}
                      </span>
                      <span className="font-['Titillium_Web',sans-serif] text-[15px] font-semibold text-white truncate">
                        {item.type}
                      </span>
                    </div>
                    <span className="font-['Share_Tech_Mono',monospace] text-[11px] text-[#9AA0A6] shrink-0">
                      {item.time}
                    </span>
                  </div>
                  <div className="font-['Share_Tech_Mono',monospace] text-[11px] text-[#bbc9cb] truncate">
                    {item.details}
                  </div>
                  {item.active && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-[#22D3E6]" />
                  )}
                </div>
              ))}
            </div>

            {/* Feed Status Footer */}
            <div className="h-7 px-3 bg-[#050505]/90 flex items-center justify-between shrink-0 border-t border-[#1B1F22]">
              <span className="font-['Share_Tech_Mono',monospace] text-[9px] text-[#22D3E6] uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#22D3E6] rounded-full animate-pulse" /> STREAM CONNECTED [TCP://WSS]
              </span>
              <span className="font-['Share_Tech_Mono',monospace] text-[9px] text-[#9AA0A6]">
                BUFFER: 5/250
              </span>
            </div>
          </div>
        </div>

        {/* ROW 3: ANOMALY SCORE TIMELINE (12 COLS, 210PX HEIGHT) */}
        <div className="w-full h-[220px] bg-[#05080A] relative flex flex-col justify-between p-3 border border-[#1B1F22]">
          {/* Timeline Header */}
          <div className="flex items-center justify-between mb-2 z-20">
            <div className="flex items-center gap-2">
              <span className="bg-[#FFFFFF] text-[#050505] font-['Rajdhani',sans-serif] text-[12px] font-bold px-2 py-0.5 tracking-wider uppercase">
                ANOMALY SCORE · LAST {activeRange}
              </span>
              <span className="font-['Share_Tech_Mono',monospace] text-[9px] text-[#9AA0A6] hidden sm:inline">
                ALGORITHM: VAE-LSTM-ENSEMBLE_V3
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#050505] border border-[#1B1F22]">
                {['1H', '24H', '7D'].map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setActiveRange(range)}
                    className={`font-['Rajdhani',sans-serif] text-[11px] px-2.5 py-1 uppercase font-bold transition-all ${
                      activeRange === range
                        ? 'bg-[#FFFFFF] text-[#050505]'
                        : 'text-[#9AA0A6] hover:text-white'
                    }`}
                  >
                    {range === '24H' && activeRange === '24H' ? '24H (ACTIVE)' : range}
                  </button>
                ))}
              </div>
              <div className="font-['Share_Tech_Mono',monospace] text-[11px] px-2 py-1 bg-[#050505] text-[#D6E85A] border border-[#D6E85A] flex items-center gap-1 font-bold">
                THRESHOLD: 70
              </div>
            </div>
          </div>

          {/* Timeline SVG Graph Visualizer */}
          <div className="relative flex-1 w-full h-[120px] overflow-visible">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 1100 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22D3E6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#22D3E6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines */}
              <line x1="0" y1="10" x2="1100" y2="10" stroke="#1B1F22" strokeWidth="1" />
              <line x1="0" y1="36" x2="1100" y2="36" stroke="#1B1F22" strokeWidth="1" />
              <line x1="0" y1="64" x2="1100" y2="64" stroke="#1B1F22" strokeWidth="1" />
              <line x1="0" y1="92" x2="1100" y2="92" stroke="#1B1F22" strokeWidth="1" />
              <line x1="0" y1="120" x2="1100" y2="120" stroke="#1B1F22" strokeWidth="1" />

              {/* Threshold Line at Score 70 */}
              <line x1="0" y1="36" x2="1100" y2="36" stroke="#D6E85A" strokeWidth="1" strokeDasharray="4 4" opacity="0.85" />
              <text x="8" y="32" fill="#D6E85A" fontFamily="Share Tech Mono" fontSize="9" letterSpacing="0.04em">
                THRESHOLD 70
              </text>

              {/* Score Line Gradient Fill */}
              <path
                d="M 0 100 Q 90 95, 180 88 T 360 84 Q 440 80, 500 52 T 540 33 Q 580 40, 620 70 T 700 80 Q 740 70, 770 26 T 810 65 Q 850 50, 890 11 T 940 70 Q 990 85, 1040 92 L 1100 95 L 1100 120 L 0 120 Z"
                fill="url(#scoreAreaGradient)"
              />

              {/* Cyan Telemetry Trend Line */}
              <path
                d="M 0 100 Q 90 95, 180 88 T 360 84 Q 440 80, 500 52 T 540 33 Q 580 40, 620 70 T 700 80 Q 740 70, 770 26 T 810 65 Q 850 50, 890 11 T 940 70 Q 990 85, 1040 92 L 1100 95"
                fill="none"
                stroke="#22D3E6"
                strokeWidth="1.5"
              />

              {/* SUSPICIOUS PEAK 1: Score 72 at x=540 */}
              <g transform="translate(540, 33)" className="cursor-pointer">
                <rect x="-4.5" y="-4.5" width="9" height="9" transform="rotate(45)" fill="#05080A" stroke="#D6E85A" strokeWidth="1.5" />
                <text x="-9" y="-9" fill="#D6E85A" fontFamily="Share Tech Mono" fontSize="9" fontWeight="bold">72</text>
              </g>

              {/* SUSPICIOUS PEAK 2: Score 78 at x=770 */}
              <g transform="translate(770, 26)" className="cursor-pointer">
                <rect x="-4.5" y="-4.5" width="9" height="9" transform="rotate(45)" fill="#05080A" stroke="#D6E85A" strokeWidth="1.5" />
                <text x="-9" y="-9" fill="#D6E85A" fontFamily="Share Tech Mono" fontSize="9" fontWeight="bold">78</text>
              </g>

              {/* CRITICAL PEAK 1: Score 91 at x=845 */}
              <g transform="translate(845, 18)" className="cursor-pointer">
                <rect x="-4.5" y="-4.5" width="9" height="9" transform="rotate(45)" fill="#FF3B4E" stroke="#FFFFFF" strokeWidth="1" />
                <text x="-16" y="16" fill="#FF3B4E" fontFamily="Share Tech Mono" fontSize="9" fontWeight="bold">91</text>
              </g>

              {/* CRITICAL PEAK 2: Score 94 at x=890 with hover */}
              <g transform="translate(890, 11)" className="cursor-pointer">
                <rect x="-6" y="-6" width="12" height="12" transform="rotate(45)" fill="#FF3B4E" stroke="#FFFFFF" strokeWidth="1.5" />
                <line x1="0" y1="0" x2="0" y2="109" stroke="#FF3B4E" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
              </g>
            </svg>

            {/* Active Tooltip at x≈81% (Score 94 peak) */}
            {activeTooltip.visible && (
              <div className="absolute -top-7 right-[10%] sm:right-[15%] md:right-[17%] z-30 pointer-events-none">
                <div className="bg-[#FFFFFF] text-[#050505] px-2 py-0.5 shadow-lg flex items-center gap-1.5 border border-[#FFFFFF]">
                  <span className="w-1.5 h-1.5 bg-[#FF3B4E] rotate-45 shrink-0" />
                  <span className="font-['Share_Tech_Mono',monospace] text-[9px] uppercase font-bold tracking-wider text-[#050505]">
                    {activeTooltip.time} · SCORE {activeTooltip.score} · {activeTooltip.entity}
                  </span>
                </div>
                <div className="w-px h-2 bg-white mx-auto" />
              </div>
            )}
          </div>

          {/* X-Axis Timestamps */}
          <div className="w-full flex justify-between items-center pt-2 font-['Share_Tech_Mono',monospace] text-[11px] text-[#9AA0A6] border-t border-[#1B1F22]">
            <span>00:00</span>
            <span>04:00</span>
            <span>08:00</span>
            <span className="text-white font-bold">12:00</span>
            <span>16:00</span>
            <span>20:00</span>
            <span>24:00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
