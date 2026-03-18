import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createContentPerformanceCache, type ContentPerformanceCache } from "@/lib/content-performance/cache";
import { parsePublishAuditJsonl } from "@/lib/content-performance/parsers/publishAudit";
import { parseEngagementAuditJsonl } from "@/lib/content-performance/parsers/engagementAudit";
import { parseDailyMetricsMarkdown } from "@/lib/content-performance/parsers/dailyMetrics";
import { parseCognitiveMetricsJson } from "@/lib/content-performance/parsers/cognitiveMetrics";

export interface ServiceSources {
  publishAuditJsonl: string;
  engagementAuditJsonl: string;
  dailyMetricsMarkdown: string;
  cognitiveMetricsJson: string;
}

export interface ContentPerformancePageDto {
  meta: {
    refreshedAt: string;
    lastSuccessAt: string | null;
    stale: boolean;
  };
  counts: {
    publishRecords: number;
    engagementRecords: number;
    dailyRecords: number;
    cognitiveRecords: number;
  };
  errors: {
    source: string;
    line: number;
    message: string;
    raw?: string;
  }[];
}

const safeRead = (filePath: string, fallback = "") => (existsSync(filePath) ? readFileSync(filePath, "utf8") : fallback);

export function loadServiceSources(): ServiceSources {
  const fixturesRoot = path.resolve(process.cwd(), "src/lib/content-performance/fixtures");

  return {
    publishAuditJsonl: safeRead(path.join(fixturesRoot, "publish-valid.jsonl"), ""),
    engagementAuditJsonl: safeRead(path.join(fixturesRoot, "engagement-valid.jsonl"), ""),
    dailyMetricsMarkdown: safeRead(path.join(fixturesRoot, "daily-valid.md"), "---\ndate: 1970-01-01\nplatform: x\n---\n"),
    cognitiveMetricsJson: safeRead(path.join(fixturesRoot, "cognitive-valid.json"), "[]"),
  };
}

export class ContentPerformanceService {
  private cache: ContentPerformanceCache<ContentPerformancePageDto>;
  private lastSuccessAt: string | null = null;

  constructor(cache: ContentPerformanceCache<ContentPerformancePageDto> = createContentPerformanceCache()) {
    this.cache = cache;
  }

  private buildDto(sources: ServiceSources, now: Date): ContentPerformancePageDto {
    const publish = parsePublishAuditJsonl(sources.publishAuditJsonl, "publish-audit.jsonl");
    const engagement = parseEngagementAuditJsonl(sources.engagementAuditJsonl, "engagement-audit.jsonl");
    const daily = parseDailyMetricsMarkdown(sources.dailyMetricsMarkdown, "daily-metrics.md");
    const cognitive = parseCognitiveMetricsJson(sources.cognitiveMetricsJson, "cognitive-metrics.json");

    const refreshedAt = now.toISOString();
    this.lastSuccessAt = this.lastSuccessAt ?? refreshedAt;

    return {
      meta: {
        refreshedAt,
        lastSuccessAt: this.lastSuccessAt,
        stale: false,
      },
      counts: {
        publishRecords: publish.records.length,
        engagementRecords: engagement.records.length,
        dailyRecords: daily.records.length,
        cognitiveRecords: cognitive.records.length,
      },
      errors: [...publish.errors, ...engagement.errors, ...daily.errors, ...cognitive.errors],
    };
  }

  getPageData(sources: ServiceSources, now = new Date()): ContentPerformancePageDto {
    const hit = this.cache.get(now);
    if (hit) {
      const stale = this.lastSuccessAt
        ? now.getTime() - new Date(this.lastSuccessAt).getTime() > 90 * 60 * 1000
        : false;

      return {
        ...hit.data,
        meta: {
          ...hit.data.meta,
          lastSuccessAt: this.lastSuccessAt,
          stale,
        },
      };
    }

    const dto = this.buildDto(sources, now);

    this.cache.set({
      data: dto,
      refreshedAt: dto.meta.refreshedAt,
      expiresAt: now.getTime() + 60 * 60 * 1000,
      lastSuccessAt: this.lastSuccessAt ?? dto.meta.refreshedAt,
    });

    return dto;
  }

  refreshNow(sources: ServiceSources, now = new Date()): ContentPerformancePageDto {
    this.cache.clear();
    return this.getPageData(sources, now);
  }
}

export const contentPerformanceService = new ContentPerformanceService();
