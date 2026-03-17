"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { DegradationBanner } from "@/components/dashboard/degradation-banner";
import { SystemPulse } from "@/components/dashboard/system-pulse";
import { CodexQuota } from "@/components/dashboard/codex-quota";
import { PipelineWidget } from "@/components/dashboard/pipeline-widget";
import { HealthScore } from "@/components/dashboard/health-score";
import { ActivityTicker } from "@/components/dashboard/activity-ticker";
import { AgentBar } from "@/components/dashboard/agent-bar";

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

        {/* 6-widget grid: 3×2 on desktop, 1-col on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ErrorBoundary><SystemPulse /></ErrorBoundary>
          <ErrorBoundary><CodexQuota /></ErrorBoundary>
          <ErrorBoundary><PipelineWidget /></ErrorBoundary>
          <ErrorBoundary><HealthScore /></ErrorBoundary>
          <ErrorBoundary><ActivityTicker /></ErrorBoundary>
          <ErrorBoundary><AgentBar /></ErrorBoundary>
        </div>
      </div>
    </AppShell>
  );
}
