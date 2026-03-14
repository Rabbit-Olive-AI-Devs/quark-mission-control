"use client";

import { cn } from "@/lib/utils";

interface StatusDotProps {
  status: "ok" | "warning" | "error" | "idle" | "active";
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
}

const colors = {
  ok: "bg-[#10B981]",
  active: "bg-[#00D4AA]",
  warning: "bg-[#F59E0B]",
  error: "bg-[#EF4444]",
  idle: "bg-[#94A3B8]",
};

const sizes = {
  sm: "w-2 h-2",
  md: "w-3 h-3",
  lg: "w-4 h-4",
};

export function StatusDot({ status, size = "md", pulse = false }: StatusDotProps) {
  return (
    <span className="relative inline-flex">
      <span className={cn("rounded-full", colors[status], sizes[size])} />
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
            colors[status]
          )}
        />
      )}
    </span>
  );
}
