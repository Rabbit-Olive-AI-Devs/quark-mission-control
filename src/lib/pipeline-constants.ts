export const STATUS_COLORS: Record<string, string> = {
  published: "#10B981",
  killed: "#EF4444",
  stale: "#F59E0B",
  redo: "#7C3AED",
}

export const TYPE_COLORS: Record<string, string> = {
  proof: "#7C3AED",
  news_relay: "#3B82F6",
  viral_ride: "#F59E0B",
  hot_take: "#EF4444",
  war_story: "#10B981",
  reaction: "#EC4899",
}

export function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}
