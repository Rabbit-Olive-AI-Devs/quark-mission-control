"use client";

const SOURCE_COLORS: Record<string, string> = {
  hn: "#FF6600",
  hackernews: "#FF6600",
  reddit: "#FF4500",
  x: "#1DA1F2",
  twitter: "#1DA1F2",
  tavily: "#00A67E",
  web: "#00A67E",
  producthunt: "#DA552F",
  tiktok: "#FF0050",
  youtube: "#FF0000",
  instagram: "#C13584",
  substack: "#FF6719",
  github: "#8B5CF6",
};

const SOURCE_LABELS: Record<string, string> = {
  hn: "HN",
  hackernews: "HN",
  reddit: "Reddit",
  x: "X",
  twitter: "X",
  tavily: "Web",
  web: "Web",
  producthunt: "PH",
  tiktok: "TikTok",
  youtube: "YouTube",
  instagram: "IG",
  substack: "Substack",
  github: "GitHub",
};

/**
 * Parse a raw source string (which may be a protocol URI, URL, or plain name)
 * into a { platform, url } pair.
 *
 * Examples:
 *   "twitter://trending/123"       → { platform: "twitter", url: "https://x.com/search?q=..." }
 *   "https://x.com/user/status/1"  → { platform: "x", url: "https://x.com/user/status/1" }
 *   "https://news.ycombinator.com/item?id=123" → { platform: "hn", url: original }
 *   "tavily://search/..."          → { platform: "tavily", url: null }
 *   "Reddit"                       → { platform: "reddit", url: null }
 */
export function parseSource(raw: string): { platform: string; url: string | null; label: string } {
  const s = raw.trim();

  // Protocol-style: "twitter://trending/123 (file ref)"
  const protoMatch = s.match(/^(\w+):\/\/(.+?)(?:\s*\(.*\))?$/);
  if (protoMatch) {
    const proto = protoMatch[1].toLowerCase();
    const rest = protoMatch[2];

    // Known protocol → platform mappings
    if (proto === "twitter" || proto === "x") {
      // twitter://trending/ID → link to X search (trending IDs aren't directly linkable)
      return { platform: "twitter", url: null, label: "X" };
    }
    if (proto === "hackernews" || proto === "hn") {
      return { platform: "hn", url: `https://news.ycombinator.com/${rest}`, label: "HN" };
    }
    if (proto === "reddit") {
      return { platform: "reddit", url: `https://reddit.com/${rest}`, label: "Reddit" };
    }
    if (proto === "tavily") {
      return { platform: "tavily", url: null, label: "Web" };
    }
    if (proto === "github") {
      return { platform: "github", url: `https://github.com/${rest}`, label: "GitHub" };
    }
    if (proto === "producthunt") {
      return { platform: "producthunt", url: `https://producthunt.com/${rest}`, label: "PH" };
    }
    if (proto === "https" || proto === "http") {
      // It's a URL — detect platform from hostname
      return parseUrl(s);
    }
    // Unknown protocol
    const key = proto.toLowerCase();
    return {
      platform: key,
      url: null,
      label: SOURCE_LABELS[key] ?? proto.charAt(0).toUpperCase() + proto.slice(1),
    };
  }

  // Full URL
  if (s.startsWith("http://") || s.startsWith("https://")) {
    return parseUrl(s);
  }

  // Plain string — "Reddit", "X", "Hacker News", etc.
  const key = s.toLowerCase().replace(/\s+/g, "");
  return {
    platform: key,
    url: null,
    label: SOURCE_LABELS[key] ?? SOURCE_LABELS[s.toLowerCase()] ?? s,
  };
}

function parseUrl(url: string): { platform: string; url: string | null; label: string } {
  try {
    // Strip trailing markdown/parenthetical file refs: " (`intel/tmp/...`)"
    const cleanUrl = url.replace(/\s*\(.*\)$/, "").replace(/[`]/g, "").trim();
    const u = new URL(cleanUrl);
    const host = u.hostname.toLowerCase();

    if (host.includes("x.com") || host.includes("twitter.com"))
      return { platform: "twitter", url: cleanUrl, label: "X" };
    if (host.includes("news.ycombinator.com"))
      return { platform: "hn", url: cleanUrl, label: "HN" };
    if (host.includes("reddit.com"))
      return { platform: "reddit", url: cleanUrl, label: "Reddit" };
    if (host.includes("github.com"))
      return { platform: "github", url: cleanUrl, label: "GitHub" };
    if (host.includes("producthunt.com"))
      return { platform: "producthunt", url: cleanUrl, label: "PH" };
    if (host.includes("tiktok.com"))
      return { platform: "tiktok", url: cleanUrl, label: "TikTok" };
    if (host.includes("youtube.com") || host.includes("youtu.be"))
      return { platform: "youtube", url: cleanUrl, label: "YouTube" };
    if (host.includes("instagram.com"))
      return { platform: "instagram", url: cleanUrl, label: "IG" };
    if (host.includes("substack.com"))
      return { platform: "substack", url: cleanUrl, label: "Substack" };
    if (host.includes("reuters.com"))
      return { platform: "web", url: cleanUrl, label: "Reuters" };
    if (host.includes("theverge.com"))
      return { platform: "web", url: cleanUrl, label: "Verge" };
    if (host.includes("mistral.ai"))
      return { platform: "web", url: cleanUrl, label: "Mistral" };

    // Generic web
    return { platform: "web", url: cleanUrl, label: host.replace("www.", "").split(".")[0] };
  } catch {
    return { platform: "web", url: null, label: "Web" };
  }
}

/**
 * Parse a multi-source string (semicolon-separated) into parsed sources.
 */
export function parseSources(raw: string): ReturnType<typeof parseSource>[] {
  // Split on " ; " or ";" and also strip backtick-wrapped file refs like (`intel/tmp/...`)
  const cleaned = raw.replace(/\s*\(`[^`]*`\)/g, "");
  const parts = cleaned.split(/\s*;\s*/).filter(Boolean);
  return parts.map(parseSource);
}

/**
 * Get the clean platform label for a raw source string (for use in summaries).
 */
export function getSourceLabel(raw: string): string {
  const sources = parseSources(raw);
  if (sources.length === 0) return "Unknown";
  // Deduplicate labels
  const unique = [...new Set(sources.map((s) => s.label))];
  return unique.join(" + ");
}

interface SourceBadgeProps {
  source: string;
}

export function SourceBadge({ source }: SourceBadgeProps) {
  const sources = parseSources(source);

  if (sources.length === 0) {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase"
        style={{ backgroundColor: "#94A3B820", color: "#94A3B8", border: "1px solid #94A3B840" }}
      >
        Unknown
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      {sources.map((s, i) => {
        const color = SOURCE_COLORS[s.platform] ?? "#94A3B8";
        const badge = (
          <span
            key={i}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase"
            style={{
              backgroundColor: `${color}20`,
              color,
              border: `1px solid ${color}40`,
            }}
          >
            {s.label}
          </span>
        );

        if (s.url) {
          return (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:brightness-125 transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              {badge}
            </a>
          );
        }

        return badge;
      })}
    </span>
  );
}
