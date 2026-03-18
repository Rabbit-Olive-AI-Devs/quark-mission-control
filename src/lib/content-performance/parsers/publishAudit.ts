import type { ContentType, Platform } from "@/lib/content-performance/types";
import { isLateArrival, mustString, parseJsonl, stringOrUndefined, toChicagoDayKey } from "@/lib/content-performance/parsers/shared";

export interface ParsedPublishAuditRecord {
  id: string;
  platform: Platform;
  contentType: ContentType;
  publishedAt: string;
  publishedDayKey: string;
  lateArrival: boolean;
  campaignId?: string;
  authorId?: string;
  url?: string;
}

export function parsePublishAuditJsonl(content: string, source: string) {
  return parseJsonl<ParsedPublishAuditRecord>(content, source, (value) => {
    const row = value as Record<string, unknown>;
    const publishedAt = mustString(row.publishedAt, "publishedAt");
    const recordedAt = stringOrUndefined(row.recordedAt);

    return {
      id: mustString(row.id, "id"),
      platform: mustString(row.platform, "platform") as Platform,
      contentType: mustString(row.contentType, "contentType") as ContentType,
      publishedAt,
      publishedDayKey: toChicagoDayKey(publishedAt),
      lateArrival: isLateArrival(publishedAt, recordedAt),
      campaignId: stringOrUndefined(row.campaignId),
      authorId: stringOrUndefined(row.authorId),
      url: stringOrUndefined(row.url),
    };
  });
}
