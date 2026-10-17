import React from 'react';
import { AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';

export default function RiskBadge({ level, score, showScore = true, size = "md" }) {
  const normLevel = (level || "Low").toUpperCase();

  const isHigh = normLevel === "HIGH";
  const isMed = normLevel === "MEDIUM";

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs font-semibold",
    md: "px-2.5 py-1 text-xs font-semibold",
    lg: "px-3.5 py-1.5 text-sm font-bold tracking-wide"
  }[size] || "px-2.5 py-1 text-xs font-semibold";

  let colorClasses = "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30";
  let Icon = ShieldCheck;

  if (isHigh) {
    colorClasses = "bg-rose-950/70 text-rose-300 border border-rose-500/50 shadow-glow-danger";
    Icon = AlertTriangle;
  } else if (isMed) {
    colorClasses = "bg-amber-950/60 text-amber-300 border border-amber-500/40";
    Icon = AlertCircle;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${colorClasses} ${sizeClasses}`}>
      <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      <span>{normLevel} RISK</span>
      {showScore && score !== undefined && score !== null && (
        <span className="opacity-80 font-mono text-[11px] ml-0.5">
          ({(score * 100).toFixed(0)}%)
        </span>
      )}
    </span>
  );
}
