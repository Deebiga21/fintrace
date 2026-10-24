import React, { useState, useEffect } from 'react';
import { X, Briefcase, ShieldAlert, CheckCircle2, UserCheck, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

export default function CreateCaseModal({ isOpen, onClose, initialData = {}, onCaseCreated }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('High');
  const [investigator, setInvestigator] = useState('Investigator');
  const [investigatorsList, setInvestigatorsList] = useState([]);
  const [primaryAccount, setPrimaryAccount] = useState('');
  const [summary, setSummary] = useState('');
  const [sourceType, setSourceType] = useState('Manual');
  const [sourceRef, setSourceRef] = useState('');
  const [isSampleDemo, setIsSampleDemo] = useState(false);
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
      const initialSource = initialData.source_type || (initialData.complaint_id ? 'Complaint' : (initialData.alert_id ? 'GNN Alert' : 'Manual'));
      const initialSourceRef = initialData.complaint_id || initialData.alert_id || '';

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
          ? `Prototype review opened for account ${targetId}. Any displayed risk score is an unverified prioritization signal; inspect and attach the underlying records before documenting a finding.`
          : 'Record the referral reason and source record IDs here. No model finding or confirmed fraud conclusion is added automatically.')
      );

      setIsSampleDemo(false);
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
        description: isSampleDemo
          ? 'Synthetic sample account attached for prototype demonstration; not a real-world allegation.'
          : 'Primary subject account attached for investigator review; attachment alone does not indicate a model finding.'
      });
    }

    if (isSampleDemo) {
      initialEvidence.push(
        {
          evidence_type: 'TRANSACTION',
          reference_id: 'TXN_10167',
          description: 'Bundled synthetic sample transfer: MULE_AGG_01 to MULE_LAYER_02, ₹340,000, 2026-10-12 22:15.'
        },
        {
          evidence_type: 'TRANSACTION',
          reference_id: 'TXN_10168',
          description: 'Bundled synthetic sample transfer: MULE_LAYER_02 to CASHOUT_CRYPTO_09, ₹335,000, 2026-10-12 23:10.'
        }
      );
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
        findings: isSampleDemo
          ? 'DEMO ONLY — The bundled synthetic CSV contains TXN_10167 (MULE_AGG_01 → MULE_LAYER_02, ₹340,000) and TXN_10168 (MULE_LAYER_02 → CASHOUT_CRYPTO_09, ₹335,000). These are sample records for demonstrating the dossier workflow, not verified findings.'
          : '',
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
      <div className="w-full max-w-lg bg-[#252B37] border border-[#333D50] rounded-none shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="p-4 bg-navy-850 border-b border-[#333D50] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-electric-600/20 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6]">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F3F4F6] tracking-wide">Initiate Investigation Case</h3>
              <p className="text-[11px] text-[#93C5FD]">Escalate flagged activity to formal investigative docket</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#93C5FD] hover:text-[#F3F4F6] rounded-lg hover:bg-[#252B37] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/70 border border-[#FF3B4E]/50 text-[#FF3B4E] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#FF3B4E] shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <div className="p-3 rounded-lg bg-[#252B37] border border-[#3B82F6] text-[#F3F4F6] rounded-none space-y-2">
            <p className="font-semibold">Want to see a complete example?</p>
            <p className="text-[11px] leading-relaxed text-[#93C5FD]">
              Load the bundled synthetic MULE_AGG_01 example. It adds two sample transfer records as evidence and labels the case as a demo.
            </p>
            <button
              type="button"
              onClick={() => {
                setIsSampleDemo(true);
                setTitle('Sample review: MULE_AGG_01 transfer chain');
                setPrimaryAccount('MULE_AGG_01');
                setSourceType('Manual');
                setSourceRef('');
                setSummary('PROTOTYPE DEMO — Synthetic sample data only. TXN_10161–TXN_10166 send a combined ₹347,060.42 into MULE_AGG_01; TXN_10167 sends ₹340,000 to MULE_LAYER_02, followed by TXN_10168 sending ₹335,000 to CASHOUT_CRYPTO_09. Verify these IDs in the transaction records. This is not a real allegation or a trained-model finding.');
              }}
              className="px-2.5 py-1.5 rounded border border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6]/15 rounded-full font-semibold"
            >
              Load sample case details
            </button>
          </div>

          <div>
            <label className="block text-[#93C5FD] font-semibold mb-1">Case Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Investigation into Mule Ring Layering Network"
              className="w-full px-3 py-2 bg-[#1F242E] border border-[#333D50] rounded-lg text-[#F3F4F6] focus:outline-none focus:border-[#3B82F6] text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#93C5FD] font-semibold mb-1">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-[#1F242E] border border-[#333D50] rounded-lg text-[#F3F4F6] focus:outline-none focus:border-[#3B82F6] text-xs"
              >
                <option value="Critical">Critical Priority</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-[#93C5FD] font-semibold mb-1">Assigned Investigator</label>
              {investigatorsList.length > 0 ? (
                <select
                  value={investigator}
                  onChange={(e) => setInvestigator(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1F242E] border border-[#333D50] rounded-lg text-[#F3F4F6] focus:outline-none focus:border-[#3B82F6] text-xs"
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
                  className="w-full px-3 py-2 bg-[#1F242E] border border-[#333D50] rounded-lg text-[#F3F4F6] focus:outline-none focus:border-[#3B82F6] text-xs"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#93C5FD] font-semibold mb-1">Primary Subject Account</label>
              <input
                type="text"
                value={primaryAccount}
                onChange={(e) => setPrimaryAccount(e.target.value)}
                placeholder="e.g. MULE_AGG_01"
                className="w-full px-3 py-2 bg-[#1F242E] border border-[#333D50] rounded-lg text-[#F3F4F6] focus:outline-none focus:border-[#3B82F6] font-mono text-xs"
              />
              <p className="mt-1 text-[10px] text-slate-500">Use an exact account ID already present in the transaction records.</p>
            </div>

            <div>
              <label className="block text-[#93C5FD] font-semibold mb-1">Investigation Source</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full px-3 py-2 bg-[#1F242E] border border-[#333D50] rounded-lg text-[#F3F4F6] focus:outline-none focus:border-[#3B82F6] text-xs"
              >
                <option value="GNN Alert">GNN Mule Alert</option>
                <option value="Money Trail">Multi-Hop Money Trail</option>
                <option value="Complaint">Cyber Crime FIR (1930)</option>
                <option value="Manual">Manual Intake / Analyst Referral</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#93C5FD] font-semibold mb-1">Investigative Summary & Premise</label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Outline the initial investigative premise, suspected mule typology, and rapid pass-through velocity..."
              className="w-full px-3 py-2 bg-[#1F242E] border border-[#333D50] rounded-lg text-[#F3F4F6] focus:outline-none focus:border-[#3B82F6] text-xs resize-none leading-relaxed"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#333D50]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#252B37] hover:bg-slate-700 text-[#93C5FD] font-medium rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-electric-600 hover:bg-[#3B82F6] text-[#F3F4F6] font-semibold rounded-lg shadow-glow-electric transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? 'Creating Docket...' : 'Create Formal Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
