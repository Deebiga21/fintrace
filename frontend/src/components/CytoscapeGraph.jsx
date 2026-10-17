import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Play,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  Info
} from 'lucide-react';

export default function CytoscapeGraph({
  graphData,
  onSelectNode,
  onSelectEdge,
  selectedNodeId,
  highlightCycles = []
}) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [layoutName, setLayoutName] = useState('cose');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [minAmount, setMinAmount] = useState(0);

  // Initialize and update Cytoscape
  useEffect(() => {
    if (!containerRef.current || !graphData) return;

    // Filter elements according to current UI filters
    const filteredNodes = (graphData.nodes || []).filter(n => {
      if (riskFilter === 'ALL') return true;
      return n.data.risk_level?.toUpperCase() === riskFilter;
    });

    const activeNodeIds = new Set(filteredNodes.map(n => n.data.id));

    const filteredEdges = (graphData.edges || []).filter(e => {
      const srcOk = activeNodeIds.has(e.data.source);
      const dstOk = activeNodeIds.has(e.data.target);
      const amtOk = (e.data.weight || e.data.amount || 0) >= minAmount;
      return srcOk && dstOk && amtOk;
    });

    const elements = [...filteredNodes, ...filteredEdges];

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: elements,
      boxSelectionEnabled: false,
      autounselectify: false,
      style: [
        // Node styling
        {
          selector: 'node',
          style: {
            'label': 'data(id)',
            'color': '#F8FAFC',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '10px',
            'font-weight': 'bold',
            'text-valign': 'bottom',
            'text-margin-y': 5,
            'text-outline-width': 2,
            'text-outline-color': '#0B1120',
            'background-color': '#10B981',
            'width': 28,
            'height': 28,
            'border-width': 2,
            'border-color': '#334155',
            'transition-property': 'background-color, border-color, width, height, shadow-blur',
            'transition-duration': '0.2s'
          }
        },
        // Medium Risk
        {
          selector: 'node[risk_level = "Medium"]',
          style: {
            'background-color': '#F59E0B',
            'border-color': '#B45309',
            'width': 34,
            'height': 34
          }
        },
        // High Risk Node
        {
          selector: 'node[risk_level = "High"]',
          style: {
            'background-color': '#EF4444',
            'border-color': '#991B1B',
            'border-width': 3,
            'width': 40,
            'height': 40,
            'shadow-blur': 15,
            'shadow-color': 'rgba(239, 68, 68, 0.75)',
            'shadow-opacity': 0.8
          }
        },
        // Root / Target Node
        {
          selector: 'node[?is_root], node[?is_target]',
          style: {
            'border-color': '#38BDF8',
            'border-width': 4,
            'width': 46,
            'height': 46,
            'shadow-blur': 25,
            'shadow-color': 'rgba(56, 189, 248, 0.9)'
          }
        },
        // Selected Node Highlight
        {
          selector: 'node:selected',
          style: {
            'border-color': '#38BDF8',
            'border-width': 4,
            'background-color': '#0284C7',
            'shadow-blur': 20,
            'shadow-color': '#38BDF8'
          }
        },
        // Edge styling (directed arrow)
        {
          selector: 'edge',
          style: {
            'width': 'mapData(weight, 1000, 500000, 1.5, 6)',
            'line-color': '#334155',
            'target-arrow-color': '#334155',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.2,
            'opacity': 0.85
          }
        },
        // Suspicious Edge
        {
          selector: 'edge[?is_suspicious]',
          style: {
            'line-color': '#EF4444',
            'target-arrow-color': '#EF4444',
            'width': 3.5,
            'line-style': 'dashed',
            'opacity': 0.95
          }
        },
        // Edge Selected
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#38BDF8',
            'target-arrow-color': '#38BDF8',
            'width': 4,
            'opacity': 1
          }
        },
        // Highlighted in circular loops
        {
          selector: '.cycle-highlight',
          style: {
            'line-color': '#F43F5E',
            'target-arrow-color': '#F43F5E',
            'border-color': '#F43F5E',
            'width': 4,
            'line-style': 'solid'
          }
        }
      ],
      layout: {
        name: layoutName,
        animate: true,
        animationDuration: 500,
        nodeDimensionsIncludeLabels: true,
        padding: 50
      }
    });

    // Handle node clicks
    cy.on('tap', 'node', function (evt) {
      const node = evt.target;
      if (onSelectNode) {
        onSelectNode(node.data());
      }
    });

    // Handle edge clicks
    cy.on('tap', 'edge', function (evt) {
      const edge = evt.target;
      if (onSelectEdge) {
        onSelectEdge(edge.data());
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [graphData, layoutName, riskFilter, minAmount]);

  // Center on selected node if passed
  useEffect(() => {
    if (!cyRef.current || !selectedNodeId) return;
    const node = cyRef.current.getElementById(selectedNodeId);
    if (node && node.length > 0) {
      cyRef.current.animate({
        center: { eles: node },
        zoom: 1.5,
        duration: 500
      });
      node.select();
    }
  }, [selectedNodeId]);

  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.3);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.7);
  const handleFit = () => cyRef.current?.fit(undefined, 50);

  return (
    <div className="relative w-full h-full min-h-[500px] bg-navy-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
      {/* Top Controls Toolbar */}
      <div className="p-3 bg-navy-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs z-10">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono font-medium flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-electric-400" />
            FILTER RISK:
          </span>
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setRiskFilter(lvl)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wider font-mono transition ${
                riskFilter === lvl
                  ? 'bg-electric-500/20 text-electric-300 border border-electric-500/50'
                  : 'bg-navy-850 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono text-[11px]">LAYOUT:</span>
          {['cose', 'concentric', 'breadthfirst', 'circle'].map((l) => (
            <button
              key={l}
              onClick={() => setLayoutName(l)}
              className={`px-2 py-1 rounded text-[11px] font-mono capitalize transition ${
                layoutName === l
                  ? 'bg-slate-700 text-white font-medium'
                  : 'bg-navy-850 text-slate-400 hover:text-slate-200'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 bg-navy-850 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 transition"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1.5 bg-navy-850 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 transition"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleFit}
            title="Fit to Screen"
            className="p-1.5 bg-navy-850 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 transition"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Graph Visual Canvas */}
      <div ref={containerRef} className="flex-1 w-full h-full bg-grid-pattern relative cursor-grab active:cursor-grabbing" />

      {/* Legend Footer */}
      <div className="px-4 py-2 bg-navy-900/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500"></span>
            <span>High Risk Mule</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Medium Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Low Risk / Standard</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 bg-rose-500 border border-dashed border-rose-500 inline-block"></span>
            <span>Suspicious Transfer</span>
          </div>
        </div>
        <div className="font-mono text-[10px] text-slate-400">
          Click any node or transaction edge to inspect evidence
        </div>
      </div>
    </div>
  );
}
