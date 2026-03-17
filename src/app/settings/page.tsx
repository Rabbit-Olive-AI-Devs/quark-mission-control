"use client";

import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusDot } from "@/components/ui/status-dot";
import { useApi } from "@/hooks/use-api";
import { useDashboardStore } from "@/stores/dashboard";
import { formatDateTime } from "@/lib/utils";
import { ACCENT } from "@/lib/theme-constants";
import type { SystemInfo } from "@/lib/parsers/types";
import { Wifi, Zap, Server, RefreshCw } from "lucide-react";
import { useState, useCallback } from "react";

const IS_REMOTE = process.env.NEXT_PUBLIC_IS_REMOTE === "true";
const SNAPSHOT_URL = process.env.NEXT_PUBLIC_SNAPSHOT_URL || "";
const POLL_INTERVAL = 60;

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  return `${hours}h ${mins}m`;
}

function snapshotHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "unknown";
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-white/5 last:border-b-0">
      <span className="text-xs text-[#94A3B8]">{label}</span>
      <span className="text-xs text-[#F1F5F9] font-mono">{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { data: system, refetch } = useApi<SystemInfo>("/api/system", {
    snapshotKey: "system",
    refreshOn: ["heartbeat"],
  });

  const connected = useDashboardStore((s) => s.connected);
  const snapshotFetchedAt = useDashboardStore((s) => s.snapshotFetchedAt);
  const hashHealthy = useDashboardStore((s) => s.hashHealthy);
  const triggerRefresh = useDashboardStore((s) => s.triggerRefresh);

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    triggerRefresh();
    refetch();
    setTimeout(() => setRefreshing(false), 1200);
  }, [triggerRefresh, refetch]);

  const isConnected = IS_REMOTE ? hashHealthy : connected;
  const modeLabel = IS_REMOTE ? "Remote" : "Local";

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold mb-6" style={{ color: ACCENT.text }}>
          Settings
        </h1>

        {/* 1. Connection */}
        <GlassCard>
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Wifi size={16} style={{ color: ACCENT.primary }} />
            Connection
          </h3>
          <div className="flex items-center gap-3 mb-3">
            <StatusDot
              status={isConnected ? "ok" : "error"}
              size="md"
              pulse={isConnected}
            />
            <span className="text-sm" style={{ color: ACCENT.text }}>
              {isConnected ? "Connected" : "Disconnected"}
            </span>
            <span
              className="ml-auto text-xs px-2 py-0.5 rounded-full"
              style={{
                background: `${ACCENT.primary}15`,
                color: ACCENT.primary,
              }}
            >
              {modeLabel}
            </span>
          </div>
          {IS_REMOTE && SNAPSHOT_URL && (
            <InfoRow label="Snapshot Host" value={snapshotHost(SNAPSHOT_URL)} />
          )}
          <InfoRow
            label="Last Fetch"
            value={snapshotFetchedAt ? formatDateTime(snapshotFetchedAt) : "\u2014"}
          />
        </GlassCard>

        {/* 2. Publish Mode */}
        <GlassCard delay={0.05}>
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Zap size={16} style={{ color: ACCENT.primary }} />
            Publish Mode
          </h3>
          <div className="flex items-center gap-3">
            <span
              className="text-sm font-bold tracking-wider px-3 py-1 rounded"
              style={{
                background: "#10B98120",
                color: "#10B981",
              }}
            >
              LIVE
            </span>
            <span className="text-xs" style={{ color: ACCENT.muted }}>
              Auto-publish enabled for approved content
            </span>
          </div>
        </GlassCard>

        {/* 3. System Info */}
        <GlassCard delay={0.1}>
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Server size={16} style={{ color: ACCENT.purple }} />
            System
          </h3>
          <div className="space-y-0">
            <InfoRow
              label="OS"
              value={system?.osVersion ?? "\u2014"}
            />
            <InfoRow
              label="Node"
              value={system?.nodeVersion ?? "\u2014"}
            />
            <InfoRow
              label="Disk"
              value={
                system
                  ? `${system.diskUsedGb} / ${system.diskTotalGb} GB`
                  : "\u2014"
              }
            />
            <InfoRow
              label="Uptime"
              value={system ? formatUptime(system.uptime) : "\u2014"}
            />
          </div>
        </GlassCard>

        {/* 4. Refresh Controls */}
        <GlassCard delay={0.15}>
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <RefreshCw size={16} style={{ color: ACCENT.primary }} />
            Refresh Controls
          </h3>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs" style={{ color: ACCENT.muted }}>
                Polling interval
              </div>
              <div className="text-sm font-mono" style={{ color: ACCENT.text }}>
                {POLL_INTERVAL}s
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: refreshing ? `${ACCENT.primary}10` : `${ACCENT.primary}20`,
                color: ACCENT.primary,
                border: `1px solid ${ACCENT.primary}40`,
                opacity: refreshing ? 0.6 : 1,
              }}
            >
              <RefreshCw
                size={14}
                className={refreshing ? "animate-spin" : ""}
              />
              {refreshing ? "Refreshing..." : "Refresh Now"}
            </button>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
