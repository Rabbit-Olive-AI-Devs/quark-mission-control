"use client";

import Link from "next/link";
import { useApi } from "@/hooks/use-api";
import { AlertTriangle, Shield, Brain } from "lucide-react";
import type { MetricsData, CognitiveData } from "@/lib/parsers/types";

export function DegradationBanner() {
  const { data: metricsData } = useApi<MetricsData>("/api/metrics", {
    snapshotKey: "metrics",
    refreshOn: ["metrics"],
  });
  const { data: cogData } = useApi<CognitiveData>("/api/cognitive", {
    snapshotKey: "cognitive",
    refreshOn: ["metrics"],
  });

  const opsNormal = !metricsData || metricsData.degradationStatus === "NORMAL";
  const cogFlags = cogData?.activeDegradation ?? [];
  const hasCognitive = cogFlags.length > 0;

  if (opsNormal && !hasCognitive) return null;

  return (
    <div className="mb-4 space-y-2">
      {!opsNormal && (
        <div className="px-4 py-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center gap-3">
          {metricsData!.degradationStatus === "DEGRADED" ? (
            <AlertTriangle size={18} className="text-[#F59E0B]" />
          ) : (
            <Shield size={18} className="text-[#EF4444]" />
          )}
          <span className="text-sm">
            System is in{" "}
            <strong className="text-[#F59E0B]">{metricsData!.degradationStatus}</strong> mode
          </span>
        </div>
      )}

      {hasCognitive && (
        <Link href="/cognitive">
          <div className="px-4 py-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center gap-3 hover:bg-[#F59E0B]/15 transition-colors cursor-pointer">
            <Brain size={18} className="text-[#F59E0B]" />
            <span className="text-sm">
              <strong className="text-[#F59E0B]">Cognitive:</strong>{" "}
              <span className="text-[#94A3B8]">
                {cogFlags
                  .map((f) =>
                    f
                      .replace(/_/g, " ")
                      .replace(/(\d+)d$/, "$1 days")
                      .replace(/^tier1 oversize:/, "Oversize: ")
                  )
                  .join(" | ")}
              </span>
            </span>
          </div>
        </Link>
      )}
    </div>
  );
}
