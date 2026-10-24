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
import { useTheme } from '../context/ThemeContext';

export default function CytoscapeGraph({
  graphData,
  onSelectNode,
  onSelectEdge,
  selectedNodeId,
  highlightCycles = []
}) {
  const { isDark } = useTheme();
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [layoutName, setLayoutName] = useState('cose');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [minAmount, setMinAmount] = useState(0);

  const primaryTurquoise = isDark ? '#1FC8DB' : '#0E9FB3';
  const nodeBg = isDark ? '#15161D' : '#FFFFFF';
  const nodeBorder = isDark ? '#262833' : '#E5E7EB';
  const textColor = isDark ? '#FFFFFF' : '#0B0B0F';
  const edgeColor = isDark ? 'rgba(156, 163, 175, 0.35)' : 'rgba(107, 114, 128, 0.35)';

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
            'color': textColor,
            'text-valign': 'bottom',
            'text-margin-y': 4,
            'background-color': nodeBg,
            'border-width': 2,
            'border-color': nodeBorder,
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': '0.2s'
          }
        },
        // Medium Risk (Yellow accent fill with black text)
        {
          selector: 'node[risk_level = "Medium"], node[risk_level = "MEDIUM"]',
          style: {
            'background-color': '#FFD23F',
            'border-color': '#FFD23F',
            'color': '#FFD23F',
            'width': 34,
            'height': 34
          }
        },
        // High Risk Node (Loss/Alert color #FF5C6C)
        {
          selector: 'node[risk_level = "High"], node[risk_level = "HIGH"]',
          style: {
            'background-color': '#FF5C6C',
            'border-color': '#FF5C6C',
            'border-width': 3,
            'color': '#FF5C6C',
            'width': 40,
            'height': 40
          }
        },
        // Root / Target Node (Turquoise)
        {
          selector: 'node[?is_root], node[?is_target]',
          style: {
            'border-color': primaryTurquoise,
            'border-width': 4,
            'background-color': nodeBg,
            'width': 46,
            'height': 46
          }
        },
        // Selected Node Highlight
        {
          selector: 'node:selected',
          style: {
            'border-color': primaryTurquoise,
            'border-width': 4,
            'background-color': nodeBg
          }
        },
        // Edge styling (directed arrow)
        {
          selector: 'edge',
          style: {
            'width': 'mapData(weight, 1000, 500000, 1.5, 6)',
            'line-color': edgeColor,
            'target-arrow-color': edgeColor,
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.2,
            'opacity': 0.85
          }
        },
        // Suspicious Edge (#FF5C6C)
        {
          selector: 'edge[?is_suspicious]',
          style: {
            'line-color': '#FF5C6C',
            'target-arrow-color': '#FF5C6C',
            'width': 3.5,
            'line-style': 'dashed',
            'opacity': 0.95
          }
        },
        // Edge Selected
        {
          selector: 'edge:selected',
          style: {
            'line-color': primaryTurquoise,
            'target-arrow-color': primaryTurquoise,
            'width': 4,
            'opacity': 1
          }
        },
        // Highlighted in circular loops
        {
          selector: '.cycle-highlight',
          style: {
            'line-color': '#FFD23F',
            'target-arrow-color': '#FFD23F',
            'border-color': '#FFD23F',
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
  }, [graphData, layoutName, riskFilter, minAmount, isDark]);

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
    <div className="relative w-full h-full min-h-[500px] fintech-card overflow-hidden flex flex-col">
      {/* Top Controls Toolbar */}
      <div className="p-3 bg-fintech-surface border-b border-fintech-border flex flex-wrap items-center justify-between gap-3 text-xs z-10">
        <div className="flex items-center gap-2">
          <span className="text-fintech-muted font-mono font-medium flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-fintech-primary" />
            FILTER RISK:
          </span>
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setRiskFilter(lvl)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wider font-mono transition ${
                riskFilter === lvl
                  ? 'btn-primary'
                  : 'bg-fintech-card text-fintech-muted hover:text-fintech-text border border-fintech-border'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Layout Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-fintech-muted font-mono text-[11px]">LAYOUT:</span>
          <select
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            className="bg-fintech-card border border-fintech-border text-fintech-text text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-fintech-primary font-mono"
          >
            <option value="cose">Force-Directed (cose)</option>
            <option value="circle">Circular Ring</option>
            <option value="breadthfirst">Hierarchical (Tree)</option>
            <option value="concentric">Concentric Layers</option>
            <option value="grid">Grid</option>
          </select>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-fintech-card p-1 rounded-lg border border-fintech-border">
          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-fintech-surface text-fintech-muted hover:text-fintech-text rounded"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-fintech-surface text-fintech-muted hover:text-fintech-text rounded"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleFit}
            className="p-1 hover:bg-fintech-surface text-fintech-muted hover:text-fintech-text rounded"
            title="Fit Canvas"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Mount Container */}
      <div ref={containerRef} className="flex-1 w-full h-full min-h-[460px] cursor-grab active:cursor-grabbing bg-transparent" />

      {/* Bottom Canvas Stats & Legend */}
      <div className="p-2.5 bg-fintech-surface border-t border-fintech-border flex items-center justify-between text-[11px] font-mono text-fintech-muted px-4">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5C6C]" /> High Risk (Alert)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFD23F]" /> Medium Risk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" /> Low Risk (Normal)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-[#FF5C6C]" /> Flagged Transfer
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
