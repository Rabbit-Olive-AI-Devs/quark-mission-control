"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PipelineCard } from "@/components/status/pipeline-card";
import { CronCard } from "@/components/status/cron-card";
import { QuotaCard } from "@/components/status/quota-card";
import { QuarkCard } from "@/components/status/quark-card";
import { SystemCard } from "@/components/status/system-card";
import { useApi } from "@/hooks/use-api";
import { formatTimeShort } from "@/lib/utils";
import type { StatusData } from "@/lib/parsers/types";

export default function StatusPage() {
  const { data, loading, error } = useApi<StatusData>("/api/status", {
    refreshOn: ["heartbeat", "pipeline", "cron"],
  });

  if (loading && !data) {
    return (
      <AppShell>
        <div className="p-6">
          <h1 className="mb-4 text-xl font-semibold text-[#F1F5F9]">Status</h1>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.03]" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (error && !data) {
    return (
      <AppShell>
        <div className="p-6">
          <h1 className="mb-4 text-xl font-semibold text-[#F1F5F9]">Status</h1>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            Failed to load status: {error}
          </div>
        </div>
      </AppShell>
    );
  }

  if (!data) return null;

  return (
    <AppShell>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#F1F5F9]">Status</h1>
          <span className="text-xs text-[#94A3B8]">
            Updated {formatTimeShort(data.timestamp)}
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <PipelineCard data={data.pipeline} />
          <CronCard data={data.cron} />
          <QuotaCard data={data.quota} />
          <QuarkCard data={data.quark} />
          <SystemCard data={data.system} />
        </div>
      </div>
    </AppShell>
  );
}
