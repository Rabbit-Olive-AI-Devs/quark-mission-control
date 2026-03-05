"use client";

import { Sidebar } from "@/components/ui/sidebar";
import { useSSE } from "@/hooks/use-sse";
import { useDashboardStore } from "@/stores/dashboard";

export function AppShell({ children }: { children: React.ReactNode }) {
  useSSE();
  const lastEvent = useDashboardStore((s) => s.lastEvent);

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* Ambient orbs */}
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />

      <Sidebar />

      <main className="ml-60 p-6 relative z-10">
        {/* SSE event indicator */}
        {lastEvent && Date.now() - lastEvent.timestamp < 3000 && (
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
