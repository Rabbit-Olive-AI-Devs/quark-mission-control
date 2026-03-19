"use client";

import { useState, useRef, useCallback } from "react";

interface CronHeatmapJob {
  name: string;
  status: string;
}

interface CronHeatmapProps {
  jobs: CronHeatmapJob[];
}

function getCellColor(status: string): string {
  if (status === "error") return "#EF4444";
  if (status === "disabled") return "#475569";
  return "#10B981"; // ok, enabled, any other active status
}

function getCellGlow(status: string): string {
  if (status === "error") return "0 0 6px rgba(239,68,68,0.35)";
  if (status === "disabled") return "none";
  return "0 0 6px rgba(16,185,129,0.2)";
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  name: string;
  status: string;
}

export function CronHeatmap({ jobs }: CronHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    name: "",
    status: "",
  });

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, job: CronHeatmapJob) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cellRect = e.currentTarget.getBoundingClientRect();
      setTooltip({
        visible: true,
        x: cellRect.left - rect.left + cellRect.width / 2,
        y: cellRect.top - rect.top - 4,
        name: job.name,
        status: job.status,
      });
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  if (jobs.length === 0) {
    return (
      <div className="flex h-12 items-center justify-center text-xs text-[#64748B]">
        No cron jobs configured
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="grid grid-cols-5 gap-[3px] sm:grid-cols-5">
        {jobs.map((job, i) => (
          <div
            key={`${job.name}-${i}`}
            className="h-4 w-4 rounded-[2px] transition-all duration-150 hover:scale-125 cursor-default"
            style={{
              backgroundColor: getCellColor(job.status),
              boxShadow: getCellGlow(job.status),
            }}
            onMouseEnter={(e) => handleMouseEnter(e, job)}
            onMouseLeave={handleMouseLeave}
          />
        ))}
      </div>

      {/* Floating tooltip */}
      {tooltip.visible && (
        <div
          className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-full rounded-md border border-[#1E293B] bg-[#0E0E14] px-2.5 py-1.5 shadow-lg"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            boxShadow: "0 4px 20px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.05)",
          }}
        >
          <p className="whitespace-nowrap text-xs font-medium text-[#F1F5F9]">
            {tooltip.name}
          </p>
          <p className="whitespace-nowrap text-[10px] text-[#64748B]">
            {tooltip.status}
          </p>
        </div>
      )}
    </div>
  );
}
