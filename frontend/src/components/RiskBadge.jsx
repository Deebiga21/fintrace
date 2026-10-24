import React from 'react';
import { AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';

export default function RiskBadge({ level, score, showScore = true, size = "md" }) {
  const normLevel = (level || "Low").toUpperCase();

  const isHigh = normLevel === "HIGH" || normLevel === "CRITICAL";
  const isMed = normLevel === "MEDIUM" || normLevel === "SUSPECT";

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] font-bold",
    md: "px-2.5 py-0.5 text-xs font-bold",
    lg: "px-3 py-1 text-sm font-bold tracking-wider"
  }[size] || "px-2.5 py-0.5 text-xs font-bold";

  let badgeStyle = {
    backgroundColor: "rgba(247, 214, 208, 0.45)",
    color: "#4A4A4A",
    borderColor: "#E8C2BB"
  };
  let marker = "○";
  let Icon = ShieldCheck;

  if (isHigh) {
    badgeStyle = {
      backgroundColor: "#DC2626",
      color: "#FFFFFF",
      borderColor: "#DC2626"
    };
    marker = "◆";
    Icon = AlertTriangle;
  } else if (isMed) {
    badgeStyle = {
      backgroundColor: "rgba(226, 180, 189, 0.35)",
      color: "#B86B7A",
      borderColor: "#B86B7A"
    };
    marker = "◇";
    Icon = AlertCircle;
  }

  return (
    <span
      style={badgeStyle}
      className={`inline-flex items-center gap-1.5 border font-['Rajdhani',sans-serif] uppercase tracking-wider ${sizeClasses}`}
    >
      <span className="text-[10px]">{marker}</span>
      <span>{normLevel} RISK</span>
      {showScore !== false && score !== undefined && score !== null && (
        <span className="font-['Share_Tech_Mono',monospace] text-[10px] ml-1 opacity-90 font-bold">
          ({(score * 100).toFixed(0)}%)
        </span>
      )}
    </span>
  );
}
