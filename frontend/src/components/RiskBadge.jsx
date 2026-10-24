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
    backgroundColor: "rgba(34, 211, 230, 0.12)",
    color: "#22D3E6",
    borderColor: "#22D3E6"
  };
  let marker = "○";
  let Icon = ShieldCheck;

  if (isHigh) {
    badgeStyle = {
      backgroundColor: "#FF3B4E",
      color: "#FFFFFF",
      borderColor: "#FF3B4E"
    };
    marker = "◆";
    Icon = AlertTriangle;
  } else if (isMed) {
    badgeStyle = {
      backgroundColor: "#D6E85A",
      color: "#050505",
      borderColor: "#D6E85A"
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
