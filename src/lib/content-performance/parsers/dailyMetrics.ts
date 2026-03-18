import type { Platform } from "@/lib/content-performance/types";
import { extractFrontmatter, numberOrDefault, toChicagoDayKey } from "@/lib/content-performance/parsers/shared";

export interface ParsedDailyMetricRecord {
  reportDate: string;
  dayKey: string;
  platform: Platform;
  publishedCount: number;
  impressions: number;
  engagements: number;
}

export function parseDailyMetricsMarkdown(content: string, source: string) {
  try {
    const fm = extractFrontmatter(content);
    const reportDate = fm.date;
    if (!reportDate) {
      throw new Error("Missing required frontmatter field: date");
    }
    if (!fm.platform) {
      throw new Error("Missing required frontmatter field: platform");
    }

    return {
      records: [
        {
          reportDate,
          dayKey: toChicagoDayKey(`${reportDate}T12:00:00.000Z`),
          platform: fm.platform as Platform,
          publishedCount: numberOrDefault(fm.publishedCount, 0),
          impressions: numberOrDefault(fm.impressions, 0),
          engagements: numberOrDefault(fm.engagements, 0),
        } satisfies ParsedDailyMetricRecord,
      ],
      errors: [] as { source: string; line: number; message: string; raw?: string }[],
    };
  } catch (error) {
    return {
      records: [] as ParsedDailyMetricRecord[],
      errors: [
        {
          source,
          line: 1,
          message: error instanceof Error ? error.message : "Daily metrics parse error",
        },
      ],
    };
  }
}
