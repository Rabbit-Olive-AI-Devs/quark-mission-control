"use client";

import { RefreshCw, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface CardFooterProps {
  lastUpdated: number | null;
  error: string | null;
  onRefresh: () => Promise<void> | void;
}

export function CardFooter({ lastUpdated, error, onRefresh }: CardFooterProps) {
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = async () => {
    setSpinning(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setSpinning(false), 600);
    }
  };

  return (
    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between gap-2">
      {error ? (
        <div className="flex items-center gap-1.5 text-[9px] text-[#EF4444]">
          <AlertTriangle size={10} />
          <span className="truncate">{error}</span>
        </div>
      ) : lastUpdated ? (
        <span className="text-[9px] text-[#94A3B8]/60">
          Updated {new Date(lastUpdated).toLocaleTimeString("en-US", { timeZone: "America/Chicago" })}
        </span>
      ) : (
        <span />
      )}
      <button
        onClick={handleRefresh}
        className="p-1 rounded-md hover:bg-white/10 transition-colors text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer"
        title="Refresh"
      >
        <RefreshCw size={11} className={spinning ? "animate-spin" : ""} />
      </button>
    </div>
  );
}
