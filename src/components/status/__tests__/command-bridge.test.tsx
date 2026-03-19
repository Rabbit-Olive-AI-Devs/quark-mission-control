import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StatusFullResponse } from "@/lib/parsers/types";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock useDashboardStore
vi.mock("@/stores/dashboard", () => ({
  useDashboardStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({ connected: true }),
    {
      setState: vi.fn(),
      getState: () => ({ connected: true }),
      subscribe: vi.fn(),
      destroy: vi.fn(),
    }
  ),
}));

// Import after mocks
import { HeroBanner } from "../hero-banner";
import { AlertsStrip } from "../alerts-strip";
import { InstrumentPanel } from "../instrument-panel";
import { Activity } from "lucide-react";

function mockData(overrides: Partial<StatusFullResponse> = {}): StatusFullResponse {
  return {
    pipeline: {
      level: "healthy",
      sentence: "No active jobs",
      details: {},
      stuckCount: 0,
      scorecard: {
        published: 2,
        killed: 0,
        stale: 0,
        pending: 0,
        avgTimeToPublish: 120,
        contentTypeBreakdown: {},
      },
    },
    cron: {
      level: "healthy",
      sentence: "All 20 jobs healthy",
      details: {},
      jobs: [
        {
          id: "abc123",
          name: "Morning Routine",
          schedule: "0 5 * * *",
          scheduleHuman: "daily at 5 AM",
          timezone: "America/Chicago",
          model: "gpt-5.3-codex",
          status: "ok",
          lastRun: new Date().toISOString(),
          nextRun: new Date(Date.now() + 3600000).toISOString(),
          lastRunMs: Date.now(),
          nextRunMs: Date.now() + 3600000,
          agentId: null,
          enabled: true,
        },
      ],
    },
    quota: {
      level: "healthy",
      sentence: "68% remaining, pace normal",
      details: {},
      raw: {
        dailyRemaining: 68,
        dailyLabel: "68%",
        weeklyRemaining: 55,
        weeklyLabel: "55%",
      },
    },
    quark: {
      level: "healthy",
      sentence: "Active, 14/14 runs OK (6h)",
      details: {},
      heartbeat: {
        lastDmTimestamp: new Date().toISOString(),
        lastMentionId: null,
        lastHeartbeat: new Date().toISOString(),
        lastDigestTimestamp: null,
        lastProactiveSuggestionDate: null,
      },
    },
    system: {
      level: "healthy",
      sentence: "CPU 15% · Mem 42% · Disk 55%",
      details: {},
      cpu: 15,
      memory: 42,
      disk: 55,
      uptime: 86400,
      osVersion: "Darwin 25.3.0",
    },
    engagement: {
      today: { total: 12, byPlatform: { x: 8, tiktok: 4 }, byAction: {} },
      inboundGap: { replyRate: 85, unansweredCount: 2 },
      guardrailBlocks: 0,
    },
    cognitive: {
      memoryHealth: {
        kbFileCount: 26,
        kbUpdatedToday: 3,
        userMdLastModified: new Date().toISOString(),
        userMdStaleDays: 0,
        identityMdLastModified: new Date().toISOString(),
        identityMdStaleDays: 0,
        journalWordCount: 450,
        journalReflectiveMarkers: 2,
        journalReflective: true,
        memoryMdLineCount: 200,
        captureQueuePromoted: 1,
      },
      proactivity: {
        surpriseMeSent: 1,
        curiosityQuestions: 2,
        socialEngagements: 8,
        commentReplies: 3,
        proactiveTotal: 6,
        reactiveTotal: 8,
        ratio: 0.75,
      },
      engagement: {
        xReplies: 5,
        tiktokReplies: 2,
        youtubeReplies: 0,
        instagramReplies: 0,
        substackReplies: 0,
        totalReceived: 12,
        totalReplied: 10,
        replyRate: 83,
      },
      degradationFlags: [],
    },
    intel: {
      highSignal: [
        {
          title: "Claude 4.6 released",
          source: "HN",
          virality: 9.2,
          confidence: "high",
          expiry: "24h",
          angle: "Review and comparison",
        },
      ],
      updatedAt: new Date().toISOString(),
    },
    contentToday: {
      publishedCount: 2,
      platforms: ["x_post", "tiktok_video"],
      publishMode: "LIVE",
    },
    activity: [
      { timestamp: "08:00-09:00", text: "Morning routine completed", level: "info" },
      { timestamp: "09:30-10:00", text: "Pipeline job published", level: "info" },
    ],
    healthScore: 94,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  mockPush.mockClear();
});

