export type FormulaPlatform = "x" | "tiktok" | "instagram" | "youtube" | "substack";

export interface EngagementMetricInput {
  likes?: number;
  replies?: number;
  reposts?: number;
  bookmarks?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  restacks?: number;
}

export interface DailyAggregateInput {
  dayKey: string;
  posts: number;
  engagements: number;
}

export interface EvolutionPoint {
  dayKey: string;
  posts: number;
  totalEngagements: number;
  engagementPerPost: number;
  rolling7dEngagement: number;
}

const n = (v?: number) => v ?? 0;

export function computePlatformEngagement(platform: FormulaPlatform, metrics: EngagementMetricInput): number {
  if (platform === "x") {
    return n(metrics.likes) + n(metrics.replies) + n(metrics.reposts) + n(metrics.bookmarks);
  }
  if (platform === "tiktok" || platform === "instagram") {
    return n(metrics.likes) + n(metrics.comments) + n(metrics.shares) + n(metrics.saves);
  }
  if (platform === "youtube") {
    return n(metrics.likes) + n(metrics.comments) + n(metrics.shares);
  }
  return n(metrics.likes) + n(metrics.comments) + n(metrics.restacks);
}

export function computeEvolutionSeries(input: DailyAggregateInput[]): EvolutionPoint[] {
  const sorted = [...input].sort((a, b) => a.dayKey.localeCompare(b.dayKey));

  return sorted.map((row, index) => {
    const slice = sorted.slice(Math.max(0, index - 6), index + 1);
    const rolling7dEngagement = slice.reduce((sum, item) => sum + item.engagements, 0) / slice.length;

    return {
      dayKey: row.dayKey,
      posts: row.posts,
      totalEngagements: row.engagements,
      engagementPerPost: row.posts > 0 ? row.engagements / row.posts : 0,
      rolling7dEngagement,
    };
  });
}
