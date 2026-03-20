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

// Content performance (deprecated — kept for backward compat)
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

// Publish audit (replaces Genviral-based content data)
export interface PublishRecord {
  jobId: string;
  contentType: string;
  format: string;
  platform: string;  // derived: x, tiktok, instagram, youtube, substack
  outcome: "published" | "killed" | "quarantined";
  url: string | null;
  timestamp: string;
  source: string | null;
}

export interface ContentAuditData {
  records: PublishRecord[];
  todayCount: number;
  weekCount: number;
  platformCounts: Record<string, number>;
  contentTypeCounts: Record<string, number>;
  killedCount: number;
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
    xImpressions: number;
    xLikes: number;
    xReplies: number;
    xRetweets: number;
    xBookmarks: number;
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

// === Post Performance Types ===

export interface PostMetrics {
  impressions: number;
  likes: number;
  replies: number;
  retweets: number;
  quotes: number;
  bookmarks: number;
  engagement_rate: number;
  // optional platform-specific fields
  views?: number;
  comments?: number;
  shares?: number;
  // YouTube Analytics
  watch_time_minutes?: number;
  avg_view_duration_sec?: number;
  avg_view_percentage?: number;
  subscribers_gained?: number;
  // Substack
  saves?: number;
}

export interface TrafficSource {
  views: number;
  minutes_watched: number;
}

export type TrafficSources = Record<string, TrafficSource>;

export type DiagnosticLabel =
  | "scale"
  | "fix_hooks"
  | "fix_distribution"
  | "rethink"
  | "unclassified";

export interface TrackedPost {
  job_id: string;
  post_id?: string;
  platform: string;
  format?: string;
  content_type: string;
  hook: string;
  cta: string;
  title?: string;
  text?: string;
  created_at?: string;
  last_updated?: string;
  metrics: PostMetrics | Record<string, never>;
  diagnostic: DiagnosticLabel;
  note?: string;
  traffic_sources?: TrafficSources;
}

export interface HookEntry {
  hook: string;
  er: number;
  impressions: number;
  content_type: string;
}

export interface ContentTypeStats {
  posts: number;
  avg_impressions: number;
  avg_er: number;
  quadrant_counts: Record<DiagnosticLabel, number>;
}

export interface HookStats {
  by_content_type: Record<string, ContentTypeStats>;
  rules: Record<string, string>;
  last_updated?: string;
}

export interface PlatformThresholds {
  // x-style thresholds
  viral_engagement_rate?: number;
  good_engagement_rate?: number;
  min_impressions?: number;
  // tiktok/youtube-style thresholds
  viral_views?: number;
  good_views?: number;
}

export interface FollowerSnapshot {
  date: string;
  x_followers?: number;
  tiktok_followers?: number;
  instagram_followers?: number;
  youtube_followers?: number;
  substack_subscribers?: number;
}

export interface FeedbackRecommendations {
  double_down: string[];
  testing: string[];
  avoid: string[];
  best_content_types?: string[];
  best_hooks?: HookEntry[];
  worst_hooks?: HookEntry[];
}

export interface PlatformHealth {
  status: string;
  posts_7d: number;
  baseline_er: number;
}

export interface ContentFeedback {
  generated_at: string;
  window_days: number;
  posts_analyzed: number;
  recommendations: FeedbackRecommendations;
  platform_health?: Record<string, PlatformHealth>;
  quadrant_summary?: Record<string, number>;
  baselines?: Record<string, number>;
  summary: string;
}

export interface PostPerformanceData {
  schemaVersion: number;
  lastCollectedAt: string;
  posts: TrackedPost[];
  hooks: HookStats;
  thresholds: Record<string, PlatformThresholds>;
  followerHistory: FollowerSnapshot[];
  feedback: ContentFeedback | null;
}

// Content Lifecycle types
export interface PipelineFunnelStage {
  stage: string;
  label: string;
  count: number;
  color: string;
}

export interface PipelineFunnelData {
  stages: PipelineFunnelStage[];
  rejectionReasons: Record<string, number>;
  quarantineReasons: Record<string, number>;
  totalSubmitted: number;
  conversionRate: number;
}

export interface CadenceDay {
  date: string;
  x: number;
  tiktok: number;
  instagram: number;
  youtube: number;
  substack: number;
  total: number;
}

export interface PublishingCadenceData {
  daily: CadenceDay[];
  avgPerDay7d: number;
  avgPerDay30d: number;
  trend: "up" | "flat" | "down";
}

export interface TypeMixEntry {
  contentType: string;
  actualCount: number;
  actualPct: number;
  targetPct: number;
  delta: number;
}

export interface ContentTypeMixData {
  entries: TypeMixEntry[];
  weightsUpdatedAt: string;
  weightsStaleDays: number;
}

export interface ContentLifecycleData {
  funnel: PipelineFunnelData;
  cadence: PublishingCadenceData;
  typeMix: ContentTypeMixData;
  feedback: ContentFeedback | null;
}

// OAuth token status
export interface OAuthProfile {
  provider: string;
  status: "ok" | "expired" | "error" | "static" | "missing";
  expiresAt: number | null;  // epoch ms
  remainingMs: number | null;
  remainingHuman: string;    // "10d", "23h", "expired", "static"
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

// === Command Bridge Types ===

export interface ActivityEntry {
  timestamp: string;
  text: string;
  level: "info" | "warning" | "error";
}

export interface ContentTodayData {
  publishedCount: number;
  platforms: string[];
  publishMode: "LIVE" | "WARMUP";
}

export interface PostPerformanceSummary {
  totalImpressions: number;
  avgER: number;
  followerDelta: number;
  diagnosticSummary: string; // e.g. "2 SCALE, 1 FIX" or "no data"
  totalFollowers: number;
  totalWatchTimeMinutes: number;
}

export interface StatusFullResponse {
  // Existing status cards
  pipeline: StatusCard & { stuckCount: number; scorecard: PipelineScorecard };
  cron: StatusCard & { jobs: CronJob[] };
  quota: StatusCard & { raw: CodexQuota | null };
  quark: StatusCard & { heartbeat: HeartbeatState | null };
  system: StatusCard & {
    cpu: number;
    memory: number;
    disk: number;
    uptime: number;
    osVersion: string;
  };

  // New sections for Command Bridge
  engagement: {
    today: { total: number; byPlatform: Record<string, number>; byAction: Record<string, number> };
    inboundGap: { replyRate: number; unansweredCount: number };
    guardrailBlocks: number;
  };
  postPerformance: PostPerformanceSummary;
  cognitive: {
    memoryHealth: CognitiveMemoryHealth;
    proactivity: CognitiveProactivity;
    engagement: CognitiveEngagement;
    degradationFlags: string[];
  } | null;
  intel: {
    highSignal: IntelTrend[];
    updatedAt: string;
  };
  contentToday: ContentTodayData;
  activity: ActivityEntry[];

  // Auth
  oauth: OAuthProfile[];

  // Metadata
  healthScore: number;
  timestamp: string;
}
