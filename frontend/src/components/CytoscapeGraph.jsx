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

    const rawElements = Array.isArray(graphData)
      ? graphData
      : (graphData.elements || [
          ...(graphData.nodes || []),
          ...(graphData.edges || [])
        ]);

    const allNodes = graphData.nodes || rawElements.filter(e => e.group === 'nodes' || (!e.data?.source && e.data?.id));
    const allEdges = graphData.edges || rawElements.filter(e => e.group === 'edges' || Boolean(e.data?.source));

    // Filter elements according to current UI filters
    const filteredNodes = allNodes.filter(n => {
      if (riskFilter === 'ALL') return true;
      return n.data?.risk_level?.toUpperCase() === riskFilter;
    });

    const activeNodeIds = new Set(filteredNodes.map(n => n.data.id));

    const filteredEdges = allEdges.filter(e => {
      const srcOk = activeNodeIds.has(e.data.source);
      const dstOk = activeNodeIds.has(e.data.target);
      const amtOk = (e.data.weight || e.data.amount || 0) >= minAmount;
      return srcOk && dstOk && amtOk;
    });

    const elements = [...filteredNodes, ...filteredEdges];

    if (cyRef.current) {
      try {
        cyRef.current.stop();
        cyRef.current.destroy();
      } catch (e) {
        // ignore
      }
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
            'label': 'data(label)',
            'font-size': '10px',
            'font-family': 'monospace',
            'font-weight': 600,
            'color': '#E2E8F0',
            'text-valign': 'bottom',
            'text-margin-y': 4,
            'background-color': '#1E293B',
            'border-width': 2,
            'border-color': '#334155',
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': '0.2s'
          }
        },
        // Medium Risk
        {
          selector: 'node[risk_level = "Medium"], node[risk_level = "MEDIUM"]',
          style: {
            'background-color': '#F59E0B',
            'border-color': '#B45309',
            'width': 34,
            'height': 34
          }
        },
        // High Risk Node
        {
          selector: 'node[risk_level = "High"], node[risk_level = "HIGH"]',
          style: {
            'background-color': '#EF4444',
            'border-color': '#991B1B',
            'border-width': 3,
            'width': 40,
            'height': 40
          }
        },
        // Root / Target Node
        {
          selector: 'node[?is_root], node[?is_target]',
          style: {
            'border-color': '#38BDF8',
            'border-width': 4,
            'width': 46,
            'height': 46
          }
        },
        // Selected Node Highlight
        {
          selector: 'node:selected',
          style: {
            'border-color': '#38BDF8',
            'border-width': 4,
            'background-color': '#0284C7'
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
      if (cyRef.current) {
        try {
          cyRef.current.stop();
          cyRef.current.destroy();
          cyRef.current = null;
        } catch (e) {
          // ignore
        }
      }
    };
  }, [graphData, layoutName, riskFilter, minAmount]);

  // Highlight cycle elements
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    cy.elements().removeClass('cycle-highlight');

    if (!highlightCycles || highlightCycles.length === 0) return;

    highlightCycles.forEach(c => {
      const accs = Array.isArray(c) ? c : (c?.accounts || []);
      accs.forEach((accId, i) => {
        const nextId = accs[(i + 1) % accs.length];
        cy.getElementById(accId).addClass('cycle-highlight');
        cy.edges(`[source = "${accId}"][target = "${nextId}"]`).addClass('cycle-highlight');
      });
    });
  }, [highlightCycles]);

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

        {/* Layout Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono text-[11px]">LAYOUT:</span>
          <select
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            className="bg-navy-850 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1 focus:outline-none focus:border-electric-500 font-mono"
          >
            <option value="cose">Force-Directed (cose)</option>
            <option value="circle">Circular Ring</option>
            <option value="breadthfirst">Hierarchical (Tree)</option>
            <option value="concentric">Concentric Layers</option>
            <option value="grid">Grid</option>
          </select>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-navy-850 p-1 rounded-lg border border-slate-800">
          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-slate-700 text-slate-300 rounded"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-slate-700 text-slate-300 rounded"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleFit}
            className="p-1 hover:bg-slate-700 text-slate-300 rounded"
            title="Fit Canvas"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Mount Container */}
      <div ref={containerRef} className="flex-1 w-full h-full min-h-[460px] cursor-grab active:cursor-grabbing" />

      {/* Bottom Canvas Stats & Legend */}
      <div className="p-2.5 bg-navy-900/90 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400 px-4">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> High Risk Mule
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Medium Risk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600" /> Low Risk Account
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-rose-500" /> Flagged Transfer
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span>{cyRef.current ? cyRef.current.nodes().length : 0} Nodes Rendered</span>
          <span>{cyRef.current ? cyRef.current.edges().length : 0} Edges</span>
        </div>
      </div>
    </div>
  );
}
