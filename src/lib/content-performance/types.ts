export type Platform = "x" | "instagram" | "tiktok" | "youtube" | "threads" | "linkedin";

export type ContentType =
  | "analysis"
  | "story"
  | "tutorial"
  | "announcement"
  | "video"
  | "slideshow"
  | "thread"
  | "short";

export type WindowDays = 7 | 14 | 30 | 90;

export type ScoreVersion = `v${number}`;

export type AuditEventType =
  | "publish_ingested"
  | "engagement_ingested"
  | "daily_report_ingested"
  | "cognitive_signal_ingested"
  | "score_computed"
  | "score_recomputed";

export interface PublishRecordRaw {
  id: string;
  platform: Platform;
  contentType: ContentType;
  publishedAt: string;
  campaignId?: string;
  authorId?: string;
  url?: string;
}

export interface EngagementRecordRaw {
  publishId: string;
  platform: Platform;
  capturedAt: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves?: number;
}

export interface DailyReportRecordRaw {
  reportDate: string;
  platform: Platform;
  publishedCount: number;
  impressions: number;
  engagements: number;
}

export interface CognitiveRecordRaw {
  signalDate: string;
  cognitiveScore: number;
  degradationDetected: boolean;
  trigger?: string;
}

export interface ScoreBreakdown {
  publishId: string;
  platform: Platform;
  contentType: ContentType;
  score: number;
  scoreVersion: ScoreVersion;
  engagementComponent: number;
  viewComponent: number;
  computedAt: string;
}

export interface ChartPoint {
  date: string;
  platform: Platform;
  score: number;
  views: number;
  engagementRate: number;
}

export interface RankingEntry {
  publishId: string;
  platform: Platform;
  contentType: ContentType;
  score: number;
  scoreVersion: ScoreVersion;
  rank: number;
}

export interface PlatformBreakdown {
  platform: Platform;
  totalScore: number;
  averageScore: number;
  totalViews: number;
  totalEngagements: number;
  topContentType: ContentType | null;
}

export interface ContentPerformanceWindowOutput {
  windowDays: WindowDays;
  scoreVersion: ScoreVersion;
  chart: ChartPoint[];
  rankings: RankingEntry[];
  breakdowns: PlatformBreakdown[];
}

export type ScoreVersionStatus = "active" | "deprecated" | "retired";

export interface ScoringWeights {
  engagement: number;
  views: number;
}
