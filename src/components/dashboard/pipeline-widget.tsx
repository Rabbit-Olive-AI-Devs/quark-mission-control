"use client"

import { motion } from "framer-motion"
import { useApi } from "@/hooks/use-api"
import { PipelineData, PipelineStage } from "@/lib/parsers/types"
import Link from "next/link"
import { STATUS_COLORS } from "@/lib/pipeline-constants"

function MiniSegmentBar({ stages, terminalStatus }: { stages: PipelineStage[]; terminalStatus?: string }) {
  const terminalColor = terminalStatus === "killed"
    ? { bg: "linear-gradient(90deg, #EF4444, rgba(239, 68, 68, 0.35))", glow: "rgba(239, 68, 68, 0.25)" }
    : terminalStatus === "redo"
      ? { bg: "linear-gradient(90deg, #F59E0B, rgba(245, 158, 11, 0.35))", glow: "rgba(245, 158, 11, 0.25)" }
      : null
  const hasActive = stages.some((s) => s.status === "active")

  return (
    <div className="flex gap-[2px] h-1">
      {stages.map((stage, i) => {
        const isHeyGen = stage.name === "heygen_submitted"
        const isTerminalMarker = !!terminalColor && !hasActive && i === stages.length - 1
        const effectiveStatus: PipelineStage["status"] = isTerminalMarker ? "active" : stage.status

        if (effectiveStatus === "completed") {
          return <div key={i} className={`bg-[#10B981] rounded-sm ${isHeyGen ? "flex-[2]" : "flex-1"}`} />
        }
        if (effectiveStatus === "active") {
          const activeBg = terminalColor
            ? terminalColor.bg
            : "linear-gradient(90deg, #00D4AA, rgba(0, 212, 170, 0.33))"
          const glow = terminalColor
            ? terminalColor.glow
            : "rgba(0, 212, 170, 0.25)"
          return (
            <div
              key={i}
              className={`rounded-sm glow-bar ${isHeyGen ? "flex-[2]" : "flex-1"}`}
              style={{
                background: activeBg,
                ["--glow-color" as string]: glow,
              }}
            />
          )
        }
        return <div key={i} className={`bg-[#1a1f2e] rounded-sm ${isHeyGen ? "flex-[2]" : "flex-1"}`} />
      })}
    </div>
  )
}

export function PipelineWidget({ delay = 0 }: { delay?: number }) {
  const { data } = useApi<PipelineData>("/api/pipeline", { snapshotKey: "pipeline", refreshOn: ["pipeline"] })

  const scorecard = data?.scorecard
  const activeJob = data?.activeJob
  const lastJob = data?.jobs?.[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass-card p-5 relative overflow-hidden"
    >
      <div className="light-line absolute top-0 left-0 right-0" />

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Left: pipeline status */}
        <div className="flex-[2]">
          {activeJob ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-2 h-2 rounded-full pulse-live"
                  style={{ background: "#00D4AA", boxShadow: "0 0 10px rgba(0, 212, 170, 0.4)" }}
                />
                <span className="text-xs font-mono text-[#F1F5F9]">{activeJob.jobId}</span>
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                  style={{
                    color: "#00D4AA",
                    background: "rgba(0, 212, 170, 0.07)",
                    border: "1px solid rgba(0, 212, 170, 0.13)",
                  }}
                >
                  {activeJob.status}
                </span>
              </div>
              <MiniSegmentBar stages={activeJob.stages} terminalStatus={activeJob.status} />
              <div className="mt-1 text-[10px] text-[#94A3B8] truncate">
                Topic: {activeJob.topic || "—"}
              </div>
            </>
          ) : lastJob ? (
            <>
              <div className="flex items-center gap-2 mb-2 opacity-60">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: STATUS_COLORS[lastJob.status] || "#94A3B8" }}
                />
                <span className="text-xs text-[#94A3B8]">
                  Last: {lastJob.jobId} — {lastJob.status}
                </span>
              </div>
              <div className="opacity-40">
                <MiniSegmentBar stages={lastJob.stages} terminalStatus={lastJob.status} />
              </div>
              <div className="mt-1 text-[10px] text-[#94A3B8] truncate opacity-70">
                Topic: {lastJob.topic || "—"}
              </div>
            </>
          ) : (
            <div className="text-xs text-[#4B5563]">No pipeline data</div>
          )}
        </div>

        {/* Right: mini scorecard */}
        {scorecard && (
          <div className="flex-1 text-right md:text-right">
            <div className="text-[11px] text-[#94A3B8]">
              <span className="text-[#10B981] font-mono">{scorecard.published}</span> published
              {" / "}
              <span className="text-[#EF4444] font-mono">{scorecard.killed}</span> killed
            </div>
            <div className="text-[9px] text-[#4B5563] mt-0.5">this week</div>
          </div>
        )}
      </div>

      {/* Link */}
      <div className="mt-3 pt-2 border-t border-white/[0.04]">
        <Link
          href="/content"
          className="text-[10px] text-[#00D4AA] hover:text-[#00D4AA]/80 transition-colors"
        >
          View pipeline →
        </Link>
      </div>
    </motion.div>
  )
}
