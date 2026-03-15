"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CronGrid } from "@/components/dashboard/cron-grid";
import { SystemVitals } from "@/components/dashboard/system-vitals";
import { AgentBar } from "@/components/dashboard/agent-bar";
import { ActivityTicker } from "@/components/dashboard/activity-ticker";
import { PendingBadge } from "@/components/dashboard/pending-badge";
import { DegradationBanner } from "@/components/dashboard/degradation-banner";
import { HeartbeatCard } from "@/components/dashboard/heartbeat-card";
import { PipelineWidget } from "@/components/dashboard/pipeline-widget";
import { CodexQuota } from "@/components/dashboard/codex-quota";
import { CognitiveWidget } from "@/components/dashboard/cognitive-widget";
import { EngagementWidget } from "@/components/dashboard/engagement-widget";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <ErrorBoundary><DegradationBanner /></ErrorBoundary>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Mission Control</h1>
          <p className="text-sm text-[#94A3B8] mt-1">Quark Operations Dashboard</p>
        </div>

        {/* Top row: Pending + Heartbeat + System */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <ErrorBoundary><PendingBadge /></ErrorBoundary>
          <ErrorBoundary><HeartbeatCard /></ErrorBoundary>
          <ErrorBoundary><SystemVitals /></ErrorBoundary>
        </div>

        {/* Middle: Cron Grid + Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <ErrorBoundary><CronGrid /></ErrorBoundary>
          <ErrorBoundary><ActivityTicker /></ErrorBoundary>
        </div>

        {/* Agent Network */}
        <div className="mb-4">
          <ErrorBoundary><AgentBar /></ErrorBoundary>
        </div>

        {/* Codex Quota + Cognitive + Engagement + Pipeline Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
          <ErrorBoundary><CodexQuota /></ErrorBoundary>
          <ErrorBoundary><CognitiveWidget delay={0.05} /></ErrorBoundary>
          <ErrorBoundary><EngagementWidget delay={0.1} /></ErrorBoundary>
          <div className="lg:col-span-2">
            <ErrorBoundary><PipelineWidget delay={0} /></ErrorBoundary>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
