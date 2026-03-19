"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { StatusLevel } from "@/lib/parsers/types";
import type { ReactNode } from "react";

interface InstrumentPanelProps {
  title: string;
  icon: LucideIcon;
  level: StatusLevel;
  href: string;
  dataPriority: 1 | 2 | 3;
  span?: 2;
  children: ReactNode;
}

const DOT_STYLES: Record<StatusLevel, string> = {
  healthy: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]",
  warning: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)] animate-[slow-pulse_2s_ease-in-out_infinite]",
  critical: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)] animate-pulse",
};

const BORDER_GLOW: Record<StatusLevel, string> = {
  healthy: "rgba(0,212,170,0.08)",
  warning: "rgba(245,158,11,0.08)",
  critical: "rgba(239,68,68,0.08)",
};

export function InstrumentPanel({
  title,
  icon: Icon,
  level,
  href,
  dataPriority,
  span,
  children,
}: InstrumentPanelProps) {
  const router = useRouter();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(href);
        }
      }}
      data-priority={dataPriority}
      className={[
        "group cursor-pointer rounded-xl border border-[#1E293B] bg-[#0E0E14] p-5",
        "transition-all duration-200 ease-out",
        "hover:border-white/10 hover:bg-white/[0.02]",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00D4AA]/50",
        span === 2 ? "col-span-1 md:col-span-2" : "",
      ].join(" ")}
      style={{
        order: dataPriority,
        boxShadow: `inset 0 1px 0 ${BORDER_GLOW[level]}, 0 0 0 0 transparent`,
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} className="text-[#94A3B8] transition-colors duration-200 group-hover:text-[#00D4AA]" />
        <span className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
          {title}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${DOT_STYLES[level]}`}
          />
          <ChevronRight
            size={14}
            className="text-[#475569] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#64748B]"
          />
        </span>
      </div>

      {/* Light separator line */}
      <div
        className="mb-3 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${BORDER_GLOW[level]}, transparent)`,
        }}
      />

      {/* Body */}
      {children}
    </div>
  );
}
