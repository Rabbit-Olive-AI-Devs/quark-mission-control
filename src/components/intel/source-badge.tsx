"use client";

const SOURCE_COLORS: Record<string, string> = {
  hn: "#FF6600",
  "hacker news": "#FF6600",
  hackernews: "#FF6600",
  reddit: "#FF4500",
  x: "#1DA1F2",
  twitter: "#1DA1F2",
  tavily: "#00A67E",
  "product hunt": "#DA552F",
  producthunt: "#DA552F",
  tiktok: "#FF0050",
  youtube: "#FF0000",
  instagram: "#C13584",
  substack: "#FF6719",
  github: "#8B5CF6",
};

const SOURCE_LABELS: Record<string, string> = {
  hn: "HN",
  "hacker news": "HN",
  hackernews: "HN",
  reddit: "Reddit",
  x: "X",
  twitter: "X",
  tavily: "Tavily",
  "product hunt": "PH",
  producthunt: "PH",
  tiktok: "TikTok",
  youtube: "YouTube",
  instagram: "IG",
  substack: "Substack",
  github: "GitHub",
};

interface SourceBadgeProps {
  source: string;
}

export function SourceBadge({ source }: SourceBadgeProps) {
  const key = source.toLowerCase().trim();
  const color = SOURCE_COLORS[key] ?? "#94A3B8";
  const label = SOURCE_LABELS[key] ?? source;

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase"
      style={{
        backgroundColor: `${color}20`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {label}
    </span>
  );
}
