import * as fs from "fs";
import * as path from "path";
import { WORKSPACE_PATH } from "../config";
import type {
  PostPerformanceData,
  ContentFeedback,
  TrackedPost,
  HookStats,
  FollowerSnapshot,
  PlatformThresholds,
} from "./types";

const PERF_PATH = path.join(
  WORKSPACE_PATH,
  "content-engine/state/post-performance.json"
);
const FEEDBACK_PATH = path.join(
  WORKSPACE_PATH,
  "content-engine/state/content-feedback.json"
);

function readFeedback(): ContentFeedback | null {
  try {
    const raw = fs.readFileSync(FEEDBACK_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return data as ContentFeedback;
  } catch {
    return null;
  }
}

export function parsePostPerformance(): PostPerformanceData | null {
  let raw: string;
  try {
    raw = fs.readFileSync(PERF_PATH, "utf-8");
  } catch {
    return null;
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const posts: TrackedPost[] = Array.isArray(data.posts)
    ? (data.posts as Record<string, unknown>[]).map((p) => ({
        job_id: (p.job_id as string) ?? "",
        post_id: (p.post_id as string) ?? "",
        platform: (p.platform as string) ?? "unknown",
        format: (p.format as string) ?? "",
        content_type: (p.content_type as string) ?? "unknown",
        hook: (p.hook as string) ?? "",
        cta: (p.cta as string) ?? "",
        title: (p.title as string) ?? "",
        text: (p.text as string) ?? "",
        created_at: (p.created_at as string) ?? (p.published_at as string) ?? "",
        last_updated: (p.last_updated as string) ?? (p.metrics_updated_at as string) ?? "",
        url: (p.url as string) ?? "",
        metrics: p.metrics && typeof p.metrics === "object" ? p.metrics as TrackedPost["metrics"] : {},
        diagnostic: ((p.diagnostic as string) ?? "unclassified") as TrackedPost["diagnostic"],
        note: (p.note as string) ?? undefined,
        traffic_sources: p.traffic_sources as TrackedPost["traffic_sources"],
      }))
    : [];

  const hooks: HookStats =
    data.hooks && typeof data.hooks === "object" && !Array.isArray(data.hooks)
      ? (data.hooks as HookStats)
      : { by_content_type: {}, rules: {} };

  const thresholds: Record<string, PlatformThresholds> =
    data.thresholds &&
    typeof data.thresholds === "object" &&
    !Array.isArray(data.thresholds)
      ? (data.thresholds as Record<string, PlatformThresholds>)
      : {};

  const followerHistory: FollowerSnapshot[] = Array.isArray(
    data.follower_history
  )
    ? (data.follower_history as FollowerSnapshot[])
    : [];

  const feedback = readFeedback();

  return {
    schemaVersion: typeof data.schema_version === "number" ? data.schema_version : 1,
    lastCollectedAt:
      typeof data.last_collected_at === "string" ? data.last_collected_at : "",
    posts,
    hooks,
    thresholds,
    followerHistory,
    feedback,
  };
}
