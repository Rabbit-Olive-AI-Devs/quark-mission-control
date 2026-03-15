import fs from "fs";
import path from "path";
import { WORKSPACE_PATH } from "../config";
import type { AgentConfig, AgentStatus, BroadcastStatus, CommsMessage } from "./types";

const CREW_AGENTS = ["neo", "fulcrum", "cassian", "chandler", "mse6"];

const OPENCLAW_JSON_PATH = path.join(
  process.env.HOME || "/Users/quark",
  ".openclaw/openclaw.json"
);

/** Read actual models from openclaw.json cron jobs (keyed by agentId) + default model */
function getActualModels(): { defaultModel: string; agentModels: Record<string, string> } {
  try {
    const raw = JSON.parse(fs.readFileSync(OPENCLAW_JSON_PATH, "utf-8"));
    const defaultModel =
      raw?.agents?.defaults?.model?.primary || "unknown";
    const agentModels: Record<string, string> = {};

    const jobs = raw?.cron?.jobs || [];
    for (const job of jobs) {
      const agentId = job.agentId || job.payload?.agentId || "";
      const model = job.model || job.payload?.model || "";
      if (agentId && model && model !== "DEFAULT") {
        // Use the first cron job's model for each agent
        if (!agentModels[agentId]) {
          agentModels[agentId] = model;
        }
      }
    }

    return { defaultModel, agentModels };
  } catch {
    return { defaultModel: "unknown", agentModels: {} };
  }
}

export function parseAgentConfig(agentName: string): AgentConfig | null {
  const configPath = path.join(WORKSPACE_PATH, `.agents/${agentName}/config.json`);
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return {
      name: raw.name || agentName,
      description: raw.description || "",
      model: raw.model || "unknown",
      timeoutSeconds: raw.timeoutSeconds || 600,
    };
  } catch {
    return null;
  }
}

function readCommsFile(fileName: string): string {
  try {
    return fs.readFileSync(path.join(WORKSPACE_PATH, `comms/${fileName}`), "utf-8");
  } catch {
    return "";
  }
}

/** Extract timestamp from a section heading like "## 2026-03-14 09:00 CT — Morning X Cycle" */
function extractTimestamp(heading: string): string | null {
  // Match patterns: "2026-03-14 09:00 CT", "2026-03-14 — ...", "2026-03-14"
  const match = heading.match(/(\d{4}-\d{2}-\d{2})(?:\s+(\d{1,2}:\d{2})\s*(?:CT|CDT|CST)?)?/);
  if (!match) return null;
  const date = match[1];
  const time = match[2] || null;
  if (time) {
    return `${date} ${time} CT`;
  }
  return `${date}`;
}

