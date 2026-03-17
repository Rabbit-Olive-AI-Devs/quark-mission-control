// Consolidated theme constants for Mission Control
// All color maps and shared formatting utilities live here.
// Individual constant files re-export from this module for backward compat.

export const STATUS_COLORS: Record<string, string> = {
  completed: "#10B981",
  published: "#10B981",
  active: "#3B82F6",
  pending: "#F59E0B",
  intake_pending: "#F59E0B",
  failed: "#EF4444",
  killed: "#EF4444",
  stale: "#F59E0B",
  quarantined: "#EF4444",
  preview_sent: "#7C3AED",
  approved: "#10B981",
  redo: "#7C3AED",
  idle: "#94A3B8",
  disabled: "#64748B",
  ok: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
};

export const TYPE_COLORS: Record<string, string> = {
  proof: "#7C3AED",
  news_relay: "#3B82F6",
  viral_ride: "#F59E0B",
  hot_take: "#EF4444",
  war_story: "#10B981",
  reaction: "#EC4899",
};

export const PLATFORM_COLORS: Record<string, string> = {
  x: "#1DA1F2",
  tiktok: "#FF0050",
  youtube: "#FF0000",
  instagram: "#C13584",
  substack: "#FF6719",
};

export const ACTION_COLORS: Record<string, string> = {
  like: "#00D4AA",
  reply: "#7C3AED",
  retweet: "#1DA1F2",
  follow: "#10B981",
  bookmark: "#F59E0B",
  comment: "#7C3AED",
  subscribe: "#10B981",
  check: "#3B82F6",
  skip: "#94A3B8",
};

export const PLATFORM_LABELS: Record<string, string> = {
  x: "X",
  tiktok: "TikTok",
  youtube: "YouTube",
  instagram: "Instagram",
  substack: "Substack",
};

export const ACCENT = {
  primary: "#00D4AA",
  purple: "#7C3AED",
  bg: "#0A0A0F",
  text: "#F1F5F9",
  muted: "#94A3B8",
  border: "rgba(255,255,255,0.08)",
} as const;

export function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export function getPlatformColor(platform: string): string {
  return PLATFORM_COLORS[platform] ?? "#94A3B8";
}

export function getActionColor(action: string): string {
  return ACTION_COLORS[action] ?? "#94A3B8";
}
