"use client";

import type { ReactNode } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Gauge } from "@/components/ui/gauge";
import { Database, Zap, MessageCircle } from "lucide-react";
import type { CognitiveDay } from "@/lib/parsers/types";

interface ScorecardsProps {
  current: CognitiveDay;
}

const TIER1_MAX = 18000;

function StaleBadge({ days, warnAt, badAt }: { days: number; warnAt: number; badAt: number }) {
  const color =
    days >= badAt ? "text-[#EF4444] bg-[#EF4444]/10" :
    days >= warnAt ? "text-[#F59E0B] bg-[#F59E0B]/10" :
    "text-[#10B981] bg-[#10B981]/10";
  const label = days === 0 ? "today" : `${days}d ago`;
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${color}`}>{label}</span>;
}

function MetricRow({ label, value, extra }: { label: string; value: ReactNode; extra?: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-[11px] text-[#94A3B8]">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#F1F5F9] font-medium">{value}</span>
        {extra}
      </div>
    </div>
  );
}

function FileSizeBar({ name, size }: { name: string; size: number }) {
  const pct = Math.min(100, (size / TIER1_MAX) * 100);
  const color = pct >= 100 ? "#EF4444" : pct >= 80 ? "#F59E0B" : "#00D4AA";
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[10px] text-[#94A3B8] w-24 truncate">{name}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[9px] text-[#94A3B8] w-10 text-right">{(size / 1000).toFixed(1)}K</span>
    </div>
  );
}

export function CognitiveScorecards({ current }: ScorecardsProps) {
  const mh = current.memoryHealth;
  const p = current.proactivity;
  const e = current.engagement;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {/* Memory Health */}
      <GlassCard delay={0.05} className="border-t-2 border-t-[#00D4AA]/50">
        <div className="flex items-center gap-2 mb-3">
          <Database size={16} className="text-[#00D4AA]" />
          <h3 className="text-sm font-medium">Memory Health</h3>
        </div>

        <MetricRow label="Knowledge Base" value={`${mh.kbFileCount} files`} extra={
          <span className="text-[10px] text-[#94A3B8]">{mh.kbUpdatedToday} today</span>
        } />
        <MetricRow label="Journal" value={`${mh.journalWordCount} words`} extra={
          <span className="flex items-center gap-1">
            <span className={`text-[10px] ${mh.journalReflective ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
              {mh.journalReflective ? "✓ reflective" : "⚠ operational"}
            </span>
            {current._journalFromDate && (
              <span className="text-[9px] text-[#94A3B8]/60">
                ({new Date(current._journalFromDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" })})
              </span>
            )}
          </span>
        } />
        <MetricRow label="USER.md" value={<StaleBadge days={mh.userMdStaleDays} warnAt={5} badAt={7} />} />
        <MetricRow label="IDENTITY.md" value={<StaleBadge days={mh.identityMdStaleDays} warnAt={5} badAt={7} />} />
        <MetricRow label="MEMORY.md" value={`${mh.memoryMdLineCount} lines`} />
        <MetricRow label="Promoted" value={mh.captureQueuePromoted} extra={
          current._journalFromDate ? (
            <span className="text-[9px] text-[#94A3B8]/60">
              ({new Date(current._journalFromDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" })})
            </span>
          ) : undefined
        } />

        <div className="mt-3 pt-2 border-t border-white/5">
          <div className="text-[10px] text-[#94A3B8] mb-1">Tier 1 File Sizes</div>
          {Object.entries(current.tier1FileSizes).map(([name, size]) => (
            <FileSizeBar key={name} name={name} size={size} />
          ))}
        </div>
      </GlassCard>

      {/* Proactivity */}
      <GlassCard delay={0.1} className="border-t-2 border-t-[#7C3AED]/50">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-[#7C3AED]" />
          <h3 className="text-sm font-medium">Proactivity</h3>
        </div>

        <div className="flex justify-center mb-4">
          <Gauge
            value={Math.round(p.ratio * 100)}
            max={100}
            size={80}
            color={p.ratio >= 0.3 ? "#10B981" : p.ratio >= 0.15 ? "#F59E0B" : "#EF4444"}
            label="Pro/React"
          />
        </div>

        <MetricRow label="Surprise Me" value={p.surpriseMeSent} />
        <MetricRow label="Curiosity Questions" value={p.curiosityQuestions} />
        <MetricRow label="Social Engagements" value={p.socialEngagements} />
        <MetricRow label="Comment Replies" value={p.commentReplies} />
        <MetricRow label="Proactive / Reactive" value={`${p.proactiveTotal} / ${p.reactiveTotal}`} />
      </GlassCard>

      {/* Engagement */}
      <GlassCard delay={0.15} className="border-t-2 border-t-[#10B981]/50">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle size={16} className="text-[#10B981]" />
          <h3 className="text-sm font-medium">Engagement</h3>
        </div>

        <div className="flex justify-center mb-4">
          <Gauge
            value={Math.round(e.replyRate * 100)}
            max={100}
            size={80}
            color={e.replyRate >= 0.5 ? "#10B981" : e.replyRate >= 0.3 ? "#F59E0B" : "#EF4444"}
            label="Reply Rate"
          />
        </div>

        <div className="text-[10px] text-[#94A3B8] mb-2">
          {e.totalReplied} / {e.totalReceived} comments replied
        </div>

        <MetricRow label="X" value={e.xReplies} />
        <MetricRow label="TikTok" value={e.tiktokReplies} />
        <MetricRow label="YouTube" value={e.youtubeReplies} />
        <MetricRow label="Instagram" value={e.instagramReplies} />
        <MetricRow label="Substack" value={e.substackReplies} />
      </GlassCard>
    </div>
  );
}
