"use client";

import { create } from "zustand";

interface DashboardState {
  // SSE connection
  connected: boolean;
  lastEvent: { type: string; file: string; timestamp: number } | null;
  refreshKey: number;

  // Cognitive
  cognitiveDegradation: string[];
  setCognitiveDegradation: (flags: string[]) => void;

  // Engagement
  engagementUnanswered: number;
  setEngagementUnanswered: (count: number) => void;

  // Actions
  triggerRefresh: () => void;
  setConnected: (connected: boolean) => void;
  setLastEvent: (event: DashboardState["lastEvent"]) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  connected: false,
  lastEvent: null,
  refreshKey: 0,
  cognitiveDegradation: [],
  setCognitiveDegradation: (flags) => set({ cognitiveDegradation: flags }),
  engagementUnanswered: 0,
  setEngagementUnanswered: (count) => set({ engagementUnanswered: count }),
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
  setConnected: (connected) => set({ connected }),
  setLastEvent: (lastEvent) => set({ lastEvent, refreshKey: Date.now() }),
}));
