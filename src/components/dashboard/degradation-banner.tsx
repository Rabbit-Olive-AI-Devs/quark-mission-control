"use client";

import { useApi } from "@/hooks/use-api";
import { AlertTriangle, Shield } from "lucide-react";
import type { MetricsData } from "@/lib/parsers/types";

export function DegradationBanner() {
  const { data } = useApi<MetricsData>("/api/metrics", ["metrics"]);

  if (!data || data.degradationStatus === "NORMAL") return null;

  return (
    <div className="mb-4 px-4 py-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center gap-3">
      {data.degradationStatus === "DEGRADED" ? (
        <AlertTriangle size={18} className="text-[#F59E0B]" />
      ) : (
        <Shield size={18} className="text-[#EF4444]" />
      )}
      <span className="text-sm">
        System is in <strong className="text-[#F59E0B]">{data.degradationStatus}</strong> mode
      </span>
    </div>
  );
}
