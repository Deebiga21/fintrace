import React from 'react';
import { AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';

export default function RiskBadge({ level, score, showScore = true, size = "md" }) {
  const normLevel = (level || "Low").toUpperCase();

  const isHigh = normLevel === "HIGH" || normLevel === "CRITICAL";
  const isMed = normLevel === "MEDIUM" || normLevel === "SUSPECT";

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] font-bold rounded",
    md: "px-2.5 py-0.5 text-xs font-bold rounded-md",
    lg: "px-3 py-1 text-sm font-bold tracking-wider rounded-lg"
  }[size] || "px-2.5 py-0.5 text-xs font-bold rounded-md";

  // Default: Low Risk (Gain/Normal in #22C55E with ▲)
  let badgeStyle = {
    backgroundColor: "rgba(34, 197, 94, 0.14)",
    color: "#22C55E",
    borderColor: "rgba(34, 197, 94, 0.35)"
  };
  let marker = "▲";

  if (isHigh) {
    // Loss/Alert in #FF5C6C with ▼
    badgeStyle = {
      backgroundColor: "rgba(255, 92, 108, 0.16)",
      color: "#FF5C6C",
      borderColor: "rgba(255, 92, 108, 0.45)"
    };
    marker = "▼";
  } else if (isMed) {
    // Yellow Accent Fill with Black text on top (Strict user rule)
    badgeStyle = {
      backgroundColor: "#FFD23F",
      color: "#0B0B0F",
      borderColor: "#FFD23F"
    };
    marker = "●";
  }

  return (
    <span
      style={badgeStyle}
      className={`inline-flex items-center gap-1.5 border font-mono uppercase tracking-wider ${sizeClasses}`}
    >
      <span className="text-[10px]">{marker}</span>
      <span>{normLevel} RISK</span>
      {showScore !== false && score !== undefined && score !== null && (
        <span className="text-[10px] ml-0.5 opacity-90 font-bold">
          ({(score * 100).toFixed(0)}%)
        </span>
      )}
    </span>
  );
}
