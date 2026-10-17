import React, { useState } from 'react';
import { X, Briefcase, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function CreateCaseModal({ isOpen, onClose, initialData = {}, onCaseCreated }) {
  const [title, setTitle] = useState(initialData.title || (initialData.account_id ? `Investigation into Mule Account ${initialData.account_id}` : 'Suspicious Money Flow Investigation'));
  const [priority, setPriority] = useState(initialData.priority || 'High');
  const [investigator, setInvestigator] = useState('Senior Investigator Vikramaditya');
  const [primaryAccount, setPrimaryAccount] = useState(initialData.account_id || '');
  const [summary, setSummary] = useState(initialData.summary || 'Flagged by GraphSAGE neural network for abnormal transaction velocity and rapid multi-hop fund dissemination.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const initialEvidence = [];
    if (primaryAccount) {
      initialEvidence.push({
        evidence_type: 'ACCOUNT',
        reference_id: primaryAccount,
        description: `Primary subject account flagged with risk score ${initialData.risk_score || 'N/A'}`
      });
    }

    try {
      const res = await api.createCase({
        title,
        priority,
        assigned_investigator: investigator,
        primary_account_id: primaryAccount || null,
        summary,
        findings: 'Preliminary graph analysis indicates potential conduit/mule account behavior.',
        initial_evidence: initialEvidence
      });

      if (onCaseCreated) {
        onCaseCreated(res);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create case');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-navy-900 border border-slate-700 rounded-xl shadow-glass overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-navy-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-electric-600/20 border border-electric-500/30 flex items-center justify-center text-electric-400">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Initiate Investigation Case</h3>
              <p className="text-[11px] text-slate-400">Escalate flagged activity to formal investigative docket</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Case Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-electric-400 font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-electric-400 text-xs"
              >
                <option value="Critical">Critical Priority</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Assigned Investigator</label>
              <input
                type="text"
                value={investigator}
                onChange={(e) => setInvestigator(e.target.value)}
                className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-electric-400 text-xs"
              >
              </input>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Primary Target Account ID</label>
            <input
              type="text"
              value={primaryAccount}
              onChange={(e) => setPrimaryAccount(e.target.value)}
              placeholder="e.g. MULE_AGG_01"
              className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-electric-400 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Investigative Summary & Premise</label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-electric-400 text-xs resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-electric-600 hover:bg-electric-500 text-white font-semibold rounded-lg shadow-glow-electric transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? 'Creating Case...' : 'Create Formal Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
