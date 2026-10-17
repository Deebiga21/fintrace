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
      const [gData, cData] = await Promise.all([
        api.getGraphData({ limit_nodes: 200 }),
        api.getCycles()
      ]);
      setGraphData(gData);
      setCycles(cData.cycles || []);
    } catch (err) {
      console.error(err);
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
      setGraphData({
        nodes: egoData.nodes,
        edges: egoData.edges,
        statistics: {
          total_nodes: egoData.nodes.length,
          total_edges: egoData.edges.length,
          high_risk_nodes: egoData.nodes.filter(n => n.data.risk_level === 'High').length,
          suspicious_edges: egoData.edges.filter(e => e.data.is_suspicious).length
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
          <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Network className="w-5 h-5 text-electric-400" />
            <span>Step 5: Interactive Financial Transaction Graph Canvas</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Directed Cytoscape.js network representing entity nodes and fund transfers. Inspect neighborhoods, cycles, and layering.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {cycles.length > 0 && (
            <button
              onClick={() => setCycleHighlightActive(!cycleHighlightActive)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                cycleHighlightActive
                  ? 'bg-rose-600 text-white shadow-glow-danger'
                  : 'bg-rose-950/40 text-rose-300 border border-rose-500/40 hover:bg-rose-900/40'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{cycles.length} Circular Loops Detected</span>
            </button>
          )}

          <button
            onClick={fetchGraphData}
            title="Reload Full Graph"
            className="p-2 bg-navy-850 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-electric-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Canvas and Inspection Side Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[620px]">
        {/* Cytoscape Canvas (3 cols) */}
        <div className="lg:col-span-3 rounded-xl overflow-hidden border border-slate-800 bg-navy-950 flex flex-col h-[620px]">
          {loading && !graphData ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-electric-400" />
              <span className="text-xs font-mono">Rendering Transaction Topology...</span>
            </div>
          ) : (
            <CytoscapeGraph
              graphData={graphData}
              onSelectNode={handleSelectNode}
              onSelectEdge={handleSelectEdge}
              selectedNodeId={selectedAccount}
              highlightCycles={cycles}
            />
          )}
        </div>

        {/* Inspection Side Drawer (1 col) */}
        <div className="rounded-xl bg-navy-900 border border-slate-800 p-5 flex flex-col justify-between space-y-4">
          {selectedNode ? (
            <div className="space-y-4 text-xs">
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">SELECTED NODE</span>
                  <RiskBadge level={selectedNode.risk_level} score={selectedNode.risk_score} size="sm" />
                </div>
                <div className="font-mono text-base font-bold text-white mt-1">{selectedNode.id}</div>
                <div className="text-[11px] text-slate-400">{selectedNode.customer_name}</div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase font-mono">ACCOUNT METRICS</div>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between p-2 rounded bg-navy-950 border border-slate-800">
                    <span className="text-slate-400">Current Balance:</span>
                    <span className="text-white font-bold">₹{(selectedNode.balance || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-navy-950 border border-slate-800">
                    <span className="text-slate-400">Total Inflow:</span>
                    <span className="text-emerald-400 font-bold">₹{(selectedNode.incoming || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-navy-950 border border-slate-800">
                    <span className="text-slate-400">Total Outflow:</span>
                    <span className="text-rose-400 font-bold">₹{(selectedNode.outgoing || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {selectedNode.flags && selectedNode.flags.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase font-mono">FLAGGED SIGNALS</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.flags.map((fl, i) => (
                      <span key={i} className="text-[10px] bg-rose-950/50 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded font-sans">
                        {fl}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <button
                  onClick={() => handleExpandEgo(selectedNode.id)}
                  className="w-full py-2 bg-navy-850 hover:bg-slate-800 border border-slate-700 text-electric-300 font-semibold rounded-lg flex items-center justify-center gap-1.5 transition text-xs"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Isolate 2-Hop Ego Network</span>
                </button>

                <button
                  onClick={() => {
                    if (onAccountSelect) onAccountSelect(selectedNode.id);
                    setCurrentPage('money-trail');
                  }}
                  className="w-full py-2 bg-navy-850 hover:bg-slate-800 border border-slate-700 text-rose-300 font-semibold rounded-lg flex items-center justify-center gap-1.5 transition text-xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Trace Multi-Hop Money Trail</span>
                </button>

                <button
                  onClick={() => {
                    if (onOpenCreateCase) onOpenCreateCase(selectedNode);
                  }}
                  className="w-full py-2 bg-electric-600 hover:bg-electric-500 text-white font-bold rounded-lg shadow-glow-electric flex items-center justify-center gap-1.5 transition text-xs"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Create Formal Case</span>
                </button>
              </div>
            </div>
          ) : selectedEdge ? (
            <div className="space-y-4 text-xs">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-[10px] text-slate-400 font-mono">SELECTED TRANSACTION EDGE</span>
                <div className="font-mono text-sm font-bold text-white mt-1">
                  {selectedEdge.source} → {selectedEdge.target}
                </div>
              </div>

              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between p-2 rounded bg-navy-950 border border-slate-800">
                  <span className="text-slate-400">Total Volume:</span>
                  <span className="text-white font-bold">₹{(selectedEdge.weight || selectedEdge.amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-navy-950 border border-slate-800">
                  <span className="text-slate-400">Transfer Count:</span>
                  <span className="text-electric-300 font-bold">{selectedEdge.count || 1}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-navy-950 border border-slate-800">
                  <span className="text-slate-400">Channel / Type:</span>
                  <span className="text-slate-200">{selectedEdge.type || 'IMPS'}</span>
                </div>
              </div>

              {selectedEdge.is_suspicious && (
                <div className="p-2.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Flagged as potential rapid pass-through or layering step.</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <button
                  onClick={() => {
                    if (onAccountSelect) onAccountSelect(selectedEdge.source);
                    setCurrentPage('money-trail');
                  }}
                  className="w-full py-2 bg-navy-850 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold rounded-lg text-xs"
                >
                  Trace Sender Flow
                </button>
                <button
                  onClick={() => {
                    if (onAccountSelect) onAccountSelect(selectedEdge.target);
                    setCurrentPage('money-trail');
                  }}
                  className="w-full py-2 bg-navy-850 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold rounded-lg text-xs"
                >
                  Trace Receiver Flow
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-2 p-6">
              <Network className="w-10 h-10 text-slate-600" />
              <div className="text-xs font-semibold text-slate-300">Interactive Canvas</div>
              <p className="text-[11px]">Click any node or directed edge in the graph canvas to inspect balance, signals, and trace options.</p>
            </div>
          )}
        </div>
      </div>

      {/* Circular Cycles Detection Summary */}
      {cycles.length > 0 && (
        <div className="p-5 rounded-xl bg-navy-900 border border-rose-500/40 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-rose-300 tracking-wide uppercase font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>DETECTED CIRCULAR MONEY TRANSFER RINGS (DIRECTED CYCLES)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Layering Evasion Pattern</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cycles.map((cycle, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-navy-950 border border-slate-800 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>CYCLE #{idx + 1} ({cycle.length} ACCOUNTS)</span>
                  <span className="text-rose-400 font-semibold">High Suspicion Loop</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {cycle.map((acc, aIdx) => (
                    <React.Fragment key={aIdx}>
                      <button
                        onClick={() => {
                          if (onAccountSelect) onAccountSelect(acc);
                          handleExpandEgo(acc);
                        }}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-electric-300 border border-slate-700 text-[11px]"
                      >
                        {acc}
                      </button>
                      <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                    </React.Fragment>
                  ))}
                  <span className="text-rose-400 font-bold">{cycle[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
