import React, { useEffect, useState } from 'react';
import {
  Network,
  RotateCcw,
  Share2,
  Briefcase,
  AlertTriangle,
  FileWarning,
  ArrowRight,
  RefreshCw,
  Search,
  Eye,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import CytoscapeGraph from '../components/CytoscapeGraph';
import RiskBadge from '../components/RiskBadge';

const normalizeGraphData = (data) => {
  if (!data) return { nodes: [], edges: [], elements: [] };
  const rawElements = Array.isArray(data)
    ? data
    : data.elements || [
        ...(data.nodes || []),
        ...(data.edges || [])
      ];

  const nodes = data.nodes || rawElements.filter(e => e.group === 'nodes' || (!e.data?.source && e.data?.id));
  const edges = data.edges || rawElements.filter(e => e.group === 'edges' || Boolean(e.data?.source));

  return {
    nodes,
    edges,
    elements: rawElements,
    total_nodes: data.total_nodes ?? nodes.length,
    total_edges: data.total_edges ?? edges.length,
  };
};

export default function GraphInvestigationPage({
  setCurrentPage,
  selectedAccount,
  onAccountSelect,
  onOpenCreateCase,
  refreshTrigger
}) {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [cycleHighlightActive, setCycleHighlightActive] = useState(false);

  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const [gData, cData] = await Promise.allSettled([
        api.getGraphData({ limit_nodes: 200 }),
        api.getCycles()
      ]);

      if (gData.status === 'fulfilled' && gData.value) {
        setGraphData(normalizeGraphData(gData.value));
      }
      if (cData.status === 'fulfilled' && cData.value) {
        const rawCycles = Array.isArray(cData.value)
          ? cData.value
          : (cData.value.cycles || []);
        setCycles(rawCycles);
      }
    } catch (err) {
      console.error("Failed to load graph data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, [refreshTrigger]);

  const handleSelectNode = (nodeData) => {
    setSelectedNode(nodeData);
    setSelectedEdge(null);
    if (onAccountSelect) onAccountSelect(nodeData.id);
  };

  const handleSelectEdge = (edgeData) => {
    setSelectedEdge(edgeData);
    setSelectedNode(null);
  };

  const handleExpandEgo = async (accId) => {
    setLoading(true);
    try {
      const egoData = await api.getSubgraph(accId, 2);
      const normalized = normalizeGraphData(egoData);
      setGraphData({
        ...normalized,
        statistics: {
          total_nodes: normalized.nodes.length,
          total_edges: normalized.edges.length,
          high_risk_nodes: normalized.nodes.filter(n => n.data?.risk_level === 'High' || n.data?.risk_level === 'HIGH').length,
          suspicious_edges: normalized.edges.filter(e => e.data?.is_suspicious).length
        }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#4A4A4A] tracking-wide flex items-center gap-2">
            <Network className="w-5 h-5 text-[#B86B7A]" />
            <span>Step 5: Interactive Financial Transaction Graph Canvas</span>
          </h2>
          <p className="text-xs text-[#6E6264] mt-1">
            Directed Cytoscape.js network representing entity nodes and fund transfers. Inspect neighborhoods, cycles, and layering.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {cycles.length > 0 && (
            <button
              onClick={() => setCycleHighlightActive(!cycleHighlightActive)}
              className={`px-3 py-1.5 rounded-none text-xs font-semibold flex items-center gap-1.5 transition ${
                cycleHighlightActive
                  ? 'bg-rose-600 text-[#4A4A4A] shadow-glow-danger'
                  : 'bg-[#FF3B4E]/15/40 text-[#FF3B4E] border border-[#FF3B4E]/40 hover:bg-[#FF3B4E]/20/40'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{cycles.length} Circular Loops Detected</span>
            </button>
          )}

          <button
            onClick={fetchGraphData}
            title="Reload Full Graph"
            className="p-2 bg-navy-850 hover:bg-[#FFFFFF] text-[#6E6264] rounded-none border border-[#E8C2BB] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#B86B7A]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Canvas and Inspection Side Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[620px]">
        {/* Cytoscape Canvas (3 cols) */}
        <div className="lg:col-span-3 rounded-none overflow-hidden border border-[#E8C2BB] bg-[#FFF5F5] flex flex-col h-[620px]">
          {loading && !graphData ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-[#6E6264]">
              <RefreshCw className="w-6 h-6 animate-spin text-[#B86B7A]" />
              <span className="text-xs font-mono">Rendering Transaction Topology...</span>
            </div>
          ) : (
            <CytoscapeGraph
              graphData={graphData}
              onSelectNode={handleSelectNode}
              onSelectEdge={handleSelectEdge}
              selectedNodeId={selectedAccount}
              highlightCycles={cycleHighlightActive ? cycles : []}
            />
          )}
        </div>

        {/* Inspection Side Drawer (1 col) */}
        <div className="rounded-none bg-[#FFFFFF]/75 backdrop-blur-2xl border border-[#E8C2BB] p-5 flex flex-col justify-between space-y-4">
          {selectedNode ? (
            <div className="space-y-4 text-xs">
              <div className="border-b border-[#E8C2BB] pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#6E6264] font-mono">SELECTED NODE</span>
                  <RiskBadge level={selectedNode.risk_level} score={selectedNode.risk_score} size="sm" />
                </div>
                <div className="font-mono text-base font-bold text-[#4A4A4A] mt-1">{selectedNode.id}</div>
                <div className="text-[11px] text-[#6E6264]">{selectedNode.customer_name}</div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[#6E6264] uppercase font-mono">ACCOUNT METRICS</div>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between p-2 rounded bg-[#FFF5F5] border border-[#E8C2BB]">
                    <span className="text-[#6E6264]">In-Degree:</span>
                    <span className="text-[#4A4A4A] font-bold">{selectedNode.in_degree ?? selectedNode.inDegree ?? '-'}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-[#FFF5F5] border border-[#E8C2BB]">
                    <span className="text-[#6E6264]">Out-Degree:</span>
                    <span className="text-[#4A4A4A] font-bold">{selectedNode.out_degree ?? selectedNode.outDegree ?? '-'}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-[#FFF5F5] border border-[#E8C2BB]">
                    <span className="text-[#6E6264]">Turnover Ratio:</span>
                    <span className="text-[#6E6264] font-bold">
                      {typeof selectedNode.turnover_ratio === 'number' ? selectedNode.turnover_ratio.toFixed(2) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-[#FFF5F5] border border-[#E8C2BB]">
                    <span className="text-[#6E6264]">Total Outgoing:</span>
                    <span className="text-[#4A4A4A]">
                      ₹{typeof selectedNode.total_outgoing === 'number' ? selectedNode.total_outgoing.toLocaleString() : '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#E8C2BB]">
                <button
                  onClick={() => handleExpandEgo(selectedNode.id)}
                  className="w-full py-2 bg-electric-600 hover:bg-[#B86B7A] text-white font-semibold rounded-none text-xs flex items-center justify-center gap-1.5 shadow-glow-rose transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Expand 2-Hop Ego Graph</span>
                </button>
                <button
                  onClick={() => {
                    if (onAccountSelect) onAccountSelect(selectedNode.id);
                    setCurrentPage('money-trail');
                  }}
                  className="w-full py-2 bg-navy-850 hover:bg-[#FFFFFF] border border-[#E8C2BB] text-[#4A4A4A] font-semibold rounded-none text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-[#B86B7A]" />
                  <span>Open Money Trail</span>
                </button>
                {onOpenCreateCase && (
                  <button
                    onClick={() => onOpenCreateCase({
                      account_id: selectedNode.id,
                      description: `High risk account flagged in Graph Canvas (Risk: ${selectedNode.risk_level}, Score: ${selectedNode.risk_score}).`
                    })}
                    className="w-full py-2 bg-rose-600/20 hover:bg-rose-600/30 text-[#FF3B4E] border border-[#FF3B4E]/30 font-semibold rounded-none text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-[#FF3B4E]" />
                    <span>Open Case</span>
                  </button>
                )}
              </div>
            </div>
          ) : selectedEdge ? (
            <div className="space-y-4 text-xs">
              <div className="border-b border-[#E8C2BB] pb-3">
                <span className="text-[10px] text-[#6E6264] font-mono">SELECTED TRANSACTION</span>
                <div className="font-mono text-sm font-bold text-[#4A4A4A] mt-1 break-all">{selectedEdge.id}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                    selectedEdge.is_suspicious
                      ? 'bg-[#FF3B4E]/15/80 text-[#FF3B4E] border border-[#FF3B4E]/50'
                      : 'bg-[#93C5FD]/15/80 text-[#6E6264] border border-[#93C5FD]/50'
                  }`}>
                    {selectedEdge.is_suspicious ? 'SUSPICIOUS' : 'STANDARD'}
                  </span>
                  <span className="text-[11px] font-mono text-[#6E6264]">{selectedEdge.transaction_type || 'TRANSFER'}</span>
                </div>
              </div>

              <div className="space-y-2 font-mono text-[11px]">
                <div className="p-2.5 rounded bg-[#FFF5F5] border border-[#E8C2BB] space-y-1">
                  <div className="text-[10px] text-[#6E6264]">TRANSFER VALUE</div>
                  <div className="text-base font-bold text-[#6E6264]">
                    ₹{typeof selectedEdge.amount === 'number' ? selectedEdge.amount.toLocaleString() : selectedEdge.amount}
                  </div>
                </div>
                <div className="p-2 rounded bg-[#FFF5F5] border border-[#E8C2BB]">
                  <div className="text-[10px] text-[#6E6264]">SOURCE SENDER</div>
                  <div className="text-[#4A4A4A] font-semibold truncate">{selectedEdge.source}</div>
                </div>
                <div className="p-2 rounded bg-[#FFF5F5] border border-[#E8C2BB]">
                  <div className="text-[10px] text-[#6E6264]">TARGET RECEIVER</div>
                  <div className="text-[#4A4A4A] font-semibold truncate">{selectedEdge.target}</div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#E8C2BB]">
                <button
                  onClick={() => {
                    if (onAccountSelect) onAccountSelect(selectedEdge.source);
                    setCurrentPage('money-trail');
                  }}
                  className="w-full py-2 bg-navy-850 hover:bg-[#FFFFFF] border border-[#E8C2BB] text-[#4A4A4A] font-semibold rounded-none text-xs"
                >
                  Trace Sender Flow
                </button>
                <button
                  onClick={() => {
                    if (onAccountSelect) onAccountSelect(selectedEdge.target);
                    setCurrentPage('money-trail');
                  }}
                  className="w-full py-2 bg-navy-850 hover:bg-[#FFFFFF] border border-[#E8C2BB] text-[#4A4A4A] font-semibold rounded-none text-xs"
                >
                  Trace Receiver Flow
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[#8A7D7F] text-center space-y-2 p-6">
              <Network className="w-10 h-10 text-slate-600" />
              <div className="text-xs font-semibold text-[#6E6264]">Interactive Canvas</div>
              <p className="text-[11px]">Click any node or directed edge in the graph canvas to inspect balance, signals, and trace options.</p>
            </div>
          )}
        </div>
      </div>

      {/* Circular Cycles Detection Summary */}
      {cycles.length > 0 && (
        <div className="p-5 rounded-none bg-[#FFFFFF]/75 backdrop-blur-2xl border border-[#FF3B4E]/40 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#FF3B4E] tracking-wide uppercase font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#FF3B4E]" />
              <span>DETECTED CIRCULAR MONEY TRANSFER RINGS (DIRECTED CYCLES)</span>
            </h3>
            <span className="text-[11px] text-[#6E6264] font-mono">Layering Evasion Pattern</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cycles.map((cycle, idx) => {
              const accountList = Array.isArray(cycle) ? cycle : (cycle?.accounts || []);
              const cycleLength = cycle.cycle_length || accountList.length;
              const confidence = cycle.confidence
                ? `${(cycle.confidence * 100).toFixed(0)}% Confidence`
                : "High Suspicion Loop";

              return (
                <div key={idx} className="p-3.5 rounded-none bg-[#FFF5F5] border border-rose-900/40 hover:border-[#FF3B4E]/50 transition text-xs font-mono space-y-2">
                  <div className="flex items-center justify-between text-[#6E6264] text-[10px]">
                    <span className="font-bold text-[#FF3B4E]">CYCLE #{idx + 1} ({cycleLength} ACCOUNTS)</span>
                    <span className="text-[#FF3B4E] font-semibold px-2 py-0.5 rounded bg-[#FF3B4E]/15/60 border border-rose-800/40">
                      {confidence}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {accountList.map((acc, aIdx) => (
                      <React.Fragment key={aIdx}>
                        <button
                          onClick={() => {
                            if (onAccountSelect) onAccountSelect(acc);
                            handleExpandEgo(acc);
                          }}
                          className="px-2 py-0.5 rounded bg-[#FFFFFF] hover:bg-slate-700 text-[#B86B7A] border border-[#E8C2BB] text-[11px] font-semibold transition hover:scale-105"
                          title={`Click to view ego network of ${acc}`}
                        >
                          {acc}
                        </button>
                        <ArrowRight className="w-3 h-3 text-[#FF3B4E] shrink-0" />
                      </React.Fragment>
                    ))}
                    {accountList.length > 0 && (
                      <span className="text-[#FF3B4E] font-bold px-1.5 py-0.5 rounded bg-[#FF3B4E]/15/50 border border-[#FF3B4E]/30">
                        {accountList[0]}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
