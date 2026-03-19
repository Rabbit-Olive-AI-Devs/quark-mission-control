"use client";

import type { StatusFullResponse, StatusLevel } from "@/lib/parsers/types";
import { PLATFORM_COLORS } from "@/lib/theme-constants";

interface ContentPanelProps {
  data: StatusFullResponse;
}

const PLATFORM_ABBREV: Record<string, string> = {
  x_post: "X",
  x_thread: "X",
  x: "X",
  tiktok_video: "TT",
  tiktok: "TT",
  reels_video: "IG",
  instagram: "IG",
  youtube: "YT",
  substack: "SS",
};

function getPlatformAbbrev(platform: string): string {
  return PLATFORM_ABBREV[platform] ?? platform.toUpperCase().slice(0, 2);
}

function getPlatformColorForFormat(format: string): string {
  if (format.startsWith("x_") || format === "x")
    return PLATFORM_COLORS.x ?? "#1DA1F2";
  if (format.startsWith("tiktok"))
    return PLATFORM_COLORS.tiktok ?? "#FF0050";
  if (format.startsWith("reels") || format === "instagram")
    return PLATFORM_COLORS.instagram ?? "#C13584";
  if (format === "youtube") return PLATFORM_COLORS.youtube ?? "#FF0000";
  if (format === "substack") return PLATFORM_COLORS.substack ?? "#FF6719";
  return "#94A3B8";
}

export function deriveContentLevel(data: StatusFullResponse): StatusLevel {
  const { publishedCount } = data.contentToday;
  if (publishedCount > 0) return "healthy";

  // Check if past noon CT
  const now = new Date();
  const ctHour = parseInt(
    now.toLocaleString("en-US", {
      timeZone: "America/Chicago",
      hour: "numeric",
      hour12: false,
    })
  );
  if (ctHour >= 12) return "warning";
  return "healthy";
}

export function ContentPanel({ data }: ContentPanelProps) {
  const { publishedCount, platforms, publishMode } = data.contentToday;

  return (
    <div className="space-y-3">
      {/* Published count */}
      <div className="flex items-baseline gap-2">
        <span
          className="font-mono text-3xl font-bold text-[#F1F5F9]"
          style={{
            textShadow:
              publishedCount > 0
                ? "0 0 16px rgba(0,212,170,0.2)"
                : "none",
          }}
        >
          {publishedCount}
        </span>
        <span className="text-sm text-[#94A3B8]">published today</span>
      </div>

      {/* Platform badges */}
      {platforms.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {platforms.map((format, i) => (
            <span
              key={`${format}-${i}`}
              className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
              style={{
                backgroundColor: getPlatformColorForFormat(format),
                boxShadow: `0 0 6px ${getPlatformColorForFormat(format)}30`,
              }}
            >
              {getPlatformAbbrev(format)}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#475569]">No publishes yet today</p>
      )}

      {/* Publish mode badge */}
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            publishMode === "LIVE"
              ? "bg-[#00D4AA]/20 text-[#00D4AA]"
              : "bg-amber-500/20 text-amber-500"
          }`}
          style={{
            boxShadow:
              publishMode === "LIVE"
                ? "0 0 8px rgba(0,212,170,0.15)"
                : "0 0 8px rgba(245,158,11,0.1)",
          }}
        >
          {publishMode}
        </span>
      </div>
    </div>
  );
}
