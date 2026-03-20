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
    ? (data.posts as TrackedPost[])
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
