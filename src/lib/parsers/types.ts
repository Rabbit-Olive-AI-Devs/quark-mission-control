// Heartbeat state
export interface HeartbeatState {
  lastDmTimestamp: string | null;
  lastMentionId: string | null;
  lastHeartbeat: string | null;
  lastDigestTimestamp: string | null;
  lastProactiveSuggestionDate: string | null;
}

// Digest
export interface DigestEntry {
  timeRange: string;
  items: string[];
}

// Pending actions
export interface PendingActions {
  dmDrafts: string[];
  xDrafts: string[];
  emailDrafts: string[];
  notes: string[];
}

// Intel
export interface IntelTrend {
  title: string;
  source: string;
  virality: number;
  confidence: string;
  expiry: string;
  angle: string;
}

export interface IntelReport {
  date: string;
  compiled: string;
  highSignal: IntelTrend[];
  rising: IntelTrend[];
  nicheSignals: IntelTrend[];
  suggestions: string[];
}

// Metrics
export interface MetricRow {
  metric: string;
  value: string;
  target: string;
  status: string;
}

export interface MetricsData {
  lastUpdated: string;
  cronReliability: string;
  codexUsage: string;
  degradationStatus: string;
  opsHealth: MetricRow[];
  contentPerf: { metric: string; today: string; sevenDayTotal: string; sevenDayAvg: string }[];
}

// Agent
export interface AgentConfig {
  name: string;
  description: string;
  model: string;
  timeoutSeconds: number;
}

export interface AgentStatus {
  config: AgentConfig;
  latestComms: string;
  hasInbound: boolean;
  hasOutbound: boolean;
}

// Comms
export interface CommsMessage {
  content: string;
  direction: "inbound" | "outbound";
}

// Broadcast
export interface BroadcastStatus {
  mode: string;
  standingOrders: string[];
  log: string[];
}

// Cron
export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  model: string;
  status: string;
  lastRun: string | null;
  nextRun: string | null;
  enabled: boolean;
}

// Session log
export interface SessionEntry {
  timeRange: string;
  items: string[];
}

// Content performance
export interface ContentPost {
  id: string;
  date: string;
  hook: string;
  hookType: string;
  platform: string;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
}

export interface HookCategory {
  totalPosts: number;
  avgViews: number;
  bestPostId: string | null;
}

// System
export interface SystemInfo {
  cpuPercent: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  diskUsedGb: number;
  diskTotalGb: number;
  uptime: number;
}
