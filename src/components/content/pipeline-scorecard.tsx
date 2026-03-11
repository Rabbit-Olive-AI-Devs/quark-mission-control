"use client"

import { motion } from "framer-motion"
import { PipelineScorecard as ScorecardType } from "@/lib/parsers/types"

const TYPE_COLORS: Record<string, string> = {
  proof: "#7C3AED",
  news_relay: "#3B82F6",
  viral_ride: "#F59E0B",
  hot_take: "#EF4444",
  war_story: "#10B981",
  reaction: "#EC4899",
}

function StatCard({
  label,
  value,
  color,
  delay,
}: {
  label: string
  value: number
  color: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass-card p-3 md:p-4 relative overflow-hidden"
    >
      <div className="light-line absolute top-0 left-0 right-0" style={{ ["--line-color" as string]: `${color}22` }} />
      <div className="text-2xl font-bold font-mono" style={{ color }}>{value}</div>
      <div className="text-[9px] text-[#94A3B8] uppercase tracking-wider mt-1">{label}</div>
    </motion.div>
  )
}

function ContentMixCard({
  breakdown,
  delay,
}: {
  breakdown: Record<string, number>
  delay: number
}) {
  const total = Object.values(breakdown).reduce((sum, n) => sum + n, 0)
  const entries = Object.entries(breakdown).filter(([, n]) => n > 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass-card p-3 md:p-4 relative overflow-hidden"
    >
      <div className="light-line absolute top-0 left-0 right-0" />
      <div className="text-[9px] text-[#94A3B8] uppercase tracking-wider mb-2">Content Mix</div>
      {total > 0 ? (
        <>
          <div className="flex gap-[2px] h-1.5 rounded-full overflow-hidden mb-2">
            {entries.map(([type, count]) => (
              <div
                key={type}
                className="rounded-full"
                style={{
                  flex: count,
                  background: TYPE_COLORS[type] || "#94A3B8",
                }}
              />
            ))}
          </div>
          <div className="flex gap-3 flex-wrap">
            {entries.map(([type, count]) => (
              <div key={type} className="flex items-center gap-1">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: TYPE_COLORS[type] || "#94A3B8" }}
                />
                <span className="text-[9px] text-[#94A3B8]">{type} ({count})</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-[11px] text-[#4B5563]">No data this week</div>
      )}
    </motion.div>
  )
}

export function PipelineScorecard({ scorecard }: { scorecard: ScorecardType }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard label="Published" value={scorecard.published} color="#10B981" delay={0.05} />
      <StatCard label="Killed" value={scorecard.killed} color="#EF4444" delay={0.1} />
      <StatCard label="Pending" value={scorecard.pending} color="#00D4AA" delay={0.15} />
      <ContentMixCard breakdown={scorecard.contentTypeBreakdown} delay={0.2} />
    </div>
  )
}