/** Get latest entry text and its timestamp from comms content */
function getLatestEntry(content: string): { text: string; timestamp: string | null } {
  const sections = content.split(/^(?=##\s)/m).filter(Boolean);
  // Iterate from last section to find the latest meaningful one
  for (let i = sections.length - 1; i >= 0; i--) {
    const section = sections[i].trim();
    if (!section) continue;

    const lines = section.split("\n");
    const heading = lines[0] || "";
    if (heading.includes("No reports") || heading.includes("awaiting")) continue;

    const timestamp = extractTimestamp(heading);
    // Get a meaningful summary from the section
    const bodyLines = lines.slice(1).filter((l) => l.trim());
    const firstMeaningful = bodyLines.find(
      (l) => l.trim().startsWith("Status:") || l.trim().startsWith("- ") || l.trim().length > 5
    );
    const headingText = heading.replace(/^#{1,3}\s*/, "").replace(/\d{4}-\d{2}-\d{2}(?:\s+\d{1,2}:\d{2}\s*(?:CT|CDT|CST)?)?\s*—?\s*/, "").trim();
    const summary = headingText || (firstMeaningful?.trim().replace(/^-\s*/, "") ?? "");

    if (summary && !summary.includes("No reports") && !summary.includes("awaiting")) {
      return { text: summary, timestamp };
    }
  }

  // Fallback: try line-by-line bullets
  const lines = content.split("\n").filter((l) => l.trim().startsWith("- "));
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line.includes("No reports") && !line.includes("awaiting")) {
      return { text: line.slice(2), timestamp: null };
    }
  }

  return { text: "No recent activity", timestamp: null };
}

export function parseAgents(): AgentStatus[] {
  const { defaultModel, agentModels } = getActualModels();

  return CREW_AGENTS.map((name) => {
    const config = parseAgentConfig(name);
    if (!config) {
      return {
        config: { name, description: "Unknown agent", model: "unknown", timeoutSeconds: 600 },
        latestComms: "Config not found",
        latestTimestamp: null,
        hasInbound: false,
        hasOutbound: false,
      };
    }

    // Override model with actual runtime model
    const actualModel = agentModels[name] || defaultModel;
    config.model = actualModel;

    const inbound = readCommsFile(`${name}-to-quark.md`);
    const outbound = readCommsFile(`quark-to-${name}.md`);

    const inEntry = getLatestEntry(inbound);
    const outEntry = getLatestEntry(outbound);

    // Prefer the most recent entry (inbound usually more recent)
    const latest = inEntry.text !== "No recent activity" ? inEntry : outEntry;

    return {
      config,
      latestComms: latest.text,
      latestTimestamp: latest.timestamp,
      hasInbound: inbound.includes("- ") && !inbound.includes("No reports") && !inbound.includes("awaiting"),
      hasOutbound: outbound.includes("- ") && !outbound.includes("No directives"),
    };
  });
}

export function parseBroadcast(): BroadcastStatus {
  const content = readCommsFile("broadcast.md");
  const modeMatch = content.match(/Current Mode:\s*(\w+)/);
  const orders: string[] = [];
  const log: string[] = [];

  let section = "";
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("Standing orders:")) section = "orders";
    else if (trimmed.startsWith("## Log")) section = "log";
    else if (trimmed.startsWith("- ") && section === "orders") orders.push(trimmed.slice(2));
    else if (trimmed.startsWith("- ") && section === "log") log.push(trimmed.slice(2));
    else if (trimmed.match(/^###/) && section === "log") log.push(trimmed.replace(/^###\s*/, ""));
  }

  return {
    mode: modeMatch?.[1] || "NORMAL",
    standingOrders: orders,
    log,
  };
}

function parseCommsContent(content: string, direction: "inbound" | "outbound"): CommsMessage[] {
  const messages: CommsMessage[] = [];
  const skipPatterns = ["No reports", "awaiting", "No directives", "No pending"];

  // Split by sections (## or ###)
  const sections = content.split(/^(?=#{1,3}\s)/m).filter(Boolean);

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed || trimmed.startsWith("# ") && !trimmed.startsWith("## ")) continue; // skip title
    if (skipPatterns.some((p) => trimmed.includes(p))) continue;

    const lines = trimmed.split("\n").filter((l) => l.trim());
    const heading = lines[0]?.replace(/^#{1,3}\s*/, "").trim() || "";
    const timestamp = extractTimestamp(heading);

    const body = lines.slice(1)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("---"))
      .map((l) => l.startsWith("- ") ? l.slice(2) : l)
      .join(" | ");

    if (heading || body) {
      messages.push({
        content: body ? `**${heading}** — ${body}` : heading || "",
        direction,
        timestamp,
      });
    }
  }

  // If no sections found, try line-by-line bullets
  if (messages.length === 0) {
    for (const line of content.split("\n")) {
      const t = line.trim();
      if (t.startsWith("- ") && !skipPatterns.some((p) => t.includes(p))) {
        messages.push({ content: t.slice(2), direction, timestamp: null });
      }
    }
  }

  return messages;
}

export function parseComms(agentName: string): CommsMessage[] {
  const inbound = readCommsFile(`${agentName}-to-quark.md`);
  const outbound = readCommsFile(`quark-to-${agentName}.md`);

  return [
    ...parseCommsContent(inbound, "inbound"),
    ...parseCommsContent(outbound, "outbound"),
  ];
}
