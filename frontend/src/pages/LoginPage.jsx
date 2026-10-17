import React, { useState } from 'react';
import { Lock, Shield, KeyRound, AlertCircle, CheckCircle2, UserCheck } from 'lucide-react';
import { api } from '../services/api';

export default function LoginPage({ setCurrentPage, onLoginSuccess }) {
  const [badgeId, setBadgeId] = useState('INV-7809-DELHI');
  const [password, setPassword] = useState('••••••••••••');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.login(badgeId, password);
      if (onLoginSuccess) {
        onLoginSuccess(res.investigator);
      }
      setCurrentPage('dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify investigator credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-navy-900 border border-slate-800 rounded-2xl shadow-glass overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-navy-850 to-navy-800 p-6 border-b border-slate-800 text-center relative">
          <div className="w-12 h-12 rounded-xl bg-electric-500/20 border border-electric-500/40 text-electric-400 mx-auto flex items-center justify-center shadow-glow-electric mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-wide">Investigator Access Portal</h2>
          <p className="text-xs text-slate-400 mt-1">FIU-IND Anti-Money Laundering & Mule Taskforce</p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            RESTRICTED ACCESS - LEVEL 4
          </span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Investigator Badge ID</label>
            <div className="relative">
              <UserCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                placeholder="e.g. INV-7809-DELHI"
                className="w-full pl-9 pr-3 py-2.5 bg-navy-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-electric-400 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Encrypted Security Passkey</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-navy-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-electric-400 text-xs"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-navy-850 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-electric-400" />
              <span>Demo Security Clearance Active</span>
            </div>
            <p>Pre-authenticated credentials are configured for hackathon & college project demonstration.</p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 text-white font-bold text-xs shadow-glow-electric transition disabled:opacity-50"
          >
            {isLoading ? 'Authenticating Investigator...' : 'Authorize & Open Intelligence Console'}
          </button>
        </form>
      </div>
    </div>
  );
}
