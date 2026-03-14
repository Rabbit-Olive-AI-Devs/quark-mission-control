"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { getISOWeek, getWeekLabel } from "@/lib/utils";
import type { CognitiveDay, WeeklyRollup } from "@/lib/parsers/types";

interface HistoryTableProps {
  weeklyRollups: WeeklyRollup[];
  history: CognitiveDay[];
}

function cellColor(value: number, warn: number, bad: number, inverse = false): string {
  if (inverse) {
    return value <= bad ? "text-[#EF4444]" : value <= warn ? "text-[#F59E0B]" : "text-[#10B981]";
  }
  return value >= bad ? "text-[#EF4444]" : value >= warn ? "text-[#F59E0B]" : "text-[#10B981]";
}

function getWeekDays(weekLabel: string, history: CognitiveDay[]): CognitiveDay[] {
  return history.filter((d) => getWeekLabel(d.date) === weekLabel);
}

function WeekRow({ rollup, history }: { rollup: WeeklyRollup; history: CognitiveDay[] }) {
  const [expanded, setExpanded] = useState(false);
  const days = expanded ? getWeekDays(rollup.weekLabel, history) : [];

  return (
    <>
      <tr
        className="hover:bg-white/[0.02] cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="py-3 px-2">
          <div className="flex items-center gap-1.5">
            {expanded ? (
              <ChevronDown size={14} className="text-[#94A3B8]" />
            ) : (
              <ChevronRight size={14} className="text-[#94A3B8]" />
            )}
            <span className="text-[#F1F5F9] text-xs">{rollup.weekLabel}</span>
          </div>
        </td>
        <td className={`py-3 px-2 text-xs ${cellColor(rollup.avgJournalWords, 300, 200, true)}`}>
          {rollup.avgJournalWords}
        </td>
        <td className={`py-3 px-2 text-xs ${cellColor(rollup.avgProactivityRatio, 0.2, 0.15, true)}`}>
          {rollup.avgProactivityRatio.toFixed(2)}
        </td>
        <td className="py-3 px-2 text-xs text-[#F1F5F9]">{rollup.totalSocialEngagements}</td>
        <td className={`py-3 px-2 text-xs ${cellColor(rollup.avgReplyRate, 0.4, 0.3, true)}`}>
          {(rollup.avgReplyRate * 100).toFixed(0)}%
        </td>
        <td className="py-3 px-2 text-xs text-[#F1F5F9]">{rollup.kbFilesAdded}</td>
        <td className={`py-3 px-2 text-xs ${cellColor(rollup.degradationDays, 2, 3)}`}>
          {rollup.degradationDays}
        </td>
      </tr>

      {rollup.identityEvolution && (
        <tr className="border-b border-white/5">
          <td colSpan={7} className="py-2 px-8">
            <div className="flex items-center gap-4 text-[10px] text-[#94A3B8]">
              <span>Identity:</span>
              <span>KB +{rollup.identityEvolution.kbDiffCreated} / ∆{rollup.identityEvolution.kbDiffUpdated}</span>
              <span>USER.md {rollup.identityEvolution.userMdChanged ? "✓ changed" : "unchanged"}</span>
              <span>Journal quality {rollup.identityEvolution.journalReflectivePct}%</span>
              <span>ID stale {rollup.identityEvolution.identityMdStaleDays}d</span>
            </div>
          </td>
        </tr>
      )}

      {expanded && days.map((day) => (
        <tr key={day.date} className="bg-white/[0.01] border-b border-white/[0.03]">
          <td className="py-2 px-2 pl-8 text-[10px] text-[#94A3B8]">{day.date}</td>
          <td className="py-2 px-2 text-[10px] text-[#94A3B8]">{day.memoryHealth.journalWordCount}</td>
          <td className="py-2 px-2 text-[10px] text-[#94A3B8]">{day.proactivity.ratio.toFixed(2)}</td>
          <td className="py-2 px-2 text-[10px] text-[#94A3B8]">{day.proactivity.socialEngagements}</td>
          <td className="py-2 px-2 text-[10px] text-[#94A3B8]">{(day.engagement.replyRate * 100).toFixed(0)}%</td>
          <td className="py-2 px-2 text-[10px] text-[#94A3B8]">{day.memoryHealth.kbUpdatedToday}</td>
          <td className="py-2 px-2 text-[10px] text-[#94A3B8]">
            {day.degradationFlags.length > 0 ? (
              <span className="text-[#F59E0B]">{day.degradationFlags.length} flags</span>
            ) : "—"}
          </td>
        </tr>
      ))}
    </>
  );
}

export function HistoryTable({ weeklyRollups, history }: HistoryTableProps) {
  return (
    <GlassCard delay={0.3}>
      <h3 className="text-sm font-medium mb-4">30-Day History</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#94A3B8] text-[10px] border-b border-white/10">
              <th className="pb-2 px-2 font-medium">Week</th>
              <th className="pb-2 px-2 font-medium">Avg Journal</th>
              <th className="pb-2 px-2 font-medium">Avg Pro/React</th>
              <th className="pb-2 px-2 font-medium">Social</th>
              <th className="pb-2 px-2 font-medium">Reply Rate</th>
              <th className="pb-2 px-2 font-medium">KB Added</th>
              <th className="pb-2 px-2 font-medium">Deg. Days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {weeklyRollups.map((rollup) => (
              <WeekRow key={rollup.weekLabel} rollup={rollup} history={history} />
            ))}
          </tbody>
        </table>
      </div>
      {weeklyRollups.length === 0 && (
        <div className="text-center text-xs text-[#94A3B8] py-8">
          No historical data yet. Chandler will populate this over time.
        </div>
      )}
    </GlassCard>
  );
}
