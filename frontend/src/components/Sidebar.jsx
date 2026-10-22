import React from 'react';
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
  Workflow
} from 'lucide-react';

export default function Sidebar({ currentPage, setCurrentPage, selectedAccount, selectedCaseId }) {
  const navSections = [
    {
      title: "OVERVIEW",
      items: [
        { id: "landing", label: "Command Overview", icon: Home, badge: "Intelligence" },
        { id: "pipeline", label: "System Pipeline", icon: Workflow, badge: "Core" },
        { id: "dashboard", label: "Executive Dashboard", icon: LayoutDashboard },
      ]
    },
    {
      title: "DATA & TRANSACTIONS",
      items: [
        { id: "upload", label: "Data Ingestion (CSV)", icon: UploadCloud },
        { id: "transactions", label: "Transaction Explorer", icon: FileSpreadsheet },
      ]
    },
    {
      title: "INTELLIGENCE & AI",
      items: [
        { id: "mule-detection", label: "Mule Account Detection", icon: ShieldAlert, badge: "GNN" },
        { id: "graph", label: "Graph Investigation", icon: Network },
        { id: "money-trail", label: "Money Trail Analysis", icon: Share2 },
        { id: "complaints", label: "Complaint Correlation", icon: FileWarning },
      ]
    },
    {
      title: "CASE MANAGEMENT",
      items: [
        { id: "cases", label: "Investigation Cases", icon: Briefcase },
        { id: "case-details", label: "Case Dossier & Evidence", icon: FileText },
      ]
    },
    {
      title: "GOVERNANCE",
      items: [
        { id: "analytics-reports", label: "Reports & Analytics", icon: BarChart3 },
        { id: "settings-model", label: "GNN Model & Settings", icon: Cpu },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-navy-900 border-r border-slate-800 flex flex-col h-screen select-none shrink-0 z-20">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-electric-600 to-sky-400 flex items-center justify-center shadow-glow-electric text-white">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white tracking-wider text-base font-mono">FINTRACE</span>
            <span className="text-[10px] bg-electric-500/20 text-electric-400 border border-electric-500/30 font-semibold px-1.5 py-0.2 rounded font-mono">
              AI GNN
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Financial Crime Intel</p>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase font-mono">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                    isActive
                      ? "bg-electric-500/15 text-electric-300 border border-electric-500/40 shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-electric-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] bg-electric-500/20 text-electric-300 px-1.5 py-0.5 rounded font-mono font-semibold">
                      {item.badge}
                    </span>
                  )}
                  {isActive && !item.badge && (
                    <ChevronRight className="w-3.5 h-3.5 text-electric-400" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Selected Account Quick Context */}
      {selectedAccount && (
        <div className="p-3 mx-3 mb-2 rounded-lg bg-navy-850 border border-electric-500/30 text-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="font-mono">ACTIVE TARGET</span>
            <span className="text-electric-400 font-bold">Selected</span>
          </div>
          <div className="font-mono font-semibold text-white truncate">{selectedAccount}</div>
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={() => setCurrentPage("graph")}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-[10px] py-1 rounded text-slate-200 transition"
            >
              Graph
            </button>
            <button
              onClick={() => setCurrentPage("money-trail")}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-[10px] py-1 rounded text-slate-200 transition"
            >
              Trail
            </button>
          </div>
        </div>
      )}

      {/* Security Clearance Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-navy-950/60 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <div>
            <div className="text-slate-200 font-medium">Session Active</div>
            <div className="text-[10px] text-slate-500 font-mono">Investigation Workspace</div>
          </div>
        </div>
        <span className="text-[9px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded font-mono text-slate-300">
          v1.0
        </span>
      </div>
    </aside>
  );
}
