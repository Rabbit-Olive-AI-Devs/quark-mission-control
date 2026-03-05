"use client";

import { AppShell } from "@/components/layout/app-shell";
import { CronGrid } from "@/components/dashboard/cron-grid";
import { SystemVitals } from "@/components/dashboard/system-vitals";
import { AgentBar } from "@/components/dashboard/agent-bar";
import { ActivityTicker } from "@/components/dashboard/activity-ticker";
import { PendingBadge } from "@/components/dashboard/pending-badge";
import { DegradationBanner } from "@/components/dashboard/degradation-banner";
import { HeartbeatCard } from "@/components/dashboard/heartbeat-card";
import { ModelFallbackChain } from "@/components/dashboard/model-fallback";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <DegradationBanner />

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Mission Control</h1>
          <p className="text-sm text-[#94A3B8] mt-1">Quark Operations Dashboard</p>
        </div>

        {/* Top row: Pending + Heartbeat + System */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <PendingBadge />
          <HeartbeatCard />
          <SystemVitals />
        </div>

        {/* Middle: Cron Grid + Activity */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <CronGrid />
          <ActivityTicker />
        </div>

        {/* Agent Network */}
        <div className="mb-4">
          <AgentBar />
        </div>

        {/* Model Fallback Chain */}
        <ModelFallbackChain />
      </div>
    </AppShell>
  );
}
