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

export interface CodexQuota {
  dailyRemaining: number; // percentage remaining
  dailyLabel: string;
  weeklyRemaining: number;
  weeklyLabel: string;
}

export interface MetricsData {
  lastUpdated: string;
  cronReliability: string;
  codexUsage: string;
  codexQuota: CodexQuota;
  degradationStatus: string;
  opsHealth: MetricRow[];
  contentPerf: { metric: string; today: string; sevenDayTotal: string; sevenDayAvg: string }[];
}

export interface CommandCenterModelRow {
  model: string;
  provider: string;
  runs: number;
  okRuns: number;
  errorRuns: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  avgDurationMs: number;
  lastSeen: string | null;
  sharePct: number;
}

export interface CommandCenterAnomaly {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
}

export interface CommandCenterData {
  generatedAt: string;
  primaryModel: string;
  fallbackChain: string[];
  quota: {
    dailyRemaining: number;
    dailyLabel: string;
    weeklyRemaining: number;
    weeklyLabel: string;
  };
  windows: {
    last24h: {
      totalRuns: number;
      successRate: number;
      totalTokens: number;
      avgDurationMs: number;
      primarySharePct: number;
      fallbackSharePct: number;
    };
    last7d: {
      totalRuns: number;
      successRate: number;
      totalTokens: number;
      avgDurationMs: number;
      primarySharePct: number;
      fallbackSharePct: number;
    };
  };
  cost: {
    visibility: "estimated" | "unpriced";
    estimatedUsd7d: number;
    note: string;
  };
  topModels24h: CommandCenterModelRow[];
  topModels7d: CommandCenterModelRow[];
  anomalies: CommandCenterAnomaly[];
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

// Pipeline V2 types
export interface PipelineStage {
  name: string
  status: 'completed' | 'active' | 'pending'
  duration?: number
  timestamp?: string
  metadata?: Record<string, string>
}

export interface PipelineJob {
  jobId: string
  status: string
  contentType: string
  lane: string
  viralityScore: number
  viralitySource: string
  topic: string
  createdAt: string
  elapsed: number
  publishTargets: string[]
  stages: PipelineStage[]
  killedReason?: string
}

export interface PipelineScorecard {
  published: number
  killed: number
  stale: number
  pending: number
  avgTimeToPublish: number
  contentTypeBreakdown: Record<string, number>
}

export interface PipelineData {
  activeJob: PipelineJob | null
  jobs: PipelineJob[]
  scorecard: PipelineScorecard
  weights: Record<string, number>
}

// --- Cognitive Dashboard ---

// Note: `current` in CognitiveData is nullable (diverges from spec's non-nullable CognitiveDay).
// This is intentional — handles the no-data/empty-directory case gracefully.
// All downstream consumers must handle data.current === null.

export interface CognitiveMemoryHealth {
  kbFileCount: number;
  kbUpdatedToday: number;
  userMdLastModified: string | null;
  userMdStaleDays: number;
  identityMdLastModified: string | null;
  identityMdStaleDays: number;
  journalWordCount: number;
  journalReflectiveMarkers: number;
  journalReflective: boolean;
  memoryMdLineCount: number;
  captureQueuePromoted: number;
}

export interface CognitiveProactivity {
  surpriseMeSent: number;
  curiosityQuestions: number;
  socialEngagements: number;
  commentReplies: number;
  proactiveTotal: number;
  reactiveTotal: number;
  ratio: number;
}

export interface CognitiveEngagement {
  xReplies: number;
  tiktokReplies: number;
  youtubeReplies: number;
  instagramReplies: number;
  substackReplies: number;
  totalReceived: number;
  totalReplied: number;
  replyRate: number;
}

export interface CognitiveIdentityEvolution {
  kbDiffCreated: number;
  kbDiffUpdated: number;
  userMdChanged: boolean;
  journalReflectivePct: number;
  identityMdStaleDays: number;
}

export interface CognitiveDay {
  date: string;
  collectedAt: string;
  memoryHealth: CognitiveMemoryHealth;
  proactivity: CognitiveProactivity;
  engagement: CognitiveEngagement;
  degradationFlags: string[];
  tier1FileSizes: Record<string, number>;
  identityEvolution?: CognitiveIdentityEvolution;
}

export interface WeeklyRollup {
  weekLabel: string;
  avgJournalWords: number;
  avgProactivityRatio: number;
  totalSocialEngagements: number;
  avgReplyRate: number;
  kbFilesAdded: number;
  degradationDays: number;
  identityEvolution?: CognitiveIdentityEvolution;
}

export interface CognitiveData {
  current: CognitiveDay | null;
  history: CognitiveDay[];
  weeklyRollups: WeeklyRollup[];
  activeDegradation: string[];
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
