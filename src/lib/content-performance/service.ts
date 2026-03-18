import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createContentPerformanceCache, type ContentPerformanceCache } from "@/lib/content-performance/cache";
import { parsePublishAuditJsonl } from "@/lib/content-performance/parsers/publishAudit";
import { parseEngagementAuditJsonl } from "@/lib/content-performance/parsers/engagementAudit";
import { parseDailyMetricsMarkdown } from "@/lib/content-performance/parsers/dailyMetrics";
import { parseCognitiveMetricsJson } from "@/lib/content-performance/parsers/cognitiveMetrics";

export interface ServiceSources {
  publishAuditJsonl: string;
  engagementAuditJsonl: string;
  dailyMetricsMarkdownFiles: string[];
  cognitiveMetricsJsonFiles: string[];
}

interface SourceHealth {
  publishAuditPresent: boolean;
  engagementAuditPresent: boolean;
  dailyMetricsFiles: number;
  cognitiveMetricsFiles: number;
}

export interface ContentPerformancePageDto {
  meta: {
    refreshedAt: string;
    lastSuccessAt: string | null;
    stale: boolean;
    sourceHealth: SourceHealth;
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

const safeRead = (filePath: string) => (existsSync(filePath) ? readFileSync(filePath, "utf8") : "");

function readAllFiles(dirPath: string, extension: string): string[] {
  if (!existsSync(dirPath)) return [];

  const files = readdirSync(dirPath)
    .filter((name) => name.endsWith(extension))
    .sort();

  return files.map((fileName) => readFileSync(path.join(dirPath, fileName), "utf8"));
}

export function loadServiceSources(): ServiceSources {
  const root = process.cwd();
  const contentState = path.resolve(root, "content-engine/state");
  const metricsRoot = path.resolve(root, "metrics");

  return {
    publishAuditJsonl: safeRead(path.join(contentState, "publish-audit.jsonl")),
    engagementAuditJsonl: safeRead(path.join(contentState, "engagement-audit.jsonl")),
    dailyMetricsMarkdownFiles: readAllFiles(path.join(metricsRoot, "daily"), ".md"),
    cognitiveMetricsJsonFiles: readAllFiles(path.join(metricsRoot, "cognitive"), ".json"),
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

    const dailyRuns = sources.dailyMetricsMarkdownFiles.map((content, idx) =>
      parseDailyMetricsMarkdown(content, `daily-metrics-${idx + 1}.md`)
    );
    const cognitiveRuns = sources.cognitiveMetricsJsonFiles.map((content, idx) =>
      parseCognitiveMetricsJson(content, `cognitive-metrics-${idx + 1}.json`)
    );

    const dailyRecords = dailyRuns.flatMap((run) => run.records);
    const dailyErrors = dailyRuns.flatMap((run) => run.errors);
    const cognitiveRecords = cognitiveRuns.flatMap((run) => run.records);
    const cognitiveErrors = cognitiveRuns.flatMap((run) => run.errors);

    if (sources.dailyMetricsMarkdownFiles.length === 0) {
      dailyErrors.push({ source: "daily-metrics", line: 1, message: "No daily metrics files found" });
    }
    if (sources.cognitiveMetricsJsonFiles.length === 0) {
      cognitiveErrors.push({ source: "cognitive-metrics", line: 1, message: "No cognitive metrics files found" });
    }

    const refreshedAt = now.toISOString();
    this.lastSuccessAt = refreshedAt;

    return {
      meta: {
        refreshedAt,
        lastSuccessAt: this.lastSuccessAt,
        stale: false,
        sourceHealth: {
          publishAuditPresent: sources.publishAuditJsonl.trim().length > 0,
          engagementAuditPresent: sources.engagementAuditJsonl.trim().length > 0,
          dailyMetricsFiles: sources.dailyMetricsMarkdownFiles.length,
          cognitiveMetricsFiles: sources.cognitiveMetricsJsonFiles.length,
        },
      },
      counts: {
        publishRecords: publish.records.length,
        engagementRecords: engagement.records.length,
        dailyRecords: dailyRecords.length,
        cognitiveRecords: cognitiveRecords.length,
      },
      errors: [...publish.errors, ...engagement.errors, ...dailyErrors, ...cognitiveErrors],
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
