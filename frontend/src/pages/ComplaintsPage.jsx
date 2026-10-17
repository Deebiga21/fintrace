import React, { useEffect, useState } from 'react';
import {
  FileWarning,
  Search,
  Plus,
  Link as LinkIcon,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  X,
  ShieldAlert,
  Building,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

export default function ComplaintsPage({
  setCurrentPage,
  onAccountSelect,
  onOpenCreateCase,
  refreshTrigger
}) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Complaint Form State
  const [newId, setNewId] = useState(`CMP-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [complainant, setComplainant] = useState('');
  const [accId, setAccId] = useState('');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [source, setSource] = useState('National Cyber Crime Reporting Portal (1930)');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const data = await api.getComplaints({ search: search || undefined });
      setComplaints(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [search, refreshTrigger]);

  const handleCreateComplaint = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createComplaint({
        complaint_id: newId,
        date_reported: new Date().toISOString(),
        complainant_name: complainant,
        reported_account_id: accId.trim().toUpperCase(),
        amount_lost: parseFloat(amount) || 0,
        description: desc,
        status: "Linked",
        source: source
      });
      setIsModalOpen(false);
      setComplainant('');
      setAccId('');
      setAmount('');
      setDesc('');
      setNewId(`CMP-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      fetchComplaints();
    } catch (err) {
      alert("Failed to record complaint: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-amber-400" />
            <span>Step 7: Cybercrime Complaint Cross-Correlation Engine</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Correlate victim fraud complaints from national portals and police FIRs with flagged banking mule accounts.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-electric-600 hover:bg-electric-500 text-white font-bold text-xs shadow-glow-electric transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Complaint</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Complaint ID, Complainant, Subject Account, or Narrative..."
            className="w-full pl-9 pr-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-electric-400"
          />
        </div>

        <div className="flex items-center gap-2 text-slate-400 font-mono text-xs">
          <span>TOTAL COMPLAINTS:</span>
          <span className="font-bold text-white">{complaints.length}</span>
        </div>
      </div>

      {/* Complaints Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {complaints.map((c) => (
          <div
            key={c.complaint_id}
            className="p-5 rounded-xl bg-navy-900 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-4 shadow-sm"
          >
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40 text-[11px]">
                  {c.complaint_id}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(c.date_reported).toLocaleDateString()}
                </span>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">Victim Complainant</div>
                <div className="text-sm font-bold text-white">{c.complainant_name}</div>
                <div className="text-xs text-rose-400 font-mono font-semibold mt-0.5">
                  Loss Claim: ₹{c.amount_lost.toLocaleString()}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-navy-950 border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed italic">
                "{c.description}"
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] text-slate-500 font-mono">REPORTED BENEFICIARY MULE:</div>
                <button
                  onClick={() => {
                    if (onAccountSelect) onAccountSelect(c.reported_account_id);
                    setCurrentPage("mule-detection");
                  }}
                  className="font-mono text-xs font-bold text-electric-300 hover:text-electric-200 flex items-center gap-1.5"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-electric-400" />
                  <span>{c.reported_account_id}</span>
                </button>
              </div>

              <div className="text-[10px] text-slate-500 font-mono">
                Source: <span className="text-slate-400 font-sans">{c.source}</span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  if (onAccountSelect) onAccountSelect(c.reported_account_id);
                  setCurrentPage("money-trail");
                }}
                className="px-3 py-1.5 rounded bg-navy-850 hover:bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-semibold transition"
              >
                Trace Flow
              </button>
              <button
                onClick={() => {
                  if (onOpenCreateCase) {
                    onOpenCreateCase({
                      account_id: c.reported_account_id,
                      title: `FIR Investigation: Complaint ${c.complaint_id}`,
                      summary: `Cyber victim ${c.complainant_name} reported loss of Rs ${c.amount_lost} routed to suspect account ${c.reported_account_id}. Narrative: ${c.description}`
                    });
                  }
                }}
                className="px-3 py-1.5 rounded bg-electric-600/30 hover:bg-electric-600/50 text-electric-300 border border-electric-500/40 text-[11px] font-bold transition flex items-center gap-1"
              >
                <Briefcase className="w-3 h-3" />
                <span>+ Launch Case</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* New Complaint Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-navy-900 border border-slate-700 rounded-xl shadow-glass overflow-hidden flex flex-col">
            <div className="p-4 bg-navy-850 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white tracking-wide">Register Cybercrime Complaint</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Complaint ID / FIR</label>
                  <input
                    type="text"
                    required
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-electric-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Complainant Full Name</label>
                  <input
                    type="text"
                    required
                    value={complainant}
                    onChange={(e) => setComplainant(e.target.value)}
                    placeholder="e.g. Ramesh K. Patel"
                    className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-electric-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Reported Destination Account</label>
                  <input
                    type="text"
                    required
                    value={accId}
                    onChange={(e) => setAccId(e.target.value)}
                    placeholder="e.g. MULE_AGG_01"
                    className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-electric-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Amount Lost (INR ₹)</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 75000"
                    className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-electric-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reporting Portal / Authority</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-electric-400"
                >
                  <option value="National Cyber Crime Reporting Portal (1930)">National Cyber Crime Reporting Portal (1930)</option>
                  <option value="State Police Cyber Cell FIR">State Police Cyber Cell FIR</option>
                  <option value="Bank Customer Grievance Desk">Bank Customer Grievance Desk</option>
                  <option value="Corporate Anti-Fraud Desk">Corporate Anti-Fraud Desk</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Incident Description & Modus Operandi</label>
                <textarea
                  rows={3}
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Detail phishing pretext, digital arrest claim, or fraudulent task scheme..."
                  className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-electric-400 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-electric-600 hover:bg-electric-500 text-white font-bold rounded-lg shadow-glow-electric disabled:opacity-50"
                >
                  {isSubmitting ? "Recording..." : "Save Complaint Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
