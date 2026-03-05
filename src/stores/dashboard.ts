"use client";

import { create } from "zustand";

interface DashboardState {
  // SSE connection
  connected: boolean;
  lastEvent: { type: string; file: string; timestamp: number } | null;

  // Data refresh triggers
  refreshKey: number;
  triggerRefresh: () => void;

  // SSE handlers
  setConnected: (connected: boolean) => void;
  setLastEvent: (event: DashboardState["lastEvent"]) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  connected: false,
  lastEvent: null,
  refreshKey: 0,

  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
  setConnected: (connected) => set({ connected }),
  setLastEvent: (lastEvent) => set({ lastEvent, refreshKey: Date.now() }),
}));
