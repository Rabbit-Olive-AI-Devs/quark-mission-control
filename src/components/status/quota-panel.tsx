"use client";

import { StatusSentence } from "@/components/ui/status-sentence";
import type { OAuthProfile, StatusFullResponse } from "@/lib/parsers/types";

interface QuotaPanelProps {
  data: StatusFullResponse;
}

function ProgressBar({ label, pct }: { label: string; pct: number }) {
  const clampedPct = Math.max(0, Math.min(100, pct));
  const color =
    clampedPct > 40 ? "#00D4AA" : clampedPct > 20 ? "#F59E0B" : "#EF4444";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-[#94A3B8]">{label}</span>
        <span className="font-mono font-bold text-[#F1F5F9]">
          {Math.round(clampedPct)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#1E293B]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${clampedPct}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}30`,
          }}
        />
      </div>
    </div>
  );
}

function computeResetTime(): string {
  const now = new Date();
  // Midnight Central Time
  const ct = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Chicago" })
  );
  const midnight = new Date(ct);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);

  const diffMs = midnight.getTime() - ct.getTime();
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);

  return `Daily resets in ${hours}h ${minutes}m`;
}

const THREE_DAYS_MS = 3 * 86_400_000;
const ONE_DAY_MS = 86_400_000;

function oauthDotColor(profile: OAuthProfile): string {
  if (profile.status === "expired") return "#EF4444";
  if (profile.status === "static") return "#00D4AA";
  if (profile.status === "error" || profile.status === "missing")
    return "#EF4444";
  if (profile.remainingMs !== null) {
    if (profile.remainingMs <= 0) return "#EF4444";
    if (profile.remainingMs < ONE_DAY_MS) return "#EF4444";
    if (profile.remainingMs < THREE_DAYS_MS) return "#F59E0B";
  }
  return "#00D4AA";
}

function providerLabel(provider: string): string {
  if (provider.includes("codex") || provider.includes("openai"))
    return "Codex";
  if (provider.includes("minimax")) return "MiniMax";
  // Capitalize first letter as fallback
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export function QuotaPanel({ data }: QuotaPanelProps) {
  const dailyPct = data.quota.raw?.dailyRemaining ?? 100;
  const weeklyPct = data.quota.raw?.weeklyRemaining ?? 100;
  const oauthProfiles = data.oauth ?? [];

  return (
    <div className="space-y-3">
      <StatusSentence
        level={data.quota.level}
        sentence={data.quota.sentence}
      />

      <ProgressBar label="Daily" pct={dailyPct} />
      <ProgressBar label="Weekly" pct={weeklyPct} />

      {oauthProfiles.length > 0 && (
        <div className="space-y-1.5 border-t border-white/[0.06] pt-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">
            Model Auth
          </span>
          {oauthProfiles.map((profile) => {
            const dotColor = oauthDotColor(profile);
            return (
              <div
                key={profile.provider}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: dotColor,
                      boxShadow: `0 0 6px ${dotColor}60`,
                    }}
                  />
                  <span className="text-[#94A3B8]">
                    {providerLabel(profile.provider)}
                  </span>
                </div>
                <span className="font-mono font-bold text-[#F1F5F9]">
                  {profile.remainingHuman}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="font-mono text-[10px] text-[#475569]">
        {computeResetTime()}
      </p>
    </div>
  );
}
