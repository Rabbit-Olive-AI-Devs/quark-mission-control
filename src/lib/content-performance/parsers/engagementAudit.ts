import type { Platform } from "@/lib/content-performance/types";
import { isLateArrival, mustString, numberOrDefault, optionalNumber, parseJsonl, stringOrUndefined, toChicagoDayKey } from "@/lib/content-performance/parsers/shared";

export interface ParsedEngagementAuditRecord {
  publishId: string;
  platform: Platform;
  capturedAt: string;
  dayKey: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number | null;
  engagementOnly: boolean;
  lateArrival: boolean;
}

export function parseEngagementAuditJsonl(content: string, source: string) {
  return parseJsonl<ParsedEngagementAuditRecord>(content, source, (value) => {
    const row = value as Record<string, unknown>;
    const capturedAt = mustString(row.capturedAt, "capturedAt");
    const recordedAt = stringOrUndefined(row.recordedAt);
    const views = optionalNumber(row.views);

    return {
      publishId: mustString(row.publishId, "publishId"),
      platform: mustString(row.platform, "platform") as Platform,
      capturedAt,
      dayKey: toChicagoDayKey(capturedAt),
      likes: numberOrDefault(row.likes, 0),
      comments: numberOrDefault(row.comments, 0),
      shares: numberOrDefault(row.shares, 0),
      saves: numberOrDefault(row.saves, 0),
      views,
      engagementOnly: views === null,
      lateArrival: isLateArrival(capturedAt, recordedAt),
    };
  });
}
