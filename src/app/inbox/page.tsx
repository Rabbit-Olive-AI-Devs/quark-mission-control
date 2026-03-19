"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { StatusSentence } from "@/components/ui/status-sentence";
import { InboxSection } from "@/components/inbox/inbox-section";
import { InboxUnanswered } from "@/components/inbox/inbox-unanswered";
import { InboxApprovals } from "@/components/inbox/inbox-approvals";
import { InboxEscalations } from "@/components/inbox/inbox-escalations";
import { InboxStale } from "@/components/inbox/inbox-stale";
import { useApi } from "@/hooks/use-api";
import { Inbox, MessageCircle, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { formatTimeShort } from "@/lib/utils";
import type { EngagementData, PipelineData, AgentStatus } from "@/lib/parsers/types";

const ESCALATION_KEYWORDS = ["escalat", "needs attention", "blocked", "failed", "urgent", "critical", "error"];
const TERMINAL_STATUSES = new Set(["published", "completed", "killed", "quarantined", "preview_sent"]);
const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000;

export default function InboxPage() {
  const { data: engagement, lastUpdated: engUpdated } = useApi<EngagementData>("/api/engagement", { refreshOn: ["engagement"] });
  const { data: pipeline } = useApi<PipelineData>("/api/pipeline", { refreshOn: ["pipeline"] });
  const { data: agentsData } = useApi<{ agents: AgentStatus[] }>("/api/agents", { refreshOn: ["comms"] });

  const agents = agentsData?.agents || [];
  const jobs = pipeline?.jobs || [];

  const counts = useMemo(() => {
    const unanswered = engagement?.inboundGap?.unansweredCount || 0;
    const approvals = jobs.filter((j) => j.status === "preview_sent").length;
    const escalations = agents.filter((a) => {
      const text = a.latestComms.toLowerCase();
      return ESCALATION_KEYWORDS.some((kw) => text.includes(kw));
    }).length;
    const stale = jobs.filter((j) => {
      if (TERMINAL_STATUSES.has(j.status)) return false;
      return Date.now() - new Date(j.createdAt).getTime() > STALE_THRESHOLD_MS;
    }).length;
    return { unanswered, approvals, escalations, stale, total: unanswered + approvals + escalations + stale };
  }, [engagement, jobs, agents]);

  const summaryLevel = counts.total === 0 ? "healthy" : counts.total <= 3 ? "warning" : "critical";
  const summarySentence = counts.total === 0
    ? "Nothing needs your attention"
    : `${counts.total} item${counts.total !== 1 ? "s" : ""} need${counts.total === 1 ? "s" : ""} your attention`;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold flex items-center gap-3 text-[#F1F5F9]">
            <Inbox size={24} className="text-[#00D4AA]" />
            Inbox
            {counts.total > 0 && (
              <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-[#00D4AA]/20 text-[#00D4AA]">
                {counts.total}
              </span>
            )}
          </h1>
          {engUpdated && (
            <span className="text-[10px] text-[#64748B] font-mono">
              Updated {formatTimeShort(engUpdated)}
            </span>
          )}
        </div>

        <div className="mb-6">
          <StatusSentence level={summaryLevel} sentence={summarySentence} />
        </div>

        {/* Full-page empty state */}
        {counts.total === 0 && !engagement && !pipeline ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
            <Inbox size={48} className="mb-4 opacity-20" />
            <p className="text-sm">Nothing needs your attention right now.</p>
            <p className="text-[10px] mt-1 opacity-50">Check back later.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <InboxSection
              title="Unanswered"
              icon={MessageCircle}
              count={counts.unanswered}
              color="#F59E0B"
              emptyMessage="All caught up — no unanswered comments or DMs"
              delay={0}
            >
              {engagement && (
                <InboxUnanswered
                  actions={engagement.actions}
                  inboundGap={engagement.inboundGap}
                />
              )}
            </InboxSection>

            <InboxSection
              title="Pending Approvals"
              icon={CheckCircle2}
              count={counts.approvals}
              color="#7C3AED"
              emptyMessage="No pipeline jobs awaiting approval"
              delay={0.05}
            >
              <InboxApprovals jobs={jobs} />
            </InboxSection>

            <InboxSection
              title="Agent Escalations"
              icon={AlertTriangle}
              count={counts.escalations}
              color="#EF4444"
              emptyMessage="No agent escalations"
              delay={0.1}
            >
              <InboxEscalations agents={agents} />
            </InboxSection>

            <InboxSection
              title="Stale Items"
              icon={Clock}
              count={counts.stale}
              color="#F59E0B"
              emptyMessage="Nothing stale — all items are progressing"
              delay={0.15}
            >
              <InboxStale jobs={jobs} />
            </InboxSection>
          </div>
        )}
      </div>
    </AppShell>
  );
}
