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

export function parseComms(agentName: string): CommsMessage[] {
  const messages: CommsMessage[] = [];

  const inbound = readCommsFile(`${agentName}-to-quark.md`);
  for (const line of inbound.split("\n")) {
    if (line.trim().startsWith("- ") && !line.includes("No reports") && !line.includes("awaiting")) {
      messages.push({ content: line.trim().slice(2), direction: "inbound" });
    }
  }

  const outbound = readCommsFile(`quark-to-${agentName}.md`);
  for (const line of outbound.split("\n")) {
    if (line.trim().startsWith("- ") && !line.includes("No directives")) {
      messages.push({ content: line.trim().slice(2), direction: "outbound" });
    }
  }

  return messages;
}
