import type { ScoreVersion, WindowDays } from "@/lib/content-performance/types";

export const CONTENT_PERFORMANCE_WINDOWS: readonly WindowDays[] = [7, 14, 30, 90] as const;

export const DEFAULT_SCORE_VERSION: ScoreVersion = "v1";

export const SCORE_V1_WEIGHTS = {
  engagement: 0.6,
  views: 0.4,
} as const;
