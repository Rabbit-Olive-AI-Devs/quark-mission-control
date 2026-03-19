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
  latestTimestamp: string | null;
  hasInbound: boolean;
  hasOutbound: boolean;
}

// Comms
export interface CommsMessage {
  content: string;
  direction: "inbound" | "outbound";
  timestamp: string | null;
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
  scheduleHuman: string;
  timezone: string;
  model: string;
  status: string;
  lastRun: string | null;
  nextRun: string | null;
  lastRunMs: number | null;
  nextRunMs: number | null;
  agentId: string | null;
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
  _journalFromDate?: string;
  _engagementSource?: "chandler" | "live";
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

// Operations
export interface OperationsDailyUsage {
  dayKey: string;
  totalTokens: number;
  costUSD: number;
}

export interface OperationsQuota {
  dailyRemaining: number;
  dailyLabel: string;
  weeklyRemaining: number;
  weeklyLabel: string;
}

export interface OperationsFallbackNode {
  name: string;
  provider: string;
  status: "active" | "standby" | "error";
}

export interface OperationsCronReliability {
  totalJobs: number;
  okJobs: number;
  failedJobs: number;
  disabledJobs: number;
  successRate: number;
  recentFailures: { name: string; lastRun: string | null; status: string }[];
}

export interface ContentPerformanceXMetrics {
  postsToday: number;
  impressions: number;
  likes: number;
  replies: number;
  retweets: number;
  bookmarks: number;
}

export interface ContentPerformancePipeline {
  published: number;
  killed: number;
  stale: number;
  pendingPreview: number;
  contentTypes: Record<string, number>;
}

export interface ContentPerformanceEngagement {
  actionsByPlatform: Record<string, Record<string, number>>;
  guardrailBlocks: number;
  engagementMode: string;
}

export interface ContentPerformanceData {
  reportDate: string;
  x: ContentPerformanceXMetrics;
  tiktokPostsToday: number;
  pipeline: ContentPerformancePipeline;
  engagement: ContentPerformanceEngagement;
}

export interface OperationsData {
  generatedAt: string;
  activeModel: string;
  quota: OperationsQuota;
  fallbackChain: OperationsFallbackNode[];
  dailyUsage: OperationsDailyUsage[];
  tokenUsage: {
    sessionTokens: number;
    sessionCostUSD: number;
    last30DaysTokens: number;
    last30DaysCostUSD: number;
  };
  cronReliability: OperationsCronReliability;
  platforms: string[];
  contentPerformance: ContentPerformanceData | null;
}

// System
export interface SystemInfo {
  cpuPercent: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  diskUsedGb: number;
  diskTotalGb: number;
  uptime: number;
  osVersion: string;
  nodeVersion: string;
}

// --- Social Engagement Dashboard ---

export interface EngagementAction {
  timestamp: string;
  platform: string;
  action: string;
  targetId: string;
  targetAuthor: string;
  text: string;
  autonomous: boolean;
  guardrailResult: string;
  source: string;
}

export interface DailyAggregate {
  date: string;
  total: number;
  byPlatform: Record<string, number>;
  byAction: Record<string, number>;
  blocks: number;
}

export interface GuardrailBlock {
  timestamp: string;
  platform: string;
  action: string;
  reason: string;
  targetAuthor?: string;
}

export interface InboundGap {
  totalReceived: number;
  totalReplied: number;
  replyRate: number;
  byPlatform: Record<string, { received: number; replied: number }>;
  unansweredCount: number;
  dataDate: string;
}

export interface EngagementUnifiedKpis {
  visibility: {
    impressions: number;
    reach: number;
  };
  engagement: {
    totalInteractions: number;
    engagementRate: number;
  };
  responsiveness: {
    repliesSent: number;
    unansweredCount: number;
    replyRate: number;
  };
  growth: {
    followerDelta: number;
  };
  conversion: {
    linkClicks: number;
    ctr: number;
  };
}

export interface EngagementSourceCoverage {
  chandler: boolean;
  genviral: boolean;
  engagementAudit: boolean;
}

export interface EngagementData {
  actions: EngagementAction[];
  today: {
    total: number;
    byAction: Record<string, number>;
    byPlatform: Record<string, number>;
  };
  trends: DailyAggregate[];
  guardrailBlocks: GuardrailBlock[];
  inboundGap: InboundGap;
  mode: "autonomous" | "approval_required";
  unifiedKpis: EngagementUnifiedKpis;
  sourceCoverage: EngagementSourceCoverage;
}

// === Status Page Types ===

export type StatusLevel = "healthy" | "warning" | "critical";

export interface StatusCard {
  level: StatusLevel;
  sentence: string;
  details: Record<string, unknown>;
}

export interface StatusData {
  pipeline: StatusCard;
  cron: StatusCard & { jobs?: Array<Record<string, unknown>> };
  quota: StatusCard & { raw?: Record<string, unknown> };
  quark: StatusCard & { heartbeat?: Record<string, unknown> };
  system: StatusCard & {
    cpu: number;
    memory: number;
    disk: number;
  };
  timestamp: string;
}
