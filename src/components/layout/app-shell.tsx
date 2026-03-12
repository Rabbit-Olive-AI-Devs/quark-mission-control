"use client";

import { Sidebar } from "@/components/ui/sidebar";
import { useSSE } from "@/hooks/use-sse";
import { useHashPolling } from "@/hooks/use-hash-polling";
import { useDashboardStore } from "@/stores/dashboard";
import { StalenessBanner } from "@/components/staleness-banner";

const IS_REMOTE = process.env.NEXT_PUBLIC_IS_REMOTE === "true";

function LocalSSE() {
  useSSE();
  return null;
}

function RemoteHashPolling() {
  useHashPolling();
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const lastEvent = useDashboardStore((s) => s.lastEvent);

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* Data freshness layer */}
      {IS_REMOTE ? <RemoteHashPolling /> : <LocalSSE />}

      {/* Ambient orbs */}
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />

      <Sidebar />

      <main className="pt-16 px-4 pb-6 md:ml-60 md:pt-6 md:px-6 relative z-10">
        {/* Staleness banner (remote mode) */}
        {IS_REMOTE && <StalenessBanner />}

        {/* SSE event indicator (local mode) */}
        {!IS_REMOTE && lastEvent && Date.now() - lastEvent.timestamp < 3000 && (
          <div className="fixed top-4 right-4 z-50 glass-card px-3 py-2 text-xs text-[#00D4AA] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] animate-ping" />
            Updated: {lastEvent.type}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