describe("HeroBanner", () => {
  it("renders health score", () => {
    render(<HeroBanner data={mockData()} />);
    expect(screen.getByText("MISSION CONTROL")).toBeInTheDocument();
    expect(screen.getByText("Systems Operational")).toBeInTheDocument();
  });

  it("renders KPI pills", () => {
    render(<HeroBanner data={mockData()} />);
    expect(screen.getByText("Crons OK")).toBeInTheDocument();
    expect(screen.getByText("Stuck")).toBeInTheDocument();
    expect(screen.getByText("Quota")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(screen.getByText("Uptime")).toBeInTheDocument();
  });

  it("shows critical status when health score is low", () => {
    render(
      <HeroBanner
        data={mockData({
          healthScore: 30,
          pipeline: {
            level: "critical",
            sentence: "Pipeline is down",
            details: {},
            stuckCount: 3,
            scorecard: {
              published: 0,
              killed: 0,
              stale: 0,
              pending: 0,
              avgTimeToPublish: 0,
              contentTypeBreakdown: {},
            },
          },
        })}
      />
    );
    expect(screen.getByText("Critical Issues Detected")).toBeInTheDocument();
  });
});

describe("AlertsStrip", () => {
  it("shows 'All systems nominal' when all healthy and no publishes", () => {
    render(
      <AlertsStrip
        data={mockData({
          contentToday: {
            publishedCount: 0,
            platforms: [],
            publishMode: "LIVE",
          },
        })}
      />
    );
    expect(screen.getByText("All systems nominal")).toBeInTheDocument();
  });

  it("shows alert chips when data has warnings", () => {
    render(
      <AlertsStrip
        data={mockData({
          cron: {
            level: "critical",
            sentence: "2/20 failed: Cassian, Deep Work",
            details: {},
            jobs: [
              {
                id: "1",
                name: "Cassian",
                schedule: "",
                scheduleHuman: "",
                timezone: "America/Chicago",
                model: "",
                status: "error",
                lastRun: null,
                nextRun: null,
                lastRunMs: null,
                nextRunMs: null,
                agentId: null,
                enabled: true,
              },
            ],
          },
        })}
      />
    );
    expect(
      screen.getByText("2/20 failed: Cassian, Deep Work")
    ).toBeInTheDocument();
    expect(screen.getByText(/Cron "Cassian" failed/)).toBeInTheDocument();
  });

  it("shows engagement gap alerts", () => {
    render(
      <AlertsStrip
        data={mockData({
          engagement: {
            today: { total: 5, byPlatform: {}, byAction: {} },
            inboundGap: { replyRate: 40, unansweredCount: 8 },
            guardrailBlocks: 0,
          },
        })}
      />
    );
    expect(screen.getByText("8 unanswered engagements")).toBeInTheDocument();
  });

  it("shows cognitive degradation alerts", () => {
    render(
      <AlertsStrip
        data={mockData({
          cognitive: {
            memoryHealth: {
              kbFileCount: 26,
              kbUpdatedToday: 0,
              userMdLastModified: null,
              userMdStaleDays: 5,
              identityMdLastModified: null,
              identityMdStaleDays: 3,
              journalWordCount: 0,
              journalReflectiveMarkers: 0,
              journalReflective: false,
              memoryMdLineCount: 200,
              captureQueuePromoted: 0,
            },
            proactivity: {
              surpriseMeSent: 0,
              curiosityQuestions: 0,
              socialEngagements: 0,
              commentReplies: 0,
              proactiveTotal: 0,
              reactiveTotal: 0,
              ratio: 0,
            },
            engagement: {
              xReplies: 0,
              tiktokReplies: 0,
              youtubeReplies: 0,
              instagramReplies: 0,
              substackReplies: 0,
              totalReceived: 0,
              totalReplied: 0,
              replyRate: 0,
            },
            degradationFlags: ["stale_user_md", "low_proactivity"],
          },
        })}
      />
    );
    expect(screen.getByText("Cognitive: stale_user_md")).toBeInTheDocument();
    expect(screen.getByText("Cognitive: low_proactivity")).toBeInTheDocument();
  });
});

describe("InstrumentPanel", () => {
  it("renders title, icon, and status dot", () => {
    render(
      <InstrumentPanel
        title="Activity"
        icon={Activity}
        level="healthy"
        href="/operations"
        dataPriority={3}
      >
        <p>Panel content</p>
      </InstrumentPanel>
    );
    expect(screen.getByText("Activity")).toBeInTheDocument();
    expect(screen.getByText("Panel content")).toBeInTheDocument();
    // Status dot (emerald for healthy)
    const dot = screen.getByRole("button").querySelector(".bg-emerald-500");
    expect(dot).toBeTruthy();
  });

  it("navigates to href on click", () => {
    render(
      <InstrumentPanel
        title="Pipeline"
        icon={Activity}
        level="warning"
        href="/content"
        dataPriority={1}
      >
        <p>Test</p>
      </InstrumentPanel>
    );
    fireEvent.click(screen.getByRole("button"));
    expect(mockPush).toHaveBeenCalledWith("/content");
  });

  it("navigates on keyboard Enter", () => {
    render(
      <InstrumentPanel
        title="Cron"
        icon={Activity}
        level="critical"
        href="/schedule"
        dataPriority={1}
      >
        <p>Test</p>
      </InstrumentPanel>
    );
    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
    expect(mockPush).toHaveBeenCalledWith("/schedule");
  });

  it("applies span=2 class for wide panels", () => {
    const { container } = render(
      <InstrumentPanel
        title="System"
        icon={Activity}
        level="healthy"
        href="/settings"
        dataPriority={3}
        span={2}
      >
        <p>Wide</p>
      </InstrumentPanel>
    );
    const panel = container.firstElementChild;
    expect(panel?.className).toContain("md:col-span-2");
  });
});
