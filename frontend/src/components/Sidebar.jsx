import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Layers,
  Network,
  Share2,
  FileSpreadsheet,
  FileWarning,
  Briefcase,
  FileText,
  BarChart3,
  Cpu,
  Home,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  Workflow,
  Lock,
  Scale,
  Copyright,
  Shield
} from 'lucide-react';

export default function Sidebar({ currentPage, setCurrentPage, selectedAccount, selectedCaseId }) {
  const navSections = [
    {
      id: "command",
      title: "COMMAND HUB",
      items: [
        { id: "landing", label: "Command Overview", icon: Home, badge: "HUD" },
        { id: "dashboard", label: "HUD Dashboard", icon: LayoutDashboard, badge: "Live" },
        { id: "pipeline", label: "System Pipeline", icon: Workflow },
      ]
    },
    {
      id: "ingestion",
      title: "DATA & INGESTION",
      items: [
        { id: "upload", label: "Data Ingestion (CSV)", icon: UploadCloud },
        { id: "transactions", label: "Transaction Explorer", icon: FileSpreadsheet },
      ]
    },
    {
      id: "intelligence",
      title: "AI INTELLIGENCE",
      items: [
        { id: "mule-detection", label: "Mule Account Detection", icon: ShieldAlert, badge: "GNN" },
        { id: "graph", label: "Graph Topology Canvas", icon: Network },
        { id: "money-trail", label: "Money Trail Analysis", icon: Share2 },
        { id: "complaints", label: "Complaint Correlation", icon: FileWarning },
      ]
    },
    {
      id: "cases",
      title: "CASE MANAGEMENT",
      items: [
        { id: "cases", label: "Investigation Cases", icon: Briefcase },
        { id: "case-details", label: "Case Dossier & Evidence", icon: FileText },
      ]
    },
    {
      id: "models",
      title: "SYSTEM & MODELS",
      items: [
        { id: "analytics-reports", label: "Reports & Analytics", icon: BarChart3 },
        { id: "settings-model", label: "Model Config & Retrain", icon: Cpu },
      ]
    },
    {
      id: "legal",
      title: "LEGAL & COMPLIANCE",
      items: [
        { id: "legal-privacy", label: "Privacy, TOS & Copyrights", icon: Scale, badge: "DPDP" }
      ]
    }
  ];

  // Accordion state: keep active section open, others collapsible
  const [openSections, setOpenSections] = useState(() => {
    const activeSec = navSections.find(sec => sec.items.some(item => item.id === currentPage));
    return activeSec ? { [activeSec.id]: true } : { command: true };
  });

  // When currentPage changes, ensure its parent dropdown is open
  useEffect(() => {
    const parentSec = navSections.find(sec => sec.items.some(item => item.id === currentPage));
    if (parentSec) {
      setOpenSections(prev => ({ ...prev, [parentSec.id]: true }));
    }
  }, [currentPage]);

  const toggleSection = (secId) => {
    setOpenSections(prev => ({
      ...prev,
      [secId]: !prev[secId]
    }));
  };

  return (
    <aside className="w-64 bg-[#05080A] border-r border-[#1B1F22] flex flex-col h-screen select-none shrink-0 z-20 font-['Titillium_Web',sans-serif]">
      {/* Brand Header */}
      <div className="p-3.5 border-b border-[#1B1F22] flex items-center gap-3 bg-[#000000]">
        <div className="w-8 h-8 bg-[#0B2E33] border border-[#22D3E6] rotate-45 flex items-center justify-center shrink-0">
          <Layers className="w-4 h-4 text-[#22D3E6] -rotate-45" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-['Krona_One',sans-serif] text-sm text-white tracking-widest uppercase">
              FINTRACE
            </span>
            <span className="text-[10px] bg-[#FFFFFF] text-[#050505] font-['Rajdhani',sans-serif] font-bold px-1.5 py-0.2 tracking-wider uppercase">
              HUD
            </span>
          </div>
          <p className="text-[10px] text-[#9AA0A6] font-['Share_Tech_Mono',monospace]">AI INVESTIGATION</p>
        </div>
      </div>

      {/* Dropdown Menus Area */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-2.5">
        <div className="px-2 pb-1 text-[10px] font-['Share_Tech_Mono',monospace] text-[#5A5F64] tracking-widest uppercase border-b border-[#1B1F22]">
          DIRECTORY // SYSTEM_FS
        </div>

        {navSections.map((section) => {
          const isOpen = !!openSections[section.id];
          const hasActiveItem = section.items.some(item => item.id === currentPage);

          return (
            <div key={section.id} className="border border-[#1B1F22] bg-[#05080A] overflow-hidden">
              {/* Dropdown Header Trigger */}
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className={`w-full flex items-center justify-between p-2 text-left transition-all ${
                  hasActiveItem ? 'bg-[#0B2E33]/60' : 'hover:bg-[#12161A]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {/* Diamond Icon */}
                  <div className={`w-3.5 h-3.5 rotate-45 flex items-center justify-center shrink-0 transition-colors ${
                    hasActiveItem ? 'bg-[#22D3E6] border border-[#22D3E6]' : 'bg-[#050505] border border-[#5A5F64]'
                  }`}>
                    {hasActiveItem && <div className="w-1 h-1 bg-[#050505]" />}
                  </div>

                  {/* White Tag Placard */}
                  <span className={`font-['Rajdhani',sans-serif] text-[12px] font-bold uppercase tracking-wider px-2 py-0.5 truncate transition ${
                    hasActiveItem
                      ? 'bg-[#FFFFFF] text-[#050505]'
                      : 'bg-[#12161A] text-[#bbc9cb] group-hover:text-white'
                  }`}>
                    {section.title}
                  </span>
                </div>

                {/* Chevron Dropdown Indicator */}
                <div className="text-[#9AA0A6] shrink-0 pl-1">
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#22D3E6]" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#5A5F64]" />
                  )}
                </div>
              </button>

              {/* Collapsible Dropdown Menu Content */}
              {isOpen && (
                <div className="py-1 px-1.5 space-y-0.5 border-t border-[#1B1F22] bg-[#000000]">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCurrentPage(item.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-[#0B2E33] text-white border-l-2 border-[#22D3E6]'
                            : 'text-[#9AA0A6] hover:text-[#22D3E6] hover:bg-[#05080A]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[#5A5F64] font-['Share_Tech_Mono',monospace] text-[11px]">↳</span>
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#22D3E6]' : 'text-[#5A5F64]'}`} />
                          <span className="truncate tracking-wide text-[11px]">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[9px] bg-[#050505] text-[#22D3E6] border border-[#22D3E6]/40 px-1 font-['Share_Tech_Mono',monospace]">
                            {item.badge}
                          </span>
                        )}
                        {isActive && !item.badge && (
                          <div className="w-1.5 h-1.5 bg-[#22D3E6] rotate-45 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Account Target Quick Context */}
      {selectedAccount && (
        <div className="p-2.5 mx-2.5 mb-2 bg-[#000000] border border-[#1B1F22] text-xs">
          <div className="flex items-center justify-between text-[9px] text-[#9AA0A6] mb-1 font-['Share_Tech_Mono',monospace]">
            <span>TARGET_NODE</span>
            <span className="text-[#22D3E6] font-bold">FOCUSED</span>
          </div>
          <div className="font-['Share_Tech_Mono',monospace] font-bold text-white truncate text-xs">{selectedAccount}</div>
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={() => setCurrentPage("graph")}
              className="flex-1 bg-[#05080A] hover:bg-[#0B2E33] text-[10px] py-0.5 text-[#22D3E6] hover:text-white transition font-['Rajdhani',sans-serif] font-bold uppercase tracking-wider border border-[#1B1F22]"
            >
              Graph
            </button>
            <button
              onClick={() => setCurrentPage("money-trail")}
              className="flex-1 bg-[#05080A] hover:bg-[#0B2E33] text-[10px] py-0.5 text-[#22D3E6] hover:text-white transition font-['Rajdhani',sans-serif] font-bold uppercase tracking-wider border border-[#1B1F22]"
            >
              Trail
            </button>
          </div>
        </div>
      )}

      {/* Security Clearance Footer */}
      <div className="p-2.5 border-t border-[#1B1F22] bg-[#000000] text-[10px] text-[#9AA0A6] flex items-center justify-between font-['Share_Tech_Mono',monospace]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#22D3E6] animate-pulse"></div>
          <div>
            <div className="text-white text-[10px] font-bold">KERNEL LIVE</div>
            <div className="text-[9px] text-[#5A5F64]">WSS: CONNECTED</div>
          </div>
        </div>
        <button
          onClick={() => setCurrentPage('legal-privacy')}
          className="text-[9px] bg-[#05080A] hover:bg-[#0B2E33] border border-[#1B1F22] hover:border-[#22D3E6] px-1.5 py-0.5 text-[#22D3E6] font-bold uppercase transition"
          title="View Legal Policies, Privacy & Copyrights"
        >
          LEGAL / PMLA
        </button>
      </div>
    </aside>
  );
}
