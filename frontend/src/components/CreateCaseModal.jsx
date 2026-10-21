import React, { useState, useEffect } from 'react';
import { X, Briefcase, ShieldAlert, CheckCircle2, UserCheck, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

export default function CreateCaseModal({ isOpen, onClose, initialData = {}, onCaseCreated }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('High');
  const [investigator, setInvestigator] = useState('Special Investigator Rajesh Verma');
  const [investigatorsList, setInvestigatorsList] = useState([]);
  const [primaryAccount, setPrimaryAccount] = useState('');
  const [summary, setSummary] = useState('');
  const [sourceType, setSourceType] = useState('Manual');
  const [sourceRef, setSourceRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Load real institutional investigators from backend
      api.getInvestigators()
        .then((list) => {
          if (Array.isArray(list) && list.length > 0) {
            setInvestigatorsList(list);
            setInvestigator(list[0].name || list[0].badge_id);
          }
        })
        .catch(() => {});

      const targetId = initialData.account_id || initialData.id || '';
      const initialSource = initialData.source_type || (initialData.complaint_id ? 'Complaint' : (targetId ? 'GNN Alert' : 'Manual'));
      const initialSourceRef = initialData.complaint_id || initialData.alert_id || (targetId ? `GNN-RISK-${targetId}` : '');

      setTitle(
        initialData.title ||
        (initialData.complaint_id
          ? `Investigation: Cyber Crime FIR ${initialData.complaint_id} (${targetId || 'Conduit'})`
          : targetId
            ? `Investigation into Mule Account ${targetId}`
            : 'Suspicious Money Flow Investigation')
      );

      setPriority(
        initialData.priority ||
        ((initialData.risk_score || 0) >= 0.75 ? 'Critical' : 'High')
      );

      setPrimaryAccount(targetId);
      setSourceType(initialSource);
      setSourceRef(initialSourceRef);

      setSummary(
        initialData.summary ||
        (targetId
          ? `Account ${targetId} flagged with risk score ${initialData.risk_score ? (initialData.risk_score * 100).toFixed(1) + '%' : 'elevated'} (${initialData.risk_level || 'Suspect'}). Graph analysis detected abnormal velocity and pass-through patterns.`
          : 'Flagged by GraphSAGE neural network for abnormal transaction velocity and rapid multi-hop fund dissemination.')
      );

      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!title.trim()) {
      setError('Please provide an investigation case title.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const initialEvidence = [];
    if (primaryAccount.trim()) {
      initialEvidence.push({
        evidence_type: 'ACCOUNT',
        reference_id: primaryAccount.trim(),
        description: `Primary subject account flagged with risk score ${initialData.risk_score ? (initialData.risk_score * 100).toFixed(1) + '%' : 'N/A'}`
      });
    }

    if (sourceRef.trim() && sourceType === 'Complaint') {
      initialEvidence.push({
        evidence_type: 'COMPLAINT',
        reference_id: sourceRef.trim(),
        description: `Source Cyber Crime FIR correlated with subject account`
      });
    }

    try {
      const res = await api.createCase({
        title: title.trim(),
        priority,
        assigned_investigator: investigator,
        primary_account_id: primaryAccount.trim() || null,
        summary: summary.trim(),
        findings: 'Preliminary graph analysis indicates potential conduit/mule account behavior across financial network.',
        source_type: sourceType,
        source_reference_id: sourceRef.trim() || null,
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
      <div className="w-full max-w-lg bg-navy-900 border border-slate-700 rounded-xl shadow-glass overflow-hidden flex flex-col animate-fadeIn">
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-500/50 text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Case Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Investigation into Mule Ring Layering Network"
              className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-electric-400 text-xs"
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
              {investigatorsList.length > 0 ? (
                <select
                  value={investigator}
                  onChange={(e) => setInvestigator(e.target.value)}
                  className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-electric-400 text-xs"
                >
                  {investigatorsList.map((inv) => (
                    <option key={inv.id || inv.badge_id} value={inv.name}>
                      {inv.name} ({inv.badge_id})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={investigator}
                  onChange={(e) => setInvestigator(e.target.value)}
                  className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-electric-400 text-xs"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Primary Subject Account</label>
              <input
                type="text"
                value={primaryAccount}
                onChange={(e) => setPrimaryAccount(e.target.value)}
                placeholder="e.g. MULE_AGG_01"
                className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-electric-400 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Investigation Source</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-electric-400 text-xs"
              >
                <option value="GNN Alert">GNN Mule Alert</option>
                <option value="Money Trail">Multi-Hop Money Trail</option>
                <option value="Complaint">Cyber Crime FIR (1930)</option>
                <option value="Manual">Manual Intake / Analyst Referral</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Investigative Summary & Premise</label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Outline the initial investigative premise, suspected mule typology, and rapid pass-through velocity..."
              className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-electric-400 text-xs resize-none leading-relaxed"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-electric-600 hover:bg-electric-500 text-white font-semibold rounded-lg shadow-glow-electric transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? 'Creating Docket...' : 'Create Formal Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
