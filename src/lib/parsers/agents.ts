import fs from "fs";
import path from "path";
import { WORKSPACE_PATH } from "../config";
import type { AgentConfig, AgentStatus, BroadcastStatus, CommsMessage } from "./types";

const CREW_AGENTS = ["neo", "fulcrum", "cassian", "chandler"];

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

function getLatestEntry(content: string): string {
  const lines = content.split("\n").filter((l) => l.trim().startsWith("- ") || l.trim().startsWith("### "));
  // Get last meaningful line
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("- ") && !line.includes("No reports") && !line.includes("awaiting")) {
      return line.slice(2);
    }
  }
  return "No recent activity";
}

export function parseAgents(): AgentStatus[] {
  return CREW_AGENTS.map((name) => {
    const config = parseAgentConfig(name);
    if (!config) {
      return {
        config: { name, description: "Unknown agent", model: "unknown", timeoutSeconds: 600 },
        latestComms: "Config not found",
        hasInbound: false,
        hasOutbound: false,
      };
    }

    const inbound = readCommsFile(`${name}-to-quark.md`);
    const outbound = readCommsFile(`quark-to-${name}.md`);

    return {
      config,
      latestComms: getLatestEntry(inbound) || getLatestEntry(outbound),
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

    // Collapse section into a single message
    const lines = trimmed.split("\n").filter((l) => l.trim());
    const heading = lines[0]?.replace(/^#{1,3}\s*/, "").trim();
    const body = lines.slice(1)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("---"))
      .map((l) => l.startsWith("- ") ? l.slice(2) : l)
      .join(" | ");

    if (heading || body) {
      messages.push({
        content: body ? `**${heading}** — ${body}` : heading || "",
        direction,
      });
    }
  }

  // If no sections found, try line-by-line bullets
  if (messages.length === 0) {
    for (const line of content.split("\n")) {
      const t = line.trim();
      if (t.startsWith("- ") && !skipPatterns.some((p) => t.includes(p))) {
        messages.push({ content: t.slice(2), direction });
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
