"use client";

import type { ReactNode } from "react";

interface InboxItemProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  age: string;
  ageColor?: string;
  action?: { label: string; onClick: () => void };
}

export function InboxItem({ icon, title, subtitle, age, ageColor = "#94A3B8", action }: InboxItemProps) {
  return (
    <div className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-white/[0.03] transition-colors">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#F1F5F9] truncate">{title}</p>
        {subtitle && <p className="text-[10px] text-[#94A3B8] truncate mt-0.5">{subtitle}</p>}
      </div>
      <span className="text-[10px] font-mono shrink-0" style={{ color: ageColor }}>{age}</span>
      {action && (
        <button
          onClick={action.onClick}
          className="text-[10px] px-2 py-1 rounded bg-[#00D4AA]/10 text-[#00D4AA] hover:bg-[#00D4AA]/20 transition-colors shrink-0"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
