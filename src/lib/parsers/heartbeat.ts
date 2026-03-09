import fs from "fs";
import path from "path";
import { WORKSPACE_PATH } from "../config";
import type { HeartbeatState } from "./types";

export function parseHeartbeat(): HeartbeatState {
  const filePath = path.join(WORKSPACE_PATH, "memory/heartbeat-state.md");
  const defaults: HeartbeatState = {
    lastDmTimestamp: null,
    lastMentionId: null,
    lastHeartbeat: null,
    lastDigestTimestamp: null,
    lastProactiveSuggestionDate: null,
  };

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      const match = line.match(/^(\w[\w_]+):\s*"?(.+?)"?\s*$/);
      if (!match) continue;
      const [, key, value] = match;

      switch (key) {
        case "last_dm_timestamp":
          defaults.lastDmTimestamp = value;
          break;
        case "last_mention_id":
          defaults.lastMentionId = value;
          break;
        case "last_heartbeat":
          defaults.lastHeartbeat = value;
          break;
        case "last_digest_timestamp": {
          if (/^\d+$/.test(value)) {
            const ms = Number(value);
            defaults.lastDigestTimestamp = Number.isFinite(ms) ? new Date(ms).toISOString() : value;
          } else {
            defaults.lastDigestTimestamp = value;
          }
          break;
        }
        case "last_proactive_suggestion_date":
          defaults.lastProactiveSuggestionDate = value;
          break;
      }
    }
  } catch {
    // Return defaults if file missing
  }

  return defaults;
}
