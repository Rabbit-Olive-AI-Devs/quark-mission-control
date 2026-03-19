"use client";

import { useApi } from "@/hooks/use-api";
import { AppShell } from "@/components/layout/app-shell";
import { HeroBanner } from "@/components/status/hero-banner";
import { AlertsStrip } from "@/components/status/alerts-strip";
import { InstrumentPanel } from "@/components/status/instrument-panel";
import { PipelinePanel } from "@/components/status/pipeline-panel";
import { CronPanel } from "@/components/status/cron-panel";
import { EngagementPanel, deriveEngagementLevel } from "@/components/status/engagement-panel";
import { QuotaPanel } from "@/components/status/quota-panel";
import { QuarkPanel } from "@/components/status/quark-panel";
import { ContentPanel, deriveContentLevel } from "@/components/status/content-panel";
import { SystemPanel } from "@/components/status/system-panel";
import { CognitivePanel, deriveCognitiveLevel } from "@/components/status/cognitive-panel";
import { IntelPanel } from "@/components/status/intel-panel";
import { ActivityPanel } from "@/components/status/activity-panel";
import { useDashboardStore } from "@/stores/dashboard";
import { formatTimeShort } from "@/lib/utils";
import {
  GitBranch,
  Clock,
  MessageCircle,
  Gauge,
  Bot,
  FileText,
  Cpu,
  Brain,
  Radar,
  Activity,
} from "lucide-react";
import type { StatusFullResponse } from "@/lib/parsers/types";

export default function StatusPage() {
  const { data, loading, error, lastUpdated } = useApi<StatusFullResponse>(
    "/api/status-full",
    {
      refreshOn: [
        "heartbeat",
        "pipeline",
        "cron",
        "metrics",
        "digest",
        "intel",
        "comms",
      ],
    }
  );
  const connected = useDashboardStore((s) => s.connected);

  // --- Loading skeleton ---
  if (loading && !data) {
    return (
      <AppShell>
        <div className="space-y-3 p-6">
          {/* Hero skeleton */}
          <div className="h-40 animate-pulse rounded-xl border border-[#1E293B] bg-white/[0.02]" />

          {/* Panel grid skeleton */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`h-48 animate-pulse rounded-xl border border-[#1E293B] bg-white/[0.02] ${
                  i === 6 || i === 9 ? "md:col-span-2" : ""
                }`}
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  // --- Error state ---
  if (error && !data) {
    return (
      <AppShell>
        <div className="p-6">
          <h1 className="mb-4 text-xl font-semibold text-[#F1F5F9]">
            Command Bridge
          </h1>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <p className="mb-2 text-sm text-red-400">
              Failed to load status: {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-400 transition-colors hover:bg-red-500/20"
            >
              Retry
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!data) return null;

  // --- Derived levels ---
  const engagementLevel = deriveEngagementLevel(data);
  const contentLevel = deriveContentLevel(data);
  const cognitiveLevel = deriveCognitiveLevel(data);

  return (
    <AppShell>
      <div className="space-y-3 p-6">
        {/* Hero Banner */}
        <HeroBanner data={data} />

        {/* Alerts Strip */}
        <AlertsStrip data={data} />

        {/* 3-column instrument grid */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {/* Priority 1 */}
          <InstrumentPanel
            title="Pipeline"
            icon={GitBranch}
            level={data.pipeline.level}
            href="/content"
            dataPriority={1}
          >
            <PipelinePanel data={data} />
          </InstrumentPanel>

          <InstrumentPanel
            title="Cron"
            icon={Clock}
            level={data.cron.level}
            href="/schedule"
            dataPriority={1}
          >
            <CronPanel data={data} />
          </InstrumentPanel>

          <InstrumentPanel
            title="Engagement"
            icon={MessageCircle}
            level={engagementLevel}
            href="/engagement"
            dataPriority={1}
          >
            <EngagementPanel data={data} />
          </InstrumentPanel>

          {/* Priority 2 */}
          <InstrumentPanel
            title="Quota"
            icon={Gauge}
            level={data.quota.level}
            href="/settings"
            dataPriority={2}
          >
            <QuotaPanel data={data} />
          </InstrumentPanel>

          <InstrumentPanel
            title="Quark"
            icon={Bot}
            level={data.quark.level}
            href="/cognitive"
            dataPriority={2}
          >
            <QuarkPanel data={data} />
          </InstrumentPanel>

          <InstrumentPanel
            title="Content"
            icon={FileText}
            level={contentLevel}
            href="/content"
            dataPriority={2}
          >
            <ContentPanel data={data} />
          </InstrumentPanel>

          {/* Priority 3 */}
          <InstrumentPanel
            title="System"
            icon={Cpu}
            level={data.system.level}
            href="/settings"
            dataPriority={3}
            span={2}
          >
            <SystemPanel data={data} />
          </InstrumentPanel>

          <InstrumentPanel
            title="Cognitive"
            icon={Brain}
            level={cognitiveLevel}
            href="/cognitive"
            dataPriority={3}
          >
            <CognitivePanel data={data} />
          </InstrumentPanel>

          <InstrumentPanel
            title="Intel"
            icon={Radar}
            level="healthy"
            href="/explore?tab=intel"
            dataPriority={3}
          >
            <IntelPanel data={data} />
          </InstrumentPanel>

          <InstrumentPanel
            title="Activity"
            icon={Activity}
            level="healthy"
            href="/operations"
            dataPriority={3}
            span={2}
          >
            <ActivityPanel data={data} />
          </InstrumentPanel>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between border-t border-white/[0.06] pt-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                connected
                  ? "bg-[#00D4AA] animate-[glow-pulse_2s_ease-in-out_infinite]"
                  : "bg-red-500"
              }`}
              style={{
                boxShadow: connected
                  ? "0 0 6px rgba(0,212,170,0.4)"
                  : "0 0 6px rgba(239,68,68,0.3)",
              }}
            />
            <span className="text-xs text-[#64748B]">
              {connected ? "Live" : "Disconnected"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#64748B]">
            {lastUpdated && (
              <span>Updated {formatTimeShort(lastUpdated)}</span>
            )}
            <span className="font-mono text-[10px] text-[#475569]">
              {connected ? "Refresh: SSE" : "Polling: 60s"}
            </span>
          </div>
        </footer>
      </div>
    </AppShell>
  );
}
