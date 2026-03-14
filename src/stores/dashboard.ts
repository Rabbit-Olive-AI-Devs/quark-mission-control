"use client";

import { create } from "zustand";

interface DashboardState {
  // SSE connection (local mode)
  connected: boolean;
  lastEvent: { type: string; file: string; timestamp: number } | null;
  refreshKey: number;

  // Shared snapshot (remote mode)
  snapshot: Record<string, unknown> | null;
  snapshotHash: string | null;
  snapshotStale: boolean;
  snapshotFetchedAt: number | null;
  lastHashCheck: number | null;
  hashHealthy: boolean;

  // Cognitive
  cognitiveDegradation: string[];
  setCognitiveDegradation: (flags: string[]) => void;

  // Actions
  triggerRefresh: () => void;
  setConnected: (connected: boolean) => void;
  setLastEvent: (event: DashboardState["lastEvent"]) => void;
  setSnapshot: (data: Record<string, unknown>, hash: string) => void;
  setSnapshotStale: (stale: boolean) => void;
  setHashHealth: (healthy: boolean, lastCheck: number) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  connected: false,
  lastEvent: null,
  refreshKey: 0,
  snapshot: null,
  snapshotHash: null,
  snapshotStale: false,
  snapshotFetchedAt: null,
  lastHashCheck: null,
  hashHealthy: true,
  cognitiveDegradation: [],
  setCognitiveDegradation: (flags) => set({ cognitiveDegradation: flags }),

  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
  setConnected: (connected) => set({ connected }),
  setLastEvent: (lastEvent) => set({ lastEvent, refreshKey: Date.now() }),
  setSnapshot: (data, hash) =>
    set({ snapshot: data, snapshotHash: hash, snapshotFetchedAt: Date.now(), snapshotStale: false }),
  setSnapshotStale: (snapshotStale) => set({ snapshotStale }),
  setHashHealth: (hashHealthy, lastHashCheck) => set({ hashHealthy, lastHashCheck }),
}));
