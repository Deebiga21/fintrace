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
            'color': '#4A4A4A',
            'text-valign': 'bottom',
            'text-margin-y': 4,
            'background-color': '#FFFFFF',
            'border-width': 2,
            'border-color': 'rgba(232, 194, 187, 0.75)',
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': '0.2s'
          }
        },
        // Medium Risk
        {
          selector: 'node[risk_level = "Medium"], node[risk_level = "MEDIUM"]',
          style: {
            'background-color': '#F7D6D0',
            'border-color': '#E2B4BD',
            'width': 34,
            'height': 34
          }
        },
        // High Risk Node
        {
          selector: 'node[risk_level = "High"], node[risk_level = "HIGH"]',
          style: {
            'background-color': '#DC2626',
            'border-color': '#B86B7A',
            'border-width': 3,
            'color': '#DC2626',
            'width': 40,
            'height': 40
          }
        },
        // Root / Target Node
        {
          selector: 'node[?is_root], node[?is_target]',
          style: {
            'border-color': '#B86B7A',
            'border-width': 4,
            'background-color': '#FFFFFF',
            'width': 46,
            'height': 46
          }
        },
        // Selected Node Highlight
        {
          selector: 'node:selected',
          style: {
            'border-color': '#B86B7A',
            'border-width': 4,
            'background-color': '#FDF1F0'
          }
        },
        // Edge styling (directed arrow)
        {
          selector: 'edge',
          style: {
            'width': 'mapData(weight, 1000, 500000, 1.5, 6)',
            'line-color': 'rgba(232, 194, 187, 0.7)',
            'target-arrow-color': 'rgba(184, 107, 122, 0.7)',
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
            'line-color': '#DC2626',
            'target-arrow-color': '#DC2626',
            'width': 3.5,
            'line-style': 'dashed',
            'opacity': 0.95
          }
        },
        // Edge Selected
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#B86B7A',
            'target-arrow-color': '#B86B7A',
            'width': 4,
            'opacity': 1
          }
        },
        // Highlighted in circular loops
        {
          selector: '.cycle-highlight',
          style: {
            'line-color': '#B86B7A',
            'target-arrow-color': '#B86B7A',
            'border-color': '#B86B7A',
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
    <div className="relative w-full h-full min-h-[500px] bg-[#FFF5F5] rounded-xl border border-[#E8C2BB] overflow-hidden flex flex-col">
      {/* Top Controls Toolbar */}
      <div className="p-3 bg-[#FFFFFF]/95 border-b border-[#E8C2BB] flex flex-wrap items-center justify-between gap-3 text-xs z-10">
        <div className="flex items-center gap-2">
          <span className="text-[#6E6264] font-mono font-medium flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#B86B7A]" />
            FILTER RISK:
          </span>
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setRiskFilter(lvl)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wider font-mono transition ${
                riskFilter === lvl
                  ? 'bg-[#F7D6D0] text-[#4A4A4A] border border-[#E2B4BD]'
                  : 'bg-[#FDF1F0] text-[#6E6264] hover:text-[#4A4A4A] border border-[#E8C2BB]'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Layout Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-[#6E6264] font-mono text-[11px]">LAYOUT:</span>
          <select
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            className="bg-[#FDF1F0] border border-[#E8C2BB] text-[#4A4A4A] text-xs rounded px-2.5 py-1 focus:outline-none focus:border-[#B86B7A] font-mono"
          >
            <option value="cose">Force-Directed (cose)</option>
            <option value="circle">Circular Ring</option>
            <option value="breadthfirst">Hierarchical (Tree)</option>
            <option value="concentric">Concentric Layers</option>
            <option value="grid">Grid</option>
          </select>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-[#FDF1F0] p-1 rounded-lg border border-[#E8C2BB]">
          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-[#F7D6D0] text-[#6E6264] hover:text-[#4A4A4A] rounded"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-[#F7D6D0] text-[#6E6264] hover:text-[#4A4A4A] rounded"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleFit}
            className="p-1 hover:bg-[#F7D6D0] text-[#6E6264] hover:text-[#4A4A4A] rounded"
            title="Fit Canvas"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Mount Container */}
      <div ref={containerRef} className="flex-1 w-full h-full min-h-[460px] cursor-grab active:cursor-grabbing" />

      {/* Bottom Canvas Stats & Legend */}
      <div className="p-2.5 bg-[#FFFFFF]/95 border-t border-[#E8C2BB] flex items-center justify-between text-[11px] font-mono text-[#6E6264] px-4">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" /> High Risk Mule
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B86B7A]" /> Medium Risk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E8C2BB]" /> Low Risk Account
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-[#DC2626]" /> Flagged Transfer
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
