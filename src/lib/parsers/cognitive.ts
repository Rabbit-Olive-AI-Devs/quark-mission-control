import * as fs from "fs";
import * as path from "path";
import { WORKSPACE_PATH } from "../config";
import { getWeekLabel } from "../utils";
import type {
  CognitiveDay,
  CognitiveData,
  CognitiveMemoryHealth,
  CognitiveProactivity,
  CognitiveEngagement,
  CognitiveIdentityEvolution,
  WeeklyRollup,
} from "./types";

const COGNITIVE_DIR = path.join(WORKSPACE_PATH, "metrics/cognitive");
const MAX_DAYS = 30;

function parseCognitiveFile(filePath: string): CognitiveDay | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    const mh = data.memory_health || {};
    const memoryHealth: CognitiveMemoryHealth = {
      kbFileCount: mh.kb_file_count ?? 0,
      kbUpdatedToday: mh.kb_files_updated_today ?? 0,
      userMdLastModified: mh.user_md_last_modified ?? null,
      userMdStaleDays: mh.user_md_stale_days ?? 0,
      identityMdLastModified: mh.identity_md_last_modified ?? null,
      identityMdStaleDays: mh.identity_md_stale_days ?? 0,
      journalWordCount: mh.journal_word_count ?? 0,
      journalReflectiveMarkers: mh.journal_reflective_markers ?? 0,
      journalReflective: mh.journal_reflective ?? false,
      memoryMdLineCount: mh.memory_md_line_count ?? 0,
      captureQueuePromoted: mh.capture_queue_promoted ?? 0,
    };

    const p = data.proactivity || {};
    const proactivity: CognitiveProactivity = {
      surpriseMeSent: p.surprise_me_sent ?? 0,
      curiosityQuestions: p.curiosity_questions ?? 0,
      socialEngagements: p.social_engagements ?? 0,
      commentReplies: p.comment_replies ?? 0,
      proactiveTotal: p.proactive_actions_total ?? 0,
      reactiveTotal: p.reactive_actions_total ?? 0,
      ratio: p.ratio ?? 0,
    };

    const e = data.engagement || {};
    const engagement: CognitiveEngagement = {
      xReplies: e.x_replies ?? 0,
      tiktokReplies: e.tiktok_replies ?? 0,
      youtubeReplies: e.youtube_replies ?? 0,
      instagramReplies: e.instagram_replies ?? 0,
      substackReplies: e.substack_replies ?? 0,
      totalReceived: e.total_received ?? 0,
      totalReplied: e.total_replied ?? 0,
      replyRate: e.reply_rate ?? 0,
    };

    let identityEvolution: CognitiveIdentityEvolution | undefined;
    if (data.identity_evolution) {
      const ie = data.identity_evolution;
      identityEvolution = {
        kbDiffCreated: ie.kb_diff_created ?? 0,
        kbDiffUpdated: ie.kb_diff_updated ?? 0,
        userMdChanged: ie.user_md_changed ?? false,
        journalReflectivePct: ie.journal_reflective_pct ?? 0,
        identityMdStaleDays: ie.identity_md_stale_days ?? 0,
      };
    }

    return {
      date: data.date || "",
      collectedAt: data.collected_at || "",
      memoryHealth,
      proactivity,
      engagement,
      degradationFlags: Array.isArray(data.degradation_flags) ? data.degradation_flags : [],
      tier1FileSizes: data.tier1_file_sizes || {},
      identityEvolution,
    };
  } catch {
    return null;
  }
}

function getLiveStaleness(): { userMdStaleDays: number; identityMdStaleDays: number } {
  const now = Date.now();
  let userMdStaleDays = 0;
  let identityMdStaleDays = 0;

  try {
    const userStat = fs.statSync(path.join(WORKSPACE_PATH, "USER.md"));
    userMdStaleDays = Math.floor((now - userStat.mtimeMs) / 86400000);
  } catch {
    userMdStaleDays = 999;
  }

  try {
    const idStat = fs.statSync(path.join(WORKSPACE_PATH, "IDENTITY.md"));
    identityMdStaleDays = Math.floor((now - idStat.mtimeMs) / 86400000);
  } catch {
    identityMdStaleDays = 999;
  }

  return { userMdStaleDays, identityMdStaleDays };
}

function computeWeeklyRollups(history: CognitiveDay[]): WeeklyRollup[] {
  const weekMap = new Map<string, CognitiveDay[]>();

  for (const day of history) {
    const label = getWeekLabel(day.date);
    if (!weekMap.has(label)) weekMap.set(label, []);
    weekMap.get(label)!.push(day);
  }

  const rollups: WeeklyRollup[] = [];
  for (const [weekLabel, days] of weekMap) {
    const n = days.length;
    const avgJournalWords = Math.round(days.reduce((s, d) => s + d.memoryHealth.journalWordCount, 0) / n);
    const avgProactivityRatio = parseFloat((days.reduce((s, d) => s + d.proactivity.ratio, 0) / n).toFixed(2));
    const totalSocialEngagements = days.reduce((s, d) => s + d.proactivity.socialEngagements, 0);
    const avgReplyRate = parseFloat((days.reduce((s, d) => s + d.engagement.replyRate, 0) / n).toFixed(2));
    const kbFilesAdded = days.reduce((s, d) => s + d.memoryHealth.kbUpdatedToday, 0);
    const degradationDays = days.filter((d) => d.degradationFlags.length > 0).length;

    // Find identity evolution from Friday entry (if any)
    const fridayEntry = days.find((d) => {
      const dow = new Date(d.date + "T12:00:00").getDay();
      return dow === 5; // Friday
    });

    rollups.push({
      weekLabel,
      avgJournalWords,
      avgProactivityRatio,
      totalSocialEngagements,
      avgReplyRate,
      kbFilesAdded,
      degradationDays,
      identityEvolution: fridayEntry?.identityEvolution,
    });
  }

  return rollups;
}

export function parseCognitive(): CognitiveData {
  const empty: CognitiveData = {
    current: null,
    history: [],
    weeklyRollups: [],
    activeDegradation: [],
  };

  // Read JSON files from cognitive directory
  let files: string[] = [];
  try {
    files = fs
      .readdirSync(COGNITIVE_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse()
      .slice(0, MAX_DAYS);
  } catch {
    return empty;
  }

  if (files.length === 0) return empty;

  const history: CognitiveDay[] = [];
  for (const file of files) {
    const day = parseCognitiveFile(path.join(COGNITIVE_DIR, file));
    if (day) history.push(day);
  }

  if (history.length === 0) return empty;

  // Current = most recent day (defensive copy to avoid mutating history[0])
  let current: CognitiveDay = { ...history[0], memoryHealth: { ...history[0].memoryHealth } };

  // If today's file doesn't exist yet, overlay live staleness on current
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  if (current.date !== todayStr) {
    const live = getLiveStaleness();
    current.memoryHealth.userMdStaleDays = live.userMdStaleDays;
    current.memoryHealth.identityMdStaleDays = live.identityMdStaleDays;
  }

  const weeklyRollups = computeWeeklyRollups(history);
  const activeDegradation = current.degradationFlags;

  return {
    current,
    history,
    weeklyRollups,
    activeDegradation,
  };
}
