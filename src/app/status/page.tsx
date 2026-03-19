"use client";

import { useDashboardStore } from "@/stores/dashboard";
import { AppShell } from "@/components/layout/app-shell";
import { PipelineCard } from "@/components/status/pipeline-card";
import { CronCard } from "@/components/status/cron-card";
import { QuotaCard } from "@/components/status/quota-card";
import { QuarkCard } from "@/components/status/quark-card";
import { SystemCard } from "@/components/status/system-card";
import {
  derivePipelineStatus,
  deriveCronStatus,
  deriveQuotaStatus,
  deriveQuarkStatus,
  deriveSystemStatus,
} from "@/lib/status-logic";
import { formatTimeShort } from "@/lib/utils";
import type { CronJob, PipelineJob, HeartbeatState, MetricsData, SystemInfo } from "@/lib/parsers/types";

export default function StatusPage() {
  const snapshot = useDashboardStore((s) => s.snapshot);
  const stale = useDashboardStore((s) => s.snapshotStale);
  const fetchedAt = useDashboardStore((s) => s.snapshotFetchedAt);
  const connected = useDashboardStore((s) => s.connected);

  if (!snapshot) {
    return (
      <AppShell>
        <div className="p-6">
          <h1 className="mb-4 text-xl font-semibold text-[#F1F5F9]">Status</h1>
          <p className="mb-4 text-sm text-[#94A3B8]">
            {connected ? "Loading snapshot..." : "Waiting for connection to MacBook..."}
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.03]" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  // --- Extract data from snapshot (wrapped in try-catch for resilience) ---
  let renderError: string | null = null;
  let pipeline, cron, quota, quark, systemStatus;
  let cronJobRecords: Array<Record<string, unknown>> = [];
  let codexQuotaRaw: Record<string, unknown> | undefined;
  let heartbeatRaw: Record<string, unknown> | undefined;

  try {
    const cronSection = snapshot.cron as { jobs?: CronJob[]; summary?: Record<string, number> } | undefined;
    const cronJobs: CronJob[] = cronSection?.jobs ?? [];

    const pipelineSection = snapshot.pipeline as { jobs?: PipelineJob[] } | undefined;
    const pipelineJobs: PipelineJob[] = pipelineSection?.jobs ?? [];

    const metrics = snapshot.metrics as MetricsData | undefined;
    const codexQuota = metrics?.codexQuota;

    const heartbeat = snapshot.heartbeat as HeartbeatState | undefined;
    const system = snapshot.system as SystemInfo | undefined;

    pipeline = derivePipelineStatus({
      jobs: pipelineJobs.map((j) => ({
        status: j.status ?? "",
        updated_at: j.createdAt ?? "",
        stage:
          Array.isArray(j.stages) && j.stages.length > 0
            ? (j.stages[j.stages.length - 1]?.name ?? "")
            : "",
      })),
    });

    cron = deriveCronStatus({
      jobs: cronJobs.map((j) => ({
        name: j.name ?? "",
        status: j.status ?? "",
      })),
    });

    quota = deriveQuotaStatus({
      dailyPct: codexQuota?.dailyRemaining ?? 100,
      weeklyPct: codexQuota?.weeklyRemaining ?? 100,
    });

    const failedCrons = cronJobs.filter((j) => j.status === "error").length;
    quark = deriveQuarkStatus({
      lastHeartbeat: heartbeat?.lastHeartbeat ?? new Date().toISOString(),
      recentRuns: cronJobs.length,
      recentFailures: failedCrons,
      windowHours: 6,
    });

    const cpuPct = system?.cpuPercent ?? 0;
    const memUsed = system?.memoryUsedMb ?? 0;
    const memTotal = system?.memoryTotalMb ?? 1;
    const diskUsed = system?.diskUsedGb ?? 0;
    const diskTotal = system?.diskTotalGb ?? 1;
    systemStatus = deriveSystemStatus({
      cpu: cpuPct,
      memory: memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0,
      disk: diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0,
    });

    cronJobRecords = cronJobs.map((j) => ({ ...j }));
    codexQuotaRaw = codexQuota as unknown as Record<string, unknown> | undefined;
    heartbeatRaw = heartbeat as unknown as Record<string, unknown> | undefined;
  } catch (e) {
    renderError = String(e);
    console.error("[StatusPage] derivation error:", e);
  }

  if (renderError || !pipeline || !cron || !quota || !quark || !systemStatus) {
    return (
      <AppShell>
        <div className="p-6">
          <h1 className="mb-4 text-xl font-semibold text-[#F1F5F9]">Status</h1>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            <p className="font-medium">Failed to derive status from snapshot</p>
            {renderError && <p className="mt-1 text-xs opacity-70">{renderError}</p>}
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-white/5 p-2 text-xs text-[#94A3B8]">
              {JSON.stringify({ keys: Object.keys(snapshot), cron: typeof snapshot.cron, pipeline: typeof snapshot.pipeline }, null, 2)}
            </pre>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#F1F5F9]">Status</h1>
          {fetchedAt && (
            <span className={`text-xs ${stale ? "text-amber-400" : "text-[#94A3B8]"}`}>
              {stale ? "Stale \u2014 " : ""}Updated {formatTimeShort(new Date(fetchedAt).toISOString())}
            </span>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <PipelineCard data={{ ...pipeline }} />
          <CronCard data={{ ...cron, jobs: cronJobRecords }} />
          <QuotaCard data={{ ...quota, raw: codexQuotaRaw }} />
          <QuarkCard data={{ ...quark, heartbeat: heartbeatRaw }} />
          <SystemCard data={{ ...systemStatus }} />
        </div>
      </div>
    </AppShell>
  );
}
