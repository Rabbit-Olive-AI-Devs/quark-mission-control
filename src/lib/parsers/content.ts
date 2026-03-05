import fs from "fs";
import path from "path";
import { WORKSPACE_PATH } from "../config";
import type { ContentPost, HookCategory } from "./types";

const PERF_PATH = "skills/genviral/workspace/performance";
const CONTENT_PATH = "skills/genviral/workspace/content";
const HOOKS_PATH = "skills/genviral/workspace/hooks";

export function parseContentLog(): ContentPost[] {
  const filePath = path.join(WORKSPACE_PATH, PERF_PATH, "log.json");
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return (raw.posts || [])
      .filter((p: Record<string, unknown>) => p.id !== "example-post-id")
      .map((p: Record<string, unknown>) => ({
        id: p.id as string,
        date: p.date as string,
        hook: p.hook as string,
        hookType: (p.hook_type || p.hookType) as string,
        platform: p.platform as string,
        metrics: p.metrics as ContentPost["metrics"],
      }));
  } catch {
    return [];
  }
}

export function parseHookTracker(): Record<string, HookCategory> {
  const filePath = path.join(WORKSPACE_PATH, PERF_PATH, "hook-tracker.json");
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const categories: Record<string, HookCategory> = {};
    for (const [key, val] of Object.entries(raw.hook_categories || {})) {
      const v = val as Record<string, unknown>;
      categories[key] = {
        totalPosts: (v.total_posts as number) || 0,
        avgViews: (v.avg_views as number) || 0,
        bestPostId: (v.best_post_id as string) || null,
      };
    }
    return categories;
  } catch {
    return {};
  }
}

export interface ContentCalendar {
  weekOf: string | null;
  plan: { day: string; platform: string; hook: string; status: string }[];
}

export function parseContentCalendar(): ContentCalendar {
  const filePath = path.join(WORKSPACE_PATH, CONTENT_PATH, "calendar.json");
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return {
      weekOf: raw.week_of || null,
      plan: (raw.plan || []).map((p: Record<string, string>) => ({
        day: p.day || "",
        platform: p.platform || "",
        hook: p.hook || "",
        status: p.status || "draft",
      })),
    };
  } catch {
    return { weekOf: null, plan: [] };
  }
}

export interface HookLibraryEntry {
  id: string;
  text: string;
  type: string;
  theme: string;
  uses: number;
  avgViews: number;
  status: string;
}

export function parseHookLibrary(): HookLibraryEntry[] {
  const filePath = path.join(WORKSPACE_PATH, HOOKS_PATH, "library.json");
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return (raw.hooks || []).map((h: Record<string, unknown>) => ({
      id: h.id as string,
      text: h.text as string,
      type: (h.type as string) || "",
      theme: (h.theme as string) || "",
      uses: (h.uses as number) || 0,
      avgViews: (h.avg_views as number) || 0,
      status: (h.status as string) || "fresh",
    }));
  } catch {
    return [];
  }
}
