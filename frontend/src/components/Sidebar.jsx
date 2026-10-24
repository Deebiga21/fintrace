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
  CreditCard,
  Send
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';

export default function Sidebar({ currentPage, setCurrentPage, selectedAccount, selectedCaseId }) {
  const { isDark } = useTheme();

  const navSections = [
    {
      id: "command",
      title: "FINTECH CORE",
      items: [
        { id: "dashboard", label: "Capital Command", icon: LayoutDashboard, badge: "Live" },
        { id: "landing", label: "Showcase Landing", icon: Home },
        { id: "pipeline", label: "Execution Pipeline", icon: Workflow },
      ]
    },
    {
      id: "ledger",
      title: "LEDGER & INGESTION",
      items: [
        { id: "transactions", label: "Transaction Ledger", icon: FileSpreadsheet },
        { id: "upload", label: "Data Ingestion (CSV)", icon: UploadCloud },
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
      title: "INVESTIGATION DESK",
      items: [
        { id: "cases", label: "Investigation Cases", icon: Briefcase },
        { id: "case-details", label: "Case Dossier & Evidence", icon: FileText },
      ]
    },
    {
      id: "models",
      title: "ANALYTICS & MODELS",
      items: [
        { id: "analytics-reports", label: "Financial Reports", icon: BarChart3 },
        { id: "settings-model", label: "Model Architecture", icon: Cpu },
      ]
    },
    {
      id: "legal",
      title: "COMPLIANCE & LEGAL",
      items: [
        { id: "legal-privacy", label: "Privacy & Compliance", icon: Scale, badge: "DPDP" }
      ]
    }
  ];

  // Accordion state
  const [openSections, setOpenSections] = useState(() => {
    const activeSec = navSections.find(sec => sec.items.some(item => item.id === currentPage));
    return activeSec ? { [activeSec.id]: true } : { command: true };
  });

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
    <aside className="w-64 bg-fintech-card border-r border-fintech-border flex flex-col h-screen select-none shrink-0 z-20 font-sans transition-colors duration-200">
      {/* Brand Header */}
      <div className="p-4 border-b border-fintech-border flex items-center justify-between bg-fintech-surface">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-fintech-primary/15 border border-fintech-primary/30 flex items-center justify-center text-fintech-primary">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-fintech-text tracking-wide">
                FinTrace
              </span>
              <span className="text-[10px] bg-[#FFD23F] text-[#0B0B0F] font-bold px-1.5 py-0.2 rounded font-mono">
                FINTECH
              </span>
            </div>
            <p className="text-[10px] text-fintech-muted font-mono">CAPITAL &amp; AML DESK</p>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        <div className="px-2 pt-1 pb-1 text-[10px] font-mono font-bold text-fintech-muted tracking-wider uppercase">
          NAVIGATION MENU
        </div>

        {navSections.map((section) => {
          const isOpen = !!openSections[section.id];
          const hasActiveItem = section.items.some(item => item.id === currentPage);

          return (
            <div key={section.id} className="rounded-xl border border-fintech-borderSubtle bg-fintech-surface overflow-hidden">
              {/* Dropdown Header Trigger */}
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className={`w-full flex items-center justify-between p-2 text-left transition ${
                  hasActiveItem ? 'bg-fintech-elevated' : 'hover:bg-fintech-elevated'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full transition-colors ${
                    hasActiveItem ? 'bg-fintech-primary' : 'bg-fintech-border'
                  }`} />
                  <span className={`text-[11px] font-mono font-bold uppercase tracking-wider truncate ${
                    hasActiveItem ? 'text-fintech-text' : 'text-fintech-muted'
                  }`}>
                    {section.title}
                  </span>
                </div>

                <div className="text-fintech-muted shrink-0 pl-1">
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-fintech-primary" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </div>
              </button>

              {/* Collapsible Menu Items */}
              {isOpen && (
                <div className="py-1 px-1.5 space-y-0.5 border-t border-fintech-borderSubtle bg-fintech-card">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCurrentPage(item.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                          isActive
                            ? 'bg-fintech-surface text-fintech-primary font-bold border-l-2 border-fintech-primary shadow-sm'
                            : 'text-fintech-muted hover:text-fintech-text hover:bg-fintech-surface'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-fintech-primary' : 'text-fintech-muted'}`} />
                          <span className="truncate tracking-wide text-xs">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[9px] bg-fintech-surface text-fintech-primary border border-fintech-border px-1.5 py-0.2 rounded font-mono font-bold">
                            {item.badge}
                          </span>
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

      {/* Target Node Focus Card */}
      {selectedAccount && (
        <div className="p-3 mx-2.5 mb-2 rounded-xl bg-fintech-surface border border-fintech-border text-xs">
          <div className="flex items-center justify-between text-[10px] text-fintech-muted mb-1 font-mono">
            <span>FOCUSED ACCOUNT</span>
            <span className="text-fintech-primary font-bold">ACTIVE</span>
          </div>
          <div className="font-mono font-bold text-fintech-text truncate text-xs">{selectedAccount}</div>
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={() => setCurrentPage("graph")}
              className="flex-1 bg-fintech-card hover:bg-fintech-elevated text-[10px] py-1 text-fintech-primary transition font-bold uppercase tracking-wider rounded border border-fintech-border"
            >
              Graph
            </button>
            <button
              onClick={() => setCurrentPage("money-trail")}
              className="flex-1 bg-fintech-card hover:bg-fintech-elevated text-[10px] py-1 text-fintech-primary transition font-bold uppercase tracking-wider rounded border border-fintech-border"
            >
              Trail
            </button>
          </div>
        </div>
      )}

      {/* Footer with Theme Toggle */}
      <div className="p-3 border-t border-fintech-border bg-fintech-surface flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-fintech-text font-mono">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
            <span>FINTECH WSS</span>
          </div>
          <div className="text-[9px] text-fintech-muted font-mono">ONLINE &bull; READY</div>
        </div>

        <ThemeToggle size="sm" showLabel={false} />
      </div>
    </aside>
  );
}
