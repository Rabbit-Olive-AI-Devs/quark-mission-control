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
};

export const PLATFORM_LABELS: Record<string, string> = {
  x: "X",
  tiktok: "TikTok",
  youtube: "YouTube",
  instagram: "Instagram",
  substack: "Substack",
};

export function getPlatformColor(platform: string): string {
  return PLATFORM_COLORS[platform] ?? "#94A3B8";
}

export function getActionColor(action: string): string {
  return ACTION_COLORS[action] ?? "#94A3B8";
}

export function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
