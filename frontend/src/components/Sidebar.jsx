import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  UploadCloud,
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
  ChevronDown,
  Workflow,
  Scale
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    id: 'command',
    title: 'Fintech core',
    items: [
      { id: 'dashboard', label: 'Capital Command', icon: LayoutDashboard, badge: 'Live' },
      { id: 'landing', label: 'Showcase Landing', icon: Home },
      { id: 'pipeline', label: 'Execution Pipeline', icon: Workflow }
    ]
  },
  {
    id: 'ledger',
    title: 'Ledger & ingestion',
    items: [
      { id: 'transactions', label: 'Transaction Ledger', icon: FileSpreadsheet },
      { id: 'upload', label: 'Data Ingestion (CSV)', icon: UploadCloud }
    ]
  },
  {
    id: 'intelligence',
    title: 'AI intelligence',
    items: [
      { id: 'mule-detection', label: 'Mule Account Detection', icon: ShieldAlert, badge: 'GNN' },
      { id: 'graph', label: 'Graph Topology Canvas', icon: Network },
      { id: 'money-trail', label: 'Money Trail Analysis', icon: Share2 },
      { id: 'complaints', label: 'Complaint Correlation', icon: FileWarning }
    ]
  },
  {
    id: 'cases',
    title: 'Investigation desk',
    items: [
      { id: 'cases', label: 'Investigation Cases', icon: Briefcase },
      { id: 'case-details', label: 'Case Dossier & Evidence', icon: FileText }
    ]
  },
  {
    id: 'models',
    title: 'Analytics & models',
    items: [
      { id: 'analytics-reports', label: 'Financial Reports', icon: BarChart3 },
      { id: 'settings-model', label: 'Model Architecture', icon: Cpu }
    ]
  },
  {
    id: 'legal',
    title: 'Compliance & legal',
    items: [{ id: 'legal-privacy', label: 'Privacy & Compliance', icon: Scale, badge: 'DPDP' }]
  }
];

export default function Sidebar({ currentPage, setCurrentPage, selectedAccount }) {
  // Accordion state: open the section that owns the current page.
  const [openSections, setOpenSections] = useState(() => {
    const activeSec = NAV_SECTIONS.find((sec) => sec.items.some((item) => item.id === currentPage));
    return activeSec ? { [activeSec.id]: true } : { command: true };
  });

  useEffect(() => {
    const parentSec = NAV_SECTIONS.find((sec) => sec.items.some((item) => item.id === currentPage));
    if (parentSec) {
      setOpenSections((prev) => ({ ...prev, [parentSec.id]: true }));
    }
  }, [currentPage]);

  const toggleSection = (secId) => {
    setOpenSections((prev) => ({ ...prev, [secId]: !prev[secId] }));
  };

  return (
    <aside className="w-64 bg-canvas border-r border-rule flex flex-col h-screen select-none shrink-0 z-20 font-sans">
      {/* Brand */}
      <div className="h-14 px-4 border-b border-rule flex items-center shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg border border-rule flex items-center justify-center text-ink shrink-0">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M3 17 9 11l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold tracking-tight text-ink leading-none">
                FinTrace
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--focus)] border border-[rgba(31,200,219,0.35)] rounded px-1 py-px leading-none">
                AML
              </span>
            </div>
            <p className="ft-label text-[9px] mt-1 truncate">Capital &amp; AML Desk</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        <div className="px-4 pb-2 ft-label">Navigation</div>

        {NAV_SECTIONS.map((section, index) => {
          const isOpen = !!openSections[section.id];
          const hasActiveItem = section.items.some((item) => item.id === currentPage);

          return (
            <div key={section.id} className={index > 0 ? 'border-t border-rule' : ''}>
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left group"
              >
                <span
                  className={`ft-label truncate transition-colors ${
                    hasActiveItem ? 'text-ink' : 'group-hover:text-ink-muted'
                  }`}
                >
                  {section.title}
                </span>
                <ChevronDown
                  className={`w-3 h-3 shrink-0 text-ink-faint transition-transform duration-150 ${
                    isOpen ? '' : '-rotate-90'
                  }`}
                />
              </button>

              {isOpen && (
                <div className="pb-2">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCurrentPage(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`relative w-full flex items-center justify-between gap-2 pl-4 pr-3 py-1.5 text-[12px] transition-colors ${
                          isActive
                            ? 'text-ink bg-white/[0.045]'
                            : 'text-ink-muted hover:text-ink hover:bg-white/[0.025]'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1 bottom-1 w-px bg-[var(--focus)]" />
                        )}
                        <span className="flex items-center gap-2 min-w-0">
                          <Icon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive ? 'text-[var(--focus)]' : 'text-ink-faint'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </span>
                        {item.badge && (
                          <span className="ft-mono text-[9px] uppercase tracking-wider text-ink-faint border border-rule rounded px-1 py-px shrink-0">
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
      </nav>

      {/* Focused account */}
      {selectedAccount && (
        <div className="mx-4 mb-3 pt-3 border-t border-rule">
          <div className="flex items-center justify-between gap-2">
            <span className="ft-label text-[9px]">Focused account</span>
            <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-[var(--focus)]">
              <span className="ft-dot bg-[var(--focus)]" />
              Active
            </span>
          </div>
          <div className="ft-mono text-[11px] text-ink truncate mt-1.5">{selectedAccount}</div>
          <div className="flex gap-1.5 mt-2">
            <button
              type="button"
              onClick={() => setCurrentPage('graph')}
              className="ft-btn-ghost flex-1 py-1 text-[10px]"
            >
              Graph
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage('money-trail')}
              className="ft-btn-ghost flex-1 py-1 text-[10px]"
            >
              Trail
            </button>
          </div>
        </div>
      )}

      {/* Status */}
      <div className="h-11 px-4 border-t border-rule flex items-center justify-between gap-2 shrink-0">
        <span className="inline-flex items-center gap-2">
          <span className="ft-dot bg-[var(--status-gain)]" />
          <span className="ft-label text-[9px]">WSS online</span>
        </span>
        <span className="ft-mono text-[9px] uppercase tracking-wider text-ink-faint">Ready</span>
      </div>
    </aside>
  );
}
